# Handy It Out — Product Overview

This document explains **what we’re building**, **who it’s for**, **how a job moves through the system**, and **why the product feels the way it does**. It’s written for humans, new engineers, and AI systems that need to reason about our business model and future integrations (for example, an **“AI Mind”** that assists with quotes, scheduling, or operations).

---

## 1. The Core Concept

**Handy It Out** is an operations platform for a handyman-style service business. Think of it as the **single place** where the office (admin), the people doing the work (handymen), and the homeowners (customers) stay aligned—without everyone living in a mess of texts, voicemails, and spreadsheets.

### What problem does it solve?

Real handyman businesses struggle with the same gaps:

- **Information scatters** — The customer said something to the dispatcher, the handyman has a different note, and nobody sees the same version of “what we agreed to.”
- **Status is fuzzy** — Is this job quoted? Waiting on the customer? Scheduled? Actually on site? Paid? Different people guess differently.
- **Coordination is painful** — Scheduling and small talk often happen in personal SMS threads that the business doesn’t control, can’t search, and can’t hand off when someone’s off shift.

**Handy It Out** fixes that by tying every conversation and state change to a **Project** record with a **clear lifecycle**. The app doesn’t replace every phone call overnight, but it **anchors** the job: quotes, acceptance, schedule, in-job updates, and completion all hang off one thread of truth.

### Ultimate vision (where we’re headed)

Short term, we’re shipping a **credible v1**: three portals, a strict status pipeline, in-app chat between customer and handyman, and admin tools to run the business.

Longer term, the vision is **Handy It Out as the nervous system of the operation**—something an **AI Mind** can plug into: it would read the same projects, timelines, and messages humans see; suggest or draft quotes; flag stuck jobs; summarize threads; and eventually help route work and answer “what’s the state of job #1042?” without someone digging through five apps.

This overview describes **today’s product behavior** so that architecting that AI layer stays grounded in real permissions, statuses, and UX constraints.

---

## 2. The Three Portals

The product is **one codebase, three experiences**. Each role signs in differently and should feel like they’re using **their** app—not a bloated “enterprise dashboard” unless you’re the admin.

### Admin

**Role in the business:** Runs the shop. Creates work, quality-checks pricing, talks to customers when needed, keeps the calendar honest, and tracks money flowing in and out.

**Mindset we design for:** *“I need to see everything that matters, act fast, and not lose track of a job.”*

**Permissions (conceptually):**

- Full visibility into **customers**, **projects**, **quotes**, **team (handymen)**, **calendar**, and **internal payment tracking**.
- Can **create and edit projects**, assign handymen, move quotes through review, **send quotes to customers**, override schedules, **pause in-app chat** on a project (`isChatEnabled`), and **reopen completed jobs** for rework (with a logged reason).
- Can **manage directory accounts** from the **Users** area: **Handymen** (staff who sign in with email at `/login`) and **Customers** (records used for the customer portal). Admins can **add** and **edit** name, email, phone, and **set or change passwords** (stored hashed). Creating a handyman is separate from day-to-day **Team** workflows but uses the same underlying staff user type.
- Uses **separate tooling** for SMS / external messaging (e.g. Quo / OpenPhone style queues)—that’s **not** the same channel as the customer↔handyman **project chat**.

**Important detail:** The admin is the **gate** between “handyman drafted a number” and “customer sees a formal quote.” Customers don’t get pulled into the handyman’s draft; the business sends something reviewed and intentional.

### Handyman

**Role in the business:** Does the visit, owns the relationship on site, and updates the job as reality unfolds.

**Mindset we design for:** *“I’m on my phone, maybe gloves on, maybe in a van—I need big buttons, obvious next steps, and one inbox for all my customer threads.”*

**Permissions (conceptually):**

- Only **assigned** projects. Cannot browse arbitrary customers or other handymen’s jobs.
- Can **submit quotes** (into an internal draft state until admin sends them), **lock the schedule** when the customer is ready, **start the job** when policy allows, **add photos and notes**, **record additional costs** while the job is in progress, and **mark the job completed**.
- **In-app project chat** with **their** customers on assigned jobs—centralized in a **Messages** inbox, not buried inside each project card only.
- **Does not** see the customer’s phone number in the UI by design—we steer coordination through **in-app messaging** and **address / maps** links so the business keeps a consistent channel.

**What we deliberately don’t emphasize in v1:** A rich “my payments and ledger” app for the handyman. The business still records payments on the admin side; the handyman profile may hold **payout instructions** for back office, not a full financial dashboard.

### Customer

**Role in the business:** The homeowner. They need to **say yes to price**, **know when someone’s coming**, and **ask quick questions** without learning your internal tools.

**Mindset we design for:** *“This should feel like a simple consumer app—my jobs, my messages, nothing scary.”*

**Permissions (conceptually):**

- Logs in with **phone** and a **password**. By default the business configures a **single shared portal password** (environment configuration). If an admin has set a **per-customer password** on that customer’s record, that **individual** password is used instead—so support can onboard a customer with their own secret without changing the global default for everyone.
- Sees **only their** projects. Can **accept quotes** when the business has sent one, use **project chat** with the assigned handyman, and **request reschedules** when the product allows.
- Does **not** assign handymen, change internal statuses, or access admin SMS queues.

**UX alignment:** Like the handyman app, the customer area uses a **mobile-first shell** with **Projects** and **Messages** as first-class tabs so chatting doesn’t feel like an afterthought.

---

## 3. The Lifecycle of a Job

Here’s the **story of one project**, end to end, in the order the system understands it. Status names match **`Project.status`** in the database.

### Chapter A — Inquiry and assignment

