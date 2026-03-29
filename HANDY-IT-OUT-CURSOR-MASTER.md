# HANDY IT OUT — Master Build Document for Cursor

> **Note (V1):** This file is a **historical / build spec**. For the **current** product overview see **[APP-DESCRIPTION.md](./APP-DESCRIPTION.md)**; for **schemas, routes, and workflows** see **[PROJECT-MANUAL.md](./PROJECT-MANUAL.md)**. Status enums and folder paths here may be outdated.

## OVERVIEW
Build a handyman service management platform called "Handy It Out" using Next.js 14 (App Router), MongoDB Atlas, Tailwind CSS, Groq AI, and OpenPhone. Plain JavaScript only — NO TypeScript.

The platform connects: Admin (manages everything), Handymen (see their jobs), and Customers (interact only via text messages through OpenPhone). An AI agent powered by Groq sits at the center — it drafts contextual replies to customer texts, generates quotes, and coordinates between customers and handymen. Admin reviews and approves AI drafts before they're sent (semi-automated).

---

## TECH STACK — CRITICAL DETAILS

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14+ (App Router) | JavaScript only, NO TypeScript. Use .js and .jsx extensions. |
| Database | MongoDB Atlas | Connection string in MONGODB_URI env var |
| ODM | Mongoose | Cache connection globally to avoid reconnects |
| Auth | NextAuth.js | CredentialsProvider, JWT strategy, role in session |
| AI | Groq API | URL: https://api.groq.com/openai/v1/chat/completions — Model: llama-3.3-70b-versatile — This is GROQ (groq.com), NOT Grok/xAI. OpenAI-compatible format. |
| SMS | OpenPhone API | Webhooks for inbound, REST API for outbound |
| Styling | Tailwind CSS | Mobile-first for handyman portal |
| Hosting | Vercel | Serverless API routes |
| Password | bcryptjs | Hash on save with pre-save hook |

---

## ENVIRONMENT VARIABLES (.env.local)
```
MONGODB_URI=mongodb+srv://fixitadmin:PASSWORD@fixit-pro.mdmseok.mongodb.net/handy-it-out?appName=fixit-pro
NEXTAUTH_SECRET=generate-a-random-string-here
NEXTAUTH_URL=http://localhost:3000
GROQ_API_KEY=user-will-fill-this
OPENPHONE_API_KEY=user-will-fill-this
OPENPHONE_WEBHOOK_SECRET=user-will-fill-this
OPENPHONE_PHONE_NUMBER=user-will-fill-this
```

---

## DATABASE SCHEMAS (Mongoose Models)

### User.js
```
name: String, required
email: String, required, unique, lowercase
password: String, required (hashed with bcryptjs via pre-save hook)
role: String, enum ['admin', 'handyman'], default 'handyman'
phone: String
skills: [String] — e.g. ['plumbing', 'electrical', 'carpentry', 'painting', 'general', 'remodeling']
hourlyRate: Number
availability: String, enum ['available', 'busy', 'off'], default 'available'
rating: Number, default 5
timestamps: true

Methods: comparePassword(candidatePassword) — uses bcrypt.compare
Pre-save hook: hash password if modified
```

### Customer.js
```
name: String, default 'Unknown'
phone: String, required, unique
email: String
address: String
totalSpent: Number, default 0
jobCount: Number, default 0
notes: String
tags: [String] — e.g. ['vip', 'rental-owner', 'repeat']
timestamps: true
```

### Project.js
```
title: String, required
customerId: ObjectId, ref 'Customer', required
handymanId: ObjectId, ref 'User'
status: String, enum ['inquiry', 'quoted', 'accepted', 'in_progress', 'completed', 'paid'], default 'inquiry'
description: String
serviceType: String, enum ['plumbing', 'electrical', 'carpentry', 'painting', 'general', 'remodeling', 'hvac', 'other']
address: String — job site address (may differ from customer address)
scheduledDate: Date
scheduledTime: String
estimatedDuration: String
quoteAmount: Number
finalAmount: Number
photos: [String] — URLs
timeline: [{
  date: Date (default Date.now),
  event: String,
  by: String — who did this (admin name, handyman name, 'AI', 'system')
}]
timestamps: true
```

### Message.js
```
customerId: ObjectId, ref 'Customer', required
projectId: ObjectId, ref 'Project'
handymanId: ObjectId, ref 'User' — if this message is to/from a handyman
direction: String, enum ['inbound', 'outbound'], required
senderType: String, enum ['customer', 'handyman', 'admin', 'ai']
originalText: String — the raw incoming message
aiDraft: String — AI-generated response
editedText: String — if admin edited the draft
sentText: String — final text that was actually sent
status: String, enum ['pending_review', 'approved', 'sent', 'failed', 'skipped'], default 'pending_review'
aiReasoning: String — why AI drafted this response
confidence: Number — 0 to 100
openphoneMessageId: String — for tracking
timestamps: true
```

