import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Quote from '@/models/Quote';
import { requireAuth, getSession } from '@/lib/auth';

export async function GET(request, context) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  await dbConnect();

  try {
    const { id } = context.params;
    const project = await Project.findById(id)
      .populate('customerId')
      .populate('handymanId', 'name phone skills availability hourlyRate rating');

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (session.user.role === 'customer' && project.customerId?._id?.toString() !== session.user.id && project.customerId?.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  await dbConnect();

  try {
    const { id } = context.params;
    const body = await request.json();
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isCustomer = session.user.role === 'customer';
    const isProjectCustomer = project.customerId?.toString() === session.user.id;
    const isHandyman = session.user.role === 'handyman';
    const isAssignedHandyman = project.handymanId?.toString() === session.user.id;

    if (isCustomer) {
      if (!isProjectCustomer) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      body.updatedBy = session.user.name || 'customer';

      // Customer accepting a quote (initial or revised)
      if (body.acceptQuote === true) {
        if (project.pendingCustomerAcceptance === false) {
          const current = await Project.findById(id).populate('customerId').populate('handymanId', 'name phone skills availability');
          return NextResponse.json(current);
        }
        const sentQuotes = await Quote.find({ projectId: id, status: { $in: ['sent', 'accepted'] } }).sort({ createdAt: -1 });
        const latestQuote = sentQuotes[0];
        if (!latestQuote) {
          return NextResponse.json({ error: 'No quote to accept' }, { status: 400 });
        }
        const alreadyAccepted = project.customerAcceptedQuoteId?.toString() === latestQuote._id.toString();
        if (alreadyAccepted) {
          const current = await Project.findById(id).populate('customerId').populate('handymanId', 'name phone skills availability');
          return NextResponse.json(current);
        }

        // Build handyman ledger entries (base pay + original additional-cost amounts, not customer markup)
        const ledgerEntries = [];
        const handymanDraft = await Quote.findOne({ projectId: id, status: 'handyman_draft' }).sort({ createdAt: -1 });
        const existingLedgerIds = new Set((project.handymanLedger || []).map((e) => e.additionalCostId?.toString()).filter(Boolean));
        const isFirstAcceptance = !project.customerAcceptedQuoteId;

        if (isFirstAcceptance && handymanDraft?.totalAmount != null && handymanDraft.totalAmount > 0) {
          ledgerEntries.push({
            description: 'Base Pay',
            amount: handymanDraft.totalAmount,
            date: new Date(),
          });
        }

        const additionalCosts = project.additionalCosts || [];
        const quoteLineItems = latestQuote.lineItems || [];
        const additionalIndices = quoteLineItems
          .map((item, i) => (String(item?.description || '').startsWith('[Additional]') ? i : -1))
          .filter((i) => i >= 0);
        for (let k = 0; k < additionalIndices.length && k < additionalCosts.length; k++) {
          const match = additionalCosts[k];
          if (!match || (match.totalCost ?? 0) <= 0) continue;
          const acId = match._id?.toString?.();
          if (acId && existingLedgerIds.has(acId)) continue;
          ledgerEntries.push({
            description: match.description || 'Additional work',
            amount: match.totalCost,
            date: new Date(),
            additionalCostId: match._id,
          });
          if (acId) existingLedgerIds.add(acId);
        }

        const update = { customerAcceptedQuoteId: latestQuote._id, pendingCustomerAcceptance: false };
        if (project.status === 'pending_customer_approval') {
          update.status = 'active';
          update.jobStarted = false;
        }
        await Quote.findByIdAndUpdate(latestQuote._id, { status: 'accepted' });
        const eventMsg =
          project.status === 'pending_customer_approval' ? 'Customer accepted quote' : 'Customer accepted revised quote';
        const pushOps = { timeline: { date: new Date(), event: `${eventMsg} — $${latestQuote.totalAmount ?? 0}`, by: body.updatedBy || 'customer' } };
        if (ledgerEntries.length > 0) {
          pushOps.handymanLedger = { $each: ledgerEntries };
        }
        const updated = await Project.findByIdAndUpdate(
          id,
          { $set: update, $push: pushOps },
          { new: true }
        )
          .populate('customerId')
          .populate('handymanId', 'name phone skills availability');
        return NextResponse.json(updated);
      }

      if (body.status !== undefined && body.status !== project.status) {
        if (body.status !== 'active' || project.status !== 'pending_customer_approval') {
          return NextResponse.json({ error: 'Invalid status change' }, { status: 403 });
        }
      }

      if (
        (body.requestReschedule === true || body.isRescheduling === true) &&
        (project.status === 'scheduled' || (project.status === 'active' && project.scheduledDate)) &&
        project.scheduledDate
      ) {
        const updated = await Project.findByIdAndUpdate(id, { $set: { isRescheduling: true, updatedBy: body.updatedBy }, $push: { timeline: { date: new Date(), event: 'Reschedule requested', by: body.updatedBy || 'customer' } } }, { new: true })
          .populate('customerId')
          .populate('handymanId', 'name phone skills availability');
        return NextResponse.json(updated);
      }
    }

    if (isHandyman) {
      if (!isAssignedHandyman) {
        return NextResponse.json({ error: 'You can only update your assigned projects' }, { status: 403 });
      }

      // Lock Schedule: first time on active job (customer accepted)
      if (body.lockSchedule && project.status === 'active' && !project.scheduledDate && !project.isRescheduling) {
        const { scheduledDate, scheduledTime } = body.lockSchedule;
        if (!scheduledDate || !scheduledTime) {
          return NextResponse.json({ error: 'scheduledDate and scheduledTime required' }, { status: 400 });
        }
        const push = {
          timeline: {
            date: new Date(),
            event: `Schedule locked: ${new Date(scheduledDate).toLocaleDateString('en-US')} at ${scheduledTime}`,
            by: body.updatedBy || session.user.name,
          },
        };
        const updated = await Project.findByIdAndUpdate(
          id,
          {
            $set: {
              status: 'scheduled',
              scheduledDate: new Date(scheduledDate),
              scheduledTime: String(scheduledTime).trim(),
              updatedBy: body.updatedBy || session.user.name,
            },
            $push: push,
          },
          { new: true }
        )
          .populate('customerId')
          .populate('handymanId', 'name phone skills availability');
        return NextResponse.json(updated);
      }

      if (
        (body.requestReschedule === true || body.isRescheduling === true) &&
        (project.status === 'scheduled' || (project.status === 'active' && project.scheduledDate)) &&
        project.scheduledDate &&
        !project.isRescheduling
      ) {
        const updated = await Project.findByIdAndUpdate(
          id,
          {
            $set: { isRescheduling: true, updatedBy: body.updatedBy || session.user.name },
            $push: { timeline: { date: new Date(), event: 'Reschedule requested', by: body.updatedBy || session.user.name } },
          },
          { new: true }
        )
          .populate('customerId')
          .populate('handymanId', 'name phone skills availability');
        return NextResponse.json(updated);
      }

      // Lock Schedule (Reschedule): handyman confirms new date/time during rescheduling
      if (
        body.lockSchedule &&
        project.isRescheduling === true &&
        (project.status === 'scheduled' || (project.status === 'active' && project.scheduledDate))
      ) {
        const { scheduledDate, scheduledTime } = body.lockSchedule;
        if (!scheduledDate || !scheduledTime) {
          return NextResponse.json({ error: 'scheduledDate and scheduledTime required' }, { status: 400 });
        }
        const updated = await Project.findByIdAndUpdate(id, {
          $set: {
            status: 'scheduled',
            scheduledDate: new Date(scheduledDate),
            scheduledTime: String(scheduledTime).trim(),
            isRescheduling: false,
            updatedBy: body.updatedBy || session.user.name,
          },
          $push: {
            timeline: {
              date: new Date(),
              event: `Reschedule locked: ${new Date(scheduledDate).toLocaleDateString('en-US')} at ${scheduledTime}`,
              by: body.updatedBy || session.user.name,
            },
          },
        }, { new: true })
          .populate('customerId')
          .populate('handymanId', 'name phone skills availability');
        return NextResponse.json(updated);
      }

      // Start Job: scheduled (date locked) -> in_progress — legacy: active + scheduledDate still allowed
      if (
        body.status === 'in_progress' &&
        project.scheduledDate &&
        !project.isRescheduling &&
        (project.status === 'scheduled' || project.status === 'active')
      ) {
        const updated = await Project.findByIdAndUpdate(id, {
          $set: {
            status: 'in_progress',
            jobStarted: true,
            updatedBy: body.updatedBy || session.user.name,
          },
          $push: { timeline: { date: new Date(), event: 'Job started', by: body.updatedBy || session.user.name } },
        }, { new: true })
          .populate('customerId')
          .populate('handymanId', 'name phone skills availability hourlyRate rating');
        return NextResponse.json(updated);
      }

      const allowedStatusTransitions = {
        scheduled: ['in_progress'],
        in_progress: ['completed'],
      };

      if (body.status !== undefined && body.status !== project.status) {
        if (body.status === 'completed' && project.status !== 'in_progress') {
          return NextResponse.json({ error: 'Start the job before marking complete' }, { status: 400 });
        }
        const allowed = allowedStatusTransitions[project.status];
        if (!allowed || !allowed.includes(body.status)) {
          return NextResponse.json({ error: `Handyman can only move ${project.status} to ${allowedStatusTransitions[project.status]?.join(', ') || 'nothing'}` }, { status: 403 });
        }
      }

      const sanitized = { updatedBy: body.updatedBy };
      if (body.status !== undefined) sanitized.status = body.status;
      if (body.status === 'completed') sanitized.isChatEnabled = false;
      if (body.$push) sanitized.$push = body.$push;
      if (body.addAdditionalCost) sanitized.addAdditionalCost = body.addAdditionalCost;
      Object.keys(body).forEach((k) => delete body[k]);
      Object.assign(body, sanitized);
    }

    if (body.addAdditionalCost && isHandyman && isAssignedHandyman && project.status === 'in_progress') {
      const { description, materialCost = 0, laborCost = 0 } = body.addAdditionalCost;
      const totalCost = (parseFloat(materialCost) || 0) + (parseFloat(laborCost) || 0);
      body.$push = body.$push || {};
      body.$push.additionalCosts = {
        description: description || 'Additional work',
        materialCost: parseFloat(materialCost) || 0,
        laborCost: parseFloat(laborCost) || 0,
        totalCost,
        submittedBy: session.user.id,
        submittedAt: new Date(),
      };
      body.$push.timeline = {
        date: new Date(),
        event: `Additional cost added: ${description || 'Extra work'} — $${totalCost}`,
        by: session.user.name || 'system',
      };
      body.additionalCostsSentToCustomerAt = null;
    }

    const hasExistingPayment = (type) =>
      (project.payments || []).some((p) => {
        const pType = p.type || 'handyman';
        return pType === type;
      });
    const isReopened = project.isReopened === true;
    const allowReopenedPayment = isReopened && session.user.role === 'admin';

    if (body.addPayment && (body.addPayment.type === 'handyman' || body.addPayment.type === 'customer')) {
      const canAdd = !hasExistingPayment(body.addPayment.type) || allowReopenedPayment;
      if (!canAdd) {
        delete body.addPayment;
      } else {
        const paymentAmount = body.addPayment.amount ?? project.finalAmount ?? project.quoteAmount ?? 0;
        body.$push = body.$push || {};
        body.$push.timeline = {
          date: new Date(),
          event: `Payment recorded: ${body.addPayment.type === 'handyman' ? 'Admin paid handyman' : 'Customer paid admin'} — $${paymentAmount}`,
          by: body.updatedBy || session.user.name || 'system',
        };
        body.$push.payments = {
          date: new Date(),
          amount: paymentAmount,
          method: body.addPayment.method || 'manual',
          status: 'recorded',
          notes: body.addPayment.notes || '',
          type: body.addPayment.type,
        };
        if (body.addPayment.type === 'customer') {
          const sentQuotes = await Quote.find({ projectId: id, status: { $in: ['sent', 'accepted'] } }).sort({ createdAt: -1 });
          const latestQuote = sentQuotes[0];
          const totalAdditional = (project.additionalCosts || []).reduce((s, c) => s + (c.totalCost || 0), 0);
          const quoteTotal = latestQuote?.totalAmount ?? project.quoteAmount ?? 0;
          const hasAdditionalInQuote = (latestQuote?.lineItems || []).some((i) => String(i?.description || '').startsWith('[Additional]'));
          const totalProjectCost = hasAdditionalInQuote ? quoteTotal : quoteTotal + totalAdditional;
          if (isReopened) {
            body.$set = body.$set || {};
            body.$set.amountAlreadyPaid = (project.amountAlreadyPaid ?? 0) + paymentAmount;
            body.$set.isReopened = false;
          } else if ((project.amountAlreadyPaid ?? 0) === 0) {
            body.$set = body.$set || {};
            body.$set.amountAlreadyPaid = totalProjectCost;
          }
        }
      }
    }

    if (body.status && body.status !== project.status && !body.addPayment) {
      const timelineEntry = {
        date: new Date(),
        event: `Status changed from ${project.status} to ${body.status}`,
        by: body.updatedBy || session.user.name || 'system',
      };
      body.$push = body.$push || {};
      body.$push.timeline = timelineEntry;

      const statusPaymentType = body.status === 'handyman_paid' ? 'handyman' : body.status === 'customer_paid' ? 'customer' : null;
      if (statusPaymentType && !hasExistingPayment(statusPaymentType)) {
        const amount = body.paymentAmount ?? project.finalAmount ?? project.quoteAmount ?? 0;
        const paymentRecord = {
          date: new Date(),
          amount,
          method: body.paymentMethod || 'manual',
          status: 'recorded',
          notes: body.paymentNotes || '',
          type: body.paymentType || statusPaymentType,
        };
        body.$push.payments = paymentRecord;
      }
    }

    const isAdmin = session.user.role === 'admin';
    if (isAdmin && body.reopenJob === true && project.status === 'completed') {
      const reason = (body.reason || '').trim();
      if (!reason) {
        return NextResponse.json({ error: 'Reason for reopening is required' }, { status: 400 });
      }
      const totalCustomerPaid = (project.payments || [])
        .filter((p) => (p.type || '') === 'customer')
        .reduce((s, p) => s + (p.amount || 0), 0);
      const amountAlreadyPaid = (project.amountAlreadyPaid ?? 0) > 0 ? project.amountAlreadyPaid : totalCustomerPaid;
      const updated = await Project.findByIdAndUpdate(id, {
        $set: {
          status: 'active',
          jobStarted: true,
          isReopened: true,
          isChatEnabled: true,
          amountAlreadyPaid,
          updatedBy: body.updatedBy || 'admin',
        },
        $push: { timeline: { date: new Date(), event: `Admin reopened job for rework: ${reason}`, by: body.updatedBy || 'admin' } },
      }, { new: true })
        .populate('customerId')
        .populate('handymanId', 'name phone skills availability hourlyRate rating');
      return NextResponse.json(updated);
    }
    if (isAdmin && body.isChatEnabled !== undefined) {
      const updated = await Project.findByIdAndUpdate(
        id,
        { $set: { isChatEnabled: !!body.isChatEnabled, updatedBy: body.updatedBy || 'admin' } },
        { new: true }
      )
        .populate('customerId')
        .populate('handymanId', 'name phone skills availability hourlyRate rating');
      return NextResponse.json(updated);
    }
    if (isAdmin && body.adminOverrideReschedule) {
      const { scheduledDate, scheduledTime } = body.adminOverrideReschedule;
      if (!scheduledDate || !scheduledTime) {
        return NextResponse.json({ error: 'scheduledDate and scheduledTime required' }, { status: 400 });
      }
      const nextStatus =
        project.status === 'active' || project.status === 'scheduled' ? 'scheduled' : project.status;
      const updated = await Project.findByIdAndUpdate(id, {
        $set: {
          status: nextStatus,
          scheduledDate: new Date(scheduledDate),
          scheduledTime: String(scheduledTime).trim(),
          isRescheduling: false,
          updatedBy: body.updatedBy || 'admin',
        },
        $push: {
          timeline: {
            date: new Date(),
            event: `Admin override: Schedule locked to ${new Date(scheduledDate).toLocaleDateString('en-US')} at ${scheduledTime}`,
            by: body.updatedBy || 'admin',
          },
        },
      }, { new: true })
        .populate('customerId')
        .populate('handymanId', 'name phone skills availability');
      return NextResponse.json(updated);
    }

    const { updatedBy, addPayment, addAdditionalCost, adminOverrideReschedule, ...updateData } = body;
    const pushData = updateData.$push;
    delete updateData.$push;

    if (body.status === 'pending_customer_approval') {
      updateData.pendingCustomerAcceptance = true;
      if (!['inquiry', 'quoted_by_handyman'].includes(project.status)) {
        delete updateData.status;
      }
    }

    const updateOps = { ...updateData };
    if (pushData) {
      updateOps.$push = pushData;
    }

    const updated = await Project.findByIdAndUpdate(id, updateOps, { new: true })
      .populate('customerId')
      .populate('handymanId', 'name phone skills availability');

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  try {
    const { id } = context.params;
    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Project deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
