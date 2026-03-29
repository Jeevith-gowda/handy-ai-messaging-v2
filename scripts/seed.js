require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

// --- Inline schemas (seed runs standalone, can't use ESM model imports) ---

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'handyman'], default: 'handyman' },
    phone: { type: String },
    skills: [{ type: String }],
    hourlyRate: { type: Number },
    availability: { type: String, enum: ['available', 'busy', 'off'], default: 'available' },
    rating: { type: Number, default: 5 },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Unknown' },
    phone: { type: String, required: true, unique: true },
    email: { type: String },
    address: { type: String },
    totalSpent: { type: Number, default: 0 },
    jobCount: { type: Number, default: 0 },
    notes: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

const ProjectSchema = new mongoose.Schema(
  {
    projectNumber: { type: String, unique: true },
    title: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    handymanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['inquiry', 'quoted', 'accepted', 'in_progress', 'completed', 'handyman_paid', 'customer_paid'],
      default: 'inquiry',
    },
    description: { type: String },
    serviceType: { type: String },
    address: { type: String },
    jobSiteContactName: { type: String },
    jobSiteContactPhone: { type: String },
    scheduledDate: { type: Date },
    scheduledTime: { type: String },
    estimatedDuration: { type: String },
    quoteAmount: { type: Number },
    quoteBreakdown: { labour: Number, materials: Number, other: Number },
    finalAmount: { type: Number },
    photos: [{ type: String }],
    payments: [{ date: Date, amount: Number, method: String, status: String, notes: String }],
    timeline: [
      {
        date: { type: Date, default: Date.now },
        event: { type: String },
        by: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const MessageSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    senderType: { type: String, enum: ['customer', 'handyman', 'admin', 'ai'] },
    originalText: { type: String },
    aiDraft: { type: String },
    sentText: { type: String },
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'sent', 'failed', 'skipped'],
      default: 'pending_review',
    },
    aiReasoning: { type: String },
    confidence: { type: Number },
  },
  { timestamps: true }
);

const QuoteSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lineItems: [{ description: String, amount: Number }],
    totalAmount: { type: Number },
    status: { type: String, enum: ['draft', 'handyman_draft', 'sent', 'accepted', 'rejected', 'revised'], default: 'draft' },
    aiGenerated: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const Quote = mongoose.models.Quote || mongoose.model('Quote', QuoteSchema);

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Clearing existing data...');

  await User.deleteMany({});
  await Customer.deleteMany({});
  await Project.deleteMany({});
  await Message.deleteMany({});
  await Quote.deleteMany({});

  // --- Users ---
  console.log('Creating users...');

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@handyitout.com',
    password: 'admin123',
    role: 'admin',
    phone: '+17045551000',
  });

  const handyman1 = await User.create({
    name: 'Marcus Johnson',
    email: 'marcus@handyitout.com',
    password: 'password123',
    role: 'handyman',
    phone: '+17045551001',
    skills: ['plumbing', 'general', 'remodeling'],
    hourlyRate: 65,
    availability: 'available',
    rating: 4.8,
  });

  const handyman2 = await User.create({
    name: 'Sarah Chen',
    email: 'sarah@handyitout.com',
    password: 'password123',
    role: 'handyman',
    phone: '+17045551002',
    skills: ['electrical', 'painting', 'general'],
    hourlyRate: 55,
    availability: 'available',
    rating: 4.9,
  });

  const handyman3 = await User.create({
    name: 'David Martinez',
    email: 'david@handyitout.com',
    password: 'password123',
    role: 'handyman',
    phone: '+17045551003',
    skills: ['carpentry', 'remodeling', 'hvac'],
    hourlyRate: 70,
    availability: 'busy',
    rating: 4.7,
  });

  // --- Customers ---
  console.log('Creating customers...');

  const customer1 = await Customer.create({
    name: 'Jennifer Williams',
    phone: '+17045552001',
    email: 'jennifer.w@email.com',
    address: '1423 Park Rd, Charlotte, NC 28203',
    totalSpent: 1250,
    jobCount: 3,
    notes: 'Owns two rental properties. Prefers morning appointments.',
    tags: ['repeat', 'rental-owner'],
  });

  const customer2 = await Customer.create({
    name: 'Robert Thompson',
    phone: '+17045552002',
    email: 'rthompson@email.com',
    address: '8901 University City Blvd, Charlotte, NC 28213',
    totalSpent: 450,
    jobCount: 1,
    notes: 'First-time customer from Google referral.',
    tags: [],
  });

  const customer3 = await Customer.create({
    name: 'Lisa Patel',
    phone: '+17045552003',
    email: 'lisa.patel@email.com',
    address: '3210 South Blvd, Charlotte, NC 28209',
    totalSpent: 3800,
    jobCount: 6,
    notes: 'VIP customer. Always tips well. Manages a small apartment complex.',
    tags: ['vip', 'repeat', 'rental-owner'],
  });

  // --- Projects (3 different statuses) ---
  console.log('Creating projects...');

  const project1 = await Project.create({
    projectNumber: 'HIO-0001',
    title: 'Kitchen Faucet Replacement',
    customerId: customer1._id,
    handymanId: handyman1._id,
    status: 'in_progress',
    description: 'Replace old kitchen faucet with a new Moen single-handle model. Customer has already purchased the faucet.',
    serviceType: 'plumbing',
    address: '1423 Park Rd, Charlotte, NC 28203',
    scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    scheduledTime: '9:00 AM',
    estimatedDuration: '2 hours',
    quoteAmount: 150,
    quoteBreakdown: { labour: 120, materials: 30, other: 0 },
    timeline: [
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), event: 'Project created', by: 'system' },
      { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), event: 'Quote sent to customer', by: 'admin' },
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), event: 'Quote accepted', by: 'customer' },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), event: 'Status changed from accepted to in_progress', by: 'admin' },
    ],
  });

  const project2 = await Project.create({
    projectNumber: 'HIO-0002',
    title: 'Ceiling Fan Installation',
    customerId: customer2._id,
    handymanId: handyman2._id,
    status: 'quoted',
    description: 'Install two ceiling fans in bedrooms. No existing wiring — needs new electrical run from attic.',
    serviceType: 'electrical',
    address: '8901 University City Blvd, Charlotte, NC 28213',
    scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    scheduledTime: '10:00 AM',
    estimatedDuration: '4 hours',
    quoteAmount: 480,
    quoteBreakdown: { labour: 400, materials: 80, other: 0 },
    timeline: [
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), event: 'Project created', by: 'system' },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), event: 'Status changed from inquiry to quoted', by: 'admin' },
    ],
  });

  const project3 = await Project.create({
    projectNumber: 'HIO-0003',
    title: 'Bathroom Remodel — Tile + Vanity',
    customerId: customer3._id,
    handymanId: handyman3._id,
    status: 'inquiry',
    description: 'Full guest bathroom remodel: remove old tile, install new subway tile, replace vanity and mirror. Customer wants modern farmhouse style.',
    serviceType: 'remodeling',
    address: '3210 South Blvd, Unit 4B, Charlotte, NC 28209',
    jobSiteContactName: 'Lisa Patel',
    jobSiteContactPhone: '+17045552003',
    estimatedDuration: '3-4 days',
    quoteAmount: 2500,
    quoteBreakdown: { labour: 1500, materials: 800, other: 200 },
    timeline: [
      { date: new Date(), event: 'Project created', by: 'system' },
    ],
  });

  // --- Quotes ---
  console.log('Creating quotes...');

  await Quote.create({
    projectId: project1._id,
    customerId: customer1._id,
    submittedBy: admin._id,
    lineItems: [
      { description: 'Faucet installation labor', amount: 120 },
      { description: 'Supply line replacement', amount: 30 },
    ],
    totalAmount: 150,
    status: 'accepted',
  });

  await Quote.create({
    projectId: project2._id,
    customerId: customer2._id,
    submittedBy: admin._id,
    lineItems: [
      { description: 'Electrical wiring (2 rooms)', amount: 280 },
      { description: 'Ceiling fan mounting (x2)', amount: 120 },
      { description: 'Materials and supplies', amount: 80 },
    ],
    totalAmount: 480,
    status: 'sent',
  });

  await Quote.create({
    projectId: project3._id,
    customerId: customer3._id,
    submittedBy: handyman3._id,
    lineItems: [
      { description: 'Tile removal and prep', amount: 400 },
      { description: 'Subway tile installation', amount: 900 },
      { description: 'Vanity + mirror install', amount: 350 },
      { description: 'Materials and supplies', amount: 250 },
    ],
    totalAmount: 1900,
    status: 'handyman_draft',
    notes: 'Tile work will take 2 full days. Vanity needs custom cut for plumbing offset.',
  });

  // --- Messages ---
  console.log('Creating messages...');

  await Message.create({
    customerId: customer3._id,
    projectId: project3._id,
    direction: 'inbound',
    senderType: 'customer',
    originalText: 'Hi! I need my guest bathroom remodeled. Looking for subway tile and a new vanity. Can you give me an estimate?',
    aiDraft: 'Hi Lisa! Thanks for reaching out. We\'d love to help with your bathroom remodel. Could you send a few photos of the current bathroom so we can give you an accurate estimate? Also, do you have a preferred tile color and vanity style in mind?',
    aiReasoning: 'Returning VIP customer requesting a remodel quote. Asked qualifying questions about preferences and requested photos for accurate estimation.',
    confidence: 88,
    status: 'pending_review',
  });

  await Message.create({
    customerId: customer1._id,
    projectId: project1._id,
    direction: 'inbound',
    senderType: 'customer',
    originalText: 'Hey, Marcus was here yesterday but the faucet is still dripping a little. Can someone come back?',
    aiDraft: 'Hi Jennifer! Sorry about that — we\'ll get Marcus back out to fix the drip. He can come by tomorrow morning at 9 AM. Does that work for you?',
    aiReasoning: 'Active project with assigned handyman. Customer reports issue with recent work. Scheduling a follow-up visit.',
    confidence: 82,
    status: 'pending_review',
  });

  await Message.create({
    customerId: customer2._id,
    projectId: project2._id,
    direction: 'outbound',
    senderType: 'admin',
    sentText: 'Hi Robert! We\'ve sent over your quote for the ceiling fan installation — $480 for both fans including wiring. Let us know if you have any questions!',
    status: 'sent',
  });

  console.log('\n--- Seed Complete ---');
  console.log(`Admin:     admin@handyitout.com / admin123`);
  console.log(`Handyman:  marcus@handyitout.com / password123`);
  console.log(`Handyman:  sarah@handyitout.com / password123`);
  console.log(`Handyman:  david@handyitout.com / password123`);
  console.log(`Customers: ${customer1.name}, ${customer2.name}, ${customer3.name}`);
  console.log(`Projects:  ${project1.title} (in_progress), ${project2.title} (quoted), ${project3.title} (inquiry)`);
  console.log('');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