### Quote.js
```
projectId: ObjectId, ref 'Project', required
customerId: ObjectId, ref 'Customer'
lineItems: [{
  description: String,
  amount: Number
}]
totalAmount: Number
status: String, enum ['draft', 'sent', 'accepted', 'rejected', 'revised'], default 'draft'
aiGenerated: Boolean, default false
notes: String
sentAt: Date
respondedAt: Date
timestamps: true
```

---

## PROJECT FOLDER STRUCTURE
```
handy-it-out/
├── app/
│   ├── layout.jsx                          — Root layout
│   ├── page.jsx                            — Redirect to /login
│   ├── login/page.jsx                      — Login form
│   ├── admin/
│   │   ├── layout.jsx                      — Sidebar + top navbar wrapper
│   │   ├── dashboard/page.jsx              — KPI cards, AI notification bar, recent activity
│   │   ├── projects/
│   │   │   ├── page.jsx                    — Project list with filters + search
│   │   │   └── [id]/page.jsx              — Project detail (status flow, timeline, quotes, messages)
│   │   ├── messages/page.jsx               — AI message review queue (pending/sent/all)
│   │   ├── quotes/page.jsx                 — All quotes with filters
│   │   ├── calendar/page.jsx               — Team-wide weekly calendar
│   │   └── team/page.jsx                   — Manage handymen (cards, add, edit)
│   ├── handyman/
│   │   ├── layout.jsx                      — Mobile bottom tab nav
│   │   ├── dashboard/page.jsx              — My jobs (today + upcoming)
│   │   ├── calendar/page.jsx               — Personal weekly schedule
│   │   └── profile/page.jsx               — Edit info, toggle availability
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.js      — NextAuth config
│       │   └── register/route.js           — Create new user (admin only)
│       ├── customers/
│       │   ├── route.js                    — GET list / POST create
│       │   └── [id]/route.js              — GET one / PUT update
│       ├── projects/
│       │   ├── route.js                    — GET list (with populate) / POST create
│       │   └── [id]/route.js              — GET one / PUT update / DELETE
│       ├── messages/
│       │   ├── route.js                    — GET list (filter by customerId/projectId) / POST create
│       │   └── [id]/route.js              — PUT update (approve, edit, skip)
│       ├── quotes/
│       │   ├── route.js                    — GET list / POST create
│       │   └── [id]/route.js              — PUT update
│       ├── users/
│       │   ├── route.js                    — GET list (filter by role)
│       │   └── [id]/route.js              — PUT update (not password/role)
│       ├── webhooks/
│       │   └── openphone/route.js          — Receive incoming texts from OpenPhone
│       └── ai/
│           ├── draft/route.js              — Generate AI response draft
│           └── quote/route.js              — Generate AI quote
├── lib/
│   ├── db.js                               — Mongoose connection with global caching
│   ├── ai.js                               — Groq API wrapper (generateAIDraft, generateQuote, extractCustomerInfo)
│   ├── openphone.js                        — OpenPhone API helper (sendMessage, parseWebhook)
│   ├── auth.js                             — getSession, requireAuth, requireAdmin helpers
│   └── messageHandler.js                   — Shared logic for processing incoming messages
├── models/
│   ├── User.js
│   ├── Customer.js
│   ├── Project.js
│   ├── Message.js
│   └── Quote.js
├── components/                             — Shared UI components
│   ├── Sidebar.jsx
│   ├── Navbar.jsx
│   ├── MetricCard.jsx
│   ├── StatusBadge.jsx
│   ├── MessageCard.jsx
│   ├── ProjectCard.jsx
│   ├── HandymanCard.jsx
│   └── ... (more as needed)
├── scripts/
│   └── seed.js                             — Seed DB with test data
├── .env.local
├── package.json
└── tailwind.config.js
```

---

## API ROUTE DETAILS

All routes use JSON. Protected routes check session via NextAuth.

### Auth
- POST /api/auth/register — Create user (admin only). Hash password with bcryptjs.
- NextAuth handles /api/auth/[...nextauth] — CredentialsProvider, email+password, returns {id, name, email, role} in session via JWT callbacks.

### Customers
- GET /api/customers — List all. Optional query: ?search=name
- POST /api/customers — Create. Body: {name, phone, address, notes}
- GET /api/customers/[id] — Get one with populated projects
- PUT /api/customers/[id] — Update fields

### Projects
- GET /api/projects — List all, populate customerId and handymanId. Optional queries: ?status=, ?handymanId=, ?customerId=
- POST /api/projects — Create. Auto-add timeline entry "Project created". Body: {title, customerId, handymanId, description, serviceType, scheduledDate, scheduledTime, quoteAmount}
- GET /api/projects/[id] — Get one, fully populated
- PUT /api/projects/[id] — Update. If status changes, auto-append timeline entry. Body: any project fields.

