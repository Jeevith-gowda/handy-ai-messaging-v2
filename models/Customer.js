import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+1' + digits.slice(1);
  }
  if (digits.length === 10) {
    return '+1' + digits;
  }
  return '+' + digits;
}

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Unknown' },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String },
    address: { type: String },
    totalSpent: { type: Number, default: 0 },
    jobCount: { type: Number, default: 0 },
    notes: { type: String },
    tags: [{ type: String }],
    /** Optional per-customer portal password (bcrypt). If unset, login uses env CUSTOMER_PASSWORD. */
    password: { type: String },
    aiDraft: { type: String },
    isSpam: { type: Boolean, default: false },
    leadStatus: { type: String, default: 'unknown' },
  },
  { timestamps: true }
);

CustomerSchema.pre('save', async function (next) {
  if (this.isModified('phone')) {
    this.phone = normalizePhone(this.phone);
  }
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

CustomerSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.phone) {
    update.phone = normalizePhone(update.phone);
  }
  next();
});

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
