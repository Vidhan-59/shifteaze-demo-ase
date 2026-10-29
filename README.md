# ShiftEaze 2.0 — Enterprise Workforce Scheduling Platform

ShiftEaze 2.0 is an enterprise trainer rostering and workforce scheduling platform designed for multi-tier organizational hierarchies (**Central → Business Unit → Site → Department**).

This repo hosts **two experiences in one Vite project**, selected client-side by route:

| Route | Experience | Audience |
|---|---|---|
| `/` | Landing — choose an experience | everyone |
| `/dashboard` | Enterprise Dashboard (web) | Central/BU/Site admins, schedulers, coordinators, assessors, vendor admins |
| `/trainer` | Trainer App (mobile) | trainers, on a phone-sized canvas |

## 📁 Project Structure

```
main.jsx                          # entrypoint — mounts <App /> inside <BrowserRouter>
src/
  App.jsx                         # route table: / , /dashboard/*, /trainer/*
  pages/
    Landing.jsx                   # experience picker
  apps/
    enterprise/
      ShiftEazeEnterpriseApp.jsx  # web dashboard (Central/BU/Site scheduling, org hierarchy, auctions, reports)
    trainer/
      TrainerMobileApp.jsx        # phone-frame trainer app (roster, punch in/out, leave, profile)
      theme/tokens.js             # trainer app's design tokens
docs/                             # design specs & fix-history notes for the trainer app
scripts/legacy/                   # one-off scripts used while building the trainer app
```

Each app is a self-contained React component with its own internal state/navigation — they don't share routing, global CSS, or module-level state, so they can evolve independently while living in one deploy.

## 🚀 Key Features

- **Shift Master & Template Builder**:
  - Weekly (7-day) and Monthly (4-week cycle) shift templates.
  - Flexible per-day slot counts and independent session timing configuration.
  - 1-Click "Reuse Week 1 for All Weeks" for monthly schedules.
  - Quick presets: 4 slots, 3 slots, 2 slots half-day, 5 slots heavy.
- **Rostering Policy & Compliance Constraints**:
  - Central, BU, and Site level compliance thresholds.
  - Multi-tier Break-Time Master with blackout enforcement (no sessions permitted in blackout windows).
  - Configurable rest buffers, daily/weekly/monthly session limits, and notice windows.
- **Auto-Rostering with Daily Module Mapping**:
  - Dynamic session-to-module mapping grid for both 1-Week and 4-Week Month schedules.
  - Automated trainer allocation based on competencies, fairness, and fatigue limits (no manual employee picking required).
  - Curriculum sequence auto-fill and "Copy to Mon–Fri" presets.
- **2-Stage Trainer Confirmation Flow**:
  - **Stage 1 (Whole Schedule)**: Trainers receive in-app alerts to review and confirm their complete week/month schedule.
  - **Stage 2 (Session-Level)**: Individual session confirmation actions and "Confirm All Sessions" batch confirmation.
- **Multi-Role Experience**:
  - Central Admin, BU Head, Site Head, Scheduler, Coordinator, Assessor, Trainer, and Vendor Admin views.

## 🛠️ Tech Stack

- **Frontend**: React, Vite
- **Routing**: React Router (client-side, selects the web vs. mobile experience)
- **Styling**: Vanilla CSS / Inline Design System
- **Build Tool**: Vite 5

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

The application will start locally at `http://localhost:3000/`.

### 3. Build for Production
```bash
npm run build
```
