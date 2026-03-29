import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
  {
    projectNumber: { type: String, unique: true },
    title: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    handymanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: [
        'inquiry',
        'quoted_by_handyman',
        'pending_customer_approval',
        'active',
        'scheduled',
        'in_progress',
        'completed',
        'handyman_paid',
        'customer_paid',
      ],
      default: 'inquiry',
    },
    /** Kept in sync when status is in_progress (legacy / reports). */
    jobStarted: { type: Boolean, default: false },
    description: { type: String },
    serviceType: {
      type: String,
      enum: ['plumbing', 'electrical', 'carpentry', 'painting', 'general', 'remodeling', 'hvac', 'other'],
    },
    address: { type: String },
    jobSiteContactName: { type: String },
    jobSiteContactPhone: { type: String },
    scheduledDate: { type: Date },
    scheduledTime: { type: String },
    isRescheduling: { type: Boolean, default: false },
    isChatEnabled: { type: Boolean, default: true },
    estimatedDuration: { type: String },
    quoteAmount: { type: Number },
    quoteBreakdown: {
      labour: { type: Number },
      materials: { type: Number },
      other: { type: Number },
    },
    finalAmount: { type: Number },
    photos: [{ type: String }],
    payments: [
      {
        date: { type: Date },
        amount: { type: Number },
        method: { type: String },
        status: { type: String },
        notes: { type: String },
        type: { type: String },
      },
    ],
    timeline: [
      {
        date: { type: Date, default: Date.now },
        event: { type: String },
        by: { type: String },
      },
    ],
    additionalCosts: [
      {
        description: { type: String },
        materialCost: { type: Number, default: 0 },
        laborCost: { type: Number, default: 0 },
        totalCost: { type: Number },
        submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        submittedAt: { type: Date, default: Date.now },
      },
    ],
    additionalCostsSentToCustomerAt: { type: Date },
    customerAcceptedQuoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
    pendingCustomerAcceptance: { type: Boolean, default: false },
    amountAlreadyPaid: { type: Number, default: 0 },
    isReopened: { type: Boolean, default: false },
    handymanLedger: [
      {
        description: { type: String },
        amount: { type: Number },
        date: { type: Date, default: Date.now },
        additionalCostId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
