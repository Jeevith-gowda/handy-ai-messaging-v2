# Handy It Out — Project manual (technical reference)

Authoritative technical reference for **schemas**, **routes**, **APIs**, **portals**, and **workflows** as implemented in this repository.

**Also read:** [README.md](./README.md) (quick start), [APP-DESCRIPTION.md](./APP-DESCRIPTION.md) (architecture narrative), [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) (business / UX story for onboarding & AI planning).

---

## 1. Tech stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js **14.2** (App Router), React **18** |
| **Language** | JavaScript only (no TypeScript) |
| **Database** | MongoDB (Mongoose **8**) |
| **Auth** | NextAuth.js (CredentialsProvider, JWT) |
| **Styling** | **Tailwind CSS v4** (`@tailwindcss/postcss`) |
| **AI (optional)** | Groq API — see `lib/ai.js`, `/api/ai/*` (requires `GROQ_API_KEY`) |
| **SMS / external messaging** | OpenPhone / Quo — `lib/quo.js`, `lib/openphone.js`, `/api/quo/*`, webhooks |
| **In-app project chat** | MongoDB `ProjectChat` + `/api/project-chat` |
| **File upload** | Cloudinary — `lib/cloudinary.js`, `/api/upload` |
| **Password hashing** | bcryptjs |
| **PWA** | `manifest.json`, `PWARegister`, Apple web app meta in root `app/layout.jsx` |
| **Hosting** | Vercel-oriented (serverless) |

---

## 2. NPM scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Dev | `npm run dev` | Next.js development server |
| Build / start | `npm run build` / `npm start` | Production |
| Lint | `npm run lint` | ESLint (`eslint-config-next`) |
| Seed users | `npm run seed` | `scripts/seed.js` |
| Seed projects | `npm run seed:projects` | `scripts/seed-projects.js` |

---

## 3. Repository structure