1. **Admin creates a project** (usually **`inquiry`**). It’s tied to a **customer** record, has a title, address, description, service type, and optionally an internal estimate. **Customer** profiles can also be **created or maintained** from **Admin → Users → Customers** (phone, email, login password) so portal access exists before or alongside project work.
2. **Admin assigns a handyman** when ready. The handyman now sees the job in **their** project list.

*At this stage, the customer hasn’t necessarily been sent a formal dollar amount through the “send quote” flow yet—that depends on how the shop runs the job.*

### Chapter B — Handyman quotes, admin reviews

3. The **handyman builds a quote** (line items, total). Submitting it moves the project toward **`quoted_by_handyman`** and stores quote data as a **handyman draft** until the office is happy with it.
4. **Admin reviews** and, when appropriate, **sends the quote to the customer**. The quote becomes **`sent`**, and the project moves to **`pending_customer_approval`** with a flag that the customer needs to accept.

*Business logic intent: the field doesn’t bypass the office. The customer sees something the business chose to release.*

### Chapter C — Customer acceptance and “the job is live”

5. The **customer accepts the quote** (from their portal). The project becomes **`active`**. The accepted quote is recorded; timeline and ledger hooks run as implemented in the API.
6. **In-app project chat** is available for **active, scheduled, in progress, and completed** statuses (subject to **`isChatEnabled`**—see below). This is the **WhatsApp-style thread** between **that customer** and **that handyman** only, stored as **ProjectChat** messages.

*This is the phase where “what time works?” actually happens in the product, alongside texts in the real world if needed.*

### Chapter D — Scheduling and reschedule

7. Someone (typically **handyman** with customer agreement) **locks the schedule**: date and time go on the project. First-time lock from **`active`** moves the job to **`scheduled`**.
8. If plans change, **customer or handyman** can **request a reschedule** when the rules allow. The system sets an **`isRescheduling`** flag and both sides can coordinate in chat until the handyman **locks a new slot** (which clears reschedule mode).

*Admin can also force schedule corrections via override when needed—operations aren’t hostage to a stuck UI state.*

### Chapter E — On site: in progress and extra work

9. When policy allows (scheduled date exists, not stuck in a bad reschedule state, etc.), the handyman **starts the job**. The project becomes **`in_progress`**; **`jobStarted`** stays aligned for reporting.
10. **Additional costs** (materials, labor for scope creep) can be added **while in progress**. Those feed admin workflow: revised quotes, customer acceptance paths, and line items as your implementation defines—so “we had to replace a rotten subfloor” becomes **documented and billable**, not a vague memory.

### Chapter F — Completion and closing the loop

11. The handyman **marks the job completed**. The project becomes **`completed`**. The API also sets **`isChatEnabled`** to **`false`**—the **same switch** the admin uses to pause chat—so the **composer disappears** and users see a **read-only** state with messaging like *“This project is completed. Chat is closed.”* (If chat was turned off earlier by admin only, copy explains **admin pause** instead.)
12. **Post-completion bookkeeping** (optional statuses like **`handyman_paid`** / **`customer_paid`**) is **admin-driven**—internal accounting, not a second consumer app for the handyman in v1.

### Epilogue — Rework

If something was wrong after completion, **admin can reopen** the job from **`completed`**. That puts the project back to **`active`**, marks it as reopened for tracking, and **turns chat back on** so coordination can resume. The timeline records **why** it was reopened.

---

## 4. UI/UX Philosophy

We’re not building a traditional “resize your browser” admin tool only. **Handy It Out** is deliberately **mobile-first** for the people in the field and on the couch—while admin stays powerful on desktop.

### Native-app feel in the browser

- **Viewport discipline:** The root layout locks **`maximumScale: 1`** and **`userScalable: false`** so we don’t get accidental pinch-zoom on iPhone that makes the UI feel like a broken website. We want **stable typography and tap targets**, like a installed app.
- **Shell layout:** Handyman and customer areas use **bottom tab bars** on small screens (Projects / Messages / Profile patterns) so thumb reach and mental models match **iOS and Android** conventions.
- **Touch-first controls:** Primary actions use **large hit areas** (often ~48px tall), **rounded cards**, and clear separation between **scrollable content** and **fixed chrome** (headers, tab bars).

### Chat that behaves like a real messenger

- **Thread screens** use a **full-height column**: message list scrolls inside a **locked flex layout**, composer pinned to the bottom (or replaced by a **banner** when chat is disabled). The goal is **no weird floating inputs** or pages where the keyboard destroys the layout unpredictably.
- **Polling** refreshes messages on a short interval so it feels **alive** without requiring the customer to install anything exotic.

### Visual calm

- Soft page backgrounds (**slate / gray** tones), **white surfaces** for cards, restrained shadows and borders—so dense operational data doesn’t feel like a spreadsheet exploded onto a phone.

### Why this matters for an “AI Mind”

Any assistant we add later should **respect the same UX contract**: short, actionable suggestions; mobile-readable summaries; and awareness that **staff and customers live in different portals** with **different permissions**. The AI shouldn’t assume everyone sees a “project admin” screen—it should know **who is asking** and **what state the job is in**.

---

## 5. How this document fits with the rest of the repo

- **`README.md`** — Quick start, stack, and pointers into the repo.
- **`APP-DESCRIPTION.md`** — Product-oriented architecture in a slightly more formal structure.
- **`PROJECT-MANUAL.md`** — Schemas, API tables, file paths, and implementation detail.

**`PRODUCT_OVERVIEW.md`** (this file) is the **narrative layer**: the story, the intent, and the **why**—so you can brief an AI architect or a new teammate in one sitting and they’ll **get** Handy It Out before they read a single route handler.

---

*Last aligned with the application’s implemented lifecycle, portals, chat rules, mobile UX patterns, and admin **Users** (handymen & customers) directory.*
