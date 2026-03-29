require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

// --- Inline schemas (seed runs standalone) ---

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
      { date: Date, event: String, by: String },
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
    sentAt: { type: Date },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
const Quote = mongoose.models.Quote || mongoose.model('Quote', QuoteSchema);

const now = new Date();
const days = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

async function seedProjects() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Clearing projects and quotes...');

  await Project.deleteMany({});
  await Quote.deleteMany({});

  // --- Handymen ---
  let handymen = await User.find({ role: 'handyman' });
  if (handymen.length === 0) {
    console.log('No handymen found. Creating 3 handymen...');
    handymen = await User.insertMany([
      { name: 'Marcus Johnson', email: 'marcus@handyitout.com', password: 'password123', role: 'handyman', phone: '+17045551001', skills: ['plumbing', 'general', 'remodeling'], hourlyRate: 65, availability: 'available', rating: 4.8 },
      { name: 'Sarah Chen', email: 'sarah@handyitout.com', password: 'password123', role: 'handyman', phone: '+17045551002', skills: ['electrical', 'painting', 'general'], hourlyRate: 55, availability: 'available', rating: 4.9 },
      { name: 'David Martinez', email: 'david@handyitout.com', password: 'password123', role: 'handyman', phone: '+17045551003', skills: ['carpentry', 'remodeling', 'hvac'], hourlyRate: 70, availability: 'busy', rating: 4.7 },
    ]);
  }
  console.log(`Using ${handymen.length} handymen: ${handymen.map((h) => h.name).join(', ')}`);

  // --- Customers ---
  const customerDefs = [
    { name: 'Jennifer Williams', phone: '+17045553001', email: 'jennifer.w@email.com', address: '1423 Park Rd, Charlotte, NC 28203' },
    { name: 'Robert Thompson', phone: '+17045553002', email: 'rthompson@email.com', address: '8901 University City Blvd, Charlotte, NC 28213' },
    { name: 'Lisa Patel', phone: '+17045553003', email: 'lisa.patel@email.com', address: '3210 South Blvd, Charlotte, NC 28209' },
    { name: 'Michael O\'Brien', phone: '+17045553004', email: 'mobrien@email.com', address: '4502 Queens Rd, Charlotte, NC 28207' },
    { name: 'Amanda Foster', phone: '+17045553005', email: 'afoster@email.com', address: '1128 Central Ave, Charlotte, NC 28204' },
    { name: 'James Chen', phone: '+17045553006', email: 'jchen@email.com', address: '7800 Rea Rd, Charlotte, NC 28277' },
    { name: 'Maria Rodriguez', phone: '+17045553007', email: 'mrodriguez@email.com', address: '2100 Park Rd, Charlotte, NC 28203' },
    { name: 'Thomas Wright', phone: '+17045553008', email: 'twright@email.com', address: '5500 Monroe Rd, Charlotte, NC 28212' },
    { name: 'Emily Davis', phone: '+17045553009', email: 'edavis@email.com', address: '1900 East Blvd, Charlotte, NC 28203' },
    { name: 'Kevin Nguyen', phone: '+17045553010', email: 'knguyen@email.com', address: '6400 South Blvd, Charlotte, NC 28217' },
  ];

  const customers = [];
  for (const c of customerDefs) {
    let cust = await Customer.findOne({ phone: c.phone });
    if (!cust) cust = await Customer.create(c);
    customers.push(cust);
  }
  console.log(`Using ${customers.length} customers`);

  // --- Projects (10 varied) ---
  const projectData = [
    {
      projectNumber: 'HIO-0001',
      title: 'Interior Painting — Living Room',
      status: 'inquiry',
      serviceType: 'painting',
      description: 'Customer wants living room repainted. Walls are in good condition, no major prep needed. Prefers neutral gray tones.',
      quoteAmount: 350,
      quoteBreakdown: { labour: 280, materials: 70, other: 0 },
      customer: 0,
      handyman: 1,
      address: '1423 Park Rd, Charlotte, NC 28203',
      timeline: [{ date: daysAgo(1), event: 'Project created', by: 'system' }],
    },
    {
      projectNumber: 'HIO-0002',
      title: 'Leaky Toilet Repair',
      status: 'inquiry',
      serviceType: 'plumbing',
      description: 'Toilet runs constantly and occasionally flushes on its own. Suspect flapper or fill valve issue.',
      quoteAmount: 85,
      quoteBreakdown: { labour: 65, materials: 20, other: 0 },
      customer: 1,
      handyman: 0,
      address: '8901 University City Blvd, Charlotte, NC 28213',
      timeline: [{ date: daysAgo(2), event: 'Project created', by: 'system' }],
    },
    {
      projectNumber: 'HIO-0003',
      title: 'Outdoor Outlet Installation',
      status: 'quoted',
      serviceType: 'electrical',
      description: 'Add GFCI outlet on exterior wall for holiday lights and power tools. Requires new circuit from panel.',
      quoteAmount: 275,
      quoteBreakdown: { labour: 200, materials: 75, other: 0 },
      customer: 2,
      handyman: 1,
      address: '3210 South Blvd, Charlotte, NC 28209',
      scheduledDate: days(7),
      scheduledTime: '10:00 AM',
      estimatedDuration: '2 hours',
      timeline: [
        { date: daysAgo(5), event: 'Project created', by: 'system' },
        { date: daysAgo(3), event: 'Quote sent to customer', by: 'admin' },
      ],
    },
    {
      projectNumber: 'HIO-0004',
      title: 'Custom Bookshelf Build',
      status: 'quoted',
      serviceType: 'carpentry',
      description: 'Built-in bookshelf for home office, 8ft wide, floor to ceiling. Customer will provide stain color.',
      quoteAmount: 520,
      quoteBreakdown: { labour: 400, materials: 120, other: 0 },
      customer: 3,
      handyman: 2,
      address: '4502 Queens Rd, Charlotte, NC 28207',
      timeline: [
        { date: daysAgo(4), event: 'Project created', by: 'system' },
        { date: daysAgo(2), event: 'Status changed from inquiry to quoted', by: 'admin' },
      ],
    },
    {
      projectNumber: 'HIO-0005',
      title: 'AC Unit Tune-Up',
      status: 'accepted',
      serviceType: 'hvac',
      description: 'Annual maintenance: clean coils, check refrigerant, replace filter. Unit is 5 years old.',
      quoteAmount: 125,
      quoteBreakdown: { labour: 100, materials: 25, other: 0 },
      customer: 4,
      handyman: 2,
      address: '1128 Central Ave, Charlotte, NC 28204',
      scheduledDate: days(3),
      scheduledTime: '9:00 AM',
      estimatedDuration: '1.5 hours',
      timeline: [
        { date: daysAgo(7), event: 'Project created', by: 'system' },
        { date: daysAgo(5), event: 'Quote sent to customer', by: 'admin' },
        { date: daysAgo(3), event: 'Quote accepted', by: 'customer' },
      ],
    },
    {
      projectNumber: 'HIO-0006',
      title: 'Kitchen Cabinet Refacing',
      status: 'in_progress',
      serviceType: 'remodeling',
      description: 'Reface existing cabinet doors and drawer fronts. New hardware. Customer chose white shaker style.',
      quoteAmount: 1850,
      quoteBreakdown: { labour: 1200, materials: 550, other: 100 },
      customer: 5,
      handyman: 2,
      address: '7800 Rea Rd, Charlotte, NC 28277',
      scheduledDate: days(-2),
      scheduledTime: '8:00 AM',
      estimatedDuration: '4-5 days',
      additionalCosts: [
        { description: 'Extra hinge replacements (12 hinges)', materialCost: 48, laborCost: 0, totalCost: 48, submittedAt: daysAgo(1) },
      ],
      timeline: [
        { date: daysAgo(14), event: 'Project created', by: 'system' },
        { date: daysAgo(10), event: 'Quote accepted', by: 'customer' },
        { date: daysAgo(2), event: 'Status changed from accepted to in_progress', by: 'admin' },
      ],
    },
    {
      projectNumber: 'HIO-0007',
      title: 'Garbage Disposal Replacement',
      status: 'in_progress',
      serviceType: 'plumbing',
      description: 'Replace old disposal with new 1/2 HP model. Customer purchased unit already.',
      quoteAmount: 150,
      quoteBreakdown: { labour: 120, materials: 30, other: 0 },
      customer: 6,
      handyman: 0,
      address: '2100 Park Rd, Charlotte, NC 28203',
      scheduledDate: days(0),
      scheduledTime: '2:00 PM',
      estimatedDuration: '1.5 hours',
      timeline: [
        { date: daysAgo(7), event: 'Project created', by: 'system' },
        { date: daysAgo(4), event: 'Quote accepted', by: 'customer' },
        { date: daysAgo(1), event: 'Status changed from accepted to in_progress', by: 'admin' },
      ],
    },
    {
      projectNumber: 'HIO-0008',
      title: 'Drywall Patch and Paint',
      status: 'completed',
      serviceType: 'general',
      description: 'Patch hole from removed TV mount, texture match, and repaint bedroom wall.',
      quoteAmount: 175,
      quoteBreakdown: { labour: 140, materials: 35, other: 0 },
      customer: 7,
      handyman: 1,
      address: '5500 Monroe Rd, Charlotte, NC 28212',
      scheduledDate: daysAgo(1),
      finalAmount: 175,
      payments: [
        { date: daysAgo(1), amount: 175, method: 'check', status: 'completed', type: 'customer' },
        { date: daysAgo(1), amount: 87.50, method: 'venmo', status: 'completed', type: 'handyman' },
      ],
      timeline: [
        { date: daysAgo(10), event: 'Project created', by: 'system' },
        { date: daysAgo(7), event: 'Quote accepted', by: 'customer' },
        { date: daysAgo(2), event: 'Status changed to in_progress', by: 'admin' },
        { date: daysAgo(1), event: 'Job completed', by: 'handyman' },
      ],
    },
    {
      projectNumber: 'HIO-0009',
      title: 'Ceiling Fan Installation (x2)',
      status: 'completed',
      serviceType: 'electrical',
      description: 'Install two ceiling fans in bedrooms. New wiring from attic. Customer provided fans.',
      quoteAmount: 380,
      quoteBreakdown: { labour: 280, materials: 100, other: 0 },
      customer: 8,
      handyman: 1,
      address: '1900 East Blvd, Charlotte, NC 28203',
      scheduledDate: daysAgo(3),
      finalAmount: 420,
      additionalCosts: [
        { description: 'Extra wire and junction box for second room', materialCost: 40, laborCost: 0, totalCost: 40, submittedAt: daysAgo(4) },
      ],
      payments: [
        { date: daysAgo(2), amount: 420, method: 'card', status: 'completed', type: 'customer' },
        { date: daysAgo(1), amount: 210, method: 'zelle', status: 'completed', type: 'handyman' },
      ],
      timeline: [
        { date: daysAgo(14), event: 'Project created', by: 'system' },
        { date: daysAgo(10), event: 'Quote accepted', by: 'customer' },
        { date: daysAgo(4), event: 'Additional cost approved', by: 'admin' },
        { date: daysAgo(3), event: 'Job completed', by: 'handyman' },
      ],
    },
    {
      projectNumber: 'HIO-0010',
      title: 'Bathroom Vanity Install',
      status: 'customer_paid',
      serviceType: 'remodeling',
      description: 'Remove old vanity, install new 36" single-sink vanity. Customer purchased vanity and faucet.',
      quoteAmount: 295,
      quoteBreakdown: { labour: 220, materials: 75, other: 0 },
      customer: 9,
      handyman: 0,
      address: '6400 South Blvd, Charlotte, NC 28217',
      scheduledDate: daysAgo(5),
      finalAmount: 295,
      payments: [
        { date: daysAgo(4), amount: 295, method: 'card', status: 'completed', type: 'customer' },
        { date: daysAgo(3), amount: 147.50, method: 'venmo', status: 'completed', type: 'handyman' },
      ],
      timeline: [
        { date: daysAgo(21), event: 'Project created', by: 'system' },
        { date: daysAgo(14), event: 'Quote accepted', by: 'customer' },
        { date: daysAgo(6), event: 'Job completed', by: 'handyman' },
        { date: daysAgo(3), event: 'Handyman paid', by: 'admin' },
      ],
    },
  ];

  console.log('Creating projects and quotes...');

  const handymanId = (idx) => handymen[idx % handymen.length]._id;

  for (const p of projectData) {
    const addCosts = (p.additionalCosts || []).map((ac) => ({
      ...ac,
      submittedBy: handymanId(p.handyman),
    }));
    const project = await Project.create({
      projectNumber: p.projectNumber,
      title: p.title,
      customerId: customers[p.customer]._id,
      handymanId: handymanId(p.handyman),
      status: p.status,
      description: p.description,
      serviceType: p.serviceType,
      address: p.address,
      quoteAmount: p.quoteAmount,
      quoteBreakdown: p.quoteBreakdown,
      finalAmount: p.finalAmount,
      scheduledDate: p.scheduledDate,
      scheduledTime: p.scheduledTime,
      estimatedDuration: p.estimatedDuration,
      payments: p.payments || [],
      timeline: p.timeline,
      additionalCosts: addCosts,
    });

    // Create quotes for quoted and beyond
    if (['quoted', 'accepted', 'in_progress', 'completed', 'handyman_paid', 'customer_paid'].includes(p.status)) {
      const quoteStatus = p.status === 'quoted' ? 'sent' : 'accepted';
      await Quote.create({
        projectId: project._id,
        customerId: customers[p.customer]._id,
        submittedBy: handymanId(p.handyman),
        lineItems: [
          { description: 'Labor', amount: p.quoteBreakdown.labour },
          { description: 'Materials', amount: p.quoteBreakdown.materials },
          ...(p.quoteBreakdown.other ? [{ description: 'Other', amount: p.quoteBreakdown.other }] : []),
        ],
        totalAmount: p.quoteAmount,
        status: quoteStatus,
        sentAt: p.status !== 'inquiry' ? daysAgo(5) : undefined,
        respondedAt: ['accepted', 'in_progress', 'completed', 'handyman_paid', 'customer_paid'].includes(p.status) ? daysAgo(3) : undefined,
      });
    }
  }

  console.log('\n--- Seed Complete ---');
  console.log('10 projects created with varied statuses:');
  console.log('  - 2 inquiry (painting, plumbing)');
  console.log('  - 2 quoted (electrical, carpentry)');
  console.log('  - 1 accepted (hvac)');
  console.log('  - 2 in_progress (remodeling, plumbing)');
  console.log('  - 2 completed (general, electrical)');
  console.log('  - 1 customer_paid (remodeling)');
  console.log('');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
  process.exit(0);
}

seedProjects().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