```
handy-it-out/
├── app/
│   ├── layout.jsx                 — Root: globals, viewport (no user zoom), PWA meta, Providers, PWARegister
│   ├── globals.css
│   ├── page.jsx                 — Redirect to /login
│   ├── providers.jsx            — SessionProvider
│   ├── login/page.jsx           — Admin / handyman (email + password)
│   ├── customer/
│   │   ├── layout.jsx           — Auth guard; mobile bottom nav: Projects, Messages, Sign out; desktop header
│   │   ├── page.jsx             — Redirect
│   │   ├── login/page.jsx       — Phone + CUSTOMER_PASSWORD
│   │   ├── dashboard/page.jsx   — Project list hub
│   │   ├── projects/page.jsx    — Projects list (if used)
│   │   ├── projects/[id]/page.jsx — Detail: quotes, accept, chat card, documents, etc.
│   │   ├── messages/page.jsx    — Messages hub / inbox
│   │   ├── messages/[projectId]/page.jsx — Full-height thread (ProjectSchedulingChat thread)
│   │   ├── profile/page.jsx
│   │   └── diy/page.jsx
│   ├── admin/
│   │   ├── layout.jsx           — Sidebar, navbar, auth guard
│   │   ├── dashboard/page.jsx
│   │   ├── projects/page.jsx, projects/[id]/page.jsx
│   │   ├── messages/page.jsx    — Quo / SMS-style conversations (not project chat)
│   │   ├── quotes/page.jsx
│   │   ├── calendar/page.jsx
│   │   ├── price-book/page.jsx
│   │   ├── reports/page.jsx
│   │   ├── payments/page.jsx
│   │   └── team/page.jsx
│   ├── handyman/
│   │   ├── layout.jsx           — Mobile bottom nav: Projects, Messages, Profile; desktop header
│   │   ├── projects/page.jsx, projects/[id]/page.jsx  — Primary job workspace
│   │   ├── messages/page.jsx, messages/[projectId]/page.jsx
│   │   ├── profile/page.jsx
│   │   ├── dashboard/page.jsx   — Legacy (not primary IA)
│   │   ├── jobs/page.jsx, jobs/[id]/page.jsx
│   │   └── calendar/page.jsx
│   └── api/
│       ├── auth/[...nextauth]/route.js
│       ├── auth/register/route.js
│       ├── projects/route.js, projects/[id]/route.js
│       ├── project-chat/route.js
│       ├── customers/route.js, customers/[id]/route.js
│       ├── quotes/route.js, quotes/[id]/route.js
│       ├── users/route.js, users/[id]/route.js
│       ├── messages/route.js, messages/[id]/route.js   — Admin SMS / review pipeline (Message model)
│       ├── upload/route.js
│       ├── ai/draft/route.js, ai/quote/route.js
│       ├── quo/conversations/route.js, quo/messages/route.js
│       └── webhooks/openphone/route.js, webhooks/quo/route.js
├── components/
│   ├── ScheduleManager.jsx          — Lock schedule, reschedule, summary
│   ├── ProjectSchedulingChat.jsx   — Project chat (card + thread variant); respects isChatEnabled
│   ├── AdminSchedulingChat.jsx
│   ├── StatusBadge.jsx
│   ├── Sidebar.jsx, Navbar.jsx
│   ├── CreateProjectModal.jsx, ConfirmModal.jsx, PriceBookModal.jsx
│   ├── ProjectCard.jsx, HandymanCard.jsx, MessageCard.jsx, MetricCard.jsx
│   ├── CustomerProjectsList.jsx
│   └── PWARegister.jsx
├── lib/
│   ├── db.js, auth.js
│   ├── ai.js, cloudinary.js
│   ├── quo.js, openphone.js, messageHandler.js
│   ├── priceBookData.js
│   ├── handymanJobTotals.js       — Display totals for handyman job cards / detail
│   └── customerChatProject.js     — CUSTOMER_CHAT_STATUSES, pickCustomerChatProject
├── models/
│   ├── User.js, Customer.js, Project.js, Quote.js
│   ├── Message.js                 — Admin / SMS pipeline
│   └── ProjectChat.js             — In-app customer ↔ handyman thread
├── scripts/
│   ├── seed.js
│   └── seed-projects.js
├── public/
├── manifest.json
└── .env.local                     — Not committed; see §7
```

---

## 4. Database schemas

### User (`models/User.js`)

- `name`, `email` (unique, lowercase), `password` (hashed on save)
- `role`: `admin` | `handyman`
- `phone`, `skills[]`, `hourlyRate`, `availability` (`available` | `busy` | `off`), `rating`, `paymentDetails` (payout notes string)
- Method: `comparePassword(candidatePassword)`

### Customer (`models/Customer.js`)

- `name`, `phone` (unique where enforced in app), `email`, `address`
- CRM-style fields as implemented: e.g. `totalSpent`, `jobCount`, `notes`, `tags[]`
- Phone normalization to E.164 where applicable (see API/customer flows)

### Project (`models/Project.js`)

| Field | Notes |
|-------|--------|
| `projectNumber` | Unique string |
| `title` | Required |
| `customerId`, `handymanId` | Refs |
| **`status`** | See §8 — full enum |
| **`jobStarted`** | Boolean; set `true` when entering `in_progress` (also used on admin reopen) |
| **`isChatEnabled`** | Boolean, default `true`. Admin toggle; set **`false`** when handyman marks **`completed`** |
| `isRescheduling` | Reschedule negotiation |
| `description`, `serviceType`, `address` | Job site |
| `jobSiteContactName`, `jobSiteContactPhone` | Optional site contact |
| `scheduledDate`, `scheduledTime`, `estimatedDuration` | Scheduling |
| `quoteAmount`, `quoteBreakdown`, `finalAmount` | Money fields |
| `photos[]` | URLs |
| `payments[]` | Recorded payments (admin / status-driven hooks) |
| `timeline[]` | `{ date, event, by }` audit-style log |
| `additionalCosts[]` | `{ description, materialCost, laborCost, totalCost, submittedBy, submittedAt }` |
| `additionalCostsSentToCustomerAt` | When extras were pushed to customer quote flow |
| `customerAcceptedQuoteId` | Latest accepted quote ref |
| `pendingCustomerAcceptance` | Customer must accept pending quote |
| `amountAlreadyPaid` | Used for reopened / partial payment logic |
| `isReopened` | Set when admin reopens a completed job |
| `handymanLedger[]` | `{ description, amount, date, additionalCostId? }` — handyman-side ledger entries |

