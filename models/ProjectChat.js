import mongoose from 'mongoose';

const ProjectChatSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    senderRole: { type: String, enum: ['customer', 'handyman'], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

ProjectChatSchema.index({ projectId: 1, createdAt: 1 });

export default mongoose.models.ProjectChat || mongoose.model('ProjectChat', ProjectChatSchema);