### Messages
- GET /api/messages — List. Required filter: ?customerId= or ?projectId= or ?status=pending_review
- POST /api/messages — Create. Body: {customerId, projectId, direction, originalText, senderType}
- PUT /api/messages/[id] — Update status, sentText, etc. When status changes to 'approved': trigger OpenPhone send if configured.

### Quotes
- GET /api/quotes — List, populate projectId and customerId. Optional: ?status=, ?projectId=
- POST /api/quotes — Create. Body: {projectId, customerId, lineItems, totalAmount, notes}
- PUT /api/quotes/[id] — Update status, line items, etc.

### Users
- GET /api/users — List. Optional: ?role=handyman. Include count of active projects per user.
- PUT /api/users/[id] — Update fields (NOT password or role).

### AI
- POST /api/ai/draft — Body: {messageId}. Fetches full context, calls Groq, updates message with aiDraft/aiReasoning/confidence.
- POST /api/ai/quote — Body: {projectId}. Fetches context + similar past projects, calls Groq, creates Quote document.

### Webhooks
- POST /api/webhooks/openphone — Receives OpenPhone webhook. No auth (but validate webhook secret if set). Process: find/create customer by phone → find active project → create Message → call AI draft → return 200.

---

## AI AGENT DESIGN

### System Prompt for Groq
```
You are the AI assistant for "Handy It Out", a professional handyman services company. You help manage customer communications via text message.

Your capabilities:
- Draft professional, friendly text message responses to customers
- You have full context about each customer, their projects, assigned handymen, and scheduling
- Be helpful, specific, and concise — these are SMS text messages, keep them natural
- Always reference specific details when available (customer name, project details, handyman name, scheduled times)
- For new customers: ask qualifying questions (address, photos, details about the issue)
- For returning customers: acknowledge their history and provide personalized service

Rules:
- Never make up information. Only reference data provided in the context.
- If you don't have enough info to answer, say so and ask the right questions.
- Keep messages under 300 characters when possible (SMS friendly).
- Be warm but professional.
- When generating quotes, base them on the pricing history provided.
```

### Context Object sent to Groq
```json
{
  "customer": { "name", "phone", "address", "totalSpent", "jobCount", "notes" },
  "currentProject": { "title", "status", "description", "serviceType", "handyman", "scheduledDate" },
  "assignedHandyman": { "name", "phone", "skills", "availability" },
  "recentMessages": [ last 10 messages for this customer ],
  "pricingHistory": [ similar past quotes for this service type ],
  "availableHandymen": [ handymen with matching skills who are available ],
  "businessRules": "Service area: Charlotte NC metro. Hours: 8am-6pm Mon-Sat. Emergency surcharge: 50%."
}
```

### AI Functions in lib/ai.js
1. **generateAIDraft(customerMessage, context)** → { draft, reasoning, confidence }
2. **generateQuote(jobDescription, context)** → { lineItems, totalAmount, reasoning }
3. **extractCustomerInfo(messageText)** → { name, address, issueDescription } — for auto-filling customer profiles

---

## UI DESIGN GUIDELINES

### Admin Dashboard
- Top: AI notification bar showing pending message count with "Review now" button
- Metric cards row: Active projects, Pending quotes, Monthly revenue, Avg response time
- Two-column layout: Recent messages (left), Active projects (right)
- Bottom: Handymen overview cards

### Message Review Queue (most important screen)
- Tabs: Pending Review (with count badge), Sent Today, All Messages
- Each message card shows:
  - Customer avatar (initials) + name + phone
  - Badge: "New lead" or "Returning" based on history
  - Context strip: customer history, similar job pricing, suggested handyman + availability
  - Customer's original message (gray box)
  - AI-drafted reply (blue-bordered box)
  - AI reasoning (small italic text)
  - Confidence bar (0-100%)
  - Actions: Approve & Send (green), Edit First (outline), Skip (text)
- "Edit First" opens editable textarea with Save & Send / Cancel

### Project Detail
- Status flow bar: inquiry → quoted → accepted → in_progress → completed → paid
- Two columns: Customer info + Quote breakdown (left), Handyman info + Schedule (right)
- Full width below: Project timeline + Conversation log

### Team Calendar
- Weekly grid, handymen color-coded
- Filter toggles per handyman
- Summary cards showing workload + open slots

### Handyman Portal (mobile-first)
- Bottom tab nav: My Jobs, Calendar, Messages, Profile
- Today's jobs with action buttons: Mark Complete, Add Note, Upload Photo, Get Directions
- Simple, no clutter — designed for phone use on job sites

### Status Badge Colors
- inquiry: yellow/amber
- quoted: blue
- accepted: purple
- in_progress: green
- completed: gray
- paid: emerald/teal