### Quote (`models/Quote.js`)

- `projectId`, `customerId`, `submittedBy` (User)
- `lineItems[]` — `{ description, amount }`
- `totalAmount`
- **`status`:** `draft` | `handyman_draft` | `sent` | `accepted` | `rejected` | `revised`
- `aiGenerated`, `notes`, `sentAt`, `respondedAt`

### Message (`models/Message.js`)

- Admin / OpenPhone-oriented pipeline: direction, senderType, AI draft fields, `sentText`, delivery `status`, etc.  
- **Not** the same as `ProjectChat`.

### ProjectChat (`models/ProjectChat.js`)

- `projectId`, `senderRole` (`customer` | `handyman`), `senderId`, `text`
- Index: `{ projectId: 1, createdAt: 1 }`
- Used only by **`/api/project-chat`**

---

## 5. Authentication & guards

### Admin & handyman

- **Login:** `/login` — email + password
- **Session:** JWT with `id`, `name`, `email`, `role`
- **Redirects (typical):** admin → `/admin/dashboard`, handyman → `/handyman/projects`
- **Seed credentials:** see `scripts/seed.js` (e.g. admin@handyitout.com / admin123; handymen — check script for exact passwords)

### Customer

- **Provider:** `customer` (CredentialsProvider in `app/api/auth/[...nextauth]/route.js`)
- **Login:** `/customer/login` — phone (normalized to E.164-style) + password matching **`CUSTOMER_PASSWORD`** (env; code falls back to `welcome123` only if unset — do not rely on this in production)
- **Identity:** JWT `id` is the **`Customer`** document `_id` (not `User`)
- **Redirect:** `/customer/dashboard` after sign-in

### Layout guards (behavior summary)

| Layout | Unauthenticated | Wrong role |
|--------|-----------------|------------|
| **Admin** | → `/login` | Handyman → `/handyman/projects` |
| **Handyman** | → `/login` | — |
| **Customer** | → `/customer/login` | Admin → `/admin/dashboard`, handyman → `/handyman/projects` |

---

## 6. Project lifecycle (`Project.status`)

Typical happy path:

| Step | `status` | Notes |
|------|-----------|--------|
| 1 | `inquiry` | Project created; handyman can draft quote |
| 2 | `quoted_by_handyman` | Handyman submits quote (`handyman_draft`) |
| 3 | `pending_customer_approval` | Admin sends quote (`sent`); `pendingCustomerAcceptance` |
| 4 | `active` | Customer `acceptQuote` on `PUT /api/projects/[id]` |
| 5 | `scheduled` | Handyman `lockSchedule` (first lock from `active` without date) |
| 6 | `in_progress` | Handyman **start job** — API requires `scheduledDate`, not in bad reschedule state; from `scheduled` or legacy `active` + date |
| 7 | `completed` | Handyman marks complete — API sets **`isChatEnabled: false`** |
| — | `handyman_paid`, `customer_paid` | Admin bookkeeping (optional) |

### Admin reopen (completed → active)

- **Condition:** `PUT` with `reopenJob: true`, `reason` (required), project `status === 'completed'`, session **admin**
- **Effect:** `status: 'active'`, `jobStarted: true`, `isReopened: true`, **`isChatEnabled: true`**, `amountAlreadyPaid` preserved/derived from customer payments, timeline entry

