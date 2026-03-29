import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
    from: { type: String },
    fromPhone: { type: String },
    isSpam: { type: Boolean, default: false },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    handymanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    senderType: { type: String, enum: ['customer', 'handyman', 'admin', 'ai'] },
    body: { type: String },
    originalText: { type: String },
    aiDraft: { type: String },
    editedText: { type: String },
    sentText: { type: String },
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'sent', 'failed', 'skipped'],
      default: 'pending_review',
    },
    aiReasoning: { type: String },
    confidence: { type: Number },
    openphoneMessageId: { type: String },
    isRead: { type: Boolean, default: false },
    mediaUrls: { type: [String], default: [] },
    isCall: { type: Boolean, default: false },
    callId: { type: String },
    callDuration: { type: Number },
    callStatus: { type: String },
    callSummary: { type: [String] },
    callNextSteps: { type: [String] },
  },
  { timestamps: true }
);

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
