# Demo credentials

All accounts live in [`src/shared/credentials.js`](../src/shared/credentials.js).
Both login screens also list the demo accounts — click one to fill its email and password in.

> **Demo only.** There is no backend in this build, so passwords are checked in the
> browser and anyone can read them from the shipped JavaScript. A real deployment must
> verify credentials on a server.

## Web dashboard — `/dashboard`

| Role | Name | Email | Password | Scope |
|---|---|---|---|---|
| Central Admin | N. Verma | `n.verma@rcsl.com` | `Central@2026` | All business units |
| **BU Head — Ports** | R. Kapoor | `r.kapoor@rcsl.com` | `Ports@2026` | Ports → Mundra, Hazira |
| **BU Head — Logistics** | A. Khanna | `a.khanna@rcsl.com` | `Logistics@2026` | Logistics → Ahmedabad, Kochi |
| **BU Head — Energy** | M. Bose | `m.bose@rcsl.com` | `Energy@2026` | Energy → Dahej |
| Site Head | S. Bhatt | `s.bhatt@rcsl.com` | `Site@2026` | Mundra |
| Scheduler | D. Menon | `d.menon@rcsl.com` | `Scheduler@2026` | Mundra |
| Training Coordinator | F. Sheikh | `f.sheikh@rcsl.com` | `Coordinator@2026` | Mundra |
| Competency Assessor | A. Ranjan | `a.ranjan@rcsl.com` | `Assessor@2026` | All sites |
| Vendor Admin | I. Qureshi | `i.qureshi@skillpartners.in` | `Vendor@2026` | Skill Partners (then any 6-digit OTP) |

## Trainer mobile app — `/trainer`

One trainer per business unit. Each is an employee in the web app, so schedulers can assign them.

The app always opens on the **business-unit picker** (Ports, Logistics or Energy); nobody stays
signed in between visits. Pick a BU, then sign in with that BU's trainer **phone number and
password**; "Use demo trainer" fills them in. The number can be typed with or without `+91` and
spaces. Credentials from a different BU are refused. The BU you sign in to decides
which schedules and notifications the app shows.

- **Ports (R. Solanki)** opens on the app's built-in September demo month and its
  "Confirm Whole Month / Confirm Manually" screen, as before.
- **Logistics (K. Mehta) and Energy (V. Singh)** start empty. Once the web dashboard publishes a
  roster for their BU, the confirm screen opens with **every session in that roster**, assigned or
  not, labelled with its dates (e.g. "28 Sep – 3 Oct 2026"). Their answers are remembered, so signing
  in again only asks about sessions still pending.

| BU | Trainer | Employee | Phone number | Password | Site |
|---|---|---|---|---|---|
| Ports | R. Solanki | E001 · RCS-1041 | `+91 98250 11041` | `Mundra#Trainer1` | Mundra |
| Logistics | K. Mehta | E002 · RCS-1077 | `+91 98250 11077` | `Kochi#Trainer2` | Kochi |
| Energy | V. Singh | E005 · RCS-1188 | `+91 98250 11188` | `Dahej#Trainer3` | Dahej |

## How schedule notifications reach the app

When a roster is published from the web dashboard (Auto-Rostering from a template, quick generate, or a weekly pattern):

- **Every trainer in that roster's BU** gets a "New ‹BU› schedule published" notification, and all of
  the roster's sessions are added to their schedule, waiting for confirmation.
- **A trainer from another BU who was assigned in it** gets "You've been assigned N sessions" with just
  those sessions.
- Assigning or reassigning a trainer to a single session later also notifies them.

Delivery goes through the browser's `localStorage` plus a `BroadcastChannel` (see
[`src/shared/mobileInbox.js`](../src/shared/mobileInbox.js)). It works when the web dashboard and the
trainer app are open **in the same browser**, in the same tab or side by side in two tabs; an open
trainer tab updates live. It cannot reach a separate physical phone without a backend and push service.

**Try it:** open `/dashboard` in one tab and sign in as a BU Head. Open `/trainer` in a second tab and
sign in as that BU's trainer. Publish a roster for the BU, and the bell on the phone lights up.
