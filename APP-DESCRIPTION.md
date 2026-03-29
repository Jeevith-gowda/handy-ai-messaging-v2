# Handy It Out — Platform overview (V1)

**Handy It Out** is a handyman operations platform: **Admin** runs the business, **Handymen** execute jobs on a **mobile-first** UI, and **Customers** use a separate portal (phone + shared password) to accept quotes and coordinate visits.

This document reflects the **completed V1 Admin & Handyman** experience and how it fits with customers and the backend.

---

## Who uses what

| Role | Entry | Primary jobs |
|------|--------|----------------|
| **Admin** | `/admin` | Create projects, assign handymen, quotes, calendar, payments (internal), Quo/SMS, overrides |
| **Handyman** | `/handyman` | **Projects** list & detail, **Messages** inbox & threads, **Profile**; quotes, schedule lock, start job, photos/notes/costs |
| **Customer** | `/customer` | View projects, accept quotes, chat, reschedule requests |

---

## V1: Mobile-first Handyman app

The handyman area is intentionally **app-like** in the browser:

- **Bottom navigation (mobile):** Fixed bar with **Projects**, **Messages**, **Profile** — same information architecture as many PWAs (see `app/handyman/layout.jsx`).
- **Desktop:** Sticky top header with the same three sections; no duplicate “dashboard” requirement to find work.
- **Visual system:** Off-white page background (`bg-slate-50`), white **cards** and **list rows**, **rounded-2xl** surfaces, **shadow-sm** / borders for depth.
- **Touch targets:** Inputs and primary buttons use **`rounded-xl`**, **`min-h-[48px]`**, and readable **`text-base`** (or 15px in dense chat) for thumbs-first use.

**Related routes (handyman):**

- `/handyman/projects` — assigned jobs (card list + status badges).
- `/handyman/projects/[id]` — job workspace, quote context, `ScheduleManager`, start job, messaging CTA.
- `/handyman/messages` — **central inbox**.
- `/handyman/messages/[projectId]` — **full-screen thread** + schedule modal.
- `/handyman/profile` — account & payout notes (not a payment *dashboard*).

*Legacy routes such as `/handyman/dashboard` or `/handyman/jobs/*` may still exist in the repo but are not the primary V1 IA.*

---

## Project status pipeline (authoritative)

Statuses are stored on **`Project.status`** (`models/Project.js`). The **main lifecycle** for a normal job:

1. **`inquiry`** — Project created; handyman may draft a quote.
2. **`quoted_by_handyman`** — Handyman quote submitted for admin review (internal pipeline step).
3. **`pending_customer_approval`** — Admin sent quote to customer; awaiting acceptance.
4. **`active`** — Customer accepted; **scheduling chat** is in play; date may not be locked yet.
5. **`scheduled`** — Handyman **locked** date/time (`lockSchedule`); job is on the calendar.
6. **`in_progress`** — Handyman **started** the job (`jobStarted` aligned in API).
7. **`completed`** — Handyman marked complete.

**Post-completion (admin bookkeeping):**

- **`handyman_paid`** / **`customer_paid`** — Used for internal payment tracking; not surfaced as a handyman “payments app” in V1.

**Rescheduling:** While a date exists, either party can request reschedule (`isRescheduling`); chat reopens until the handyman locks a new slot.

---

## Centralized messaging (WhatsApp-style inbox)

- **Inbox:** `/handyman/messages` shows one row per project that is in a **messaging-eligible** status (e.g. active work and completed threads still available for context).
- **Thread:** `/handyman/messages/[projectId]` renders **`ProjectSchedulingChat`** in **`variant="thread"`** — scrollable bubbles, composer pinned to the bottom, polling refresh.
- **API:** `GET`/`POST` **`/api/project-chat`** (project-scoped messages; distinct from admin Quo/SMS queues).

**Design intent:** One place for the handyman to **see every customer conversation** without hunting inside each project card.

---

## Integrated scheduling (`ScheduleManager`)

**Component:** `components/ScheduleManager.jsx`

**Responsibilities:**

- **Lock schedule** — Submits `lockSchedule: { scheduledDate, scheduledTime }` to `PUT /api/projects/[id]`; transitions **`active` → `scheduled`** on first lock, or clears **reschedule** when locking a new slot.
- **Request reschedule** — Sets `isRescheduling` and timeline entries when allowed.
- **Summary** — Optional display of the current locked window.

**Where it appears:**

| Surface | Behavior |
|---------|----------|
| **Handyman project detail** | Inline scheduling card for `active` / `scheduled` (and legacy `active` + date). |
| **Handyman message thread** | Same UI inside a **modal** (“Lock schedule”) so the handyman stays in chat while picking date/time. |

Props of note: `project`, `projectId`, `updatedByName`, `onSuccess`, `showRescheduleChat`, `variant` (`default` | `compact`).

---

## V1 constraints & privacy

- **Customer phone masking (handyman):** The handyman UI **does not display** the customer’s phone number; on-site copy explains **in-app messaging** is the channel (see handyman project detail).
- **Maps deep links:** Job **address** from Admin drives a **Google Maps** URL: `https://maps.google.com/?q=<encoded address>` — no separate maps API key required for V1.
- **Handyman payment *tracking* hidden:** Admin continues to record **handyman / customer** payments where implemented; **handymen do not get a ledger/history/payments dashboard** in V1 (profile may still store **payout instructions** for back-office use).

---

## Admin portal (V1 scope)

- Project list, detail, quotes, team, calendar, payments (internal), messaging integrations (Quo), AI assist (Groq), uploads (Cloudinary).
- Can **override** schedule and **reopen** completed jobs for rework (see **PROJECT-MANUAL.md**).

---

## Tech stack

Next.js 14 (App Router), MongoDB + Mongoose, NextAuth, Tailwind CSS, Groq, OpenPhone/Quo, Cloudinary, Vercel-oriented deployment.

---

## Further reading

- **[README.md](./README.md)** — Repo entry point and quick reference.
- **[PROJECT-MANUAL.md](./PROJECT-MANUAL.md)** — Schemas, API tables, guards, and file layout.
