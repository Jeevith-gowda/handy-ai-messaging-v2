import mongoose from 'mongoose';

const QuoteSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lineItems: [
      {
        description: { type: String },
        amount: { type: Number },
      },
    ],
    totalAmount: { type: Number },
    status: {
      type: String,
      enum: ['draft', 'handyman_draft', 'sent', 'accepted', 'rejected', 'revised'],
      default: 'draft',
    },
    aiGenerated: { type: Boolean, default: false },
    notes: { type: String },
    sentAt: { type: Date },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Quote || mongoose.model('Quote', QuoteSchema);
