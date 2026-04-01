import mongoose from 'mongoose';

const deletedConversationSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, unique: true, index: true },
    deletedAt: { type: Date, required: true },
    source: { type: String, default: 'webhook' },
    rawPayload: { type: Object },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.DeletedConversation || mongoose.model('DeletedConversation', deletedConversationSchema);
