import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listConversations } from '@/lib/quo';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';

export async function GET(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const phoneNumberId = process.env.QUO_PHONE_NUMBER_ID;
  if (!phoneNumberId || phoneNumberId === 'user-will-fill-this') {
    return NextResponse.json({ error: 'QUO_PHONE_NUMBER_ID not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const maxResults = Math.min(100, Math.max(1, parseInt(searchParams.get('maxResults') || '50', 10)));
    const pageToken = searchParams.get('pageToken') || undefined;
    const state = (searchParams.get('state') || 'open').toLowerCase();

    const raw = await listConversations(phoneNumberId, { maxResults, pageToken });
    const list = Array.isArray(raw?.data) ? raw.data : [];

    const filtered = state === 'open'
      ? list.filter((conv) => !conv.deletedAt)
      : state === 'archived'
        ? list.filter((conv) => conv.deletedAt)
        : list; // 'all' or unknown => return everything

    await dbConnect();

    // Extract unique participants mapping dynamically
    const allNumbers = new Set();
    filtered.forEach(c => {
      const pArr = c.participants ?? c.phoneNumbers ?? c.participant ?? [];
      const arr = Array.isArray(pArr) ? pArr : [pArr].filter(Boolean);
      arr.forEach(x => {
        const ph = typeof x === 'string' ? x : x?.phoneNumber ?? x?.number ?? x;
        if (ph) allNumbers.add(ph);
      });
    });

    const customers = await Customer.find({ phone: { $in: Array.from(allNumbers) } }).select('phone name aiDraft isSpam');
    const customerMap = {};
    customers.forEach(c => {
      customerMap[c.phone] = c;
    });

    const finalFiltered = filtered.map(c => {
      const pArr = c.participants ?? c.phoneNumbers ?? c.participant ?? [];
      const arr = Array.isArray(pArr) ? pArr : [pArr].filter(Boolean);
      const ph = arr.map(x => typeof x === 'string' ? x : x?.phoneNumber ?? x?.number ?? x).find(Boolean);

      if (!customerMap[ph]) {
        return null; // Spam or deleted Customer
      }

      if (customerMap[ph]?.isSpam) {
        return null; // Filter out spam entirely
      }

      const realName = customerMap[ph]?.name && customerMap[ph].name !== 'Unknown' ? customerMap[ph].name : c.contactName;
      return { ...c, contactName: realName || null, aiDraft: customerMap[ph]?.aiDraft || null, isSpam: false };
    }).filter(Boolean);

    const response = {
      ...raw,
      data: finalFiltered,
      totalItems: finalFiltered.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Quo conversations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: error.message?.includes('402') ? 402 : 500 }
    );
  }
}