---

## 7. In-app project chat (`/api/project-chat`)

### Eligible statuses (thread exists in API)

- **`active`**, **`scheduled`**, **`in_progress`**, **`completed`**
- If `status` is anything else, **`GET`** returns **`[]`** (empty list).

### `isChatEnabled`

- **`GET`:** Does **not** strip messages when `isChatEnabled === false` — clients can still load history for read-only UI.
- **`POST`:** Rejects new messages with **400** if `isChatEnabled === false` (“paused by Admin” style error).
- **UI:** `ProjectSchedulingChat` treats `isChatEnabled === false` as **no composer**; banner text depends on `project.status === 'completed'` vs admin pause.

### Roles

- **Customer / handyman:** must be the project’s customer or assigned handyman to read/write.
- **Admin:** can **GET** messages for any project (read-only via this API); **POST** is not allowed for admin on this route (only customer/handyman send).

### Polling (typical)

- `ProjectSchedulingChat` polls messages ~**5s**
- Customer project detail / messages pages may poll **`GET /api/projects/[id]`** ~**5s** to refresh `isChatEnabled` and status

### Distinction from admin SMS

- **Admin `/admin/messages`** + **`/api/quo/*`** = external SMS / Quo pipeline  
- **Project chat** = MongoDB `ProjectChat` only

**Shared constant (customer inbox helpers):** `lib/customerChatProject.js` — `CUSTOMER_CHAT_STATUSES` matches the API list above.

---

## 8. Scheduling (`ScheduleManager` + `PUT /api/projects/[id]`)

- **`lockSchedule`:** `{ scheduledDate, scheduledTime }` + `updatedBy`
  - First lock from **`active`** without date → **`scheduled`**
  - Reschedule path: when `isRescheduling`, locking updates slot and clears `isRescheduling`
- **Request reschedule:** customer or handyman (when allowed) sets `isRescheduling: true` + timeline
- **Surfaces:**
  - Inline: `app/handyman/projects/[id]/page.jsx`
  - Modal: `app/handyman/messages/[projectId]/page.jsx`
- **Admin:** `adminOverrideReschedule` body (see route) for forced schedule updates

---

## 9. Quoting (summary)

1. Admin creates project (`inquiry` / assigns handyman).
2. Handyman creates quote → **`handyman_draft`**, project → **`quoted_by_handyman`**.
3. Admin sends to customer → quote **`sent`**, project → **`pending_customer_approval`**, `pendingCustomerAcceptance: true`.
4. Customer **`acceptQuote: true`** → **`active`**, `customerAcceptedQuoteId`, ledger entries for base pay / additional lines per API logic.
5. Revised quotes: new **`sent`** quote may set `pendingCustomerAcceptance` again; customer UI shows accept flow for active work.

---

## 10. Additional costs

- Handyman submits **`addAdditionalCost`** on **`PUT /api/projects/[id]`** while **`in_progress`** (assigned handyman only).
- Pushes to `project.additionalCosts[]`, clears `additionalCostsSentToCustomerAt` as implemented, timeline entry.
- Admin/customer flows integrate extras into quotes / line items (see admin project detail & quote APIs).

---

## 11. Portal permissions (action matrix)

| Action | Admin | Handyman | Customer |
|--------|-------|----------|----------|
| View project (role-scoped) | ✓ all | ✓ assigned | ✓ own |
| Project chat **GET** (history) | ✓ | ✓ assigned | ✓ own |
| Project chat **POST** (send) | — | ✓ assigned | ✓ own (if `isChatEnabled` & status allowed) |
| **Pause / enable chat** (`isChatEnabled`) | ✓ (`PUT` dedicated branch) | — | — |
| **Mark complete** → `isChatEnabled: false` | — | ✓ (API enforces) | — |
| Lock schedule | Override ✓ | ✓ | — |
| Request reschedule | — | ✓ | ✓ |
| Reopen completed job | ✓ (`reopenJob` + `reason`) | — | — |
| Record internal payments | ✓ | — | — |

