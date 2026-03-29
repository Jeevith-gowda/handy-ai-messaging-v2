# Handy It Out

A handyman service management platform that connects **Admin**, **Handyman**, and **Customer** in one system—from inquiry and quoting through scheduling, in-app messaging, field work, completion, and post-job bookkeeping.

---

## Overview

The app delivers three role-based portals on **Next.js 14 (App Router)**:

| Role | Focus |
|------|--------|
| **Admin** | Projects, quotes, **Users** (handymen & customers), team, calendar, payments, SMS/Quo messaging, AI assist, uploads |
| **Handyman** | Mobile-first **Projects**, **Messages**, **Profile**—quotes, schedule lock, start/complete job, photos, notes, additional costs |
| **Customer** | Phone + shared-password login; **Projects** and **Messages** tabs (mobile bottom nav), project detail, quote acceptance, chat, reschedule |

See **[APP-DESCRIPTION.md](./APP-DESCRIPTION.md)** for product detail and **[PROJECT-MANUAL.md](./PROJECT-MANUAL.md)** for schemas, APIs, and file layout.

---

## Documentation

| Document | Purpose |
|----------|---------|
| **[APP-DESCRIPTION.md](./APP-DESCRIPTION.md)** | Product overview, portals, lifecycle, messaging, scheduling, constraints & privacy |
| **[PROJECT-MANUAL.md](./PROJECT-MANUAL.md)** | Technical manual: structure, schemas, APIs, auth, and implementation notes |

---

## Highlights

### Mobile-first Handyman & Customer shells

- **Handyman** (`app/handyman/layout.jsx`): fixed **bottom tab bar** on small screens—**Projects**, **Messages**, **Profile**; desktop uses a top header with the same destinations.
- **Customer** (`app/customer/layout.jsx`): **Projects** (dashboard + project routes) and **Messages** (inbox + per-project threads) with a similar bottom nav on mobile.
- **Touch-friendly UI:** generous tap targets (`min-h-[48px]`), rounded inputs/buttons, card-based lists.

### Project status pipeline (main lifecycle)

```
inquiry
  → quoted_by_handyman
  → pending_customer_approval
  → active
  → scheduled
  → in_progress
  → completed
```

Post-completion bookkeeping (admin): **`handyman_paid`**, **`customer_paid`**. Admin can **reopen** a completed job for rework (restores workflow and re-enables project chat).

### Centralized project chat (handyman ↔ customer)

- **API:** `GET` / `POST` **`/api/project-chat`** (MongoDB `ProjectChat` model).
- **UI:** **`ProjectSchedulingChat`** (`components/ProjectSchedulingChat.jsx`) — default “card” variant on project pages and **`variant="thread"`** for full-height threads.
- **Handyman:** `/handyman/messages` (inbox), `/handyman/messages/[projectId]` (thread + schedule modal).
- **Customer:** `/customer/messages`, `/customer/messages/[projectId]`.
- **Admin control:** Project detail includes an **Enable chat** toggle (`Project.isChatEnabled`).
- **Completion lock:** When the handyman marks the job **completed**, the API sets **`isChatEnabled: false`** (same field as the admin toggle). The thread becomes **read-only** with a banner: *“This project is completed. Chat is closed.”* If chat was turned off by admin only, users see the *paused by administrator* message instead.

### Integrated scheduling

- **`ScheduleManager`** (`components/ScheduleManager.jsx`) — lock schedule, request reschedule, summary; used on **handyman project detail** and in a **modal** on the **handyman message thread** so scheduling stays in context.

### Admin user directory (Handymen & Customers)

- **Navigation:** Sidebar section **Users** → **Handymen** (`/admin/users/handymen`) and **Customers** (`/admin/users/customers`).
- **Lists:** Name, email, phone, account created; **Edit** opens a shared modal (contact fields + optional password change).
- **Create:** **+ Add New Handyman** / **+ Add New Customer** opens a shared **Add** modal (full name, email, phone, set password).
- **API (admin-only):** `GET /api/admin/users?role=handyman|customer`, `POST /api/admin/users` (body includes `role`), `PATCH /api/admin/users/[id]`. Passwords are **hashed** via Mongoose model hooks (`User` / `Customer`).
- **Data model:** Staff handymen are **`User`** documents (`role: 'handyman'`). End customers are **`Customer`** documents (phone login on the customer portal). Admins can assign a **per-customer password**; if unset, login still uses the shared **`CUSTOMER_PASSWORD`** env value (see **PROJECT-MANUAL.md**).

### Privacy & V1 scope notes

- Customer **phone numbers are not shown** to handymen; copy steers users to **in-app chat**.
- **Google Maps** links use the job **address** (`https://maps.google.com/?q=...`).
- Handyman **payment tracking dashboards** are not exposed in V1; profile may still hold **payout instructions** for operations.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router), React 18 |
| Database | MongoDB + Mongoose |
| Auth | NextAuth (credentials / JWT) |
| Styling | **Tailwind CSS v4** |
| Media / ops (optional) | Cloudinary, Groq AI, OpenPhone/Quo — see **PROJECT-MANUAL.md** |

Designed for **Vercel** (serverless).

---

## Quick start

1. Create **`.env.local`** at the repo root. Set at minimum **`MONGODB_URI`**, **`NEXTAUTH_SECRET`**, **`NEXTAUTH_URL`**, and any optional keys described in **PROJECT-MANUAL.md** (e.g. customer shared password, Cloudinary, AI/SMS).
2. **`npm install`** then **`npm run dev`** (default: [http://localhost:3000](http://localhost:3000)).
3. Seed data (optional): **`npm run seed`** and/or **`npm run seed:projects`** — see **PROJECT-MANUAL.md** §4 for default admin/handyman credentials.

### Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build & start |
| `npm run lint` | ESLint |
| `npm run seed` | Seed users (and related base data) |
| `npm run seed:projects` | Seed sample projects |

---

## Primary routes (cheat sheet)

| Area | Routes |
|------|--------|
| Auth | `/login` (admin/handyman), `/customer/login` |
| Admin | `/admin/dashboard`, `/admin/projects`, `/admin/projects/[id]`, `/admin/quotes`, `/admin/calendar`, `/admin/payments`, `/admin/users/handymen`, `/admin/users/customers`, `/admin/team`, `/admin/messages`, … |
| Handyman | `/handyman/projects`, `/handyman/projects/[id]`, `/handyman/messages`, `/handyman/messages/[projectId]`, `/handyman/profile` |
| Customer | `/customer/dashboard`, `/customer/projects`, `/customer/projects/[id]`, `/customer/messages`, `/customer/messages/[projectId]`, `/customer/profile`, `/customer/diy` |

Legacy handyman routes (e.g. `/handyman/dashboard`, `/handyman/jobs/*`) may still exist but are not the main information architecture.