---

## BUILD PHASES — Execute in order, test each before moving on

### Phase 1: Foundation
Create the Next.js project, install dependencies (mongoose, next-auth, bcryptjs), set up MongoDB connection in lib/db.js with global caching, create all 5 Mongoose models in models/ folder, set up NextAuth with CredentialsProvider and role-based JWT callbacks, create login page at app/login/page.jsx, create seed script at scripts/seed.js (1 admin: admin@handyitout.com/admin123, 3 handymen with realistic data, 3 customers, 3 projects at different statuses), make root page.jsx redirect to /login.
TEST: Run seed, login as admin redirects to /admin/dashboard (404 is fine), login as handyman redirects to /handyman/dashboard.

### Phase 2: Admin layout + dashboard
Create app/admin/layout.jsx with sidebar nav (Dashboard, Projects, Messages, Quotes, Calendar, Team) and top navbar (logo "Handy It Out" + user avatar). Create dashboard page fetching real data from API routes. Create all placeholder pages so no 404s. Protect all admin routes — redirect to /login if not authenticated.
TEST: Dashboard shows real metric numbers, all sidebar links work without 404s.

### Phase 3: Project management
Build projects list page with status filter tabs, search bar, and "New Project" button. Build create project form (select customer or create new, select handyman, fill details). Build project detail page with status flow bar, customer card, handyman card, quote section, timeline with "Add Update" form, and conversation log.
TEST: Create a project, view it, advance its status, see timeline update.

### Phase 4: Team management
Build team page with handyman cards grid (avatar, name, skills tags, rate, availability badge, active project count). Add "Add Handyman" form (creates user via /api/auth/register). Add edit functionality for each handyman. Create GET/PUT /api/users routes.
TEST: Add a handyman, edit their skills, verify active project count.

### Phase 5: Quotes system
Build quotes list page with status filter tabs. Build create quote form with dynamic line items (add/remove rows, auto-total). Link quotes to projects. Show quotes on project detail page.
TEST: Create a quote, see it on the project detail, change its status.

### Phase 6: Handyman portal
Build app/handyman/layout.jsx with mobile-friendly bottom tab navigation. Build dashboard showing today's and upcoming jobs for the logged-in handyman. Add action buttons on jobs (mark complete, add note, upload photo). Build personal calendar view. Build profile page with availability toggle. Update login to redirect handymen here.
TEST: Login as handyman, see assigned jobs, mark complete, toggle availability.

### Phase 7: AI integration
Build lib/ai.js with Groq API wrapper. Implement generateAIDraft (takes message + context, returns draft/reasoning/confidence). Implement generateQuote (takes job description + pricing history). Implement extractCustomerInfo (parse customer details from messages). Build /api/ai/draft and /api/ai/quote endpoints. IMPORTANT: Groq URL is https://api.groq.com/openai/v1/chat/completions, model is llama-3.3-70b-versatile.
TEST: Hit /api/ai/draft with a test message, verify contextual response.

### Phase 8: Message system + review queue
Build messages page with Pending/Sent/All tabs. Build message cards with full UI (customer info, context strip, AI draft, reasoning, confidence, actions). Implement approve/edit/skip flow. Add "Generate AI Draft" button for messages without drafts. Show pending count badge in admin sidebar. Add "Simulate Incoming" test form.
TEST: Simulate a message, generate AI draft, approve it, see status change.

### Phase 9: OpenPhone integration
Build webhook receiver at /api/webhooks/openphone (parse OpenPhone payload, find/create customer, create message, auto-generate AI draft). Build lib/openphone.js (sendTextMessage function using OpenPhone API). Wire up approve flow: when admin approves → send via OpenPhone → update status to 'sent'. Handle errors gracefully — if OpenPhone not configured, still mark as sent for testing. Implement phone number normalization for customer matching.
TEST: Real text to OpenPhone number → appears in review queue → approve → customer receives reply.

### Phase 10: Deploy + polish
Deploy to Vercel (vercel CLI or GitHub integration). Set all env vars in Vercel dashboard. Point OpenPhone webhook to production URL. Test end-to-end in production. Mobile responsive fixes. Bug fixes.

---

## COMMON PITFALLS TO AVOID
1. Using TypeScript — this project is JavaScript only
2. Using Grok (xAI) instead of Groq — the API URL is api.groq.com, model is llama-3.3-70b-versatile
3. Forgetting 'use client' on interactive components (forms, filters, modals)
4. Not populating references in Mongoose queries (always populate customerId, handymanId)
5. Not normalizing phone numbers before customer lookup (strip +1, spaces, dashes)
6. Making the handyman portal desktop-first — it must be mobile-first
7. Not caching the MongoDB connection — leads to connection pool exhaustion on Vercel