---

## 12. UX notes (mobile-first)

- **Root viewport** (`app/layout.jsx`): `maximumScale: 1`, `userScalable: false`, `viewportFit: cover` — reduces accidental zoom; app-like feel.
- **Handyman:** bottom nav **Projects | Messages | Profile** (`md:hidden`); desktop top header.
- **Customer:** bottom nav **Projects | Messages | Sign out**; desktop **My Projects | Messages** + sign out.
- **Handyman privacy:** customer phone not shown on handyman project UI; maps link from `project.address`.
- **Handyman payments:** no full ledger/payment dashboard in v1; profile may store **payout instructions**.

---

## 13. API routes (inventory)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth |
| POST | `/api/auth/register` | Registration (as implemented) |
| GET | `/api/projects` | List projects (role-filtered) |
| GET/PUT | `/api/projects/[id]` | Single project: status, `lockSchedule`, `acceptQuote`, reschedule, `addAdditionalCost`, `addPayment`, `reopenJob`, `isChatEnabled`, admin overrides, … |
| GET/POST | `/api/project-chat` | `ProjectChat` list + create |
| GET/POST | `/api/quotes` | Quotes; query `projectId` for handyman history |
| GET/PATCH/… | `/api/quotes/[id]` | Single quote |
| GET/POST | `/api/customers` | Customers |
| GET/PUT/… | `/api/customers/[id]` | Single customer |
| GET/POST | `/api/users` | Users (admin/handyman directory) |
| GET/PUT/… | `/api/users/[id]` | Single user |
| GET/POST | `/api/messages` | Admin `Message` pipeline |
| GET/PATCH/… | `/api/messages/[id]` | Single admin message |
| POST | `/api/upload` | Cloudinary upload |
| POST | `/api/ai/draft`, `/api/ai/quote` | AI assist (Groq) |
| GET/POST | `/api/quo/conversations`, `/api/quo/messages` | Quo integration |
| POST | `/api/webhooks/openphone`, `/api/webhooks/quo` | Webhooks |

*For exact body shapes and guards, read the corresponding `route.js` files.*

---

## 14. Environment variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | Canonical app URL (e.g. `http://localhost:3000`) |
| `CUSTOMER_PASSWORD` | Shared password for customer portal login |
| `GROQ_API_KEY` | Groq (AI routes) |
| `QUO_*` / `OPENPHONE_*` | External SMS (see `lib/quo.js`, `lib/openphone.js`) |
| `CLOUDINARY_*` | Image upload |

---

## 15. Status & flags (quick reference)

### Project `status` enum (canonical)

`inquiry`, `quoted_by_handyman`, `pending_customer_approval`, `active`, `scheduled`, `in_progress`, `completed`, `handyman_paid`, `customer_paid`

### Quote `status` enum

`draft`, `handyman_draft`, `sent`, `accepted`, `rejected`, `revised`

### Chat-related

- **`isChatEnabled`:** `false` disables **sending**; UI read-only banner; set `false` on **handyman complete**; admin can toggle; reopen sets `true`.
- **`isRescheduling`:** true while negotiating a new slot after a date exists.

---

## 16. Admin sidebar

- Navigation entries: Dashboard, Projects, Messages, Quotes, Calendar, **Price Book**, **Reports**, Payments, Team (`components/Sidebar.jsx`).
- Collapse preference: `localStorage` key **`sidebar-collapsed`**.

---

## 17. Related documentation

| File | Contents |
|------|----------|
| [README.md](./README.md) | Quick start, scripts, route cheat sheet |
| [APP-DESCRIPTION.md](./APP-DESCRIPTION.md) | Product / portal description |
| [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) | Business logic & UX narrative for humans / AI |

---

*This manual is meant to stay aligned with the codebase. If behavior changes, update the relevant section and the linked product docs.*
