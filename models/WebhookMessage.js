import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, required: true }, // MIME type: 'image/jpeg', 'video/mp4', etc.
});

const webhookMessageSchema = new mongoose.Schema({
  quoMessageId: { type: String, required: true, unique: true, index: true },
  conversationId: { type: String, index: true },
  phoneNumberId: { type: String },
  fromNumber: { type: String, required: true },
  toNumber: { type: String, required: true },
  direction: { type: String, enum: ['incoming', 'outgoing'], required: true },
  body: { type: String, default: '' },
  status: { type: String },
  media: [mediaSchema], // THIS is where images/videos are stored
  userId: { type: String },
  quoCreatedAt: { type: Date, required: true },
  rawPayload: { type: Object }, // Full webhook JSON for debugging
}, {
  timestamps: true, // adds createdAt, updatedAt
});

// Indexes for fast lookups
webhookMessageSchema.index({ phoneNumberId: 1, fromNumber: 1 });
webhookMessageSchema.index({ phoneNumberId: 1, toNumber: 1 });
webhookMessageSchema.index({ quoCreatedAt: -1 });

export default mongoose.models.WebhookMessage || mongoose.model('WebhookMessage', webhookMessageSchema);
