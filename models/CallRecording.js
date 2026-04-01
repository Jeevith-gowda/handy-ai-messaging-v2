import mongoose from 'mongoose';

const callRecordingSchema = new mongoose.Schema({
  quoCallId: { type: String, required: true, unique: true, index: true },
  conversationId: { type: String, index: true },
  phoneNumberId: { type: String },
  recordingUrl: { type: String },
  recordingType: { type: String },
  recordingDuration: { type: Number },
  voicemailUrl: { type: String },
  voicemailType: { type: String },
  voicemailDuration: { type: Number },
  quoCreatedAt: { type: Date },
}, {
  timestamps: true,
});

export default mongoose.models.CallRecording || mongoose.model('CallRecording', callRecordingSchema);
