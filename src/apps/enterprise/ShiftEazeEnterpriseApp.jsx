import React, { useState, useMemo, useReducer, useEffect, useRef } from "react";
import { WEB_ACCOUNTS, verifyWebLogin } from "../../shared/credentials.js";
import { deliverToMobile } from "../../shared/mobileInbox.js";

/* ══════════════════════════════════════════════════════════════════════
   ShiftEaze — Enterprise Workforce Scheduling (Central → BU → Site → Department)

   Scope of this build (see the closing note at the bottom of this file
   for the full reconciliation): Login, Central/BU/Site Dashboards,
   Organization hierarchy (BU/Site/Department views), Central/BU/Site
   Scheduler with density-aware overlap handling, Session Detail Drawer,
   and a lightweight Reports view. This is deliberately NOT the masters/
   employee-CRUD application — that is a separate artifact. This one is
   the dashboard-and-scheduler experience the brief specifies, built
   strictly on Central → BU → Site → Department with no Terminal level,
   per Architecture v2.1 §5.1 (a single recursive org_unit table with
   level ∈ {central, bu, site, department}).
   ══════════════════════════════════════════════════════════════════════ */

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`;

const V = {
  primary: "#3B3090", primaryDark: "#2b2470", primarySoft: "#eeecfb", rail: "#14142c",
  page: "#f2f2f5", border: "#e3e3e8", borderStrong: "#cfcfd8", text: "#1f1f24", text2: "#6b6b74", text3: "#9a9aa2",
  card: "#ffffff", track: "#f4f4f8", todayTint: "#f7f6fd",
};

// Status semantics, verbatim from Architecture v2.1 §5.4 — the same six
// colours plus the hatched "occupied but not a delivery" pattern are used
// consistently everywhere a session appears: scheduler, dashboard, drawer.
const STATUS = {
  draft:      { label: "Draft",              bg: "#eef0f4", fg: "#5a6472", bar: "#9aa4b2", desc: "Not published" },
  assigned:   { label: "Awaiting response",  bg: "#e6edfd", fg: "#2451c9", bar: "#4d7bea", desc: "Published, assigned, awaiting trainer response" },
  confirmed:  { label: "Confirmed",          bg: "#e3f6ea", fg: "#137a3f", bar: "#28a862", desc: "Confirmed" },
  unassigned: { label: "Unassigned",         bg: "#fef2e0", fg: "#9a5b06", bar: "#e0a233", desc: "Unassigned, or declined and being backfilled" },
  atrisk:     { label: "At risk",            bg: "#fce8e8", fg: "#b3261e", bar: "#e0453b", desc: "Within notice window, no confirmed trainer" },
  auction:    { label: "Open — interest",    bg: "#f2eafd", fg: "#6d2fc4", bar: "#9d5fe0", desc: "Open for auction with interest registered" },
  travel:     { label: "Travel / leave",     bg: "#f4f4f8", fg: "#6b6b74", bar: "#9aa4b2", hatch: true, desc: "Occupied but not a delivery" },
};

const TODAY = "2026-09-16"; // a Wednesday

/* ─────────────────────── ORGANISATION: CENTRAL → BU → SITE → DEPARTMENT ─────────────────────── */
// One recursive shape in spirit (id, parentId, level), kept as three flat
// arrays here only for readability — exactly what Architecture v2.1 §5.1
// calls a single org_unit table with level ∈ {central, bu, site, department}.
const CENTRAL = { id: "CENTRAL", name: "Central", level: "central" };

const BUS = [
  { id: "BU-PORTS", name: "Ports", code: "PRT", level: "bu", parentId: "CENTRAL" },
  { id: "BU-LOGISTICS", name: "Logistics", code: "LOG", level: "bu", parentId: "CENTRAL" },
  { id: "BU-ENERGY", name: "Energy", code: "ENG", level: "bu", parentId: "CENTRAL" },
];

const SITES = [
  { id: "SITE-MUNDRA", name: "Mundra", code: "MUN", level: "site", parentId: "BU-PORTS", lat: 22.83, lng: 69.72 },
  { id: "SITE-HAZIRA", name: "Hazira", code: "HAZ", level: "site", parentId: "BU-PORTS", lat: 21.10, lng: 72.62 },
  { id: "SITE-AHMEDABAD", name: "Ahmedabad", code: "AMD", level: "site", parentId: "BU-LOGISTICS", lat: 23.02, lng: 72.57 },
  { id: "SITE-KOCHI", name: "Kochi", code: "KOC", level: "site", parentId: "BU-LOGISTICS", lat: 9.93, lng: 76.26 },
  { id: "SITE-DAHEJ", name: "Dahej", code: "DHJ", level: "site", parentId: "BU-ENERGY", lat: 21.70, lng: 72.55 },
];

const DEPARTMENTS = [
  { id: "DEP-CRANE", name: "Crane Operations", code: "CRN", level: "department", parentId: "SITE-MUNDRA", head: "S. Bhatt" },
  { id: "DEP-SAFETY", name: "Safety & HSE", code: "SAF", level: "department", parentId: "SITE-MUNDRA", head: "R. Kapoor" },
  { id: "DEP-QUALITY", name: "Quality", code: "QLT", level: "department", parentId: "SITE-MUNDRA", head: "D. Menon" },
  { id: "DEP-YARD", name: "Yard Operations", code: "YRD", level: "department", parentId: "SITE-HAZIRA", head: "A. Ranjan" },
  { id: "DEP-FLEET", name: "Fleet", code: "FLT", level: "department", parentId: "SITE-AHMEDABAD", head: "P. Nair" },
  { id: "DEP-WAREHOUSE", name: "Warehouse Operations", code: "WHS", level: "department", parentId: "SITE-KOCHI", head: "K. Mehta" },
  { id: "DEP-PROCESS", name: "Process Safety", code: "PRS", level: "department", parentId: "SITE-DAHEJ", head: "V. Singh" },
];

const ORG_UNITS = [CENTRAL, ...BUS, ...SITES, ...DEPARTMENTS];
const orgUnit = (id) => ORG_UNITS.find((o) => o.id === id);
const orgChildren = (id) => ORG_UNITS.filter((o) => o.parentId === id);
const orgAncestors = (id) => { const out = []; let n = orgUnit(id); while (n) { out.push(n); n = n.parentId ? orgUnit(n.parentId) : null; } return out.reverse(); };
const buOf = (unitId) => orgAncestors(unitId).find((n) => n.level === "bu");
const siteOf = (unitId) => orgAncestors(unitId).find((n) => n.level === "site");
// Every site/department beneath a node, inclusive — the subtree a role's parent_path scope resolves to.
function orgSubtreeIds(rootId) {
  const out = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const next = frontier.flatMap((id) => orgChildren(id).map((c) => c.id));
    out.push(...next);
    frontier = next;
  }
  return out;
}

/* ───────────────────────────── MODULES ───────────────────────────── */
const MODULES = [
  { id: "MOD-CRANE", name: "Crane Operation Safety", short: "Crane Ops", color: "#6a4fd6", skill: "SK-CRANE", level: "skilled" },
  { id: "MOD-SAFETY", name: "Safety & Compliance", short: "Safety", color: "#1d9e75", skill: "SK-SAFETY", level: "foundation" },
  { id: "MOD-SOFT", name: "Soft Skills Communication", short: "Soft Skills", color: "#d85a30", skill: "SK-SOFT", level: "foundation" },
  { id: "MOD-DIGITAL", name: "Digital Literacy", short: "Digital", color: "#d4537e", skill: "SK-DIGITAL", level: "foundation" },
  { id: "MOD-FIRSTAID", name: "First Aid & Emergency", short: "First Aid", color: "#378add", skill: "SK-FIRSTAID", level: "skilled" },
  { id: "MOD-QUALITY", name: "Quality Fundamentals", short: "Quality", color: "#b8860b", skill: "SK-QUALITY", level: "foundation" },
];
const moduleOf = (id) => MODULES.find((m) => m.id === id);

/* ───────────────────────────── SKILL / COMPETENCY MASTERS ───────────────────────────── */
let LEVELS = [
  { id: "L1", code: "L1", name: "Awareness", score: 20, note: "Knows the subject, cannot deliver", active: true },
  { id: "L2", code: "L2", name: "Assisted", score: 40, note: "Can support as secondary", active: true },
  { id: "L3", code: "L3", name: "Independent", score: 60, note: "Delivers standard sessions alone", active: true },
  { id: "L4", code: "L4", name: "Advanced", score: 80, note: "Delivers core technical content", active: true },
  { id: "L5", code: "L5", name: "Master", score: 100, note: "Can certify others", active: true },
];
const LEVEL_NAME = Object.fromEntries(LEVELS.map((l) => [Number(l.code.slice(1)), `${l.code} ${l.name}`]));

let SKILLS = [
  { id: "SK-CRANE", code: "CRN", name: "Crane Operation", criticality: "core", type: "technical", minLevel: 4, minScore: 75, cert: "CRANE", active: true },
  { id: "SK-SAFETY", code: "SAF", name: "Safety Induction", criticality: "foundation", type: "foundation", minLevel: 2, minScore: 45, cert: "", active: true },
  { id: "SK-SOFT", code: "SFT", name: "Communication Skills", criticality: "foundation", type: "foundation", minLevel: 2, minScore: 45, cert: "", active: true },
  { id: "SK-DIGITAL", code: "DIG", name: "Digital Literacy", criticality: "foundation", type: "foundation", minLevel: 2, minScore: 40, cert: "", active: true },
  { id: "SK-FIRSTAID", code: "FST", name: "First Aid", criticality: "core", type: "technical", minLevel: 3, minScore: 60, cert: "FIRSTAID", active: true },
  { id: "SK-QUALITY", code: "QLT", name: "Quality Fundamentals", criticality: "foundation", type: "foundation", minLevel: 2, minScore: 45, cert: "", active: true },
];
const skillOf = (id) => SKILLS.find((s) => s.id === id);

let DESIGNATIONS = [
  { id: "DSG1", code: "MT", name: "Master Trainer", grade: "M4", active: true },
  { id: "DSG2", code: "SI", name: "Senior Instructor", grade: "M3", active: true },
  { id: "DSG3", code: "IN", name: "Instructor", grade: "M2", active: true },
  { id: "DSG4", code: "TA", name: "Training Assistant", grade: "M1", active: true },
];
let WORK_TYPES = [
  { id: "WT1", code: "ONR", name: "On-roll", billable: false, rate: 0, active: true },
  { id: "WT2", code: "OFR", name: "Off-roll", billable: true, rate: 850, active: true },
  { id: "WT3", code: "AGY", name: "Agency / empanelled", billable: true, rate: 1400, active: true },
  { id: "WT4", code: "FRL", name: "Freelance", billable: true, rate: 1800, active: true },
];

let CLASSROOMS = [
  { id: "CR1", site: "SITE-MUNDRA", code: "MUN-CR-01", name: "Admin Block Classroom", building: "Admin Block", floor: "2", room: "204", type: "normal", cap: 30, equip: "", active: true },
  { id: "CR2", site: "SITE-MUNDRA", code: "MUN-CR-02", name: "Crane Simulator Bay", building: "Sim Centre", floor: "1", room: "S-01", type: "simulator", cap: 6, equip: "CRANE", active: true },
  { id: "CR3", site: "SITE-MUNDRA", code: "MUN-CR-03", name: "Berth 3 OJT Yard", building: "Berth 3", floor: "G", room: "OJT-A", type: "ojt", cap: 4, equip: "CRANE", active: true },
  { id: "CR4", site: "SITE-HAZIRA", code: "HAZ-CR-01", name: "Training Hall", building: "Training Hall", floor: "1", room: "101", type: "normal", cap: 28, equip: "", active: true },
  { id: "CR5", site: "SITE-AHMEDABAD", code: "AMD-CR-01", name: "Fleet Office Classroom", building: "Fleet Office", floor: "3", room: "301", type: "normal", cap: 20, equip: "", active: true },
  { id: "CR6", site: "SITE-KOCHI", code: "KOC-CR-01", name: "Warehouse HQ Classroom", building: "Warehouse HQ", floor: "1", room: "W-12", type: "normal", cap: 26, equip: "", active: true },
  { id: "CR7", site: "SITE-DAHEJ", code: "DHJ-CR-01", name: "Process Block Classroom", building: "Process Block", floor: "1", room: "P-05", type: "normal", cap: 22, equip: "", active: true },
];
let GEOFENCES = [
  { id: "GF1", site: "SITE-MUNDRA", code: "GF-MUN-01", name: "Mundra Admin Block", radius: 200, lat: 22.831, lng: 69.721, active: true },
  { id: "GF2", site: "SITE-HAZIRA", code: "GF-HAZ-01", name: "Hazira Training Hall", radius: 250, lat: 21.101, lng: 72.621, active: true },
  { id: "GF3", site: "SITE-AHMEDABAD", code: "GF-AMD-01", name: "Ahmedabad Fleet Office", radius: 200, lat: 23.021, lng: 72.571, active: true },
  { id: "GF4", site: "SITE-KOCHI", code: "GF-KOC-01", name: "Kochi Warehouse HQ", radius: 300, lat: 9.931, lng: 76.261, active: true },
  { id: "GF5", site: "SITE-DAHEJ", code: "GF-DHJ-01", name: "Dahej Process Block", radius: 200, lat: 21.701, lng: 72.551, active: true },
];

/* ───────────────────────────── SHIFT MASTER — session-lane templates ─────────────────────────────
   A shift is a reusable working-window template scoped to a Site. Auto
   Rostering applies a shift template across a date range to generate the
   literal, dated session rows the scheduler already reads — one source
   of truth, no separate pattern/override bookkeeping. */
let SHIFTS = [
  // Shift Master defines pure time-blocks — no module here. Module, and the
  // primary/secondary trainer, are chosen per lane in Auto Rostering instead.
  { id: "SH1", code: "WD-MUN", name: "Mundra weekday — 4 sessions", site: "SITE-MUNDRA", color: "#6a4fd6", start: 480,
    sessions: [{ o: 0, d: 120 }, { o: 150, d: 120 }, { o: 330, d: 120 }, { o: 480, d: 120 }] },
  { id: "SH2", code: "WD-HAZ", name: "Hazira weekday — 2 sessions", site: "SITE-HAZIRA", color: "#1d9e75", start: 510,
    sessions: [{ o: 0, d: 120 }, { o: 150, d: 120 }] },
  { id: "SH3", code: "WD-AMD", name: "Ahmedabad weekday — 2 sessions", site: "SITE-AHMEDABAD", color: "#d4537e", start: 540,
    sessions: [{ o: 0, d: 120 }, { o: 150, d: 120 }] },
  { id: "SH4", code: "WD-KOC", name: "Kochi weekday — 2 sessions", site: "SITE-KOCHI", color: "#d85a30", start: 480,
    sessions: [{ o: 0, d: 120 }, { o: 150, d: 120 }] },
  { id: "SH5", code: "WD-DHJ", name: "Dahej weekday — 1 session", site: "SITE-DAHEJ", color: "#378add", start: 540,
    sessions: [{ o: 0, d: 120 }] },
];

/* ───────────────────────────── WEEKLY TEMPLATE MASTER ─────────────────────────────
   A weekly template defines a complete 1-week session structure (e.g. Mon–Fri 4 sessions,
   Sat 2 sessions half-day, Sun off), configurable rostering policy settings (max sessions
   per day/week/month, max valid rejections, buffer, SLAs, secondary trainer requirements),
   and is mapped to Business Units (BUs) or Sites. */
let WEEKLY_TEMPLATES = [
  {
    id: "WT-STD-PORTS",
    type: "weekly",
    code: "WT-PORT-STD",
    name: "Standard Port Operations Weekly Template (4+2 Half Day)",
    desc: "Monday–Friday 4 sessions/day (09:00–18:15), Saturday 2 sessions half-day (09:00–13:15), Sunday weekly rest.",
    scopeLevel: "site",
    mappedUnits: ["SITE-MUNDRA", "SITE-HAZIRA", "BU-PORTS"],
    color: "#3B3090",
    days: {
      Mon: { active: true, label: "Monday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Tue: { active: true, label: "Tuesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Wed: { active: true, label: "Wednesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Thu: { active: true, label: "Thursday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Fri: { active: true, label: "Friday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Sat: { active: true, isHalfDay: true, label: "Saturday (Half-Day)", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }] },
      Sun: { active: false, isRestDay: true, label: "Sunday (Rest Day)", sessions: [] },
    },
    settings: {
      maxSessionsPerDay: 4,
      maxSessionsPerWeek: 22,
      maxSessionsPerMonth: 88,
      maxValidRejections: 3,
      minBufferMins: 15,
      maxConsecutiveDays: 6,
      noticeSlaHours: 48,
      requireSecondaryIfLearnersOver: 25,
      secondaryMandatoryForSkills: ["SK-CRANE"],
    },
  },
  {
    id: "WT-LOG-GEN",
    type: "weekly",
    code: "WT-LOG-STD",
    name: "Logistics Standard Week (4+2 Half Day)",
    desc: "Logistics operational cycle: 4 sessions Mon–Fri, 2 sessions Saturday half-day, Sunday off.",
    scopeLevel: "bu",
    mappedUnits: ["BU-LOGISTICS", "SITE-AHMEDABAD", "SITE-KOCHI"],
    color: "#1d9e75",
    days: {
      Mon: { active: true, label: "Monday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Tue: { active: true, label: "Tuesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Wed: { active: true, label: "Wednesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Thu: { active: true, label: "Thursday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Fri: { active: true, label: "Friday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Sat: { active: true, isHalfDay: true, label: "Saturday (Half-Day)", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }] },
      Sun: { active: false, isRestDay: true, label: "Sunday (Rest Day)", sessions: [] },
    },
    settings: {
      maxSessionsPerDay: 4,
      maxSessionsPerWeek: 22,
      maxSessionsPerMonth: 88,
      maxValidRejections: 3,
      minBufferMins: 15,
      maxConsecutiveDays: 6,
      noticeSlaHours: 48,
      requireSecondaryIfLearnersOver: 25,
      secondaryMandatoryForSkills: ["SK-SAFETY"],
    },
  },
  {
    id: "MT-PORT-MONTHLY",
    type: "monthly",
    code: "MT-PORT-4WK",
    name: "Ports 1-Month Operational Master Template (4-Week Cycle)",
    desc: "Complete 1-month blueprint for Ports & Logistics. 4 rotating weekly schedules with 1-click week reuse and variable daily slots.",
    scopeLevel: "site",
    mappedUnits: ["SITE-MUNDRA", "SITE-HAZIRA", "BU-PORTS"],
    color: "#087ea4",
    weeks: {
      W1: {
        label: "Week 1 (Heavy Operations & Simulator)",
        days: {
          Mon: { active: true, label: "Monday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Tue: { active: true, label: "Tuesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Wed: { active: true, label: "Wednesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Thu: { active: true, label: "Thursday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Fri: { active: true, label: "Friday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Sat: { active: true, isHalfDay: true, label: "Saturday (Half-Day)", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }] },
          Sun: { active: false, isRestDay: true, label: "Sunday (Rest Day)", sessions: [] },
        },
      },
      W2: {
        label: "Week 2 (Port Safety & HSE Protocols)",
        days: {
          Mon: { active: true, label: "Monday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Tue: { active: true, label: "Tuesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Wed: { active: true, label: "Wednesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Thu: { active: true, label: "Thursday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Fri: { active: true, label: "Friday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Sat: { active: true, isHalfDay: true, label: "Saturday (Half-Day)", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }] },
          Sun: { active: false, isRestDay: true, label: "Sunday (Rest Day)", sessions: [] },
        },
      },
      W3: {
        label: "Week 3 (Crane & Logistics Skills)",
        days: {
          Mon: { active: true, label: "Monday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Tue: { active: true, label: "Tuesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Wed: { active: true, label: "Wednesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Thu: { active: true, label: "Thursday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Fri: { active: true, label: "Friday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
          Sat: { active: true, isHalfDay: true, label: "Saturday (Half-Day)", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }] },
          Sun: { active: false, isRestDay: true, label: "Sunday (Rest Day)", sessions: [] },
        },
      },
      W4: {
        label: "Week 4 (Competency Assessment & Review)",
        days: {
          Mon: { active: true, label: "Monday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }] },
          Tue: { active: true, label: "Tuesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }] },
          Wed: { active: true, label: "Wednesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }] },
          Thu: { active: true, label: "Thursday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }] },
          Fri: { active: true, label: "Friday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }] },
          Sat: { active: true, isHalfDay: true, label: "Saturday (Evaluation)", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }] },
          Sun: { active: false, isRestDay: true, label: "Sunday (Rest Day)", sessions: [] },
        },
      },
    },
    days: {
      Mon: { active: true, label: "Monday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Tue: { active: true, label: "Tuesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Wed: { active: true, label: "Wednesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Thu: { active: true, label: "Thursday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Fri: { active: true, label: "Friday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
      Sat: { active: true, isHalfDay: true, label: "Saturday (Half-Day)", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }] },
      Sun: { active: false, isRestDay: true, label: "Sunday (Rest Day)", sessions: [] },
    },
    settings: {
      maxSessionsPerDay: 4,
      maxSessionsPerWeek: 22,
      maxSessionsPerMonth: 88,
      maxValidRejections: 3,
      minBufferMins: 15,
      maxConsecutiveDays: 6,
      noticeSlaHours: 48,
      requireSecondaryIfLearnersOver: 20,
      secondaryMandatoryForSkills: ["SK-CRANE"],
    },
  },
];

/* ───────────────────────────── EMPLOYEE / TRAINER MASTER ───────────────────────────── */
const cmp = (skill, level, score, state = "verified") => ({ skill, level, score, state });
const empOf = (id) => EMPLOYEES.find((e) => e.id === id);
const trainerOf = empOf; // every trainer is an employee record in this build
let EMPLOYEES = [
  { id: "E001", code: "RCS-1041", name: "R. Solanki", email: "r.solanki@rcsl.com", phone: "+91 98250 11041",
    site: "SITE-MUNDRA", designation: "DSG1", workType: "WT1", doj: "2012-04-02", trainerType: "technical",
    competencies: [cmp("SK-CRANE", 5, 91), cmp("SK-SAFETY", 3, 64)],
    certs: [{ type: "CRANE", no: "CR-2021-4417", expiry: "2027-06-30" }],
    modes: ["classroom", "simulator", "ojt"], languages: ["English", "Hindi", "Gujarati"],
    education: [{ q: "B.E. Mechanical", inst: "Gujarat Technological University", year: 2010 }],
    work: [{ employer: "APSEZ", role: "Crane Operator", from: "2010", to: "2012" }],
    feedback: 4.6, feedbackCount: 54, active: true, scope: ["SITE-MUNDRA", "SITE-HAZIRA"] },
  { id: "E002", code: "RCS-1077", name: "K. Mehta", email: "k.mehta@rcsl.com", phone: "+91 98250 11077",
    site: "SITE-KOCHI", designation: "DSG2", workType: "WT1", doj: "2014-07-15", trainerType: "both",
    competencies: [cmp("SK-SAFETY", 4, 79), cmp("SK-SOFT", 3, 66)],
    certs: [], modes: ["classroom"], languages: ["English", "Malayalam"],
    education: [{ q: "MBA HR", inst: "Symbiosis", year: 2013 }],
    work: [{ employer: "L&T", role: "Training Officer", from: "2013", to: "2014" }],
    feedback: 4.5, feedbackCount: 41, active: true, scope: ["SITE-KOCHI"] },
  { id: "E003", code: "RCS-1103", name: "S. Iyer", email: "s.iyer@rcsl.com", phone: "+91 98250 11103",
    site: "SITE-MUNDRA", designation: "DSG2", workType: "WT2", doj: "2016-01-11", trainerType: "foundation",
    competencies: [cmp("SK-SOFT", 4, 81), cmp("SK-QUALITY", 3, 65)],
    certs: [], modes: ["classroom"], languages: ["English", "Tamil", "Hindi"],
    education: [{ q: "M.A. English", inst: "Madras University", year: 2015 }],
    work: [{ employer: "NTTF", role: "Soft Skills Trainer", from: "2015", to: "2016" }],
    feedback: 4.7, feedbackCount: 36, active: true, scope: ["SITE-MUNDRA"] },
  { id: "E004", code: "RCS-1150", name: "P. Chauhan", email: "p.chauhan@rcsl.com", phone: "+91 98250 11150",
    site: "SITE-HAZIRA", designation: "DSG3", workType: "WT1", doj: "2017-09-01", trainerType: "technical",
    competencies: [cmp("SK-CRANE", 4, 78), cmp("SK-SAFETY", 3, 61)],
    certs: [{ type: "CRANE", no: "CR-2022-8890", expiry: "2026-10-20" }],
    modes: ["classroom", "simulator"], languages: ["English", "Hindi"],
    education: [{ q: "Diploma Mechanical", inst: "Govt Polytechnic", year: 2016 }],
    work: [{ employer: "DP World", role: "Crane Operator", from: "2016", to: "2017" }],
    feedback: 4.3, feedbackCount: 30, active: true, scope: ["SITE-MUNDRA", "SITE-HAZIRA"] },
  { id: "E005", code: "RCS-1188", name: "V. Singh", email: "v.singh@rcsl.com", phone: "+91 98250 11188",
    site: "SITE-DAHEJ", designation: "DSG1", workType: "WT1", doj: "2013-03-20", trainerType: "both",
    competencies: [cmp("SK-FIRSTAID", 5, 88), cmp("SK-SAFETY", 4, 80)],
    certs: [{ type: "FIRSTAID", no: "FA-2020-1120", expiry: "2028-01-31" }],
    modes: ["classroom", "ojt"], languages: ["English", "Hindi", "Gujarati"],
    education: [{ q: "B.Tech Chemical", inst: "NIT Surat", year: 2012 }],
    work: [{ employer: "Reliance", role: "Safety Officer", from: "2012", to: "2013" }],
    feedback: 4.4, feedbackCount: 33, active: true, scope: ["SITE-DAHEJ", "SITE-AHMEDABAD"] },
  { id: "E006", code: "RCS-1204", name: "N. Joshi", email: "n.joshi@rcsl.com", phone: "+91 98250 11204",
    site: "SITE-AHMEDABAD", designation: "DSG3", workType: "WT3", doj: "2019-11-05", trainerType: "foundation",
    competencies: [cmp("SK-DIGITAL", 4, 77), cmp("SK-SAFETY", 3, 68)],
    certs: [], modes: ["classroom"], languages: ["English", "Gujarati", "Hindi"],
    education: [{ q: "B.Com", inst: "Gujarat University", year: 2018 }],
    work: [{ employer: "Skill Partners", role: "Trainer", from: "2018", to: "2019" }],
    feedback: 4.2, feedbackCount: 22, active: true, scope: ["SITE-AHMEDABAD"], vendor: "Skill Partners" },
  { id: "E007", code: "RCS-1220", name: "A. Pillai", email: "a.pillai@skillpartners.in", phone: "+91 98250 11220",
    site: "SITE-HAZIRA", designation: "DSG4", workType: "WT4", doj: "2026-08-20", trainerType: "technical",
    competencies: [cmp("SK-CRANE", 3, 58), cmp("SK-SAFETY", 2, 44, "draft")],
    certs: [], modes: ["classroom"], languages: ["English"],
    education: [], work: [], feedback: 0, feedbackCount: 0, active: true, scope: ["SITE-HAZIRA"], vendor: "Skill Partners" },
  { id: "E008", code: "RCS-1233", name: "D. Rao", email: "d.rao@rcsl.com", phone: "+91 98250 11233",
    site: "SITE-KOCHI", designation: "DSG2", workType: "WT1", doj: "2015-06-30", trainerType: "both",
    competencies: [cmp("SK-QUALITY", 4, 84), cmp("SK-SAFETY", 4, 79)],
    certs: [], modes: ["classroom", "ojt"], languages: ["English", "Malayalam", "Hindi"],
    education: [{ q: "B.Sc Logistics", inst: "Cochin University", year: 2014 }],
    work: [{ employer: "DP World", role: "Warehouse Supervisor", from: "2014", to: "2015" }],
    feedback: 4.5, feedbackCount: 29, active: true, scope: ["SITE-KOCHI"] },
  // Ports bench — enough depth at Mundra and Hazira that every Ports session
  // has 3–4 real, validated candidates for the recommendation and auction panels.
  { id: "E009", code: "RCS-1251", name: "M. Desai", email: "m.desai@rcsl.com", phone: "+91 98250 11251",
    site: "SITE-MUNDRA", designation: "DSG2", workType: "WT1", doj: "2015-02-09", trainerType: "both",
    competencies: [cmp("SK-CRANE", 4, 84), cmp("SK-FIRSTAID", 3, 70), cmp("SK-SAFETY", 4, 76)],
    certs: [{ type: "CRANE", no: "CR-2023-1102", expiry: "2027-12-31" }, { type: "FIRSTAID", no: "FA-2024-0311", expiry: "2027-03-31" }],
    modes: ["classroom", "simulator", "ojt"], languages: ["English", "Hindi", "Gujarati"],
    education: [{ q: "Diploma Marine Engineering", inst: "Govt Polytechnic Bhuj", year: 2013 }],
    work: [{ employer: "APSEZ", role: "RTG Operator", from: "2013", to: "2015" }],
    feedback: 4.5, feedbackCount: 38, active: true, scope: ["SITE-MUNDRA", "SITE-HAZIRA"] },
  { id: "E010", code: "RCS-1262", name: "H. Patel", email: "h.patel@rcsl.com", phone: "+91 98250 11262",
    site: "SITE-HAZIRA", designation: "DSG2", workType: "WT1", doj: "2016-08-01", trainerType: "both",
    competencies: [cmp("SK-CRANE", 4, 79), cmp("SK-FIRSTAID", 4, 76), cmp("SK-SAFETY", 3, 66)],
    certs: [{ type: "CRANE", no: "CR-2022-5521", expiry: "2027-08-31" }, { type: "FIRSTAID", no: "FA-2023-7710", expiry: "2027-11-30" }],
    modes: ["classroom", "simulator", "ojt"], languages: ["English", "Hindi", "Gujarati"],
    education: [{ q: "B.E. Electrical", inst: "SVNIT Surat", year: 2015 }],
    work: [{ employer: "Hazira Port", role: "Crane Supervisor", from: "2015", to: "2016" }],
    feedback: 4.4, feedbackCount: 31, active: true, scope: ["SITE-HAZIRA", "SITE-MUNDRA"] },
  { id: "E011", code: "RCS-1275", name: "J. Thakkar", email: "j.thakkar@rcsl.com", phone: "+91 98250 11275",
    site: "SITE-MUNDRA", designation: "DSG1", workType: "WT1", doj: "2011-05-16", trainerType: "both",
    competencies: [cmp("SK-FIRSTAID", 4, 81), cmp("SK-SAFETY", 4, 77), cmp("SK-QUALITY", 3, 62)],
    certs: [{ type: "FIRSTAID", no: "FA-2022-4409", expiry: "2027-09-30" }],
    modes: ["classroom", "ojt"], languages: ["English", "Hindi", "Gujarati"],
    education: [{ q: "B.Sc Nursing", inst: "Gujarat University", year: 2009 }],
    work: [{ employer: "Adani Hospitals", role: "Emergency Care Lead", from: "2009", to: "2011" }],
    feedback: 4.7, feedbackCount: 47, active: true, scope: ["SITE-MUNDRA", "SITE-HAZIRA"] },
  { id: "E012", code: "RCS-1288", name: "L. Fernandes", email: "l.fernandes@rcsl.com", phone: "+91 98250 11288",
    site: "SITE-MUNDRA", designation: "DSG3", workType: "WT2", doj: "2018-10-22", trainerType: "foundation",
    competencies: [cmp("SK-QUALITY", 4, 80), cmp("SK-SOFT", 3, 68), cmp("SK-SAFETY", 3, 62)],
    certs: [], modes: ["classroom"], languages: ["English", "Hindi", "Konkani"],
    education: [{ q: "B.Com", inst: "Goa University", year: 2017 }],
    work: [{ employer: "Bureau Veritas", role: "QA Associate", from: "2017", to: "2018" }],
    feedback: 4.3, feedbackCount: 26, active: true, scope: ["SITE-MUNDRA", "SITE-HAZIRA"] },
  { id: "E013", code: "RCS-1296", name: "B. Shah", email: "b.shah@skillpartners.in", phone: "+91 98250 11296",
    site: "SITE-HAZIRA", designation: "DSG3", workType: "WT3", doj: "2020-01-13", trainerType: "both",
    competencies: [cmp("SK-FIRSTAID", 3, 68), cmp("SK-SAFETY", 3, 70), cmp("SK-QUALITY", 3, 61)],
    certs: [{ type: "FIRSTAID", no: "FA-2024-1188", expiry: "2027-01-31" }],
    modes: ["classroom"], languages: ["English", "Gujarati"],
    education: [{ q: "B.Sc Chemistry", inst: "VNSGU Surat", year: 2019 }],
    work: [{ employer: "Skill Partners", role: "Safety Trainer", from: "2019", to: "2020" }],
    feedback: 4.1, feedbackCount: 18, active: true, scope: ["SITE-HAZIRA", "SITE-MUNDRA"], vendor: "Skill Partners",
    contract: { end: "2027-03-31", hoursLeft: 140 } },
  { id: "E014", code: "RCS-1304", name: "G. Nair", email: "g.nair@rcsl.com", phone: "+91 98250 11304",
    site: "SITE-MUNDRA", designation: "DSG1", workType: "WT1", doj: "2010-11-08", trainerType: "technical",
    competencies: [cmp("SK-CRANE", 5, 88), cmp("SK-FIRSTAID", 3, 65)],
    // Crane certificate lapses mid-month — shows the "valid on the session date" rule failing for later sessions.
    certs: [{ type: "CRANE", no: "CR-2019-0907", expiry: "2026-09-20" }, { type: "FIRSTAID", no: "FA-2021-6620", expiry: "2027-06-30" }],
    modes: ["classroom", "simulator", "ojt"], languages: ["English", "Malayalam", "Hindi"],
    education: [{ q: "B.Tech Mechanical", inst: "CUSAT", year: 2008 }],
    work: [{ employer: "DP World", role: "Crane Instructor", from: "2008", to: "2010" }],
    feedback: 4.8, feedbackCount: 61, active: true, scope: ["SITE-MUNDRA"] },
  { id: "E015", code: "RCS-1317", name: "Y. Qadri", email: "y.qadri@rcsl.com", phone: "+91 98250 11317",
    site: "SITE-HAZIRA", designation: "DSG3", workType: "WT1", doj: "2019-04-01", trainerType: "technical",
    competencies: [cmp("SK-CRANE", 4, 80), cmp("SK-SAFETY", 3, 63)],
    certs: [{ type: "CRANE", no: "CR-2024-3345", expiry: "2028-02-29" }],
    modes: ["classroom", "simulator"], languages: ["English", "Hindi", "Urdu"],
    education: [{ q: "ITI Crane Operator", inst: "ITI Surat", year: 2017 }],
    work: [{ employer: "Hazira Port", role: "Crane Operator", from: "2017", to: "2019" }],
    feedback: 4.2, feedbackCount: 20, active: true, scope: ["SITE-HAZIRA", "SITE-MUNDRA"] },
  { id: "E016", code: "RCS-1322", name: "R. Bhatia", email: "r.bhatia@rcsl.com", phone: "+91 98250 11322",
    site: "SITE-MUNDRA", designation: "DSG2", workType: "WT1", doj: "2014-03-17", trainerType: "technical",
    competencies: [cmp("SK-CRANE", 4, 81), cmp("SK-FIRSTAID", 3, 66)],
    certs: [{ type: "CRANE", no: "CR-2023-2240", expiry: "2027-10-31" }, { type: "FIRSTAID", no: "FA-2023-5512", expiry: "2027-05-31" }],
    modes: ["classroom", "simulator", "ojt"], languages: ["English", "Hindi", "Punjabi"],
    education: [{ q: "B.E. Mechanical", inst: "Thapar Institute", year: 2012 }],
    work: [{ employer: "JNPT", role: "Crane Operator", from: "2012", to: "2014" }],
    feedback: 4.4, feedbackCount: 35, active: true, scope: ["SITE-MUNDRA"] },
  { id: "E017", code: "RCS-1336", name: "S. Kulkarni", email: "s.kulkarni@rcsl.com", phone: "+91 98250 11336",
    site: "SITE-MUNDRA", designation: "DSG2", workType: "WT1", doj: "2017-06-05", trainerType: "both",
    competencies: [cmp("SK-FIRSTAID", 4, 78), cmp("SK-SAFETY", 3, 65), cmp("SK-SOFT", 3, 64)],
    certs: [{ type: "FIRSTAID", no: "FA-2024-2208", expiry: "2027-12-31" }],
    modes: ["classroom", "ojt"], languages: ["English", "Marathi", "Hindi"],
    education: [{ q: "B.Sc Nursing", inst: "Pune University", year: 2015 }],
    work: [{ employer: "Red Cross", role: "First Aid Instructor", from: "2015", to: "2017" }],
    feedback: 4.6, feedbackCount: 40, active: true, scope: ["SITE-MUNDRA"] },
  { id: "E018", code: "RCS-1341", name: "T. Ansari", email: "t.ansari@rcsl.com", phone: "+91 98250 11341",
    site: "SITE-HAZIRA", designation: "DSG2", workType: "WT1", doj: "2015-09-14", trainerType: "technical",
    competencies: [cmp("SK-CRANE", 4, 83), cmp("SK-SAFETY", 3, 60)],
    certs: [{ type: "CRANE", no: "CR-2022-7781", expiry: "2027-07-31" }],
    modes: ["classroom", "simulator", "ojt"], languages: ["English", "Hindi", "Urdu"],
    education: [{ q: "Diploma Mechanical", inst: "Govt Polytechnic Surat", year: 2013 }],
    work: [{ employer: "Hazira Port", role: "RTG Operator", from: "2013", to: "2015" }],
    feedback: 4.5, feedbackCount: 39, active: true, scope: ["SITE-HAZIRA"] },
  { id: "E019", code: "RCS-1358", name: "V. Rathod", email: "v.rathod@rcsl.com", phone: "+91 98250 11358",
    site: "SITE-HAZIRA", designation: "DSG3", workType: "WT1", doj: "2018-02-26", trainerType: "both",
    competencies: [cmp("SK-CRANE", 4, 77), cmp("SK-FIRSTAID", 3, 64), cmp("SK-SAFETY", 3, 67)],
    certs: [{ type: "CRANE", no: "CR-2024-0915", expiry: "2028-01-31" }, { type: "FIRSTAID", no: "FA-2024-0916", expiry: "2027-08-31" }],
    modes: ["classroom", "simulator"], languages: ["English", "Gujarati", "Hindi"],
    education: [{ q: "ITI Fitter", inst: "ITI Bharuch", year: 2016 }],
    work: [{ employer: "L&T Hazira", role: "Crane Operator", from: "2016", to: "2018" }],
    feedback: 4.3, feedbackCount: 24, active: true, scope: ["SITE-HAZIRA", "SITE-MUNDRA"] },
  { id: "E020", code: "RCS-1363", name: "P. Menon", email: "p.menon@rcsl.com", phone: "+91 98250 11363",
    site: "SITE-MUNDRA", designation: "DSG3", workType: "WT1", doj: "2019-07-08", trainerType: "both",
    competencies: [cmp("SK-CRANE", 4, 76), cmp("SK-FIRSTAID", 3, 69), cmp("SK-QUALITY", 3, 60)],
    certs: [{ type: "CRANE", no: "CR-2024-1730", expiry: "2028-03-31" }, { type: "FIRSTAID", no: "FA-2024-1731", expiry: "2027-09-30" }],
    modes: ["classroom", "simulator", "ojt"], languages: ["English", "Malayalam", "Hindi"],
    education: [{ q: "B.Tech Electrical", inst: "NIT Calicut", year: 2018 }],
    work: [{ employer: "Cochin Port", role: "Electrical Supervisor", from: "2018", to: "2019" }],
    feedback: 4.2, feedbackCount: 16, active: true, scope: ["SITE-MUNDRA"] },
  { id: "E021", code: "RCS-1379", name: "K. Jadeja", email: "k.jadeja@rcsl.com", phone: "+91 98250 11379",
    site: "SITE-HAZIRA", designation: "DSG1", workType: "WT1", doj: "2012-12-03", trainerType: "technical",
    competencies: [cmp("SK-CRANE", 5, 86), cmp("SK-FIRSTAID", 3, 63)],
    certs: [{ type: "CRANE", no: "CR-2021-9902", expiry: "2027-11-30" }, { type: "FIRSTAID", no: "FA-2022-9903", expiry: "2027-04-30" }],
    modes: ["classroom", "simulator", "ojt"], languages: ["English", "Gujarati", "Hindi"],
    education: [{ q: "B.E. Mechanical", inst: "LD College of Engineering", year: 2010 }],
    work: [{ employer: "APM Terminals", role: "Crane Trainer", from: "2010", to: "2012" }],
    feedback: 4.7, feedbackCount: 52, active: true, scope: ["SITE-HAZIRA"] },
];


/* ───────────────────────────── UTILITIES ───────────────────────────── */
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtDay = (s) => parseD(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmtWd = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
const fmtDt = (d) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
const fmtLong = (s) => parseD(s).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const toMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmtT = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const initials = (n) => (n || "").split(/[\s.]+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
const uid = (p) => `${p}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const monday = (d) => addDays(d, -((d.getDay() + 6) % 7));

/* ───────────────────────────── BREAK-TIME MASTER & COMPLIANCE DATA ─────────────────────────────
   Break times are defined at Central level, BU level, and Site level.
   Rule: For any mandatory defined break-time, NO session is permitted in that time box.
   Compliance policies are enforced hierarchically (Central baseline → BU overrides → Site overrides). */
let BREAK_TIMES = [
  { id: "BRK-C-LUNCH", name: "Mandatory Lunch Break", level: "central", scopeId: null, start: "13:15", end: "14:00", dur: 45, type: "lunch", mandatory: true, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
  { id: "BRK-C-TEA-AM", name: "Morning Refreshment & Debrief", level: "central", scopeId: null, start: "11:00", end: "11:15", dur: 15, type: "tea", mandatory: true, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
  { id: "BRK-C-TEA-PM", name: "Afternoon Rest Buffer", level: "central", scopeId: null, start: "16:00", end: "16:15", dur: 15, type: "tea", mandatory: true, days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "BRK-SITE-MUN-SAFETY", name: "Mundra Berth Shift Handover", level: "site", scopeId: "SITE-MUNDRA", start: "18:15", end: "18:45", dur: 30, type: "turnover", mandatory: true, days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "BRK-BU-PRT-ALIGN", name: "Ports Marine Weather Alignment", level: "bu", scopeId: "BU-PORTS", start: "08:30", end: "08:45", dur: 15, type: "turnover", mandatory: false, days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
];

let COMPLIANCE_POLICIES = {
  central: {
    maxSessionsPerDay: 4,
    maxSessionsPerWeek: 22,
    maxSessionsPerMonth: 88,
    maxConsecutiveDays: 6,
    maxValidRejections: 3,
    minBufferMins: 15,
    noticeSlaHours: 48,
    responseSlaHours: 24,
    swapSlaHours: 4,
    requireSecondaryIfLearnersOver: 20,
    secondaryMandatoryForSkills: ["SK-CRANE", "SK-SIM"],
  },
  bu_overrides: {
    "BU-PORTS": {
      maxSessionsPerDay: 4,
      maxSessionsPerWeek: 20,
      maxSessionsPerMonth: 80,
      requireSecondaryIfLearnersOver: 18,
      secondaryMandatoryForSkills: ["SK-CRANE", "SK-FORK"],
    },
  },
  site_overrides: {
    "SITE-MUNDRA": {
      noticeSlaHours: 72,
      maxValidRejections: 2,
      minBufferMins: 20,
    },
  },
};

function getEffectiveBreakTimes(buId, siteId, breakTimes = BREAK_TIMES) {
  return (breakTimes || []).filter((b) => {
    if (b.level === "central") return true;
    if (b.level === "bu" && b.scopeId === buId) return true;
    if (b.level === "site" && b.scopeId === siteId) return true;
    return false;
  });
}

function getEffectivePolicy(buId, siteId, policies = COMPLIANCE_POLICIES) {
  const c = policies?.central || {};
  const b = (buId && policies?.bu_overrides?.[buId]) || {};
  const s = (siteId && policies?.site_overrides?.[siteId]) || {};
  return { ...c, ...b, ...s };
}

function checkSessionBreakCollision(startStr, endStr, dayCode, effectiveBreaks = []) {
  const sMins = toMins(startStr);
  const eMins = toMins(endStr);
  if (isNaN(sMins) || isNaN(eMins) || eMins <= sMins) return null;

  for (const brk of effectiveBreaks) {
    if (!brk.mandatory) continue;
    if (brk.days && !brk.days.includes(dayCode)) continue;
    const bStart = toMins(brk.start);
    const bEnd = toMins(brk.end);
    if (sMins < bEnd && eMins > bStart) {
      return {
        collided: true,
        breakItem: brk,
        reason: `Overlaps with ${brk.name} (${brk.start}–${brk.end}) [${brk.level.toUpperCase()} level]`,
      };
    }
  }
  return null;
}

function getTemplateDays(tmpl, weekKey = "W1") {
  if (!tmpl) return {};
  if (tmpl.type === "monthly" && tmpl.weeks?.[weekKey]?.days) {
    return tmpl.weeks[weekKey].days;
  }
  return tmpl.days || {};
}

function countTemplateTotalSessions(tmpl) {
  if (!tmpl) return 0;
  if (tmpl.type === "monthly" && tmpl.weeks) {
    return Object.values(tmpl.weeks).reduce((wAcc, w) => {
      return wAcc + Object.values(w.days || {}).reduce((dAcc, d) => {
        return dAcc + (d.active && !d.isRestDay ? (d.sessions?.length || 0) : 0);
      }, 0);
    }, 0);
  }
  return Object.values(tmpl.days || {}).reduce((acc, d) => {
    return acc + (d.active && !d.isRestDay ? (d.sessions?.length || 0) : 0);
  }, 0);
}


/* ───────────────────────────── SESSION SEED DATA ───────────────────────────── */
// Sessions are the one entity every screen in this build revolves around.
// Deliberately over-dense at Central scope on a couple of days, so the
// density/overlap handling in the scheduler has something real to prove.
function seedSessions() {
  const rows = [];
  let n = 8000;
  // Demo build: operational data is seeded for the Ports BU only (Mundra +
  // Hazira). Logistics and Energy carry master data but no sessions.
  // `pool` = who gets seeded as the assigned trainer. Auction bids are seeded
  // in init(), once the engine can validate them.
  const plan = [
    { dept: "DEP-CRANE", mod: "MOD-CRANE", learners: 6, cap: 6, pool: ["E001", "E009", "E014"] },
    { dept: "DEP-SAFETY", mod: "MOD-SAFETY", learners: 26, cap: 30, pool: ["E003", "E011", "E012"] },
    { dept: "DEP-QUALITY", mod: "MOD-QUALITY", learners: 20, cap: 24, pool: ["E012", "E003"] },
    { dept: "DEP-YARD", mod: "MOD-CRANE", learners: 8, cap: 8, pool: ["E004", "E015", "E010"] },
    { dept: "DEP-SAFETY", mod: "MOD-FIRSTAID", learners: 16, cap: 20, pool: ["E011", "E009"] },
    { dept: "DEP-YARD", mod: "MOD-SAFETY", learners: 18, cap: 24, pool: ["E013", "E004"] },
  ];
  const starts = ["08:30", "09:00", "10:45", "11:00", "13:30", "14:00", "15:45", "16:00"];
  const statusCycle = ["confirmed", "confirmed", "assigned", "confirmed", "unassigned", "confirmed", "atrisk", "auction", "confirmed", "draft"];

  for (let day = 14; day <= 27; day++) {
    const date = `2026-09-${pad(day)}`;
    const dow = parseD(date).getDay();
    if (dow === 0) continue; // Sunday off
    // Every weekday, every plan row fires; on a couple of "heavy" days everything fires twice
    // (once in the morning block, once in the afternoon) to genuinely stress Central density.
    const heavy = day === 16 || day === 22;
    const rounds = heavy ? 2 : 1;
    for (let r = 0; r < rounds; r++) {
      plan.forEach((p, pi) => {
        const idx = (day + pi + r * 3) % starts.length;
        const start = starts[idx];
        const dur = 120;
        const statusIdx = (day + pi + r) % statusCycle.length;
        let status = statusCycle[statusIdx];
        const cands = p.pool;
        const trainer = status === "unassigned" || status === "auction" || status === "draft" ? null : cands[(day + pi) % cands.length];
        if (!trainer && status === "confirmed") status = "unassigned";
        rows.push({
          id: `S-${n++}`, date, start, end: fmtT(toMins(start) + dur), dur,
          dept: p.dept, site: siteOf(p.dept).id, bu: buOf(p.dept).id, mod: p.mod,
          learners: p.learners, capacity: p.cap, trainer, status,
          conflict: false, updatedAt: `${date} ${start}`, createdBy: "System",
        });
      });
    }
  }
  // Mark genuine double-bookings so the "conflict" signal is real, not decorative.
  const byTrainerDate = {};
  rows.forEach((s) => { if (!s.trainer) return; const k = `${s.trainer}|${s.date}`; (byTrainerDate[k] = byTrainerDate[k] || []).push(s); });
  Object.values(byTrainerDate).forEach((list) => {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (toMins(a.start) < toMins(b.end) && toMins(b.start) < toMins(a.end)) { a.conflict = true; b.conflict = true; }
    }
  });
  // A handful of travel/leave blocks — "occupied but not a delivery" per §5.4.
  ["E001", "E010"].forEach((tid, i) => {
    rows.push({
      id: `S-${n++}`, date: `2026-09-${pad(18 + i)}`, start: "07:00", end: "12:00", dur: 300,
      dept: null, site: trainerOf(tid).site, bu: buOf(trainerOf(tid).site).id, mod: null,
      learners: 0, capacity: 0, trainer: tid, status: "travel", conflict: false,
      updatedAt: `2026-09-${pad(18 + i)} 07:00`, createdBy: "System", label: "Travel block",
    });
  });
  return rows;
}

/* ═══════════════════════════════════════════════════════════════════════
   ELIGIBILITY & RECOMMENDATION ENGINE
   Two-stage: hard filters (binary, never overridable) then a weighted
   score over whoever survives. Same two-stage design as the Architecture
   v2.1 document §13, re-grounded on Site (no Terminal) for eligibility
   and travel scoring.
   ═══════════════════════════════════════════════════════════════════════ */
const DEFAULT_WEIGHTS = { competency: 30, location: 15, scheduleFit: 12, workload: 12, effectiveness: 10, cost: 8, continuity: 6, interest: 4, development: 3 };
const WEIGHT_META = [
  ["competency", "Competency fit", "Score for the required skill"],
  ["location", "Location & travel", "Distance from their base site"],
  ["scheduleFit", "Schedule fit", "Contiguity with their existing day"],
  ["workload", "Workload balance", "Headroom against the daily cap"],
  ["effectiveness", "Recent effectiveness", "Smoothed learner feedback"],
  ["cost", "Cost", "Fully-loaded session cost"],
  ["continuity", "Continuity", "Already teaching this batch"],
  ["interest", "Interest signal", "Registered interest in this slot"],
  ["development", "Development need", "Building bench strength"],
];

function travelMinutes(siteA, siteB) {
  if (siteA === siteB) return 0;
  const a = orgUnit(siteA), b = orgUnit(siteB);
  if (!a?.lat || !b?.lat) return 0;
  const R = 6371, rad = (v) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(h));
  if (km < 150) return Math.round(km * 1.3) + 20;
  if (km < 600) return Math.round(km * 1.1) + 30;
  return 180 + Math.round(km / 12);
}

// Site holiday calendar (§9.2 rule 3). Kept off the seeded fortnight so it
// shows as a passing check rather than wiping out a whole day of candidates.
const HOLIDAYS = [
  { date: "2026-11-09", name: "Diwali", sites: null },
  { date: "2026-12-25", name: "Christmas Day", sites: null },
];
// Leave requests, kept in sync with state.leaves at render (see App) — pending
// leave counts as occupied, per §13.4 E-12.
let LEAVES = [];
const EXTERNAL_WORK_TYPES = ["WT3", "WT4"];
// Classroom-type capability (§9.2 rule 9): crane modules run in the simulator bay.
const REQUIRED_MODE = { "SK-CRANE": "simulator" };

// The 15 list-inclusion rules of Architecture v2.1 §9.2, evaluated one by one
// so the admin can see every rule (passing or failing) behind a candidate.
const VALIDATION_RULES = [
  [1, "No session overlap", "Interval overlap against every confirmed and notified (pending-response) assignment"],
  [2, "No travel-block overlap", "Travel blocks are treated exactly like sessions for occupancy"],
  [3, "No leave / blackout / holiday", "Approved and pending leave, blackout dates and the site holiday calendar"],
  [4, "Inter-session gap", "Gap to adjacent sessions ≥ max(trainer break, venue turnaround, intra-site travel)"],
  [5, "Rest hours", "≥ 10h between the last session end and this session start on consecutive days"],
  [6, "Competency", "Verified level ≥ required, training type matches, equipment matches"],
  [7, "Certification", "Valid on the session date, not just today"],
  [8, "Load caps", "Would-be day / week / month counts within the load policy"],
  [9, "Classroom-type capability", "OJT / simulator clearance, VILT enablement"],
  [10, "Deployable scope", "Session site is inside the trainer's deployable scope"],
  [11, "Travel feasibility", "Can physically reach the venue before the session starts"],
  [12, "Profile readiness", "Profile is recommendation-ready (not a seeded shell)"],
  [13, "Account state", "Not suspended — declines never cause suspension"],
  [14, "Contract validity", "External trainers only: active contract with hours remaining"],
  [15, "Re-validation at commit", "Every rule above re-runs at the moment you click Assign"],
];

function eligibility(emp, ctx) {
  // ctx: { skillId, dateIso, startMin, endMin, siteId, busySessions, skipSkillGate, excludeId }
  // skipSkillGate is set by the caller when the session's module is
  // Foundation-level: the skill/competency/cert gate is a soft gate and is
  // waived, but every scheduling rule (overlap, leave, caps, scope, travel)
  // still applies — a Foundation session still can't double-book someone.
  const sk = skillOf(ctx.skillId);
  const policy = getEffectivePolicy(buOf(ctx.siteId)?.id, ctx.siteId);
  const busy = (ctx.busySessions ?? []).filter((o) => o.id !== ctx.excludeId);
  const sameDay = busy.filter((o) => o.date === ctx.dateIso);
  const overlaps = (o) => toMins(o.start) < ctx.endMin && ctx.startMin < toMins(o.end);
  const r = {};
  const set = (n, ok, detail) => { r[n] = { ok, detail }; };

  const sessClash = sameDay.filter((o) => o.status !== "travel" && overlaps(o));
  set(1, !sessClash.length, sessClash.length ? `Clashes with ${sessClash.map((o) => `${moduleOf(o.mod)?.short ?? o.id} ${o.start}–${o.end}`).join(", ")}` : "No overlapping session that day");
  const travClash = sameDay.filter((o) => o.status === "travel" && overlaps(o));
  set(2, !travClash.length, travClash.length ? `On a travel block ${travClash[0].start}–${travClash[0].end}` : "No travel block in this window");

  const leave = LEAVES.find((l) => l.emp === emp.id && ["approved", "pending"].includes(l.state) && l.from <= ctx.dateIso && ctx.dateIso <= l.to);
  const hol = HOLIDAYS.find((h) => h.date === ctx.dateIso && (!h.sites || h.sites.includes(ctx.siteId)));
  set(3, !leave && !hol && !emp.leaveDays?.includes(ctx.dateIso),
    leave ? `${leave.state === "approved" ? "On approved" : "Pending"} ${leave.type.toLowerCase()} (${fmtDay(leave.from)}${leave.to !== leave.from ? `–${fmtDay(leave.to)}` : ""})`
      : hol ? `Site holiday — ${hol.name}` : emp.leaveDays?.includes(ctx.dateIso) ? "On approved leave" : "No leave, blackout or holiday");

  const adjacent = sameDay.filter((o) => !overlaps(o));
  const gapFails = adjacent.map((o) => {
    const gap = toMins(o.end) <= ctx.startMin ? ctx.startMin - toMins(o.end) : toMins(o.start) - ctx.endMin;
    const need = Math.max(policy.minBufferMins ?? 15, o.site && o.site !== ctx.siteId ? travelMinutes(o.site, ctx.siteId) : 0);
    return gap < need ? `${gap} min gap to ${moduleOf(o.mod)?.short ?? "block"} ${o.start}–${o.end}, needs ${need}` : null;
  }).filter(Boolean);
  set(4, !gapFails.length, gapFails[0] ?? `≥ ${policy.minBufferMins ?? 15} min to every adjacent session`);

  const dayBefore = iso(addDays(parseD(ctx.dateIso), -1)), dayAfter = iso(addDays(parseD(ctx.dateIso), 1));
  const prevEnd = Math.max(-1, ...busy.filter((o) => o.date === dayBefore).map((o) => toMins(o.end)));
  const nextStart = Math.min(99999, ...busy.filter((o) => o.date === dayAfter).map((o) => toMins(o.start)));
  const restBefore = prevEnd >= 0 ? 1440 - prevEnd + ctx.startMin : null;
  const restAfter = nextStart < 99999 ? 1440 - ctx.endMin + nextStart : null;
  const restMin = Math.min(...[restBefore, restAfter].filter((x) => x !== null), 99999);
  set(5, restMin >= 600, restMin === 99999 ? "No sessions on adjacent days" : `${Math.floor(restMin / 60)}h ${restMin % 60}m rest${restMin < 600 ? " — below the 10h minimum" : " (≥ 10h)"}`);

  const c = sk && emp.competencies.find((x) => x.skill === ctx.skillId);
  if (!sk) set(6, true, "No skill gate on this module");
  else if (ctx.skipSkillGate) set(6, true, `Foundation soft gate — open to any trainer${c ? ` (${sk.name} L${c.level}, TCI ${c.score})` : ""}`);
  else if (!c) set(6, false, `No competency in ${sk.name}`);
  else if (c.state !== "verified") set(6, false, `${sk.name} is ${c.state}, not verified`);
  else if (c.level < sk.minLevel) set(6, false, `${sk.name} at L${c.level}, needs L${sk.minLevel}`);
  else if (c.score < sk.minScore) set(6, false, `TCI ${c.score} below ${sk.minScore} for a ${sk.criticality} skill`);
  else if (emp.trainerType !== "both" && emp.trainerType !== sk.type) set(6, false, `Trainer is ${emp.trainerType}, skill is ${sk.type}`);
  else set(6, true, `${sk.name} L${c.level} verified, TCI ${c.score} (needs L${sk.minLevel} / ${sk.minScore})`);

  const cert = sk?.cert && emp.certs.find((x) => x.type === sk.cert);
  if (!sk?.cert || ctx.skipSkillGate) set(7, true, ctx.skipSkillGate && sk?.cert ? "Waived — foundation soft gate" : "No certificate required");
  else if (!cert) set(7, false, `Missing ${sk.cert} certificate`);
  else if (cert.expiry < ctx.dateIso) set(7, false, `${sk.cert} certificate expired ${fmtDay(cert.expiry)}, before the session`);
  else set(7, true, `${sk.cert} valid until ${fmtDay(cert.expiry)}`);

  const wkStart = iso(monday(parseD(ctx.dateIso))), wkEnd = iso(addDays(monday(parseD(ctx.dateIso)), 6));
  const deliveries = busy.filter((o) => o.status !== "travel");
  const dayN = deliveries.filter((o) => o.date === ctx.dateIso).length + 1;
  const weekN = deliveries.filter((o) => o.date >= wkStart && o.date <= wkEnd).length + 1;
  const monthN = deliveries.filter((o) => o.date.slice(0, 7) === ctx.dateIso.slice(0, 7)).length + 1;
  const capFail = dayN > policy.maxSessionsPerDay ? `Would be ${dayN} sessions that day (cap ${policy.maxSessionsPerDay})`
    : weekN > policy.maxSessionsPerWeek ? `Would be ${weekN} sessions that week (cap ${policy.maxSessionsPerWeek})`
    : monthN > policy.maxSessionsPerMonth ? `Would be ${monthN} sessions that month (cap ${policy.maxSessionsPerMonth})` : null;
  set(8, !capFail, capFail ?? `Day ${dayN}/${policy.maxSessionsPerDay} · week ${weekN}/${policy.maxSessionsPerWeek} · month ${monthN}/${policy.maxSessionsPerMonth}`);

  const mode = REQUIRED_MODE[ctx.skillId] ?? "classroom";
  set(9, (emp.modes ?? []).includes(mode), (emp.modes ?? []).includes(mode) ? `Cleared for ${mode} delivery` : `Not cleared for ${mode} delivery`);

  const inScope = (emp.scope || []).includes(ctx.siteId);
  set(10, inScope, inScope ? `${orgUnit(ctx.siteId)?.name} is in their deployable scope` : `${orgUnit(ctx.siteId)?.name} outside their deployable scope`);

  const tm = travelMinutes(emp.site, ctx.siteId);
  const travelOk = !(tm > 0 && ctx.startMin - tm - 60 < 360);
  set(11, travelOk, tm === 0 ? "Local — based at this site" : travelOk ? `${Math.round(tm / 60 * 10) / 10}h travel, arrives before ${fmtT(ctx.startMin)}`
    : `Cannot travel ${Math.round(tm / 60)}h and arrive before ${fmtT(ctx.startMin)}`);

  set(12, emp.profileState !== "seeded", emp.profileState === "seeded" ? "Profile still a seeded shell — onboarding incomplete" : "Profile is recommendation-ready");
  set(13, emp.active && !emp.suspended, !emp.active ? "Employee is inactive" : emp.suspended ? "Account suspended" : "Active");

  if (!EXTERNAL_WORK_TYPES.includes(emp.workType)) set(14, true, "Not applicable — internal trainer");
  else if (!emp.contract) set(14, false, "External trainer with no active contract on file");
  else if (emp.contract.end < ctx.dateIso) set(14, false, `Contract ended ${fmtDay(emp.contract.end)}`);
  else if (emp.contract.hoursLeft < (ctx.endMin - ctx.startMin) / 60) set(14, false, `Only ${emp.contract.hoursLeft}h left on contract`);
  else set(14, true, `Contract to ${fmtDay(emp.contract.end)}, ${emp.contract.hoursLeft}h remaining`);

  set(15, true, "Re-checked automatically when you click Assign");

  const checks = VALIDATION_RULES.map(([n, rule, desc]) => ({ n, rule, desc, ...r[n] }));
  const fails = checks.filter((x) => !x.ok).map((x) => x.detail);
  return { pass: fails.length === 0, fails, checks, travelMin: tm };
}

function scoreCandidate(emp, ctx, sessions, weights) {
  const c = emp.competencies.find((x) => x.skill === ctx.skillId);
  const sub = {};
  sub.competency = c ? c.score : 0;
  const tm = travelMinutes(emp.site, ctx.siteId);
  sub.location = tm === 0 ? 100 : tm <= 90 ? 80 : tm <= 240 ? 62 : tm <= 400 ? 42 : 24;
  const sameDay = sessions.filter((s) => s.trainer === emp.id && s.date === ctx.dateIso && s.id !== ctx.excludeId);
  sub.scheduleFit = sameDay.some((s) => s.site === ctx.siteId) ? 92 : sameDay.length ? 62 : 60;
  const sameWeek = sessions.filter((s) => s.trainer === emp.id && s.status !== "travel" && Math.abs((parseD(s.date) - parseD(ctx.dateIso)) / 86400000) < 7);
  sub.workload = Math.max(0, Math.round(100 * (1 - sameWeek.length / 8)));
  const m = 5, G = 4.2, v = emp.feedbackCount;
  sub.effectiveness = Math.round(((v ? (v / (v + m)) * emp.feedback + (m / (v + m)) * G : G) / 5) * 100);
  const wt = WORK_TYPES.find((w) => w.id === emp.workType);
  sub.cost = Math.max(0, 100 - Math.round(((wt?.rate ?? 0) / 1800) * 60) - (tm > 240 ? 20 : tm > 90 ? 8 : 0));
  sub.continuity = sameDay.length > 0 ? 90 : 45;
  sub.interest = (ctx.interests ?? []).includes(emp.id) ? 100 : 50;
  sub.development = emp.feedbackCount < 10 ? 85 : 50;
  const total = Object.entries(weights).reduce((a, [k, w]) => a + (sub[k] ?? 0) * (w / 100), 0);
  return { sub, total: Math.round(total * 10) / 10, travelMin: tm, weekLoad: sameWeek.length, tci: c?.score ?? null };
}

function rankCandidates(employees, ctx, sessions, weights) {
  const eligible = [], excluded = [];
  employees.forEach((emp) => {
    const busySessions = sessions.filter((s) => s.trainer === emp.id || s.secondaryTrainer === emp.id);
    const el = eligibility(emp, { ...ctx, busySessions });
    const scored = scoreCandidate(emp, ctx, sessions, weights);
    if (!el.pass) return excluded.push({ emp, fails: el.fails, checks: el.checks, ...scored });
    eligible.push({ emp, checks: el.checks, ...scored });
  });
  eligible.sort((a, b) => b.total - a.total);
  eligible.forEach((c, i) => (c.rank = i + 1));
  return { eligible, excluded };
}

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN SYSTEM PRIMITIVES
   ═══════════════════════════════════════════════════════════════════════ */
const Card = ({ children, style, pad = true, onClick }) => (
  <div onClick={onClick} style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 10,
    padding: pad ? 16 : 0, cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>
);
const CardHead = ({ label, sub, right, icon }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: sub ? 10 : 12 }}>
    <div><div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>{icon}{label}</div>
      {sub && <div style={{ fontSize: 12, color: V.text2, marginTop: 3 }}>{sub}</div>}</div>
    {right}
  </div>
);
const Btn = ({ children, onClick, kind = "", size = "", disabled, style, title }) => {
  const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit",
    fontWeight: 500, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1,
    height: size === "sm" ? 30 : 36, padding: size === "sm" ? "0 11px" : "0 15px", fontSize: size === "sm" ? 12.5 : 13.5,
    transition: "background .15s,border-color .15s,opacity .15s" };
  const kinds = {
    "": { background: "#fff", color: V.text, border: `1px solid ${V.border}` },
    primary: { background: V.primary, color: "#fff", border: `1px solid ${V.primary}` },
    outline: { background: "#fff", color: V.primary, border: `1.5px solid ${V.primary}` },
    danger: { background: "#fff", color: "#b3261e", border: "1px solid #f0c2c0" },
    ghost: { background: "transparent", color: V.text2, border: "1px solid transparent" },
  };
  return <button title={title} onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
};
const StatusBadge = ({ status, compact }) => {
  const s = STATUS[status] ?? STATUS.draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: compact ? 11 : 12, fontWeight: 500, color: s.fg }}>
      <span style={{ width: 6, height: 6, borderRadius: s.hatch ? 2 : "50%", flexShrink: 0,
        background: s.hatch ? `repeating-linear-gradient(45deg,${s.bar} 0 2px,transparent 2px 4px)` : s.bar }} />
      {s.label}
    </span>
  );
};
const Pill = ({ children, tone = "muted", style }) => {
  const t = { muted: ["#f4f4f7", V.text2], primary: [V.primarySoft, V.primary], success: ["#eef8f2", "#137a3f"],
    danger: ["#fdf2f2", "#b3261e"], warn: ["#fef8ee", "#9a5b06"] }[tone] || ["#f4f4f7", V.text2];
  return <span style={{ fontSize: 11, fontWeight: 500,
    background: t[0], color: t[1], padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap", ...style }}>{children}</span>;
};
const Bar = ({ v, color = V.primary, h = 6, bg = V.track }) => (
  <div style={{ height: h, background: bg, borderRadius: 999, overflow: "hidden", width: "100%" }}>
    <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, v))}%`, background: color, borderRadius: 999, transition: "width .3s" }} /></div>
);
const Num = ({ children, style }) => <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{children}</span>;
const Field = ({ label, children }) => (
  <label style={{ display: "block" }}><span style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: V.text2,
    marginBottom: 5, textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</span>{children}</label>
);
const selCls = { height: 34, border: `1px solid ${V.border}`, borderRadius: 7, padding: "0 10px", fontSize: 12.5,
  fontFamily: "inherit", background: "#fff", color: V.text, outline: "none", minWidth: 130 };
const Select = ({ children, ...p }) => <select {...p} style={{ ...selCls, ...p.style }}>{children}</select>;
const Input = (p) => <input {...p} style={{ ...selCls, minWidth: 0, ...p.style }} />;

/* ─────────────────────── KPI ─────────────────────── */
const Kpi = ({ label, value, sub, tone, onClick }) => (
  <Card pad style={{ padding: "14px 16px", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
    <div style={{ fontSize: 11.5, color: V.text2, marginBottom: 7 }}>{label}</div>
    <Num style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: tone || V.text, letterSpacing: "-.01em" }}>{value}</Num>
    {sub && <div style={{ fontSize: 11, color: V.text3, marginTop: 6 }}>{sub}</div>}
  </Card>
);

/* ─────────────────────── BREADCRUMBS ─────────────────────── */
function Breadcrumbs({ path, onNavigate }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5, fontSize: 13, marginBottom: 4 }}>
      {path.map((p, i) => (
        <span key={p.id ?? i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {i > 0 && <span style={{ color: V.text3 }}>/</span>}
          {i === path.length - 1 || !onNavigate ? (
            <span style={{ color: i === path.length - 1 ? V.text : V.text2, fontWeight: i === path.length - 1 ? 600 : 400 }}>{p.name}</span>
          ) : (
            <button onClick={() => onNavigate(p)} style={{ border: 0, background: "transparent", cursor: "pointer",
              color: V.primary, fontFamily: "inherit", fontSize: 13, padding: 0 }}>{p.name}</button>
          )}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────── EMPTY / ERROR / LOADING ─────────────────────── */
const EmptyState = ({ title, hint, action, icon = "▢" }) => (
  <div style={{ textAlign: "center", padding: "46px 20px" }}>
    <div style={{ fontSize: 26, color: V.text3, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: V.text }}>{title}</div>
    {hint && <div style={{ fontSize: 12.5, color: V.text3, marginTop: 5, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>{hint}</div>}
    {action && <div style={{ marginTop: 14 }}>{action}</div>}
  </div>
);
const ErrorState = ({ title = "Something went wrong", hint, onRetry }) => (
  <div style={{ textAlign: "center", padding: "46px 20px" }}>
    <div style={{ fontSize: 26, color: "#b3261e", marginBottom: 10 }}>⚠</div>
    <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
    {hint && <div style={{ fontSize: 12.5, color: V.text3, marginTop: 5 }}>{hint}</div>}
    {onRetry && <div style={{ marginTop: 14 }}><Btn kind="outline" onClick={onRetry}>Retry</Btn></div>}
  </div>
);
const Skeleton = ({ h = 16, w = "100%", style }) => (
  <div style={{ height: h, width: w, borderRadius: 6, background: "linear-gradient(90deg,#eceef2 25%,#f5f6f8 37%,#eceef2 63%)",
    backgroundSize: "400% 100%", animation: "sh 1.4s ease infinite", ...style }} />
);
const SkeletonCard = () => (
  <Card><Skeleton h={11} w="40%" style={{ marginBottom: 12 }} /><Skeleton h={26} w="55%" style={{ marginBottom: 8 }} /><Skeleton h={10} w="70%" /></Card>
);
const SkeletonRows = ({ n = 5 }) => (
  <div style={{ display: "grid", gap: 8 }}>{Array.from({ length: n }).map((_, i) => <Skeleton key={i} h={44} />)}</div>
);

/* ─────────────────────── MODAL / DRAWER ─────────────────────── */
const Modal = ({ title, sub, onClose, children, width = 520, footer }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,20,30,.5)", zIndex: 80,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: width,
      maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(20,20,44,.28)" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div><div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>{sub && <div style={{ fontSize: 12.5, color: V.text2, marginTop: 3 }}>{sub}</div>}</div>
        <button onClick={onClose} style={{ border: 0, background: "transparent", fontSize: 20, cursor: "pointer", color: V.text3 }}>×</button>
      </div>
      <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>{children}</div>
      {footer && <div style={{ padding: "13px 20px", borderTop: `1px solid ${V.border}`, display: "flex", justifyContent: "flex-end", gap: 9 }}>{footer}</div>}
    </div>
  </div>
);
const Drawer = ({ children, onClose, width = 480 }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,20,30,.4)", zIndex: 70, display: "flex", justifyContent: "flex-end" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width, background: "#fff", height: "100%",
      overflowY: "auto", boxShadow: "-8px 0 32px rgba(20,20,44,.2)" }}>{children}</div>
  </div>
);

/* ─────────────────────── VIEW TOGGLE / TABS ─────────────────────── */
const Toggle = ({ items, value, onChange }) => (
  <div style={{ display: "inline-flex", border: `1px solid ${V.border}`, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
    {items.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)} style={{ border: 0, fontFamily: "inherit", cursor: "pointer", padding: "7px 13px",
        fontSize: 12.5, fontWeight: 500, background: value === k ? V.primary : "#fff", color: value === k ? "#fff" : V.text2 }}>{l}</button>))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   SCOPE RESOLUTION — the rule that makes RBAC structural, not cosmetic
   (Architecture v2.1 §3.1: "org-scoped roles are resolved through
   org_unit.parent_path, so a role automatically sees every node beneath
   them with no per-record configuration.")
   ═══════════════════════════════════════════════════════════════════════ */
// Fixed root per demo role — this is what section 31 calls a development/
// demo role switcher; a real deployment would resolve this from the signed-in
// user's own org_unit assignment, never from a client-side toggle.
// Fixed scope per demo role. central/bu/site are the enterprise "view" roles
// this build's dashboard/scheduler/organization screens are parameterised by;
// scheduler/coordinator are also site-scoped but operate the roster day to
// day; assessor/trainer/vendor are function- or self-scoped, per Architecture
// v2.1 §3.1, so they carry no org root at all.
const ROLE_ROOT = { central: "CENTRAL", bu: "BU-PORTS", site: "SITE-MUNDRA", scheduler: "SITE-MUNDRA", coordinator: "SITE-MUNDRA" };
const ROLE_LABEL = { central: "Central Admin", bu: "BU Head", site: "Site Head", scheduler: "Scheduler",
  coordinator: "Training Coordinator", assessor: "Competency Assessor", trainer: "Trainer", vendor_admin: "Vendor Admin" };

function sessionUnitIds(s) {
  // A session's most specific unit, walking up as far as it actually has (a
  // travel block has no department, only a site).
  return [s.dept, s.site, s.bu].filter(Boolean);
}
function sessionsInScope(sessions, rootId) {
  const allowed = new Set(orgSubtreeIds(rootId));
  return sessions.filter((s) => sessionUnitIds(s).some((id) => allowed.has(id)));
}

/* ─────────────────────── CASCADING FILTERS ─────────────────────── */
function applyFilters(sessions, f) {
  return sessions.filter((s) => {
    if (f.bu && s.bu !== f.bu) return false;
    if (f.site && s.site !== f.site) return false;
    if (f.dept && s.dept !== f.dept) return false;
    if (f.mod && s.mod !== f.mod) return false;
    if (f.status && s.status !== f.status) return false;
    if (f.from && s.date < f.from) return false;
    if (f.to && s.date > f.to) return false;
    if (f.q) {
      const hay = `${moduleOf(s.mod)?.name ?? ""} ${trainerOf(s.trainer)?.name ?? ""} ${orgUnit(s.dept)?.name ?? ""} ${s.id}`.toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });
}
const emptyFilters = () => ({ bu: "", site: "", dept: "", mod: "", status: "", from: "", to: "", q: "" });
const filtersActive = (f) => Object.entries(f).some(([k, v]) => v);

/* ─────────────────────── KPI AGGREGATION — per Architecture v2.1 §5.2 ───────────────────────
   Central: "Where is the system failing?" -> unassigned by BU, decline/backfill
            rate, fill rate, cross-BU deployments, SLA breaches.
   BU:      "Which site is short of capacity?" -> sessions by site & status,
            utilisation by trainer, upcoming auctions.
   Site:    "Is next month's schedule covered?" -> unassigned queue, pending
            confirmations, at-risk sessions.
   ═══════════════════════════════════════════════════════════════════════ */
function computeKpis(sessions) {
  const real = sessions.filter((s) => s.status !== "travel");
  const total = real.length;
  const confirmed = real.filter((s) => s.status === "confirmed").length;
  const unassigned = real.filter((s) => s.status === "unassigned").length;
  const atRisk = real.filter((s) => s.status === "atrisk").length;
  const auction = real.filter((s) => s.status === "auction").length;
  const awaiting = real.filter((s) => s.status === "assigned").length;
  const conflicts = real.filter((s) => s.conflict).length;
  const crossBu = real.filter((s) => s.trainer && trainerOf(s.trainer) && buOf(trainerOf(s.trainer).site)?.id !== s.bu).length;
  const fillRate = total ? Math.round((confirmed / total) * 100) : 0;
  const backfillRate = total ? Math.round(((unassigned + atRisk) / total) * 100) : 0;
  return { total, confirmed, unassigned, atRisk, auction, awaiting, conflicts, crossBu, fillRate, backfillRate };
}
function byUnit(sessions, level) {
  const groups = {};
  sessions.filter((s) => s.status !== "travel").forEach((s) => {
    const id = s[level]; if (!id) return;
    (groups[id] = groups[id] || []).push(s);
  });
  return Object.entries(groups).map(([id, list]) => ({ unit: orgUnit(id), kpis: computeKpis(list) }))
    .sort((a, b) => b.kpis.total - a.kpis.total);
}
function trainerUtilisation(sessions) {
  const groups = {};
  sessions.filter((s) => s.trainer && s.status !== "travel").forEach((s) => (groups[s.trainer] = groups[s.trainer] || []).push(s));
  return Object.entries(groups).map(([id, list]) => ({ trainer: trainerOf(id), count: list.length,
    conflicts: list.filter((s) => s.conflict).length })).sort((a, b) => b.count - a.count);
}

/* ─────────────────────── DENSITY / OVERLAP LANES ───────────────────────
   Assigns each session in a day to the first lane it does not overlap in,
   opening a new lane only when it must. This is the "stacked events / event
   lanes" technique the brief calls for so overlapping sessions stay legible
   instead of being treated as an error.
   ═══════════════════════════════════════════════════════════════════════ */
function computeLanes(daySessions) {
  const sorted = [...daySessions].sort((a, b) => toMins(a.start) - toMins(b.start));
  const lanes = [];
  sorted.forEach((s) => {
    let lane = lanes.find((l) => toMins(l[l.length - 1].end) <= toMins(s.start));
    if (!lane) { lane = []; lanes.push(lane); }
    lane.push(s);
  });
  return lanes;
}

/* ═══════════════════════════════════════════════════════════════════════
   HIERARCHY FILTER BAR — cascading BU -> Site -> Department, always
   pre-scoped to the viewer's root so an out-of-scope option can never
   even be offered (§27: "structure the UI around the access scope,
   don't merely hide data").
   ═══════════════════════════════════════════════════════════════════════ */
function HierarchyFilterBar({ root, value, onChange, showModule, showStatus, showDateRange, showSearch, onSaveView, savedViews }) {
  const rootUnit = orgUnit(root);
  const buOptions = rootUnit.level === "central" ? BUS : rootUnit.level === "bu" ? [rootUnit] : [buOf(root)];
  const siteOptions = (value.bu ? orgChildren(value.bu) : (rootUnit.level === "site" ? [rootUnit] : orgChildren(root === "CENTRAL" ? null : root)))
    .filter((s) => s?.level === "site" && orgSubtreeIds(root).includes(s.id));
  const siteScope = rootUnit.level === "site" ? [rootUnit] : value.bu ? orgChildren(value.bu).filter((s) => s.level === "site") : SITES.filter((s) => orgSubtreeIds(root).includes(s.id));
  const deptScope = value.site ? orgChildren(value.site) : rootUnit.level === "department" ? [rootUnit] : DEPARTMENTS.filter((d) => orgSubtreeIds(root).includes(d.id));

  const set = (patch) => onChange({ ...value, ...patch });
  const clearAll = () => onChange(emptyFilters());

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap", padding: "12px 14px",
      background: "#fff", border: `1px solid ${V.border}`, borderRadius: 10, marginBottom: 14 }}>
      {rootUnit.level === "central" && (
        <Field label="Business unit">
          <Select value={value.bu} onChange={(e) => set({ bu: e.target.value, site: "", dept: "" })}>
            <option value="">All BUs</option>{buOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
      )}
      {rootUnit.level !== "site" && rootUnit.level !== "department" && (
        <Field label="Site">
          <Select value={value.site} onChange={(e) => set({ site: e.target.value, dept: "" })}>
            <option value="">All sites</option>{siteScope.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      )}
      {rootUnit.level !== "department" && (
        <Field label="Department">
          <Select value={value.dept} onChange={(e) => set({ dept: e.target.value })}>
            <option value="">All departments</option>{deptScope.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
      )}
      {showModule && (
        <Field label="Session type">
          <Select value={value.mod} onChange={(e) => set({ mod: e.target.value })}>
            <option value="">All types</option>{MODULES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
      )}
      {showStatus && (
        <Field label="Status">
          <Select value={value.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All statuses</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      )}
      {showDateRange && (
        <>
          <Field label="From"><Input type="date" value={value.from} onChange={(e) => set({ from: e.target.value })} style={{ width: 148 }} /></Field>
          <Field label="To"><Input type="date" value={value.to} onChange={(e) => set({ to: e.target.value })} style={{ width: 148 }} /></Field>
        </>
      )}
      {showSearch && (
        <Field label="Search">
          <Input placeholder="Session, trainer, department…" value={value.q} onChange={(e) => set({ q: e.target.value })} style={{ width: 210 }} />
        </Field>
      )}
      <div style={{ flex: 1 }} />
      {filtersActive(value) && <Btn size="sm" onClick={clearAll}>Clear filters</Btn>}
      {onSaveView && <Btn size="sm" kind="outline" onClick={onSaveView}>Save view</Btn>}
    </div>
  );
}

/* Hierarchy selection summary above scheduler and dashboard */
function ScopeSummary({ root, filters }) {
  const parts = [orgUnit(root)];
  if (filters.bu && root === "CENTRAL") parts.push(orgUnit(filters.bu));
  if (filters.site) parts.push(orgUnit(filters.site));
  if (filters.dept) parts.push(orgUnit(filters.dept));
  if (parts.length <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10, fontSize: 12, color: V.text2 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: V.text3, textTransform: "uppercase", letterSpacing: ".04em" }}>Scope:</span>
      {parts.map((p, i) => (
        <React.Fragment key={p.id}>
          {i > 0 && <span style={{ color: V.text3 }}>/</span>}
          <span style={{ fontWeight: i === parts.length - 1 ? 600 : 400, color: i === parts.length - 1 ? V.primary : V.text2 }}>{p.name}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════════════════════════════════════ */
const DEMO_USERS = [
  { id: "U1", name: "N. Verma", role: "central", title: "Central Admin", scope: "Central — all business units" },
  // One BU Head per business unit; `root` pins each to their own BU.
  { id: "U2", name: "R. Kapoor", role: "bu", title: "BU Head · Ports", scope: "Ports business unit", root: "BU-PORTS" },
  { id: "U10", name: "A. Khanna", role: "bu", title: "BU Head · Logistics", scope: "Logistics business unit", root: "BU-LOGISTICS" },
  { id: "U11", name: "M. Bose", role: "bu", title: "BU Head · Energy", scope: "Energy business unit", root: "BU-ENERGY" },
  { id: "U3", name: "S. Bhatt", role: "site", title: "Site Head", scope: "Mundra site" },
  { id: "U4", name: "D. Menon", role: "scheduler", title: "Scheduler", scope: "Mundra site" },
  { id: "U5", name: "F. Sheikh", role: "coordinator", title: "Training Coordinator", scope: "Mundra site" },
  { id: "U6", name: "A. Ranjan", role: "assessor", title: "Competency Assessor", scope: "All sites" },
  // Trainers no longer sign in on web — their own schedule/session confirmation,
  // punch in/out and leave live exclusively in the ShiftEaze mobile app.
  { id: "U9", name: "I. Qureshi", role: "vendor_admin", title: "Vendor Admin", scope: "Skill Partners", vendor: "Skill Partners" },
];

function Login({ onLogin, authStage, pendingUserId, onOtpVerify }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const pendingUser = DEMO_USERS.find((u) => u.id === pendingUserId);
  const accountOf = (userId) => WEB_ACCOUNTS.find((a) => a.userId === userId);

  const submit = () => {
    const account = verifyWebLogin(email, password);
    if (!account) { setError("That email and password don't match any account."); return; }
    setError("");
    onLogin(account.userId);
  };
  // Demo convenience: picking an account fills its credentials in for you.
  const fill = (userId) => {
    const a = accountOf(userId);
    if (!a) return;
    setEmail(a.email); setPassword(a.password); setError("");
  };
  const onEnter = (e) => { if (e.key === "Enter") submit(); };
  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter',-apple-system,sans-serif", background: V.page }}>
      <style>{FONTS}{`@keyframes sh{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
      <div style={{ flex: "0 0 44%", background: V.primary, color: "#fff", padding: 44, display: "flex",
        flexDirection: "column", justifyContent: "space-between" }} className="hide-sm">
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 19, fontWeight: 700 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
            {Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ width: 5, height: 5, background: "#d8d5f2", borderRadius: 1 }} />)}
          </div>ShiftEaze
        </div>
        <div>
          <div style={{ fontSize: 29, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-.02em", maxWidth: 420 }}>
            One organisational hierarchy — Central, Business Unit, Site, Department — driving every dashboard and every schedule.</div>
          <div style={{ display: "flex", gap: 30, marginTop: 32 }}>
            {[["3", "business units"], ["5", "sites"], ["7", "departments"]].map(([n, l]) => (
              <div key={l}><Num style={{ fontSize: 21, fontWeight: 700 }}>{n}</Num><div style={{ fontSize: 11.5, color: "#b9b4e4", marginTop: 3 }}>{l}</div></div>))}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: "#9d98d0" }}>Riddhi Corporate Services · NextEdge</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
        {authStage === "otp" ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>Verify it's you</h1>
            <p style={{ fontSize: 13, color: V.text2, margin: "6px 0 22px" }}>External accounts need a one-time code. We sent one to {pendingUser?.name}.</p>
            <Field label="6-digit code"><Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{ width: "100%", textAlign: "center", letterSpacing: "0.4em", fontSize: 16, height: 44 }} placeholder="······" /></Field>
            <Btn kind="primary" style={{ width: "100%", marginTop: 14 }} disabled={otp.length !== 6} onClick={() => onOtpVerify(pendingUserId)}>Verify and sign in</Btn>
          </>
        ) : (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>Sign in</h1>
          <p style={{ fontSize: 13, color: V.text2, margin: "6px 0 22px" }}>Enterprise workforce scheduling</p>
          <div style={{ display: "grid", gap: 9, marginBottom: 20 }}>
            <Btn>⛨ Continue with single sign-on</Btn>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 16px" }}>
            <span style={{ flex: 1, height: 1, background: V.border }} /><span style={{ fontSize: 11, color: V.text3 }}>or sign in with email</span>
            <span style={{ flex: 1, height: 1, background: V.border }} />
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Work email"><Input type="email" autoComplete="username" value={email} onKeyDown={onEnter} placeholder="name@rcsl.com"
              onChange={(e) => { setEmail(e.target.value); setError(""); }} style={{ width: "100%", height: 40 }} /></Field>
            <Field label="Password">
              <div style={{ position: "relative" }}>
                <Input type={showPw ? "text" : "password"} autoComplete="current-password" value={password} onKeyDown={onEnter} placeholder="••••••••"
                  onChange={(e) => { setPassword(e.target.value); setError(""); }} style={{ width: "100%", height: 40, paddingRight: 56 }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent",
                    color: V.primary, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{showPw ? "Hide" : "Show"}</button>
              </div>
            </Field>
          </div>
          {error && <div role="alert" style={{ marginTop: 10, fontSize: 12.5, color: "#b3261e", background: "#fdecea", borderRadius: 8, padding: "8px 10px" }}>{error}</div>}
          <Btn kind="primary" style={{ width: "100%", marginTop: 14 }} disabled={!email || !password} onClick={submit}>Sign in</Btn>

          <div style={{ fontSize: 11, fontWeight: 600, color: V.text3, textTransform: "uppercase", letterSpacing: ".04em", margin: "22px 0 8px" }}>
            Demo accounts — click to fill in</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
            {DEMO_USERS.filter((u) => accountOf(u.id)).map((u) => {
              const picked = accountOf(u.id)?.email === email.trim().toLowerCase();
              return (
              <button key={u.id} onClick={() => fill(u.id)} style={{ textAlign: "left", border: `1.5px solid ${picked ? V.primary : V.border}`,
                borderRadius: 9, padding: "9px 11px", background: picked ? V.primarySoft : "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: V.primary, color: "#fff", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600, flexShrink: 0 }}>{initials(u.name)}</span>
                  <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}{u.vendor && " · OTP"}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: V.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.title}</span></span>
                </div>
              </button>);
            })}
          </div>
          <p style={{ fontSize: 11, color: V.text3, marginTop: 14, textAlign: "center" }}>
            Central, BU and Site accounts can switch views from the top bar to compare scopes.</p>
        </>
        )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SESSION CARD — compact, information-rich, used in every density level
   ═══════════════════════════════════════════════════════════════════════ */
function SessionCard({ s, onClick, compact }) {
  const mod = moduleOf(s.mod);
  const t = s.trainer ? trainerOf(s.trainer) : null;
  const st = STATUS[s.status] ?? STATUS.draft;
  return (
    <button onClick={() => onClick(s)} style={{ width: "100%", textAlign: "left", border: 0, cursor: "pointer", fontFamily: "inherit",
      borderRadius: 7, padding: compact ? "5px 7px" : "8px 10px", background: st.bg,
      borderLeft: `3px solid ${st.bar}`, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: compact ? 10.5 : 12, fontWeight: 700, color: st.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {s.label ?? mod?.short}</span>
        {s.conflict && <span title="Scheduling conflict" style={{ fontSize: 10, color: "#b3261e" }}>⚠</span>}
        {mod?.level === "skilled" && <span title="Skilled — competency-gated" style={{ fontSize: 9, color: st.fg, opacity: .7 }}>●</span>}
        {s.secondaryTrainer && <span title="Has a secondary trainer" style={{ fontSize: 9, color: st.fg, opacity: .7 }}>+2</span>}
      </div>
      <div style={{ fontSize: compact ? 9.5 : 11, color: st.fg, opacity: .85, marginTop: 1 }}>
        {s.start}–{s.end}{!compact && t ? ` · ${t.name}` : !compact ? " · unassigned" : ""}</div>
      {!compact && <div style={{ fontSize: 10, color: st.fg, opacity: .7, marginTop: 1 }}>
        {orgUnit(s.dept)?.name ?? orgUnit(s.site)?.name}</div>}
    </button>
  );
}

/* Collapses an overlong lane into the first few cards plus a "+N more" that
   expands inline — exactly the technique the brief calls out in §7 and §24. */
function DenseSessionList({ sessions, onOpen, limit = 3 }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? sessions : sessions.slice(0, limit);
  const hidden = sessions.length - shown.length;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {shown.map((s) => <SessionCard key={s.id} s={s} onClick={onOpen} compact />)}
      {hidden > 0 && (
        <button onClick={() => setExpanded(true)} style={{ border: `1px dashed ${V.borderStrong}`, background: "#fff", borderRadius: 6,
          padding: "4px 7px", fontSize: 10.5, color: V.text2, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
          +{hidden} more</button>)}
      {expanded && sessions.length > limit && (
        <button onClick={() => setExpanded(false)} style={{ border: 0, background: "transparent", fontSize: 10, color: V.text3, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
          Show less</button>)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ASSIGNMENT PANELS — Recommended (Group 1) and Auction (Group 2), per
   Architecture v2.1 §9.1.
   ═══════════════════════════════════════════════════════════════════════ */
const InfoBtn = ({ onClick, active, title = "Show validation details" }) => (
  <button title={title} onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${active ? V.primary : "#c9c6dc"}`, flexShrink: 0,
      background: active ? V.primary : "#fff", color: active ? "#fff" : V.primary, fontSize: 11.5, fontWeight: 700,
      fontStyle: "italic", fontFamily: "Georgia, serif", cursor: "pointer", lineHeight: 1, padding: 0 }}>i</button>
);

function candidateBadges(c, s) {
  const out = [];
  if (s.nominee === c.emp.id) out.push(["HOT LEAD", "#fff1e6", "#b4530a"]);
  if ((s.interests ?? []).includes(c.emp.id)) out.push(["INTERESTED", STATUS.auction.bg, STATUS.auction.fg]);
  if (c.travelMin === 0) out.push(["LOCAL", "#eef8f2", "#137a3f"]);
  else if (buOf(c.emp.site)?.id !== s.bu) out.push(["CROSS-BU — TRAVEL REQUIRED", "#fef8ee", "#9a5b06"]);
  else out.push([`TRAVEL ${Math.round(c.travelMin / 6) / 10}h`, "#fef8ee", "#9a5b06"]);
  if (c.weekLoad <= 1) out.push(["UNDER-UTILISED", "#eaf3fc", "#1d5fa8"]);
  if (c.emp.feedbackCount < 10) out.push(["PROVISIONAL", "#f4f4f7", V.text2]);
  return out;
}

function CandidateRow({ c, s, rank, weights, canAssign, onAssign, onSecondary, bid, blocked, accent = V.primary }) {
  const top3 = WEIGHT_META.map(([k, l]) => [l, (c.sub[k] * weights[k]) / 100]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const desig = DESIGNATIONS.find((d) => d.id === c.emp.designation)?.name;
  return (
    <div style={{ borderTop: `1px solid ${V.border}`, opacity: blocked ? 0.72 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 16px" }}>
        {rank != null && <Num style={{ fontSize: 11, color: V.text3, width: 14, paddingTop: 7 }}>{rank}</Num>}
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: blocked ? "#b9b6cc" : accent, color: "#fff", display: "flex", flexShrink: 0,
          alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600 }}>{initials(c.emp.name)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {c.emp.name}
            <span style={{ fontSize: 11, fontWeight: 400, color: V.text3 }}>{desig}</span>
            {rank === 1 && !blocked && <Pill tone="success">★ Top match</Pill>}
          </div>
          <div style={{ fontSize: 11, color: V.text2, marginTop: 2 }}>
            {orgUnit(c.emp.site)?.name} · week load <Num>{c.weekLoad}</Num> · TCI <Num>{c.tci ?? "—"}</Num>
          </div>
          {blocked ? (
            <div style={{ fontSize: 11, color: "#b3261e", marginTop: 3 }}>✗ {c.fails[0]}{c.fails.length > 1 ? ` (+${c.fails.length - 1} more)` : ""}</div>
          ) : (
            <div style={{ fontSize: 10.5, color: V.text3, marginTop: 2 }}>{top3.map(([l, v]) => `${l} ${v.toFixed(1)}`).join(" · ")}</div>
          )}
          {bid && <div style={{ fontSize: 10.5, color: STATUS.auction.fg, marginTop: 3 }}>✋ Registered {bid.at}{bid.note ? ` — “${bid.note}”` : ""}</div>}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
            {candidateBadges(c, s).map(([t, bg, fg]) => <span key={t} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".03em",
              background: bg, color: fg, padding: "2px 6px", borderRadius: 4 }}>{t}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {blocked ? <Pill tone="danger">Blocked</Pill> : <Num style={{ fontSize: 16, fontWeight: 700 }}>{c.total}</Num>}
          </div>
          {canAssign && !blocked && (
            <div style={{ display: "flex", gap: 4 }}>
              {onSecondary && <Btn size="sm" onClick={onSecondary} title="Assign as secondary trainer">+ 2nd</Btn>}
              <Btn size="sm" kind="primary" onClick={onAssign}>Assign</Btn>
            </div>)}
        </div>
      </div>
    </div>
  );
}

function RulesInfoModal({ kind, onClose }) {
  const H = ({ children }) => <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: V.text2, margin: "16px 0 8px" }}>{children}</div>;
  const AUCTION_RULES = [
    ["Visibility is hard-filter gated", "A trainer never sees a session they cannot legally take"],
    ["Interest does not block the calendar", "Otherwise a trainer interested in 5 sessions freezes their own availability"],
    ["Clash warning at registration", "Overlapping interests are warned; assignment to both is prevented"],
    ["Max 8 open interests per week", "Prevents blanket registration to game the interest signal"],
    ["Withdrawal before assignment is free", "No consequence of any kind"],
    ["Declining after assignment = normal decline", "Reason plus optional recommendation, nothing further"],
    ["Re-validated at assignment", "Certificates expire and leave gets approved — checked as of the session date, at commit"],
    ["Development opportunities shown separately", "One level short → offered as Secondary shadowing; declining never counts"],
    ["Visible to vendor admin", "Vendors manage interest for their own agency trainers"],
    ["Full audit trail", "Every registration, withdrawal, lapse and assignment is logged"],
  ];
  return (
    <Modal title={kind === "auction" ? "How the auction works" : "How recommendations are built"} width={640} onClose={onClose}
      sub={kind === "auction" ? "Architecture v2.1 §9.1, §11 — trainer-initiated interest" : "Architecture v2.1 §9 and §13 — one eligibility engine, ranked presentation"}
      footer={<Btn kind="primary" onClick={onClose}>Got it</Btn>}>
      <div style={{ fontSize: 12.5, color: V.text2, lineHeight: 1.55 }}>
        {kind === "auction"
          ? <p>The auction lists only trainers who <strong>registered interest</strong> in this session. Every bidder is <strong>re-validated</strong> against
              the same hard filters as the Recommended list, and ordered by score — not by who bid first. A bidder who has since become ineligible
              (say, a certificate expired) is shown greyed with the exact rule that now fails.</p>
          : <p>Stage 1 applies <strong>hard filters</strong> to the entire trainer pool — a candidate must pass all of them. Stage 2 ranks the survivors
              with a <strong>weighted score</strong>. Excluded trainers are never silently dropped: each one is listed with the rule they failed.</p>}
        {kind === "auction" ? (
          <>
            <H>Auction rules (§11.1)</H>
            {AUCTION_RULES.map(([r, d], i) => (
              <div key={r} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 6, marginBottom: 6 }}>
                <Num style={{ color: V.text3 }}>{i + 1}.</Num><div><strong style={{ color: V.text }}>{r}</strong> — {d}</div></div>))}
          </>
        ) : (
          <>
            <H>Hard filters — validation rules (§9.2)</H>
            {VALIDATION_RULES.map(([n, r, d]) => (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 6, marginBottom: 6 }}>
                <Num style={{ color: V.text3 }}>{n}.</Num><div><strong style={{ color: V.text }}>{r}</strong> — {d}</div></div>))}
            <H>Weighted scoring (§13.3)</H>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {WEIGHT_META.map(([k, l]) => <Pill key={k}>{l} {DEFAULT_WEIGHTS[k]}</Pill>)}
            </div>
          </>
        )}
        <H>Badges</H>
        {[["HOT LEAD", "Nominated by the trainer who declined, and eligible — pinned to the top"], ["INTERESTED", "Registered interest via the auction (+4% interest signal)"],
          ["LOCAL", "Based at the session's site — no travel"], ["CROSS-BU — TRAVEL REQUIRED", "Based in another business unit; travel is planned into the calendar"],
          ["UNDER-UTILISED", "At most one session this week"], ["PROVISIONAL", "Fewer than 10 rated sessions — score uses a smoothed prior"]].map(([b, d]) => (
          <div key={b} style={{ marginBottom: 5 }}><strong style={{ color: V.text, fontSize: 11 }}>{b}</strong> — {d}</div>))}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SESSION DETAIL DRAWER
   ═══════════════════════════════════════════════════════════════════════ */
function SessionDrawer({ s, role, onClose, dispatch, allSessions, weights }) {
  const mod = moduleOf(s.mod);
  const trainer = s.trainer ? trainerOf(s.trainer) : null;
  const dept = orgUnit(s.dept), site = orgUnit(s.site), bu = orgUnit(s.bu);
  const canEdit = role === "central" || role === "site" || role === "scheduler";
  // Recommendation and auction panels are visible to every role; assigning
  // from them is limited to roles that own the roster.
  const canAssign = canEdit || role === "bu";
  const [showExcluded, setShowExcluded] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);
  const [rulesModal, setRulesModal] = useState(null);

  const skillId = mod?.skill;
  const skipSkillGate = mod?.level === "foundation";
  const ctx = { skillId, dateIso: s.date, startMin: toMins(s.start), endMin: toMins(s.end), siteId: s.site, excludeId: s.id, skipSkillGate, interests: s.interests ?? [] };
  const ranked = mod ? rankCandidates(EMPLOYEES.filter((e) => e.id !== s.trainer), ctx, allSessions, weights) : { eligible: [], excluded: [] };

  // §9.2 rule 15 — every hard filter re-runs at commit, against the live session table.
  const commitAssign = (empId, as) => {
    const emp = empOf(empId);
    const recheck = eligibility(emp, { ...ctx, busySessions: allSessions.filter((x) => x.trainer === empId || x.secondaryTrainer === empId) });
    if (!recheck.pass) { dispatch({ type: "toast", msg: `Can't assign ${emp.name} — ${recheck.fails[0]}` }); return; }
    if (as === "secondary") dispatch({ type: "reassignSecondary", id: s.id, trainer: empId });
    else { dispatch({ type: "reassign", id: s.id, trainer: empId }); onClose(); }
  };

  // Auction block: cross-reference everyone who registered interest against the
  // same engine ranking above, so an interested trainer who has since gone on
  // leave (say) still shows the real blocking reason rather than a bare name.
  const eligMap = new Map(ranked.eligible.map((c) => [c.emp.id, c]));
  const exclMap = new Map(ranked.excluded.map((c) => [c.emp.id, c]));
  const interested = (s.interests ?? []).map((id) => ({ emp: empOf(id), elig: eligMap.get(id), excl: exclMap.get(id) })).filter((r) => r.emp);

  // A same-day, same-trainer clash list — for the "why flagged" explanation.
  const clashes = trainer ? allSessions.filter((o) => o.id !== s.id && o.trainer === trainer.id && o.date === s.date
    && toMins(o.start) < toMins(s.end) && toMins(s.start) < toMins(o.end)) : [];

  return (
    <Drawer onClose={onClose} width={560}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${V.border}`, position: "sticky", top: 0, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <StatusBadge status={s.status} />
              {interested.length > 0 && <Pill tone="primary" style={{ background: STATUS.auction.bg, color: STATUS.auction.fg }}>{interested.length} interested</Pill>}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 8 }}>{s.label ?? mod?.name}</div>
            <div style={{ fontSize: 12.5, color: V.text2, marginTop: 3 }}><Num>{s.id}</Num> · {fmtLong(s.date)}</div>
          </div>
          <button onClick={onClose} style={{ border: 0, background: "transparent", fontSize: 22, cursor: "pointer", color: V.text3 }}>×</button>
        </div>
      </div>

      <div style={{ padding: 20, display: "grid", gap: 16 }}>
        <Card>
          <CardHead label="Organisational context" />
          <Breadcrumbs path={[CENTRAL, bu, site, dept].filter(Boolean)} />
        </Card>

        <Card>
          <CardHead label="Schedule" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
            <div><div style={{ fontSize: 11, color: V.text3 }}>Date</div><div style={{ marginTop: 2 }}>{fmtDay(s.date)}</div></div>
            <div><div style={{ fontSize: 11, color: V.text3 }}>Time</div><div style={{ marginTop: 2 }}><Num>{s.start}–{s.end}</Num> ({s.dur} min)</div></div>
            <div><div style={{ fontSize: 11, color: V.text3 }}>Last updated</div><div style={{ marginTop: 2 }}><Num>{s.updatedAt}</Num></div></div>
            <div><div style={{ fontSize: 11, color: V.text3 }}>Created by</div><div style={{ marginTop: 2 }}>{s.createdBy}</div></div>
          </div>
        </Card>

        {s.status !== "travel" && (
          <Card>
            <CardHead label="Participants & capacity" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: trainer ? 12 : 0 }}>
              <div><div style={{ fontSize: 11, color: V.text3 }}>Learners</div><div style={{ marginTop: 2 }}>{s.learners} of {s.capacity}</div></div>
              <div><div style={{ fontSize: 11, color: V.text3 }}>Capacity used</div>
                <div style={{ marginTop: 4 }}><Bar v={(s.learners / Math.max(1, s.capacity)) * 100} /></div></div>
            </div>
            {trainer ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: `1px solid ${V.border}` }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: V.primary, color: "#fff", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>{initials(trainer.name)}</span>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{trainer.name} <span style={{ fontWeight: 400, color: V.text3, fontSize: 11 }}>· primary</span></div>
                  <div style={{ fontSize: 11.5, color: V.text2 }}>Based at {orgUnit(trainer.site)?.name}</div></div>
                <span style={{ marginLeft: "auto" }}><StatusBadge status={s.status} compact /></span>
              </div>
            ) : <div style={{ fontSize: 12.5, color: STATUS.unassigned.fg, background: STATUS.unassigned.bg, padding: "8px 10px", borderRadius: 7 }}>
                  No trainer assigned yet — see the two panels below.</div>}

            {/* Secondary trainer — a fully independent, optional assist role.
                Its own mini-status never changes the session's overall status above. */}
            {(() => {
              const secTrainer = s.secondaryTrainer ? empOf(s.secondaryTrainer) : null;
              const secTone = s.secondaryStatus === "confirmed" ? { bg: STATUS.confirmed.bg, fg: STATUS.confirmed.fg, label: "Confirmed" }
                : s.secondaryStatus === "assigned" ? { bg: STATUS.assigned.bg, fg: STATUS.assigned.fg, label: "Awaiting response" } : null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, marginTop: 12, borderTop: `1px dashed ${V.border}`, flexWrap: "wrap" }}>
                  {secTrainer ? (
                    <>
                      <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#9d96d8", color: "#fff", display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials(secTrainer.name)}</span>
                      <div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{secTrainer.name} <span style={{ fontWeight: 400, color: V.text3, fontSize: 11 }}>· secondary</span></div>
                        <div style={{ fontSize: 11, color: V.text2 }}>{orgUnit(secTrainer.site)?.name}</div></div>
                      {secTone && <Pill style={{ background: secTone.bg, color: secTone.fg }}>{secTone.label}</Pill>}
                      {canEdit && <Btn size="sm" kind="danger" style={{ marginLeft: "auto" }} onClick={() => dispatch({ type: "reassignSecondary", id: s.id, trainer: null })}>Remove</Btn>}
                    </>
                  ) : <div style={{ fontSize: 12, color: V.text3 }}>No secondary trainer — fully optional.</div>}
                </div>);
            })()}
            {canEdit && mod && !s.secondaryTrainer && (
              <div style={{ marginTop: 10 }}>
                <Select defaultValue="" onChange={(e) => { if (e.target.value) dispatch({ type: "reassignSecondary", id: s.id, trainer: e.target.value }); }}
                  style={{ width: "100%", height: 32, fontSize: 12 }}>
                  <option value="">+ Add a secondary trainer (optional)</option>
                  {ranked.eligible.filter((c) => c.emp.id !== s.trainer).map((c) => <option key={c.emp.id} value={c.emp.id}>{c.emp.name} · {c.total}</option>)}
                </Select>
              </div>
            )}
            {clashes.length > 0 && (
              <div style={{ marginTop: 12, padding: "9px 11px", background: "#fce8e8", borderRadius: 7 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#b3261e" }}>Conflict — same trainer, overlapping time</div>
                {clashes.map((c) => <div key={c.id} style={{ fontSize: 11.5, color: "#b3261e", marginTop: 3 }}>
                  {c.label ?? moduleOf(c.mod)?.name} · {c.start}–{c.end} · {orgUnit(c.dept)?.name ?? orgUnit(c.site)?.name}</div>)}
              </div>)}
          </Card>
        )}

        <Card>
          <CardHead label="Activity" />
          <div style={{ fontSize: 12.5, color: V.text2, display: "grid", gap: 7 }}>
            <div>· Created by {s.createdBy} — {s.updatedAt}</div>
            <div>· Status is currently <strong>{STATUS[s.status]?.label}</strong></div>
            {s.conflict && <div style={{ color: "#b3261e" }}>· Flagged as a scheduling conflict</div>}
          </div>
        </Card>

        {s.status !== "travel" && skillId && (() => {
          // HOT LEAD (§13.4 E-03): an eligible nominee is pinned to the top of Group 1.
          const recs = [...ranked.eligible].sort((a, b) => (b.emp.id === s.nominee) - (a.emp.id === s.nominee));
          const shownRecs = showAllRecs ? recs : recs.slice(0, 4);
          const bids = interested.map((r) => r.elig ? { ...r.elig, bid: true } : r.excl ? { ...r.excl, blocked: true } : null).filter(Boolean)
            .sort((a, b) => (a.blocked - b.blocked) || (b.total - a.total));
          const invite = recs.filter((c) => !(s.interests ?? []).includes(c.emp.id)).slice(0, Math.max(0, 4 - bids.length));
          const row = (c, key, extra = {}) => (
            <CandidateRow key={key} c={c} s={s} weights={weights}
              canAssign={canAssign} onAssign={() => commitAssign(c.emp.id, "primary")}
              onSecondary={c.emp.id !== s.trainer && c.emp.id !== s.secondaryTrainer ? () => commitAssign(c.emp.id, "secondary") : null} {...extra} />);
          return (
            <>
              {/* GROUP 1 — Recommended, AI matching-engine ranked */}
              <Card pad={false} style={{ border: `1.5px solid ${V.primary}30`, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", background: V.primarySoft, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>◆ Recommended <span style={{ fontWeight: 400, color: V.text2 }}>— AI matching engine</span></div>
                    <div style={{ fontSize: 12, color: V.text2, marginTop: 3 }}>
                      {ranked.eligible.length} eligible · {ranked.excluded.length} blocked · {trainer ? "ranked as replacements for the current trainer" : "ranked for this exact session"}</div>
                  </div>
                  <InfoBtn title="How recommendations are built" onClick={() => setRulesModal("rec")} />
                </div>
                {ranked.eligible.length === 1 && (
                  <div style={{ padding: "8px 16px", fontSize: 11.5, background: "#fef8ee", color: "#9a5b06", borderTop: `1px solid ${V.border}` }}>
                    ⚠ Single point of failure — only one eligible trainer for this session (§13.4 E-02)</div>)}
                {ranked.eligible.length === 0
                  ? <div style={{ padding: "0 16px 16px" }}><EmptyState title="No one is eligible" hint="Every candidate is blocked — open the blocked list below to see which rule each one fails." icon="⚠" /></div>
                  : shownRecs.map((c) => row(c, `rec-${c.emp.id}`, { rank: c.emp.id === s.nominee ? "★" : recs.indexOf(c) + 1 }))}
                {recs.length > 4 && (
                  <button onClick={() => setShowAllRecs(!showAllRecs)} style={{ width: "100%", padding: "9px 16px", border: 0, borderTop: `1px solid ${V.border}`,
                    background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: V.primary, fontWeight: 600 }}>
                    {showAllRecs ? "Show top 4 only" : `Show all ${recs.length} eligible trainers`}</button>)}
                <div style={{ borderTop: `1px solid ${V.border}` }}>
                  <button onClick={() => setShowExcluded(!showExcluded)} style={{ width: "100%", display: "flex", justifyContent: "space-between",
                    padding: "11px 16px", border: 0, background: "#fafafc", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, color: V.text2 }}>
                    <span>{ranked.excluded.length} blocked — every failing rule shown</span><span>{showExcluded ? "▲" : "▼"}</span></button>
                  {showExcluded && ranked.excluded.map((c) => row(c, `exc-${c.emp.id}`, { blocked: true }))}
                </div>
              </Card>

              {/* GROUP 2 — Auction: trainers who put their own hand up, re-validated */}
              <Card pad={false} style={{ border: `1.5px solid ${STATUS.auction.bar}40`, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", background: STATUS.auction.bg, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: STATUS.auction.fg }}>✋ Auction <span style={{ fontWeight: 400 }}>— registered interest</span></div>
                    <div style={{ fontSize: 12, color: STATUS.auction.fg, marginTop: 3, opacity: .85 }}>
                      {bids.length ? `${bids.length} bid${bids.length > 1 ? "s" : ""} · ${bids.filter((b) => !b.blocked).length} still eligible after re-validation · ordered by score`
                        : "No bids yet — invite the best-matched trainers below"}</div>
                  </div>
                  <InfoBtn title="How the auction works" onClick={() => setRulesModal("auction")} />
                </div>
                {bids.map((c) => row(c, `bid-${c.emp.id}`, { bid: s.interestMeta?.[c.emp.id] ?? { at: "earlier" }, blocked: c.blocked, accent: STATUS.auction.bar }))}
                {invite.length > 0 && (
                  <>
                    <div style={{ padding: "9px 16px", borderTop: `1px solid ${V.border}`, background: "#faf8fe", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#6b21a8", textTransform: "uppercase", letterSpacing: ".04em" }}>
                        Recommended to invite</span>
                      {canAssign && <Btn size="sm" onClick={() => dispatch({ type: "auctionInvite", id: s.id, emps: invite.map((c) => c.emp.id) })}>Invite {invite.length}</Btn>}
                    </div>
                    {invite.map((c) => row(c, `inv-${c.emp.id}`, { accent: STATUS.auction.bar }))}
                  </>)}
              </Card>
            </>
          );
        })()}
        {canEdit && s.status !== "travel" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn size="sm" onClick={() => dispatch({ type: "duplicate", id: s.id })}>Duplicate</Btn>
            <Btn size="sm" kind="danger" onClick={() => { dispatch({ type: "cancel", id: s.id }); onClose(); }}>Cancel session</Btn>
          </div>
        )}
        {role === "bu" && s.status !== "travel" && (
          <Card>
            <CardHead label="BU actions" sub="BU Heads have read visibility and can escalate to the site scheduler" />
            <Btn size="sm" onClick={() => dispatch({ type: "escalate", id: s.id })}>Escalate to Site scheduler</Btn>
          </Card>
        )}
      </div>
      {rulesModal && <RulesInfoModal kind={rulesModal} onClose={() => setRulesModal(null)} />}
    </Drawer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD PANELS — published rosters, coverage by day, status breakdown.
   Status colours are the STATUS bar colours, folded into four buckets and
   stacked in validated order (confirmed → awaiting → open → at risk); every
   segment also carries a visible count so colour is never the only cue.
   ═══════════════════════════════════════════════════════════════════════ */
const BUCKETS = [
  ["confirmed", "Confirmed", STATUS.confirmed.bar],
  ["awaiting", "Awaiting response", STATUS.assigned.bar],
  ["open", "Open (unassigned / auction / draft)", STATUS.unassigned.bar],
  ["atrisk", "At risk", STATUS.atrisk.bar],
];
const bucketOf = (s) => s.status === "confirmed" ? "confirmed" : s.status === "assigned" ? "awaiting" : s.status === "atrisk" ? "atrisk" : "open";
const bucketCounts = (list) => {
  const c = { confirmed: 0, awaiting: 0, open: 0, atrisk: 0 };
  list.forEach((s) => { if (s.status !== "travel") c[bucketOf(s)] += 1; });
  return c;
};

function RosterFocusNote({ batch }) {
  if (!batch?.name) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", marginBottom: 12, borderRadius: 8,
      background: "#eef8f2", border: "1px solid #b8e3c8", fontSize: 12.5, color: "#137a3f" }}>
      <span style={{ fontWeight: 700 }}>Published roster:</span>
      <span>{batch.name} · {orgUnit(batch.dept)?.name}, {orgUnit(batch.site)?.name} · {fmtDay(batch.from)} – {fmtDay(batch.to)} · {batch.count} sessions</span>
    </div>
  );
}

function BucketLegend({ counts }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 11.5, color: V.text2 }}>
      {BUCKETS.map(([k, label, color]) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
          {label} <Num style={{ fontWeight: 700, color: V.text }}>{counts[k]}</Num>
        </span>))}
    </div>
  );
}

function StatusBreakdown({ sessions }) {
  const counts = bucketCounts(sessions);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <Card>
      <CardHead label="Schedule status" sub={`${total} sessions in this view`} />
      {total === 0 ? <EmptyState title="No sessions in this view" icon="▢" /> : (
        <>
          <div style={{ display: "flex", gap: 2, height: 16, marginBottom: 12 }}>
            {BUCKETS.filter(([k]) => counts[k]).map(([k, label, color], i, arr) => (
              <div key={k} title={`${label}: ${counts[k]} (${Math.round((counts[k] / total) * 100)}%)`}
                style={{ flex: counts[k], background: color, minWidth: 4,
                  borderRadius: `${i === 0 ? 4 : 0}px ${i === arr.length - 1 ? 4 : 0}px ${i === arr.length - 1 ? 4 : 0}px ${i === 0 ? 4 : 0}px` }} />))}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {BUCKETS.map(([k, label, color]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: V.text2 }}>{label}</span>
                <Num style={{ fontWeight: 700 }}>{counts[k]}</Num>
                <Num style={{ width: 40, textAlign: "right", color: V.text3 }}>{Math.round((counts[k] / total) * 100)}%</Num>
              </div>))}
          </div>
        </>
      )}
    </Card>
  );
}

function CoverageByDay({ sessions, filters, onOpenDay }) {
  const [hover, setHover] = useState(null);
  // Window: the filtered date range (up to 3 weeks), else the next two weeks from today.
  const start = filters.from ? parseD(filters.from) : parseD(TODAY);
  const lastWanted = filters.to ? parseD(filters.to) : addDays(start, 13);
  const span = Math.min(21, Math.max(1, Math.round((lastWanted - start) / 86400000) + 1));
  const days = Array.from({ length: span }, (_, i) => iso(addDays(start, i)));
  const perDay = days.map((d) => ({ d, c: bucketCounts(sessions.filter((s) => s.date === d)) }));
  const totalOf = (c) => c.confirmed + c.awaiting + c.open + c.atrisk;
  const max = Math.max(1, ...perDay.map((x) => totalOf(x.c)));
  const sum = perDay.reduce((acc, { c }) => { BUCKETS.forEach(([k]) => (acc[k] += c[k])); return acc; }, { confirmed: 0, awaiting: 0, open: 0, atrisk: 0 });
  const H = 150;
  const hov = hover != null ? perDay[hover] : null;
  return (
    <Card style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Coverage by day</div>
          <div style={{ fontSize: 12, color: V.text3, marginTop: 2 }}>{fmtDay(days[0])} – {fmtDay(days[days.length - 1])} · click a day to open it in the scheduler</div>
        </div>
        <BucketLegend counts={sum} />
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ height: 18, fontSize: 11.5, color: V.text2, marginBottom: 4 }}>
          {hov ? <span><strong style={{ color: V.text }}>{fmtLong(hov.d)}</strong> — {BUCKETS.map(([k, l]) => `${l.split(" (")[0]} ${hov.c[k]}`).join(" · ")}</span> : " "}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: 6, alignItems: "end", height: H + 18,
          borderBottom: `1px solid ${V.border}` }}>
          {perDay.map(({ d, c }, i) => {
            const t = totalOf(c);
            const segs = BUCKETS.filter(([k]) => c[k]);
            return (
              <button key={d} type="button" onClick={() => onOpenDay(d)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                title={`${fmtDay(d)}: ${t} sessions`}
                style={{ border: 0, padding: 0, background: hover === i ? "#f4f3fb" : "transparent", cursor: "pointer", height: "100%",
                  display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "stretch", borderRadius: 4, fontFamily: "inherit" }}>
                {t > 0 && <Num style={{ fontSize: 10.5, color: V.text2, textAlign: "center", marginBottom: 3 }}>{t}</Num>}
                <div style={{ display: "flex", flexDirection: "column-reverse", gap: 2, height: (t / max) * H, margin: "0 auto", width: "70%", maxWidth: 28 }}>
                  {segs.map(([k, , color], si) => (
                    <div key={k} style={{ flex: c[k], background: color, minHeight: 3,
                      borderRadius: si === segs.length - 1 ? "4px 4px 0 0" : 0 }} />))}
                </div>
              </button>);
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: 6, marginTop: 5 }}>
          {days.map((d) => {
            const dt = parseD(d);
            return <div key={d} style={{ textAlign: "center", fontSize: 10, color: d === TODAY ? V.primary : V.text3, fontWeight: d === TODAY ? 700 : 400, lineHeight: 1.3 }}>
              {fmtWd(dt).slice(0, 2)}<br /><Num>{dt.getDate()}</Num></div>;
          })}
        </div>
      </div>
    </Card>
  );
}

function PublishedRosters({ batches, sessions, onFocus, onOpenScheduler, onCreate }) {
  return (
    <Card pad={false} style={{ gridColumn: "1 / -1" }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <CardHead label="Published rosters" sub="Every roster published from Schedule Creation, newest first" />
        {onCreate && <Btn size="sm" onClick={onCreate}>+ Create roster</Btn>}
      </div>
      {batches.length === 0 ? (
        <div style={{ padding: "0 16px 16px" }}>
          <EmptyState title="No rosters published yet" hint="Create a template, then publish it from Schedule Creation → Trainer Assignment. It will appear here." icon="▤" />
        </div>
      ) : batches.map((b) => {
        const rows = sessions.filter((s) => s.batch === b.id);
        const c = bucketCounts(rows);
        const live = rows.length;
        return (
          <div key={b.id} style={{ display: "grid", gridTemplateColumns: "minmax(200px,1.6fr) 1.2fr 1fr auto", gap: 14, alignItems: "center",
            padding: "12px 16px", borderTop: `1px solid ${V.border}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
              <div style={{ fontSize: 11.5, color: V.text3, marginTop: 2 }}>{b.source} · published {b.at}</div>
            </div>
            <div style={{ fontSize: 12, color: V.text2 }}>
              {orgUnit(b.dept)?.name}, {orgUnit(b.site)?.name}<br />
              <span style={{ color: V.text3 }}>{fmtDay(b.from)} – {fmtDay(b.to)} · <Num>{live}</Num> sessions</span>
            </div>
            <div>
              <div style={{ display: "flex", gap: 2, height: 8, marginBottom: 5 }}>
                {BUCKETS.filter(([k]) => c[k]).map(([k, label, color]) => (
                  <div key={k} title={`${label}: ${c[k]}`} style={{ flex: c[k], background: color, borderRadius: 2, minWidth: 3 }} />))}
              </div>
              <div style={{ fontSize: 11, color: V.text3 }}>
                <Num>{c.confirmed}</Num> confirmed · <Num>{c.awaiting}</Num> awaiting · <Num>{c.open + c.atrisk}</Num> open</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn size="sm" onClick={() => onFocus(b)}>Focus</Btn>
              <Btn size="sm" kind="primary" onClick={() => onOpenScheduler(b)}>Scheduler →</Btn>
            </div>
          </div>);
      })}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARDS — one component, parameterised by scope level, per
   Architecture v2.1 §5.2 ("the same dashboard component, parameterised by
   the user's scope node — each level asks a different question").
   ═══════════════════════════════════════════════════════════════════════ */
function Dashboard({ role, root, allSessions, onOpenSession, go, loading, error, onRetry, preset, batches = [], openBatch }) {
  const [filters, setFilters] = useState(() => ({ ...emptyFilters(), ...(preset?.filters ?? {}) }));
  const scoped = useMemo(() => sessionsInScope(allSessions, root), [allSessions, root]);
  const filtered = useMemo(() => applyFilters(scoped, filters), [scoped, filters]);
  const kpis = computeKpis(filtered);
  const rootUnit = orgUnit(root);

  if (loading) return (
    <div><Skeleton h={13} w={220} style={{ marginBottom: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      <SkeletonRows /></div>);
  if (error) return <Card><ErrorState hint="We couldn't load the dashboard for this scope." onRetry={onRetry} /></Card>;

  // With a date range set (e.g. jumping in from a published roster) the site list shows that range instead of today.
  const ranged = !!(filters.from || filters.to);
  const today = ranged ? filtered.filter((s) => s.status !== "travel") : filtered.filter((s) => s.date === TODAY);
  const scopedBatches = batches.filter((b) => orgSubtreeIds(root).includes(b.site));
  const scopeOf = (b) => ({ bu: b.bu, site: b.site, dept: b.dept, from: b.from, to: b.to });
  const exceptions = filtered.filter((s) => ["unassigned", "atrisk"].includes(s.status));

  return (
    <div>
      <Breadcrumbs path={[CENTRAL, ...(role !== "central" ? [buOf(root)] : []), ...(role === "site" ? [orgUnit(root)] : [])].filter(Boolean)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.01em" }}>
            {role === "central" ? "Central Dashboard" : role === "bu" ? `${rootUnit.name} — BU Dashboard` : `${rootUnit.name} — Site Dashboard`}</h1>
          <p style={{ fontSize: 13, color: V.text2, marginTop: 3 }}>
            {role === "central" ? "Enterprise-wide overview across every business unit."
              : role === "bu" ? "Operational visibility across the sites in this business unit."
              : "Is next month's schedule covered? Today's operational picture for this site."}</p>
        </div>
        <Btn kind="outline" onClick={() => go("scheduler")}>Open scheduler →</Btn>
      </div>

      {preset?.batch && <RosterFocusNote batch={preset.batch} />}
      <HierarchyFilterBar root={root} value={filters} onChange={setFilters} showDateRange showModule />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {role === "central" && <>
          <Kpi label="Sessions in scope" value={kpis.total} sub={`${kpis.fillRate}% confirmed`} />
          <Kpi label="Unassigned" value={kpis.unassigned} tone={kpis.unassigned ? "#9a5b06" : V.text} onClick={() => setFilters({ ...filters, status: "unassigned" })} />
          <Kpi label="At risk (SLA)" value={kpis.atRisk} tone={kpis.atRisk ? "#b3261e" : V.text} sub="inside the notice window" onClick={() => setFilters({ ...filters, status: "atrisk" })} />
          <Kpi label="Cross-BU deployments" value={kpis.crossBu} sub="trainer from another BU" />
        </>}
        {role === "bu" && <>
          <Kpi label="Sessions this scope" value={kpis.total} sub={`${kpis.fillRate}% confirmed`} />
          <Kpi label="Open auctions" value={kpis.auction} tone={kpis.auction ? "#6d2fc4" : V.text} onClick={() => setFilters({ ...filters, status: "auction" })} />
          <Kpi label="Unassigned" value={kpis.unassigned} tone={kpis.unassigned ? "#9a5b06" : V.text} onClick={() => setFilters({ ...filters, status: "unassigned" })} />
          <Kpi label="Backfill rate" value={`${kpis.backfillRate}%`} sub="unassigned + at risk" />
        </>}
        {role === "site" && <>
          <Kpi label="Sessions this month" value={kpis.total} sub={`${kpis.fillRate}% confirmed`} />
          <Kpi label="Unassigned queue" value={kpis.unassigned} tone={kpis.unassigned ? "#9a5b06" : V.text} onClick={() => setFilters({ ...filters, status: "unassigned" })} />
          <Kpi label="Pending confirmation" value={kpis.awaiting} tone={kpis.awaiting ? "#2451c9" : V.text} onClick={() => setFilters({ ...filters, status: "assigned" })} />
          <Kpi label="At risk" value={kpis.atRisk} tone={kpis.atRisk ? "#b3261e" : V.text} onClick={() => setFilters({ ...filters, status: "atrisk" })} />
        </>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: role === "site" ? "1.5fr 1fr" : "1fr 1fr", gap: 16 }}>
        <Card pad={false}>
          <div style={{ padding: 16 }}>
            <CardHead label={role === "site" ? (ranged ? "Sessions in selected range" : "Today's schedule") : "Exceptions"}
              sub={role === "site" ? (ranged ? `${filters.from ? fmtDay(filters.from) : "…"} – ${filters.to ? fmtDay(filters.to) : "…"}` : fmtLong(TODAY)) : "Unassigned or at risk, soonest first — this is the queue that earns its keep"} />
          </div>
          {(role === "site" ? today : exceptions).length === 0 ? (
            <EmptyState title={role === "site" ? "Nothing scheduled today" : "No exceptions"} hint="Every session in scope has a confirmed trainer." icon="✓" />
          ) : (
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {(role === "site" ? today : exceptions).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).slice(0, 12).map((s) => (
                <div key={s.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${V.border}` }}><SessionCard s={s} onClick={onOpenSession} /></div>))}
            </div>
          )}
        </Card>

        <Card pad={false}>
          <div style={{ padding: 16 }}>
            <CardHead label={role === "central" ? "Business unit roll-up" : role === "bu" ? "Sites in this BU" : "Department summary"} />
          </div>
          <div style={{ padding: "0 16px 16px" }}>
            {byUnit(filtered, role === "central" ? "bu" : role === "bu" ? "site" : "dept").length === 0 ? (
              <EmptyState title="No data for this scope" icon="▢" />
            ) : byUnit(filtered, role === "central" ? "bu" : role === "bu" ? "site" : "dept").map(({ unit, kpis: k }) => (
              <div key={unit.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <button onClick={() => go("scheduler", null, unit.id)} style={{ border: 0, background: "transparent", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: V.text, padding: 0 }}>{unit.name}</button>
                  <Num style={{ fontSize: 12, color: V.text2 }}>{k.confirmed}/{k.total}</Num>
                </div>
                <Bar v={k.fillRate} color={k.atRisk ? "#e0453b" : "#28a862"} />
                {(k.unassigned > 0 || k.atRisk > 0) && <div style={{ fontSize: 11, color: V.text3, marginTop: 4 }}>
                  {k.unassigned > 0 && `${k.unassigned} unassigned`}{k.unassigned > 0 && k.atRisk > 0 && " · "}{k.atRisk > 0 && `${k.atRisk} at risk`}</div>}
              </div>
            ))}
          </div>
        </Card>

        {role === "site" && (
          <Card pad={false} style={{ gridColumn: "1 / -1" }}>
            <div style={{ padding: 16 }}><CardHead label="Classroom / capacity occupancy" sub="Learners booked against capacity, this scope" /></div>
            <div style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
              {filtered.filter((s) => s.status !== "travel").slice(0, 6).map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 140, fontSize: 12, color: V.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{moduleOf(s.mod)?.short}</span>
                  <div style={{ flex: 1 }}><Bar v={(s.learners / Math.max(1, s.capacity)) * 100} /></div>
                  <Num style={{ fontSize: 11.5, color: V.text3, width: 50, textAlign: "right" }}>{s.learners}/{s.capacity}</Num>
                </div>))}
            </div>
          </Card>
        )}
        <CoverageByDay sessions={filtered} filters={filters}
          onOpenDay={(d) => openBatch?.("scheduler", { id: "day", from: d, to: d, bu: filters.bu, site: filters.site, dept: filters.dept })} />
        <StatusBreakdown sessions={filtered} />
        {(
          <Card pad={false}>
            <div style={{ padding: 16 }}><CardHead label="Trainer utilisation" sub="Sessions held this scope, highest first" /></div>
            <div style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
              {trainerUtilisation(filtered).slice(0, 8).map(({ trainer, count, conflicts }) => (
                <div key={trainer.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 120, fontSize: 12, color: V.text2 }}>{trainer.name}</span>
                  <div style={{ flex: 1 }}><Bar v={Math.min(100, count * 10)} color={conflicts ? "#e0453b" : V.primary} /></div>
                  <Num style={{ fontSize: 11.5, color: V.text3, width: 70, textAlign: "right" }}>{count} sessions{conflicts ? ` · ${conflicts}⚠` : ""}</Num>
                </div>))}
            </div>
          </Card>
        )}
        <PublishedRosters batches={scopedBatches} sessions={allSessions}
          onFocus={(b) => setFilters({ ...emptyFilters(), ...scopeOf(b) })}
          onOpenScheduler={(b) => openBatch?.("scheduler", b)} onCreate={() => go("auto-rostering")} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ORGANIZATION — BU / Site / Department drill-down (§13, §14)
   ═══════════════════════════════════════════════════════════════════════ */
function Organization({ role, root, allSessions, go, openSession }) {
  const [focus, setFocus] = useState(root);
  useEffect(() => setFocus(root), [root]);

  const unit = orgUnit(focus);
  const scoped = sessionsInScope(allSessions, focus);
  const kpis = computeKpis(scoped);
  const children = orgChildren(focus).filter((c) => orgSubtreeIds(root).includes(c.id));
  const isLeafDept = unit.level === "department";

  const crumbPath = orgAncestors(focus);

  return (
    <div>
      <Breadcrumbs path={crumbPath} onNavigate={(p) => setFocus(p.id)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700 }}>{unit.name}</h1>
          <p style={{ fontSize: 13, color: V.text2, marginTop: 3 }}>
            {unit.level === "central" ? "Every business unit in the organisation." : unit.level === "bu" ? "Sites within this business unit."
              : unit.level === "site" ? "Departments within this site." : `Department head: ${unit.head ?? "—"}`}</p>
        </div>
        <Btn kind="outline" onClick={() => go("scheduler", null, focus)}>View in scheduler →</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <Kpi label="Sessions" value={kpis.total} sub={`${kpis.fillRate}% confirmed`} />
        <Kpi label="Unassigned" value={kpis.unassigned} tone={kpis.unassigned ? "#9a5b06" : V.text} />
        <Kpi label="At risk" value={kpis.atRisk} tone={kpis.atRisk ? "#b3261e" : V.text} />
        <Kpi label={isLeafDept ? "Trainers active" : "Sub-units"} value={isLeafDept ? trainerUtilisation(scoped).length : children.length} />
      </div>

      {!isLeafDept ? (
        <Card pad={false}>
          <div style={{ padding: 16 }}><CardHead label={unit.level === "central" ? "Business units" : unit.level === "bu" ? "Sites" : "Departments"} /></div>
          {children.length === 0 ? <EmptyState title={`No ${unit.level === "bu" ? "sites" : "departments"} found`} hint="Nothing is configured under this node yet." /> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, padding: "0 16px 16px" }}>
              {children.map((c) => {
                const ck = computeKpis(sessionsInScope(allSessions, c.id));
                return (
                  <Card key={c.id} onClick={() => setFocus(c.id)} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                      <Pill tone={ck.atRisk ? "danger" : ck.unassigned ? "warn" : "success"}>{ck.fillRate}%</Pill>
                    </div>
                    <Bar v={ck.fillRate} color={ck.atRisk ? "#e0453b" : "#28a862"} />
                    <div style={{ fontSize: 11.5, color: V.text3, marginTop: 8 }}>
                      {ck.total} sessions{ck.unassigned ? ` · ${ck.unassigned} unassigned` : ""}{c.head ? ` · Head: ${c.head}` : ""}</div>
                  </Card>);
              })}
            </div>
          )}
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
          <Card pad={false}>
            <div style={{ padding: 16 }}><CardHead label="Upcoming sessions" /></div>
            {scoped.filter((s) => s.date >= TODAY && s.status !== "travel").length === 0 ? <EmptyState title="Nothing upcoming" /> : (
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {scoped.filter((s) => s.date >= TODAY && s.status !== "travel").sort((a, b) => a.date.localeCompare(b.date))
                  .slice(0, 14).map((s) => <div key={s.id} style={{ padding: "9px 16px", borderBottom: `1px solid ${V.border}` }}>
                    <SessionCard s={s} onClick={openSession} /></div>)}
              </div>)}
          </Card>
          <Card pad={false}>
            <div style={{ padding: 16 }}><CardHead label="Personnel active here" /></div>
            <div style={{ padding: "0 16px 16px" }}>
              {trainerUtilisation(scoped).length === 0 ? <EmptyState title="No trainers active" /> :
                trainerUtilisation(scoped).map(({ trainer, count }) => (
                  <div key={trainer.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: `1px solid ${V.border}` }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: V.primary, color: "#fff", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600 }}>{initials(trainer.name)}</span>
                    <span style={{ flex: 1, fontSize: 12.5 }}>{trainer.name}</span>
                    <Num style={{ fontSize: 11.5, color: V.text3 }}>{count}</Num>
                  </div>))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── TRUE CONTINUOUS TIMELINE LAYOUT ───────────────────────
   Positions sessions by exact start and end minute on a continuous vertical axis.
   Solves overlapping collisions using interval graph column packing:
   - Partitions overlapping sessions into connected conflict clusters
   - Assigns minimal non-conflicting columns within each cluster
   - Expands width across free adjacent columns
   - Height = (endMin - startMin) * pxPerMin
   - Top = (startMin - calendarStartMin) * pxPerMin
   ═══════════════════════════════════════════════════════════════════════ */

const CALENDAR_DEFAULT_START_HOUR = 7;   // 07:00
const CALENDAR_DEFAULT_END_HOUR = 20;    // 20:00
const PIXELS_PER_MINUTE = 1.2;          // 72px per hour, 18px per 15 min, 36px per 30 min

function computeDayEventLayout(daySessions, startOfDayMins, pxPerMin = PIXELS_PER_MINUTE) {
  if (!daySessions || daySessions.length === 0) return [];

  // 1. Sort sessions: earlier start first; for identical start, longer duration first
  const sorted = [...daySessions].sort((a, b) => {
    const diff = toMins(a.start) - toMins(b.start);
    if (diff !== 0) return diff;
    return (toMins(b.end) - toMins(b.start)) - (toMins(a.end) - toMins(a.start));
  });

  // 2. Group into connected clusters of overlapping events
  // Note: Touching sessions (a.end <= b.start) do NOT overlap
  const clusters = [];
  let currentCluster = [];
  let currentClusterEnd = -1;

  sorted.forEach((s) => {
    const sStart = toMins(s.start);
    const sEnd = toMins(s.end);
    if (currentCluster.length === 0) {
      currentCluster.push(s);
      currentClusterEnd = sEnd;
    } else if (sStart < currentClusterEnd) {
      currentCluster.push(s);
      if (sEnd > currentClusterEnd) {
        currentClusterEnd = sEnd;
      }
    } else {
      clusters.push(currentCluster);
      currentCluster = [s];
      currentClusterEnd = sEnd;
    }
  });
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 3. For each cluster, assign columns and calculate side-by-side coordinates
  const layoutResults = [];

  clusters.forEach((cluster) => {
    const columns = []; // array of arrays of sessions

    cluster.forEach((s) => {
      const sStart = toMins(s.start);
      // Find the first column where s does not collide with the last event
      let placedCol = -1;
      for (let c = 0; c < columns.length; c++) {
        const lastInCol = columns[c][columns[c].length - 1];
        if (toMins(lastInCol.end) <= sStart) {
          columns[c].push(s);
          placedCol = c;
          s._colIndex = c;
          break;
        }
      }
      if (placedCol === -1) {
        s._colIndex = columns.length;
        columns.push([s]);
      }
    });

    const numCols = columns.length;

    // Check if session can expand into unused adjacent columns to its right
    cluster.forEach((s) => {
      const sStart = toMins(s.start);
      const sEnd = toMins(s.end);
      let span = 1;

      for (let c = s._colIndex + 1; c < numCols; c++) {
        // Does any session in column c overlap with s?
        const hasOverlap = columns[c].some((other) => {
          const oStart = toMins(other.start);
          const oEnd = toMins(other.end);
          return sStart < oEnd && oStart < sEnd;
        });
        if (hasOverlap) break;
        span++;
      }

      const sStartMin = toMins(s.start);
      const sEndMin = toMins(s.end);
      const durMin = Math.max(sEndMin - sStartMin, 15);
      const top = (sStartMin - startOfDayMins) * pxPerMin;
      const height = durMin * pxPerMin;
      const leftPct = (s._colIndex / numCols) * 100;
      const widthPct = (span / numCols) * 100;

      layoutResults.push({
        session: s,
        top,
        height,
        leftPct,
        widthPct,
      });
    });
  });

  return layoutResults;
}

function TimelineSessionBlock({ s, top, height, leftPct, widthPct, onClick }) {
  const mod = moduleOf(s.mod);
  const t = s.trainer ? trainerOf(s.trainer) : null;
  const st = STATUS[s.status] ?? STATUS.draft;
  const isTravel = s.status === "travel" || st.hatch;
  const deptUnit = orgUnit(s.dept);
  const siteUnit = orgUnit(s.site);
  const locationLabel = deptUnit?.name ?? siteUnit?.name ?? "";

  const sStartMin = toMins(s.start);
  const sEndMin = toMins(s.end);
  const durMin = s.dur ?? (sEndMin - sStartMin);

  // Height and width tiers for responsive layout
  const isNarrow = widthPct < 35;
  const isMicro = height < 34;                     // ~15-25 mins
  const isCompact = height >= 34 && height < 68;   // ~30-50 mins
  const isMedium = height >= 68 && height < 110;   // ~60-90 mins
  const isLarge = height >= 110;                   // >= 90-120 mins

  const titleText = s.label ?? mod?.name ?? mod?.short ?? "Session";
  const timeText = `${s.start}–${s.end}`;
  const travelPattern = "repeating-linear-gradient(45deg, #f4f4f8, #f4f4f8 6px, #e7e7ed 6px, #e7e7ed 12px)";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(s)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(s); }}
      title={`${titleText}\nTime: ${timeText} (${durMin} min)\nTrainer: ${t ? t.name : "Unassigned"}\nScope: ${locationLabel}\nStatus: ${st.label}${s.conflict ? "\nConflict: Trainer double-booked" : ""}`}
      style={{
        position: "absolute",
        top: `${top}px`,
        height: `${Math.max(height - 2, 18)}px`,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        borderRadius: 6,
        padding: isMicro ? "2px 5px" : isCompact ? "4px 6px" : isNarrow ? "5px 6px" : "6px 9px",
        background: isTravel ? travelPattern : st.bg,
        borderLeft: `3.5px solid ${st.bar}`,
        borderTop: `1px solid ${isTravel ? V.borderStrong : st.bar}33`,
        borderRight: `1px solid ${isTravel ? V.borderStrong : st.bar}33`,
        borderBottom: `1px solid ${isTravel ? V.borderStrong : st.bar}33`,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
        cursor: "pointer",
        overflow: "hidden",
        boxSizing: "border-box",
        zIndex: 2,
        transition: "box-shadow 0.12s ease, transform 0.12s ease, z-index 0.12s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: isMicro ? "center" : "flex-start",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.zIndex = 15;
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.14)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.zIndex = 2;
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.06)";
      }}
    >
      {/* MICRO VIEW (< 34px, e.g. 15-25 min) */}
      {isMicro && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, width: "100%", overflow: "hidden", minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: st.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
            {titleText}
          </span>
          {!isNarrow && (
            <span style={{ fontSize: 9.5, color: st.fg, opacity: 0.85, flexShrink: 0, fontWeight: 500 }}>
              {s.start}
            </span>
          )}
          {s.conflict && <span style={{ fontSize: 9, color: "#b3261e", flexShrink: 0 }}>⚠</span>}
        </div>
      )}

      {/* COMPACT VIEW (34px - 67px, e.g. 30-50 min) */}
      {isCompact && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", minWidth: 0 }}>
            <span style={{ fontSize: isNarrow ? 10.5 : 11, fontWeight: 700, color: st.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {titleText}
            </span>
            {s.conflict && <span title="Scheduling conflict" style={{ fontSize: 10, color: "#b3261e", flexShrink: 0 }}>⚠</span>}
            {mod?.level === "skilled" && <span title="Skilled" style={{ fontSize: 8, color: st.fg, opacity: 0.7, flexShrink: 0 }}>●</span>}
          </div>
          <div style={{ fontSize: 9.5, color: st.fg, opacity: 0.85, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {timeText}{!isNarrow && (t ? ` · ${t.name}` : " · Unassigned")}
          </div>
        </>
      )}

      {/* MEDIUM VIEW (68px - 109px, e.g. 60-80 min) */}
      {isMedium && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", minWidth: 0 }}>
            <span style={{ fontSize: isNarrow ? 10.5 : 11.5, fontWeight: 700, color: st.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {titleText}
            </span>
            {s.conflict && <span title="Scheduling conflict" style={{ fontSize: 10, color: "#b3261e", flexShrink: 0 }}>⚠</span>}
            {mod?.level === "skilled" && <span title="Skilled — competency-gated" style={{ fontSize: 8, color: st.fg, opacity: 0.7, flexShrink: 0 }}>●</span>}
            {s.secondaryTrainer && <span title="Has secondary trainer" style={{ fontSize: 8, color: st.fg, opacity: 0.7, flexShrink: 0 }}>+2</span>}
          </div>
          <div style={{ fontSize: 10, color: st.fg, opacity: 0.9, marginTop: 2, fontWeight: 500 }}>
            {timeText} {!isNarrow && <span style={{ opacity: 0.7, fontSize: 9.5 }}>({durMin}m)</span>}
          </div>
          <div style={{ fontSize: 9.5, color: st.fg, opacity: 0.8, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t ? (isNarrow ? t.name : `👤 ${t.name}`) : "Unassigned"}
          </div>
          {locationLabel && !isNarrow && (
            <div style={{ fontSize: 9, color: st.fg, opacity: 0.65, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {locationLabel}
            </div>
          )}
        </>
      )}

      {/* LARGE VIEW (>= 110px, e.g. 90-120+ min) */}
      {isLarge && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, overflow: "hidden", minWidth: 0 }}>
            <span style={{ fontSize: isNarrow ? 11 : 12, fontWeight: 700, color: st.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {titleText}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              {s.conflict && <span title="Scheduling conflict" style={{ fontSize: 11, color: "#b3261e" }}>⚠</span>}
              {mod?.level === "skilled" && <span title="Skilled" style={{ fontSize: 8, color: st.fg, opacity: 0.7 }}>●</span>}
              {s.secondaryTrainer && <span title="Secondary trainer" style={{ fontSize: 8, color: st.fg, opacity: 0.7 }}>+2</span>}
            </div>
          </div>
          <div style={{ fontSize: isNarrow ? 10 : 11, color: st.fg, opacity: 0.9, marginTop: 2, fontWeight: 600 }}>
            {timeText} {!isNarrow && <span style={{ opacity: 0.7, fontSize: 10, fontWeight: 400 }}>({durMin} mins)</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: st.fg, opacity: 0.85, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: t ? st.bar : "#e0a233", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t ? t.name : "Unassigned"}</span>
          </div>
          {locationLabel && (
            <div style={{ fontSize: 9.5, color: st.fg, opacity: 0.7, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isNarrow ? (deptUnit?.name ?? siteUnit?.name) : `📍 ${locationLabel}`}
            </div>
          )}
          <div style={{ marginTop: "auto", paddingTop: 3, display: "flex", alignItems: "center", justifyContent: "space-between", minWidth: 0 }}>
            <span style={{
              fontSize: 9,
              fontWeight: 600,
              color: st.fg,
              background: "rgba(255, 255, 255, 0.65)",
              padding: "1px 5px",
              borderRadius: 4,
              border: `1px solid ${st.bar}44`,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {st.label}
            </span>
            {!isNarrow && s.learners > 0 && (
              <span style={{ fontSize: 9.5, color: st.fg, opacity: 0.75 }}>
                {s.learners}/{s.capacity}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function WeekTimelineCalendar({ weekDays, filteredSessions, onOpenSession }) {
  // Determine timeline hours based on week's sessions
  const weekSessions = useMemo(() => {
    const datesSet = new Set(weekDays.map((d) => iso(d)));
    return filteredSessions.filter((s) => datesSet.has(s.date));
  }, [weekDays, filteredSessions]);

  const { startHour, endHour, startMin, totalMins } = useMemo(() => {
    const starts = weekSessions.map((s) => toMins(s.start));
    const ends = weekSessions.map((s) => toMins(s.end));
    const minM = starts.length ? Math.min(...starts) : CALENDAR_DEFAULT_START_HOUR * 60;
    const maxM = ends.length ? Math.max(...ends) : CALENDAR_DEFAULT_END_HOUR * 60;
    const sH = Math.min(CALENDAR_DEFAULT_START_HOUR, Math.floor(minM / 60));
    const eH = Math.max(CALENDAR_DEFAULT_END_HOUR, Math.ceil(maxM / 60));
    return {
      startHour: sH,
      endHour: eH,
      startMin: sH * 60,
      totalMins: (eH - sH) * 60,
    };
  }, [weekSessions]);

  const totalHeight = totalMins * PIXELS_PER_MINUTE;

  // Generate hour marks
  const hourMarks = useMemo(() => {
    const marks = [];
    for (let h = startHour; h <= endHour; h++) {
      marks.push(h);
    }
    return marks;
  }, [startHour, endHour]);

  // Current time indicator calculation
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const showCurrentTime = currentMinutes >= startMin && currentMinutes <= (startMin + totalMins);
  const currentTimeTop = (currentMinutes - startMin) * PIXELS_PER_MINUTE;

  // Precompute layout for each day
  const dayLayouts = useMemo(() => {
    const map = {};
    weekDays.forEach((d) => {
      const dateStr = iso(d);
      const daySess = weekSessions.filter((s) => s.date === dateStr);
      map[dateStr] = computeDayEventLayout(daySess, startMin, PIXELS_PER_MINUTE);
    });
    return map;
  }, [weekDays, weekSessions, startMin]);

  return (
    <div
      style={{
        position: "relative",
        maxHeight: "calc(100vh - 290px)",
        minHeight: 540,
        overflowY: "auto",
        overflowX: "auto",
        borderTop: `1px solid ${V.border}`,
        background: "#ffffff",
      }}
    >
      <div style={{ minWidth: 1060, position: "relative" }}>
        {/* STICKY HEADER ROW */}
        <div
          style={{
            display: "flex",
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: "#ffffff",
            borderBottom: `1px solid ${V.border}`,
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.03)",
          }}
        >
          {/* Top-left corner above time axis */}
          <div
            style={{
              width: 70,
              minWidth: 70,
              position: "sticky",
              left: 0,
              zIndex: 35,
              background: V.track,
              borderRight: `1px solid ${V.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: V.text3,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "10px 0",
            }}
          >
            Time
          </div>

          {/* 7 Day header cells */}
          {weekDays.map((d) => {
            const isToday = iso(d) === TODAY;
            return (
              <div
                key={iso(d)}
                style={{
                  flex: 1,
                  minWidth: 140,
                  background: isToday ? V.todayTint : V.track,
                  borderRight: `1px solid ${V.border}`,
                  textAlign: "center",
                  padding: "9px 4px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: isToday ? V.primary : V.text2 }}>
                  {fmtWd(d)}
                </div>
                <div style={{ fontSize: 11, color: isToday ? V.primaryDark : V.text3, marginTop: 1 }}>
                  {fmtDt(d)}
                </div>
              </div>
            );
          })}
        </div>

        {/* CALENDAR BODY */}
        <div style={{ display: "flex", position: "relative", height: totalHeight }}>
          {/* STICKY TIME COLUMN */}
          <div
            style={{
              width: 70,
              minWidth: 70,
              position: "sticky",
              left: 0,
              zIndex: 20,
              background: "#ffffff",
              borderRight: `1px solid ${V.border}`,
              boxSizing: "border-box",
            }}
          >
            {hourMarks.map((h) => {
              const topY = (h * 60 - startMin) * PIXELS_PER_MINUTE;
              return (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    top: Math.max(topY - 8, 3),
                    right: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: V.text2,
                    fontFamily: "monospace, Inter, sans-serif",
                    lineHeight: 1,
                    userSelect: "none",
                  }}
                >
                  {pad(h)}:00
                </div>
              );
            })}
          </div>

          {/* GRID COLUMNS & EVENTS AREA */}
          <div style={{ display: "flex", flex: 1, position: "relative", height: totalHeight }}>
            {/* HORIZONTAL GRID LINES (spans all days) */}
            {hourMarks.map((h) => {
              const topY = (h * 60 - startMin) * PIXELS_PER_MINUTE;
              const halfY = topY + 30 * PIXELS_PER_MINUTE;
              return (
                <React.Fragment key={h}>
                  {/* Major hour line */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: topY,
                      height: 1,
                      background: "#e3e3e8",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  />
                  {/* Minor 30-minute line */}
                  {h < endHour && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: halfY,
                        height: 1,
                        background: "#f0f0f4",
                        borderTop: "1px dashed #dedee5",
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* 7 DAY COLUMNS */}
            {weekDays.map((d) => {
              const dateStr = iso(d);
              const isToday = dateStr === TODAY;
              const events = dayLayouts[dateStr] || [];

              return (
                <div
                  key={dateStr}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    position: "relative",
                    height: totalHeight,
                    borderRight: `1px solid ${V.border}`,
                    background: isToday ? "rgba(247, 246, 253, 0.45)" : "transparent",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Current Time Indicator on Today's column */}
                  {isToday && showCurrentTime && (
                    <div
                      style={{
                        position: "absolute",
                        top: currentTimeTop,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: "#e0453b",
                        zIndex: 12,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: -4,
                          top: -3,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#e0453b",
                        }}
                      />
                    </div>
                  )}

                  {/* Rendered Session Blocks */}
                  {events.map((item) => (
                    <TimelineSessionBlock
                      key={item.session.id}
                      s={item.session}
                      top={item.top}
                      height={item.height}
                      leftPct={item.leftPct}
                      widthPct={item.widthPct}
                      onClick={onOpenSession}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCHEDULER — Week (true continuous time grid with overlap packing),
   Month (calendar), Agenda (flat list).
   ═══════════════════════════════════════════════════════════════════════ */
function Scheduler({ role, root, allSessions, presetFocus, preset, openSession, dispatch, loading, error, onRetry }) {
  const [view, setView] = useState("week");
  // Jumping in from a published roster opens on its first week, filtered to its department.
  const [filters, setFilters] = useState(() => ({ ...emptyFilters(), ...(preset ? { bu: preset.filters.bu, site: preset.filters.site, dept: preset.filters.dept } : {}) }));
  const anchor = preset?.anchor ? parseD(preset.anchor) : null;
  const [weekOffset, setWeekOffset] = useState(anchor ? Math.round((monday(anchor) - monday(parseD(TODAY))) / (7 * 86400000)) : 0);
  const [monthOffset, setMonthOffset] = useState(anchor
    ? (anchor.getFullYear() - parseD(TODAY).getFullYear()) * 12 + anchor.getMonth() - parseD(TODAY).getMonth() : 0);

  useEffect(() => {
    if (!presetFocus) return;
    const u = orgUnit(presetFocus);
    setFilters((f) => ({ ...f, bu: u.level === "bu" ? u.id : "", site: u.level === "site" ? u.id : (u.level === "department" ? siteOf(u.id).id : ""), dept: u.level === "department" ? u.id : "" }));
  }, [presetFocus]);

  const scoped = useMemo(() => sessionsInScope(allSessions, root), [allSessions, root]);
  const filtered = useMemo(() => applyFilters(scoped, filters), [scoped, filters]);
  const groupLevel = !filters.bu && role === "central" ? "bu" : !filters.site ? "site" : "dept";

  const weekStart = addDays(monday(parseD(TODAY)), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthDate = new Date(parseD(TODAY).getFullYear(), parseD(TODAY).getMonth() + monthOffset, 1);
  const monthDays = useMemo(() => {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const start = monday(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [monthOffset]);

  if (loading) return <div><Skeleton h={40} style={{ marginBottom: 14 }} /><Skeleton h={420} /></div>;
  if (error) return <Card><ErrorState title="Unable to load scheduler" hint="Something went wrong while retrieving sessions." onRetry={onRetry} /></Card>;

  const sessionsOnDate = (d) => filtered.filter((s) => s.date === iso(d));

  return (
    <div>
      <Breadcrumbs path={[CENTRAL, ...(role !== "central" ? [buOf(root)] : []), ...(role === "site" ? [orgUnit(root)] : [])].filter(Boolean)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700 }}>{role === "central" ? "Central Scheduler" : role === "bu" ? `${orgUnit(root).name} — BU Scheduler` : `${orgUnit(root).name} — Site Scheduler`}</h1>
          <p style={{ fontSize: 13, color: V.text2, marginTop: 3 }}>
            {role === "central" ? "Every business unit, site, and department in a single view."
              : "Filtered to your current scope. Click any session to view details."}</p>
        </div>
        <Toggle value={view} onChange={setView} items={[["week", "Week"], ["month", "Month"], ["agenda", "Agenda"]]} />
      </div>

      {preset?.batch && <RosterFocusNote batch={preset.batch} />}
      <ScopeSummary root={root} filters={filters} />
      <HierarchyFilterBar root={root} value={filters} onChange={setFilters} showModule showStatus showSearch={view === "agenda"} />

      {view === "week" && (
        <Card pad={false}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${V.border}` }}>
            <Btn size="sm" onClick={() => setWeekOffset(0)}>Today</Btn>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Btn size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>‹</Btn>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtDt(weekDays[0])} – {fmtDt(weekDays[6])}</span>
              <Btn size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>›</Btn>
            </div>
            <span style={{ fontSize: 11.5, color: V.text3 }}>{filtered.length} sessions this week's scope</span>
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No sessions scheduled" hint="There are no sessions matching your current filters." action={<Btn kind="outline" onClick={() => setFilters(emptyFilters())}>Clear filters</Btn>} />
          ) : (
            <WeekTimelineCalendar weekDays={weekDays} filteredSessions={filtered} onOpenSession={openSession} />
          )}
        </Card>
      )}

      {view === "month" && (
        <Card pad={false}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${V.border}` }}>
            <Btn size="sm" onClick={() => setMonthOffset(0)}>Today</Btn>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Btn size="sm" onClick={() => setMonthOffset(monthOffset - 1)}>‹</Btn>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              <Btn size="sm" onClick={() => setMonthOffset(monthOffset + 1)}>›</Btn>
            </div>
            <span />
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: V.border, borderRadius: 8, overflow: "hidden" }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} style={{ background: V.track, textAlign: "center", fontSize: 11, fontWeight: 700, color: V.text2, padding: "6px 0" }}>{d}</div>))}
              {monthDays.map((d) => {
                const inMonth = d.getMonth() === monthDate.getMonth();
                const list = sessionsOnDate(d);
                const isToday = iso(d) === TODAY;
                return (
                  <div key={iso(d)} style={{ background: inMonth ? "#fff" : "#fafafc", minHeight: 92, padding: 6, opacity: inMonth ? 1 : .5 }}>
                    <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? V.primary : V.text3, marginBottom: 4 }}>{d.getDate()}</div>
                    {list.length > 0 && <DenseSessionList sessions={list} onOpen={openSession} limit={2} />}
                  </div>);
              })}
            </div>
          </div>
        </Card>
      )}

      {view === "agenda" && (
        <Card pad={false}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${V.border}`, fontSize: 12.5, color: V.text2 }}>
            {filtered.length} session{filtered.length !== 1 ? "s" : ""} · sorted by date</div>
          {filtered.length === 0 ? <EmptyState title="No sessions scheduled" hint="There are no sessions matching your current filters." action={<Btn kind="outline" onClick={() => setFilters(emptyFilters())}>Clear filters</Btn>} /> : (
            <div style={{ maxHeight: 560, overflowY: "auto" }}>
              {[...filtered].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).map((s) => {
                const mod = moduleOf(s.mod), t = s.trainer ? trainerOf(s.trainer) : null;
                return (
                  <button key={s.id} onClick={() => openSession(s)} style={{ width: "100%", textAlign: "left", border: 0, cursor: "pointer",
                    fontFamily: "inherit", display: "grid", gridTemplateColumns: "100px 1.6fr 1.4fr 1fr 110px", gap: 12, alignItems: "center",
                    padding: "10px 16px", borderBottom: `1px solid ${V.border}`, background: "#fff" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = V.todayTint} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
                    <Num style={{ fontSize: 12, color: V.text2 }}>{fmtDay(s.date)}<br /><span style={{ color: V.text3 }}>{s.start}</span></Num>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.label ?? mod?.name}</span>
                    <span style={{ fontSize: 12, color: V.text2 }}>{[buOf(s.bu)?.name, orgUnit(s.site)?.name, orgUnit(s.dept)?.name].filter(Boolean).join(" / ")}</span>
                    <span style={{ fontSize: 12, color: V.text2 }}>{t?.name ?? "—"}</span>
                    <span style={{ display: "flex", justifyContent: "flex-end" }}><StatusBadge status={s.status} compact /></span>
                  </button>);
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
const thBase = { padding: "9px 8px", background: V.track, borderBottom: `1px solid ${V.border}`, fontSize: 11, fontWeight: 600, color: V.text2, textAlign: "center", position: "sticky", top: 0 };
const tdBase = { padding: 6, borderBottom: `1px solid ${V.border}`, borderRight: `1px solid ${V.border}`, verticalAlign: "top", minWidth: 118 };

/* ═══════════════════════════════════════════════════════════════════════
   REPORTS — a lightweight analytics view over the same KPI data already
   computed for the dashboards; deliberately not a new metrics system.
   ═══════════════════════════════════════════════════════════════════════ */
function Reports({ role, root, allSessions }) {
  const scoped = sessionsInScope(allSessions, root);
  const kpis = computeKpis(scoped);
  const level = role === "central" ? "bu" : role === "bu" ? "site" : "dept";
  const rows = byUnit(scoped, level);

  return (
    <div>
      <Breadcrumbs path={[CENTRAL, ...(role !== "central" ? [buOf(root)] : []), ...(role === "site" ? [orgUnit(root)] : [])].filter(Boolean)} />
      <h1 style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Reports</h1>
      <p style={{ fontSize: 13, color: V.text2, marginBottom: 16 }}>Fill rate, backfill rate and conflicts for the current scope — the same figures behind the dashboard, laid out for review.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <Kpi label="Overall fill rate" value={`${kpis.fillRate}%`} />
        <Kpi label="Backfill rate" value={`${kpis.backfillRate}%`} sub="unassigned + at risk" />
        <Kpi label="Conflicts" value={kpis.conflicts} tone={kpis.conflicts ? "#b3261e" : V.text} />
        <Kpi label="Cross-BU deployments" value={kpis.crossBu} />
      </div>

      <Card pad={false}>
        <div style={{ padding: 16 }}><CardHead label={`Breakdown by ${level === "bu" ? "business unit" : level === "site" ? "site" : "department"}`} /></div>
        {rows.length === 0 ? <EmptyState title="No data for this scope" /> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["Unit", "Sessions", "Confirmed", "Unassigned", "At risk", "Fill rate"].map((h) => (
                <th key={h} style={{ ...thBase, textAlign: h === "Unit" ? "left" : "center" }}>{h}</th>))}
            </tr></thead>
            <tbody>
              {rows.map(({ unit, kpis: k }) => (
                <tr key={unit.id}>
                  <td style={{ ...tdBase, borderRight: 0, fontWeight: 600 }}>{unit.name}</td>
                  <td style={{ ...tdBase, borderRight: 0, textAlign: "center" }}><Num>{k.total}</Num></td>
                  <td style={{ ...tdBase, borderRight: 0, textAlign: "center", color: "#137a3f" }}><Num>{k.confirmed}</Num></td>
                  <td style={{ ...tdBase, borderRight: 0, textAlign: "center", color: k.unassigned ? "#9a5b06" : V.text3 }}><Num>{k.unassigned}</Num></td>
                  <td style={{ ...tdBase, borderRight: 0, textAlign: "center", color: k.atRisk ? "#b3261e" : V.text3 }}><Num>{k.atRisk}</Num></td>
                  <td style={{ ...tdBase, borderRight: 0, width: 140 }}><Bar v={k.fillRate} color={k.atRisk ? "#e0453b" : "#28a862"} /></td>
                </tr>))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   GENERIC MASTER — Skill / Level / Designation / Work Type / Classroom /
   Geofence. All CRUD, all referentially protected against masters that
   depend on them (Skill Master cannot be deleted while Modules or
   employee competencies still reference it).
   ═══════════════════════════════════════════════════════════════════════ */
const MASTER_SCHEMAS = {
  skills: { title: "Skill Master", singular: "Skill", desc: "The taxonomy the recommendation engine's hard filters read from.",
    cols: "90px 1.5fr 1fr 1fr 90px 90px 1fr 90px",
    fields: [
      { n: "code", l: "Code", t: "text", req: true, w: 1 }, { n: "name", l: "Skill name", t: "text", req: true, w: 2 },
      { n: "criticality", l: "Criticality", t: "opt", opts: ["foundation", "core", "critical_safety"], req: true, w: 1 },
      { n: "type", l: "Training type", t: "opt", opts: ["technical", "foundation"], req: true, w: 1 },
      { n: "minLevel", l: "Min level", t: "number", req: true, w: 1 }, { n: "minScore", l: "Min score", t: "number", req: true, w: 1 },
      { n: "cert", l: "Required cert", t: "text", w: 1 }, { n: "active", l: "Active", t: "bool", w: 1 },
    ],
    row: (r) => [r.code, r.name, <Pill tone={r.criticality === "core" ? "danger" : "muted"}>{r.criticality}</Pill>, r.type, `L${r.minLevel}`, r.minScore, r.cert || "—", null],
    head: ["Code", "Name", "Criticality", "Type", "Min level", "Min score", "Certificate", ""] },
  levels: { title: "Level Master", singular: "Level", desc: "The proficiency scale every competency is measured on.",
    cols: "90px 1.2fr 90px 2fr 90px",
    fields: [{ n: "code", l: "Code", t: "text", req: true, w: 1 }, { n: "name", l: "Name", t: "text", req: true, w: 2 },
      { n: "score", l: "Numeric anchor", t: "number", req: true, w: 1 }, { n: "note", l: "Meaning", t: "text", w: 2 }, { n: "active", l: "Active", t: "bool", w: 1 }],
    row: (r) => [r.code, r.name, r.score, r.note, null], head: ["Code", "Name", "Anchor", "Meaning", ""] },
  designations: { title: "Designation Master", singular: "Designation", desc: "Trainer tier — suggested from competency, confirmed by a human.",
    cols: "100px 1.6fr 1fr 90px",
    fields: [{ n: "code", l: "Code", t: "text", req: true, w: 1 }, { n: "name", l: "Designation", t: "text", req: true, w: 2 },
      { n: "grade", l: "Grade", t: "text", w: 1 }, { n: "active", l: "Active", t: "bool", w: 1 }],
    row: (r) => [r.code, r.name, r.grade, null], head: ["Code", "Designation", "Grade", ""] },
  workTypes: { title: "Work Type Master", singular: "Work type", desc: "Engagement model — feeds the recommendation engine's cost scoring.",
    cols: "100px 1.6fr 1fr 1fr 90px",
    fields: [{ n: "code", l: "Code", t: "text", req: true, w: 1 }, { n: "name", l: "Work type", t: "text", req: true, w: 2 },
      { n: "billable", l: "Billable", t: "bool", w: 1 }, { n: "rate", l: "Session rate (₹)", t: "number", w: 1 }, { n: "active", l: "Active", t: "bool", w: 1 }],
    row: (r) => [r.code, r.name, r.billable ? "Billable" : "Internal", r.rate ? `₹${r.rate}` : "—", null],
    head: ["Code", "Work type", "Billing", "Rate", ""] },
  classrooms: { title: "Classroom Master", singular: "Classroom", desc: "Site → Building → Floor → Room. A session points directly at one — there is no separate booking workflow.",
    cols: "90px 1fr 1.1fr 1.2fr 65px 85px 1fr 75px 85px 75px", siteScoped: true,
    fields: [{ n: "code", l: "Classroom code", t: "text", req: true, w: 1 }, { n: "name", l: "Classroom name", t: "text", req: true, w: 2 },
      { n: "site", l: "Site", t: "site", req: true, w: 2 }, { n: "building", l: "Building", t: "text", req: true, w: 2 },
      { n: "floor", l: "Floor", t: "text", req: true, w: 1 }, { n: "room", l: "Room", t: "text", req: true, w: 1 },
      { n: "type", l: "Type", t: "opt", opts: ["normal", "simulator", "ojt", "virtual"], req: true, w: 1 },
      { n: "cap", l: "Capacity", t: "number", req: true, w: 1 }, { n: "equip", l: "Equipment", t: "text", w: 1 }, { n: "active", l: "Active", t: "bool", w: 1 }],
    row: (r) => [r.code, r.name, buOf(r.site)?.name ?? "—", orgUnit(r.site)?.name, r.building, `${r.floor} · ${r.room}`,
      <Pill tone={r.type === "ojt" ? "warn" : r.type === "simulator" ? "primary" : "muted"}>{r.type}</Pill>, r.cap, r.equip || "—", null],
    head: ["Code", "Name", "Business unit", "Site", "Building", "Floor / Room", "Type", "Seats", "Equipment", ""] },
  geofences: { title: "Geofence Master", singular: "Geofence", desc: "Attendance boundary — a punch outside the radius is flagged, not blocked.",
    cols: "100px 1fr .9fr 1.3fr 85px 1.1fr 85px", siteScoped: true,
    fields: [{ n: "code", l: "Geofence code", t: "text", req: true, w: 1 }, { n: "site", l: "Site", t: "site", req: true, w: 2 },
      { n: "name", l: "Fence name", t: "text", req: true, w: 2 },
      { n: "radius", l: "Radius (m)", t: "number", req: true, w: 1 }, { n: "lat", l: "Latitude", t: "number", step: "0.0001", w: 1 },
      { n: "lng", l: "Longitude", t: "number", step: "0.0001", w: 1 }, { n: "active", l: "Active", t: "bool", w: 1 }],
    row: (r) => [r.code, r.name, buOf(r.site)?.name ?? "—", orgUnit(r.site)?.name, `${r.radius} m`, `${r.lat}, ${r.lng}`, null],
    head: ["Code", "Fence name", "Business unit", "Site", "Radius", "Centre", ""] },
};

function MasterScreen({ mkey, data, dispatch, toast }) {
  const schema = MASTER_SCHEMAS[mkey];
  const [q, setQ] = useState(""); const [editing, setEditing] = useState(null); const [confirmDel, setConfirmDel] = useState(null);
  const rows = data[mkey] ?? [];
  const filtered = rows.filter((r) => !q || Object.values(r).some((v) => String(v).toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>{schema.title}</h1>
      <p style={{ fontSize: 13, color: V.text2, marginBottom: 16 }}>{schema.desc}</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <Input placeholder={`Search ${schema.singular.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: V.text2 }}>{filtered.length} of {rows.length}</span>
        <Btn kind="primary" onClick={() => setEditing({ __new: true, active: true })}>+ Add {schema.singular}</Btn>
      </div>
      <Card pad={false}>
        {filtered.length === 0 ? <EmptyState title={`No ${schema.singular.toLowerCase()} found`} action={<Btn kind="outline" onClick={() => setEditing({ __new: true, active: true })}>+ Add {schema.singular}</Btn>} /> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{schema.head.map((h, i) => <th key={i} style={{ ...thBase, textAlign: i === 0 ? "left" : "center" }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((r) => {
                const cells = schema.row(r);
                return (
                  <tr key={r.id}>
                    {cells.map((c, i) => c === null ? (
                      <td key={i} style={{ ...tdBase, borderRight: 0, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Btn size="sm" onClick={() => setEditing(r)}>Edit</Btn>
                          <Btn size="sm" kind="danger" onClick={() => setConfirmDel(r)}>Delete</Btn></div>
                      </td>
                    ) : <td key={i} style={{ ...tdBase, borderRight: 0, textAlign: i === 0 ? "left" : "center", fontWeight: i === 0 ? 600 : 400 }}>{c}</td>)}
                  </tr>);
              })}
            </tbody>
          </table>
        )}
      </Card>
      {editing && <MasterForm schema={schema} record={editing} onClose={() => setEditing(null)}
        onSave={(vals) => { dispatch({ type: editing.__new ? "masterAdd" : "masterEdit", mkey, id: editing.id, vals }); setEditing(null); }} />}
      {confirmDel && (
        <Modal title={`Delete ${schema.singular.toLowerCase()}?`} onClose={() => setConfirmDel(null)} width={420}
          footer={<><Btn onClick={() => setConfirmDel(null)}>Cancel</Btn><Btn kind="danger" onClick={() => { dispatch({ type: "masterDelete", mkey, id: confirmDel.id }); setConfirmDel(null); }}>Delete</Btn></>}>
          <p style={{ fontSize: 13.5 }}><strong>{confirmDel.name || confirmDel.code}</strong> will be removed. If any employee, module or session still references it, the delete is refused.</p>
        </Modal>)}
    </div>
  );
}

function MasterForm({ schema, record, onClose, onSave }) {
  const [vals, setVals] = useState(() => { const v = {}; schema.fields.forEach((f) => { v[f.n] = record[f.n] ?? (f.t === "bool" ? true : ""); }); return v; });
  const [err, setErr] = useState({});
  const submit = () => {
    const e = {}; schema.fields.forEach((f) => { if (f.req && (vals[f.n] === "" || vals[f.n] == null)) e[f.n] = "Required"; });
    setErr(e); if (Object.keys(e).length) return; onSave(vals);
  };
  return (
    <Modal title={record.__new ? `Add ${schema.singular}` : `Edit ${schema.singular}`} onClose={onClose} width={600}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={submit}>{record.__new ? "Create" : "Save changes"}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {schema.fields.map((f) => (
          <div key={f.n} style={{ gridColumn: f.w === 2 ? "span 2" : "span 1" }}>
            <Field label={f.l}>
              {f.t === "site" ? (
                <Select value={vals[f.n]} onChange={(e) => setVals({ ...vals, [f.n]: e.target.value })} style={err[f.n] ? { borderColor: "#b3261e" } : { width: "100%" }}>
                  <option value="">Select site</option>{SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
              ) : f.t === "opt" ? (
                <Select value={vals[f.n]} onChange={(e) => setVals({ ...vals, [f.n]: e.target.value })} style={{ width: "100%" }}>
                  <option value="">Select</option>{f.opts.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}</Select>
              ) : f.t === "bool" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 9, height: 34 }}>
                  <input type="checkbox" checked={!!vals[f.n]} onChange={(e) => setVals({ ...vals, [f.n]: e.target.checked })} />
                  <span style={{ fontSize: 13 }}>{vals[f.n] ? "Active" : "Inactive"}</span></div>
              ) : (
                <Input type={f.t === "number" ? "number" : "text"} step={f.step} value={vals[f.n]}
                  onChange={(e) => setVals({ ...vals, [f.n]: f.t === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })}
                  style={{ width: "100%", ...(err[f.n] ? { borderColor: "#b3261e" } : {}) }} />
              )}
            </Field>
            {err[f.n] && <div style={{ fontSize: 11, color: "#b3261e", marginTop: 3 }}>{err[f.n]}</div>}
          </div>))}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EMPLOYEE MASTER — full profile: identity, competency, certificates,
   experience, availability, eligibility summary. This is what the
   recommendation engine reads on every single matching decision.
   ═══════════════════════════════════════════════════════════════════════ */
function EmployeeMaster({ data, dispatch, toast, onOpen, scopeSite, scopeVendor }) {
  const [q, setQ] = useState(""); const [site, setSite] = useState(""); const [adding, setAdding] = useState(false);
  const base = scopeVendor ? data.employees.filter((e) => e.vendor === scopeVendor)
    : scopeSite ? data.employees.filter((e) => e.site === scopeSite) : data.employees;
  const list = base.filter((e) => (!site || e.site === site) && (!q || `${e.name} ${e.code} ${e.email}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>{scopeVendor ? "My Trainers" : "Employee Master"}</h1>
      <p style={{ fontSize: 13, color: V.text2, marginBottom: 16 }}>Trainers are a floating pool — matched by competency, not tied to a department.</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Input placeholder="Search name, code or email…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
        {!scopeSite && !scopeVendor && (
          <Select value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="">All sites</option>{SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>)}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: V.text2 }}>{list.length} of {base.length}</span>
        {!scopeVendor && <Btn kind="primary" onClick={() => setAdding(true)}>+ Add Employee</Btn>}
      </div>
      <Card pad={false}>
        {list.length === 0 ? <EmptyState title="No employees match" /> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Employee", "Code", "Site", "Designation", "Top competency", "Verified", ""].map((h, i) => (
              <th key={i} style={{ ...thBase, textAlign: i === 0 ? "left" : "center" }}>{h}</th>))}</tr></thead>
            <tbody>
              {list.map((e) => {
                const top = [...e.competencies].sort((a, b) => b.score - a.score)[0];
                const sk = top && skillOf(top.skill);
                const ver = e.competencies.filter((c) => c.state === "verified").length;
                return (
                  <tr key={e.id} onClick={() => onOpen(e.id)} style={{ cursor: "pointer" }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = V.todayTint} onMouseLeave={(ev) => ev.currentTarget.style.background = "#fff"}>
                    <td style={{ ...tdBase, borderRight: 0, fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", background: V.primary, color: "#fff", display: "flex",
                          alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{initials(e.name)}</span>
                        <span>{e.name}<div style={{ fontSize: 11, color: V.text3, fontWeight: 400 }}>{e.trainerType}{e.vendor ? ` · ${e.vendor}` : ""}</div></span>
                      </div></td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "center" }}><Num>{e.code}</Num></td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "center" }}>{orgUnit(e.site)?.name}</td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "center" }}>{DESIGNATIONS.find((d) => d.id === e.designation)?.name}</td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "center" }}>{sk ? `${sk.name} · L${top.level}` : "—"}</td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "center" }}><Pill tone={ver ? "success" : "warn"}>{ver}</Pill>
                      {e.profileState && e.profileState !== "ready" && <div style={{ marginTop: 3 }}><Pill>{e.profileState}</Pill></div>}</td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "right" }}><Btn size="sm" onClick={(ev) => { ev.stopPropagation(); onOpen(e.id); }}>Open</Btn></td>
                  </tr>);
              })}
            </tbody>
          </table>
        )}
      </Card>
      {adding && <EmployeeForm record={{ __new: true, active: true, competencies: [], certs: [], education: [], work: [], modes: ["classroom"], languages: [], scope: [], feedback: 0, feedbackCount: 0, trainerType: "foundation" }}
        onClose={() => setAdding(false)} onSave={(vals) => { dispatch({ type: "empAdd", vals }); setAdding(false); }} />}
    </div>
  );
}

function EmployeeForm({ record, onClose, onSave }) {
  const [v, setV] = useState(() => ({ code: record.code ?? "", name: record.name ?? "", email: record.email ?? "", phone: record.phone ?? "",
    site: record.site ?? "", designation: record.designation ?? "", workType: record.workType ?? "", doj: record.doj ?? "",
    trainerType: record.trainerType ?? "foundation", vendor: record.vendor ?? "", scope: record.scope ?? [], modes: record.modes ?? ["classroom"],
    languages: (record.languages ?? []).join(", ") }));
  const [err, setErr] = useState({});
  const toggleIn = (k, val) => setV((s) => ({ ...s, [k]: s[k].includes(val) ? s[k].filter((x) => x !== val) : [...s[k], val] }));
  const submit = () => {
    const e = {}; ["code", "name", "site", "designation", "workType"].forEach((f) => { if (!v[f]) e[f] = "Required"; });
    setErr(e); if (Object.keys(e).length) return;
    onSave({ ...v, languages: v.languages.split(",").map((x) => x.trim()).filter(Boolean) });
  };
  return (
    <Modal title={record.__new ? "Add Employee" : "Edit Employee"} onClose={onClose} width={680}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={submit}>{record.__new ? "Create employee" : "Save changes"}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Employee code"><Input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })} style={err.code ? { borderColor: "#b3261e" } : {}} /></Field>
        <Field label="Full name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} style={err.name ? { borderColor: "#b3261e" } : {}} /></Field>
        <Field label="Email"><Input value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
        <Field label="Mobile"><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
        <Field label="Base site"><Select value={v.site} onChange={(e) => setV({ ...v, site: e.target.value })} style={err.site ? { borderColor: "#b3261e" } : {}}>
          <option value="">Select site</option>{SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Designation"><Select value={v.designation} onChange={(e) => setV({ ...v, designation: e.target.value })} style={err.designation ? { borderColor: "#b3261e" } : {}}>
          <option value="">Select</option>{DESIGNATIONS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        <Field label="Work type"><Select value={v.workType} onChange={(e) => setV({ ...v, workType: e.target.value })} style={err.workType ? { borderColor: "#b3261e" } : {}}>
          <option value="">Select</option>{WORK_TYPES.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
        <Field label="Trainer type"><Select value={v.trainerType} onChange={(e) => setV({ ...v, trainerType: e.target.value })}>
          <option value="foundation">Foundation</option><option value="technical">Technical</option><option value="both">Both</option></Select></Field>
        <Field label="Vendor / agency"><Input value={v.vendor} onChange={(e) => setV({ ...v, vendor: e.target.value })} /></Field>
        <div style={{ gridColumn: "span 2" }}><Field label="Deployable scope">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{SITES.map((s) => (
            <button key={s.id} onClick={() => toggleIn("scope", s.id)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12.5, cursor: "pointer",
              border: v.scope.includes(s.id) ? "1.5px solid #3B3090" : "1px solid #e3e3e8", background: v.scope.includes(s.id) ? "#eeecfb" : "#fff",
              color: v.scope.includes(s.id) ? "#3B3090" : "#6b6b74" }}>{s.name}</button>))}</div></Field></div>
        <div style={{ gridColumn: "span 2" }}><Field label="Languages" hint="Comma separated"><Input value={v.languages} onChange={(e) => setV({ ...v, languages: e.target.value })} /></Field></div>
      </div>
    </Modal>
  );
}

function EmployeeDetail({ emp, dispatch, onBack, toast, trainerSelf }) {
  const [tab, setTab] = useState("competency"); const [editing, setEditing] = useState(false);
  const [compEdit, setCompEdit] = useState(null); const [rowEdit, setRowEdit] = useState(null);
  const verified = emp.competencies.filter((c) => c.state === "verified");
  const canTeach = SKILLS.filter((sk) => {
    const c = emp.competencies.find((x) => x.skill === sk.id);
    if (!c || c.state !== "verified" || c.level < sk.minLevel || c.score < sk.minScore) return false;
    if (emp.trainerType !== "both" && emp.trainerType !== sk.type) return false;
    if (sk.cert && !emp.certs.some((x) => x.type === sk.cert && x.expiry >= TODAY)) return false;
    return true;
  });
  const blocked = SKILLS.filter((sk) => emp.competencies.find((x) => x.skill === sk.id) && !canTeach.includes(sk)).map((sk) => {
    const c = emp.competencies.find((x) => x.skill === sk.id);
    let why = c.state !== "verified" ? `Competency is ${c.state}, not verified` : c.level < sk.minLevel ? `At L${c.level}, needs L${sk.minLevel}`
      : c.score < sk.minScore ? `Score ${c.score} below ${sk.minScore}` : (emp.trainerType !== "both" && emp.trainerType !== sk.type) ? `Trainer is ${emp.trainerType}, skill is ${sk.type}` : `Needs a valid ${sk.cert} certificate`;
    return { sk, why };
  });

  return (
    <div>
      <button onClick={onBack} style={{ border: 0, background: "transparent", cursor: "pointer", color: V.primary, fontSize: 12.5, marginBottom: 10, padding: 0 }}>← Back</button>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: V.primary, color: "#fff", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, flexShrink: 0 }}>{initials(emp.name)}</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 19, fontWeight: 700 }}>{emp.name}</h1>
              <Pill tone={emp.active ? "success" : "muted"}>{emp.active ? "Active" : "Inactive"}</Pill>
              <Pill tone="primary">{emp.trainerType}</Pill>
              {emp.profileState && emp.profileState !== "ready" && <Pill tone="warn">Profile {pcsOf(emp.done)}% — not yet rosterable</Pill>}
            </div>
            <div style={{ fontSize: 13, color: V.text2, marginTop: 4 }}><Num>{emp.code}</Num> · {DESIGNATIONS.find((d) => d.id === emp.designation)?.name} · Based at {orgUnit(emp.site)?.name}</div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Can teach", canTeach.length], ["Verified", verified.length], ["Feedback", emp.feedbackCount ? emp.feedback.toFixed(1) : "—"]].map(([l, n]) => (
              <div key={l}><Num style={{ fontSize: 19, fontWeight: 700 }}>{n}</Num><div style={{ fontSize: 11, color: V.text3 }}>{l}</div></div>))}
          </div>
          {!trainerSelf && <Btn kind="primary" onClick={() => setEditing(true)}>Edit details</Btn>}
        </div>
      </Card>

      <Toggle value={tab} onChange={setTab} items={[["competency", "Competency"], ["certs", "Certificates"], ["experience", "Experience"], ["availability", "Availability"], ["eligibility", "Eligibility"]]} />
      <div style={{ height: 14 }} />

      {tab === "competency" && (
        <Card pad={false}>
          <div style={{ padding: 16, display: "flex", justifyContent: "space-between" }}><CardHead label="Competency matrix" sub="Only verified rows count for rostering" />
            <Btn size="sm" kind="primary" onClick={() => setCompEdit({ __new: true, level: 2, score: 40, state: "draft" })}>+ Add skill</Btn></div>
          {emp.competencies.length === 0 ? <EmptyState title="No skills recorded" /> : emp.competencies.map((c, i) => {
            const sk = skillOf(c.skill); const meets = sk && c.state === "verified" && c.level >= sk.minLevel && c.score >= sk.minScore;
            return (
              <div key={i} style={{ padding: "12px 16px", borderTop: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{sk?.name}</div>
                  <div style={{ fontSize: 11.5, color: V.text3 }}>{LEVEL_NAME[c.level]} · gate L{sk?.minLevel}/{sk?.minScore}</div></div>
                <div style={{ width: 90 }}><Bar v={c.score} color={meets ? "#28a862" : "#e0a233"} /></div>
                <Num style={{ width: 30 }}>{c.score}</Num>
                <Pill tone={c.state === "verified" ? "success" : c.state === "draft" ? "warn" : "muted"}>{c.state}</Pill>
                <div style={{ display: "flex", gap: 6 }}>
                  {c.state !== "verified" && <Btn size="sm" onClick={() => dispatch({ type: "compVerify", empId: emp.id, index: i })}>Verify</Btn>}
                  <Btn size="sm" onClick={() => setCompEdit({ ...c, index: i })}>Edit</Btn>
                  <Btn size="sm" kind="danger" onClick={() => dispatch({ type: "compDelete", empId: emp.id, index: i })}>×</Btn>
                </div>
              </div>);
          })}
        </Card>)}

      {tab === "certs" && (
        <Card pad={false}>
          <div style={{ padding: 16, display: "flex", justifyContent: "space-between" }}><CardHead label="Certificates" />
            <Btn size="sm" onClick={() => setRowEdit({ kind: "certs", index: -1, rec: { type: "", no: "", expiry: "" } })}>+ Add</Btn></div>
          {emp.certs.length === 0 ? <EmptyState title="No certificates" /> : emp.certs.map((c, i) => {
            const expired = c.expiry < TODAY, soon = !expired && (parseD(c.expiry) - parseD(TODAY)) / 86400000 <= 30;
            return (
              <div key={i} style={{ padding: "12px 16px", borderTop: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{c.type}</div><div style={{ fontSize: 11.5, color: V.text3 }}>{c.no} · valid to {c.expiry ? fmtDay(c.expiry) : "—"}</div></div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Pill tone={expired ? "danger" : soon ? "warn" : "success"}>{expired ? "Expired" : soon ? "Expiring" : "Valid"}</Pill>
                  <Btn size="sm" onClick={() => setRowEdit({ kind: "certs", index: i, rec: c })}>Edit</Btn>
                  <Btn size="sm" kind="danger" onClick={() => dispatch({ type: "subDelete", empId: emp.id, kind: "certs", index: i })}>×</Btn></div>
              </div>);
          })}
        </Card>)}

      {tab === "experience" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card pad={false}>
            <div style={{ padding: 16, display: "flex", justifyContent: "space-between" }}><CardHead label="Education" />
              <Btn size="sm" onClick={() => setRowEdit({ kind: "education", index: -1, rec: { q: "", inst: "", year: "" } })}>+ Add</Btn></div>
            {emp.education.length === 0 ? <EmptyState title="Nothing recorded" /> : emp.education.map((e, i) => (
              <div key={i} style={{ padding: "10px 16px", borderTop: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between" }}>
                <div><strong>{e.q}</strong> — {e.inst} ({e.year})</div>
                <div style={{ display: "flex", gap: 6 }}><Btn size="sm" onClick={() => setRowEdit({ kind: "education", index: i, rec: e })}>Edit</Btn>
                  <Btn size="sm" kind="danger" onClick={() => dispatch({ type: "subDelete", empId: emp.id, kind: "education", index: i })}>×</Btn></div>
              </div>))}
          </Card>
          <Card pad={false}>
            <div style={{ padding: 16, display: "flex", justifyContent: "space-between" }}><CardHead label="Work experience" />
              <Btn size="sm" onClick={() => setRowEdit({ kind: "work", index: -1, rec: { employer: "", role: "", from: "", to: "" } })}>+ Add</Btn></div>
            {emp.work.length === 0 ? <EmptyState title="Nothing recorded" /> : emp.work.map((w, i) => (
              <div key={i} style={{ padding: "10px 16px", borderTop: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between" }}>
                <div><strong>{w.role}</strong> — {w.employer} ({w.from}–{w.to})</div>
                <div style={{ display: "flex", gap: 6 }}><Btn size="sm" onClick={() => setRowEdit({ kind: "work", index: i, rec: w })}>Edit</Btn>
                  <Btn size="sm" kind="danger" onClick={() => dispatch({ type: "subDelete", empId: emp.id, kind: "work", index: i })}>×</Btn></div>
              </div>))}
          </Card>
        </div>)}

      {tab === "availability" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card><CardHead label="Deployable scope" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{SITES.map((s) => {
              const on = (emp.scope || []).includes(s.id);
              return <button key={s.id} onClick={() => dispatch({ type: "empToggle", empId: emp.id, field: "scope", value: s.id })}
                style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12.5, cursor: "pointer", border: on ? "1.5px solid #3B3090" : "1px solid #e3e3e8",
                  background: on ? "#eeecfb" : "#fff", color: on ? "#3B3090" : "#6b6b74" }}>{s.name}{on && " ✓"}</button>;
            })}</div></Card>
          <Card><CardHead label="Delivery modes" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["classroom", "simulator", "ojt", "virtual"].map((m) => {
              const on = (emp.modes || []).includes(m);
              return <button key={m} onClick={() => dispatch({ type: "empToggle", empId: emp.id, field: "modes", value: m })}
                style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12.5, cursor: "pointer", border: on ? "1.5px solid #3B3090" : "1px solid #e3e3e8",
                  background: on ? "#eeecfb" : "#fff", color: on ? "#3B3090" : "#6b6b74" }}>{m}{on && " ✓"}</button>;
            })}</div></Card>
        </div>)}

      {tab === "eligibility" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card pad={false}><div style={{ padding: 16 }}><CardHead label="Can be rostered on" /></div>
            {canTeach.length === 0 ? <EmptyState title="Not rosterable yet" /> : canTeach.map((sk) => (
              <div key={sk.id} style={{ padding: "10px 16px", borderTop: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between" }}>
                <span>{sk.name}</span><Pill tone="success">Eligible</Pill></div>))}
          </Card>
          <Card pad={false}><div style={{ padding: 16 }}><CardHead label="Blocked" /></div>
            {blocked.length === 0 ? <EmptyState title="Nothing blocked" /> : blocked.map(({ sk, why }) => (
              <div key={sk.id} style={{ padding: "10px 16px", borderTop: `1px solid ${V.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>{sk.name}</span><Pill tone="danger">Blocked</Pill></div>
                <div style={{ fontSize: 11.5, color: V.text3, marginTop: 2 }}>{why}</div></div>))}
          </Card>
        </div>)}

      {editing && <EmployeeForm record={emp} onClose={() => setEditing(false)} onSave={(vals) => { dispatch({ type: "empEdit", id: emp.id, vals }); setEditing(false); }} />}
      {compEdit && <CompetencyForm emp={emp} record={compEdit} onClose={() => setCompEdit(null)}
        onSave={(vals) => { dispatch({ type: compEdit.__new ? "compAdd" : "compEdit", empId: emp.id, index: compEdit.index, vals }); setCompEdit(null); }} />}
      {rowEdit && <SubRowForm rowEdit={rowEdit} onClose={() => setRowEdit(null)} onSave={(rec) => { dispatch({ type: "subSave", empId: emp.id, kind: rowEdit.kind, index: rowEdit.index, rec }); setRowEdit(null); }} />}
    </div>
  );
}

function CompetencyForm({ emp, record, onClose, onSave }) {
  const [v, setV] = useState({ skill: record.skill ?? "", level: record.level ?? 2, score: record.score ?? 40, state: record.state ?? "draft" });
  const sk = SKILLS.find((s) => s.id === v.skill);
  const meets = sk && v.state === "verified" && v.level >= sk.minLevel && v.score >= sk.minScore;
  const used = emp.competencies.map((c, i) => (i === record.index ? null : c.skill)).filter(Boolean);
  return (
    <Modal title={record.__new ? "Add skill" : "Edit competency"} sub={emp.name} onClose={onClose} width={480}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!v.skill} onClick={() => onSave(v)}>Save</Btn></>}>
      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Skill"><Select value={v.skill} onChange={(e) => setV({ ...v, skill: e.target.value })} style={{ width: "100%" }}>
          <option value="">Select a skill</option>{SKILLS.map((s) => <option key={s.id} value={s.id} disabled={used.includes(s.id)}>{s.name}</option>)}</Select></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Level"><Select value={v.level} onChange={(e) => setV({ ...v, level: Number(e.target.value), score: Number(e.target.value) * 20 })} style={{ width: "100%" }}>
            {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>{LEVEL_NAME[l]}</option>)}</Select></Field>
          <Field label="Score"><Input type="number" min={0} max={100} value={v.score} onChange={(e) => setV({ ...v, score: Number(e.target.value) })} style={{ width: "100%" }} /></Field>
        </div>
        <Field label="State"><Select value={v.state} onChange={(e) => setV({ ...v, state: e.target.value })} style={{ width: "100%" }}>
          <option value="draft">Draft</option><option value="submitted">Submitted</option><option value="verified">Verified</option></Select></Field>
        {sk && <div style={{ background: meets ? "#e3f6ea" : "#fef2e0", borderRadius: 8, padding: 11, fontSize: 12 }}>
          <strong>{meets ? "Meets the gate" : "Does not meet the gate"}</strong> — {sk.name} requires L{sk.minLevel}/{sk.minScore}{sk.cert ? `, plus a valid ${sk.cert} certificate` : ""}.</div>}
      </div>
    </Modal>
  );
}

function SubRowForm({ rowEdit, onClose, onSave }) {
  const cfg = { certs: { title: "Certificate", fields: [["type", "Type"], ["no", "Number"], ["expiry", "Valid until", "date"]] },
    education: { title: "Education", fields: [["q", "Qualification"], ["inst", "Institution"], ["year", "Year", "number"]] },
    work: { title: "Work", fields: [["employer", "Employer"], ["role", "Role"], ["from", "From"], ["to", "To"]] } }[rowEdit.kind];
  const [v, setV] = useState({ ...rowEdit.rec });
  return (
    <Modal title={`${rowEdit.index === -1 ? "Add" : "Edit"} ${cfg.title.toLowerCase()}`} onClose={onClose} width={440}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => onSave(v)}>Save</Btn></>}>
      <div style={{ display: "grid", gap: 14 }}>
        {cfg.fields.map(([n, l, t]) => (
          <Field key={n} label={l}><Input type={t ?? "text"} value={v[n] ?? ""} onChange={(e) => setV({ ...v, [n]: t === "number" ? Number(e.target.value) : e.target.value })} style={{ width: "100%" }} /></Field>))}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SHIFT MASTER — reusable session-lane templates, scoped to a Site.
   Auto Rostering applies one of these across a date range to generate the
   literal, dated session rows the scheduler already reads.
   ═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   WEEKLY & MONTHLY TEMPLATE MASTER — Dynamic Slot Blueprints & Policies
   ═══════════════════════════════════════════════════════════════════════ */
function WeeklyTemplateMaster({ data, dispatch, toast, scopeSite }) {
  const allTemplates = data.weeklyTemplates ?? [];
  const [typeFilter, setTypeFilter] = useState("all"); // "all", "weekly", "monthly"
  const templates = scopeSite
    ? allTemplates.filter((t) => (t.mappedUnits ?? []).includes(scopeSite) || (t.mappedUnits ?? []).includes(buOf(scopeSite)?.id))
    : allTemplates;

  const filteredTemplates = templates.filter((t) => {
    if (typeFilter === "all") return true;
    return (t.type || "weekly") === typeFilter;
  });

  const [sel, setSel] = useState(templates[0]?.id ?? allTemplates[0]?.id ?? null);
  const [curWeek, setCurWeek] = useState("W1"); // for monthly templates: W1, W2, W3, W4
  const [editing, setEditing] = useState(null);
  const [mappingModal, setMappingModal] = useState(null);
  const [settingsModal, setSettingsModal] = useState(null);
  const [timingEditorModal, setTimingEditorModal] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Mon");

  const tmpl = allTemplates.find((t) => t.id === sel) ?? filteredTemplates[0] ?? templates[0] ?? allTemplates[0];

  const mappedBuId = (tmpl?.mappedUnits || []).find((u) => u.startsWith("BU-"));
  const mappedSiteId = (tmpl?.mappedUnits || []).find((u) => u.startsWith("SITE-"));
  const effectiveBreaks = getEffectiveBreakTimes(mappedBuId, mappedSiteId, data.breakTimes);

  const isMonthly = tmpl?.type === "monthly";
  const activeDays = getTemplateDays(tmpl, curWeek);
  const totalMonthlySess = countTemplateTotalSessions(tmpl);

  const curDay = activeDays[selectedDay] || { active: false, sessions: [] };
  const daySessions = curDay.sessions || [];

  const updateTemplateDays = (newDays) => {
    if (isMonthly && tmpl.weeks) {
      const updatedWeeks = {
        ...tmpl.weeks,
        [curWeek]: {
          ...(tmpl.weeks[curWeek] || {}),
          days: newDays,
        },
      };
      dispatch({
        type: "templateEdit",
        id: tmpl.id,
        vals: {
          weeks: updatedWeeks,
          days: curWeek === "W1" ? newDays : tmpl.days,
        },
      });
    } else {
      dispatch({
        type: "templateEdit",
        id: tmpl.id,
        vals: { days: newDays },
      });
    }
  };

  const addSlot = () => {
    const last = daySessions[daySessions.length - 1];
    const startMin = last ? toMins(last.end) + 15 : 540;
    const endMin = startMin + 120;
    const newSess = {
      o: last ? last.o + last.d + 15 : 0,
      d: 120,
      label: `Session ${daySessions.length + 1}`,
      start: fmtT(startMin),
      end: fmtT(endMin),
    };
    const nextDays = { ...activeDays, [selectedDay]: { ...curDay, active: true, isRestDay: false, sessions: [...daySessions, newSess] } };
    updateTemplateDays(nextDays);
  };

  const removeSlot = (idx) => {
    const nextSess = daySessions.filter((_, i) => i !== idx);
    const nextDays = { ...activeDays, [selectedDay]: { ...curDay, sessions: nextSess } };
    updateTemplateDays(nextDays);
  };

  const toggleRest = () => {
    const nextDays = {
      ...activeDays,
      [selectedDay]: {
        ...curDay,
        active: curDay.isRestDay,
        isRestDay: !curDay.isRestDay,
        sessions: curDay.isRestDay
          ? [
              { o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" },
              { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" },
              { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" },
              { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" },
            ]
          : [],
      },
    };
    updateTemplateDays(nextDays);
  };

  const applyPreset = (presetKey) => {
    const presets = {
      std4: [
        { o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" },
        { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" },
        { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" },
        { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" },
      ],
      three: [
        { o: 0, d: 120, label: "Session 1", start: "09:30", end: "11:30" },
        { o: 150, d: 120, label: "Session 2", start: "12:00", end: "14:00" },
        { o: 330, d: 120, label: "Session 3", start: "15:00", end: "17:00" },
      ],
      two: [
        { o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" },
        { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" },
      ],
      heavy5: [
        { o: 0, d: 120, label: "Session 1", start: "08:30", end: "10:30" },
        { o: 135, d: 120, label: "Session 2", start: "10:45", end: "12:45" },
        { o: 270, d: 120, label: "Session 3", start: "13:00", end: "15:00" },
        { o: 405, d: 120, label: "Session 4", start: "15:15", end: "17:15" },
        { o: 540, d: 120, label: "Session 5", start: "17:30", end: "19:30" },
      ],
    };
    const s = presets[presetKey] || [];
    const nextDays = { ...activeDays, [selectedDay]: { ...curDay, active: true, isRestDay: false, sessions: JSON.parse(JSON.stringify(s)) } };
    updateTemplateDays(nextDays);
  };

  const copyDayToWeekdays = () => {
    const src = JSON.parse(JSON.stringify(daySessions));
    const nextDays = { ...activeDays };
    ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((dk) => {
      if (nextDays[dk]) {
        nextDays[dk] = { ...nextDays[dk], active: true, isRestDay: false, sessions: JSON.parse(JSON.stringify(src)) };
      }
    });
    updateTemplateDays(nextDays);
  };

  const weeklyCount = allTemplates.filter((t) => (t.type || "weekly") === "weekly").length;
  const monthlyCount = allTemplates.filter((t) => t.type === "monthly").length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18, alignItems: "start" }}>
        {/* Template List Panel */}
        <Card pad={false}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${V.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Roster Templates</span>
                <div style={{ fontSize: 11, color: V.text3 }}>Weekly &amp; Monthly Blueprints</div>
              </div>
              <Btn
                size="sm"
                kind="primary"
                onClick={() =>
                  setEditing({
                    __new: true,
                    type: typeFilter === "monthly" ? "monthly" : "weekly",
                    code: "",
                    name: "",
                    desc: "",
                    color: typeFilter === "monthly" ? "#087ea4" : V.primary,
                    scopeLevel: "site",
                    mappedUnits: scopeSite ? [scopeSite] : ["SITE-MUNDRA"],
                  })
                }
              >
                + Add
              </Btn>
            </div>

            {/* Type Filter Buttons */}
            <div style={{ display: "flex", gap: 4, background: "#f1f1f5", padding: 3, borderRadius: 6 }}>
              <button
                onClick={() => setTypeFilter("all")}
                style={{ flex: 1, padding: "4px 0", border: 0, borderRadius: 4, fontSize: 11, fontWeight: typeFilter === "all" ? 700 : 500, background: typeFilter === "all" ? "#fff" : "transparent", color: typeFilter === "all" ? V.primary : V.text2, cursor: "pointer" }}
              >
                All ({allTemplates.length})
              </button>
              <button
                onClick={() => setTypeFilter("weekly")}
                style={{ flex: 1, padding: "4px 0", border: 0, borderRadius: 4, fontSize: 11, fontWeight: typeFilter === "weekly" ? 700 : 500, background: typeFilter === "weekly" ? "#fff" : "transparent", color: typeFilter === "weekly" ? V.primary : V.text2, cursor: "pointer" }}
              >
                Weekly ({weeklyCount})
              </button>
              <button
                onClick={() => setTypeFilter("monthly")}
                style={{ flex: 1, padding: "4px 0", border: 0, borderRadius: 4, fontSize: 11, fontWeight: typeFilter === "monthly" ? 700 : 500, background: typeFilter === "monthly" ? "#fff" : "transparent", color: typeFilter === "monthly" ? "#087ea4" : V.text2, cursor: "pointer" }}
              >
                Monthly ({monthlyCount})
              </button>
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div style={{ padding: 20 }}><EmptyState title="No templates found" hint="Create a template or clear filter." /></div>
          ) : (
            filteredTemplates.map((t) => {
              const sessCount = countTemplateTotalSessions(t);
              const isSel = sel === t.id;
              const isMonth = t.type === "monthly";
              const mappedText = (t.mappedUnits || []).map((uId) => orgUnit(uId)?.name || uId).join(", ");
              return (
                <button
                  key={t.id}
                  onClick={() => setSel(t.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: 0,
                    cursor: "pointer",
                    padding: "12px 16px",
                    borderBottom: `1px solid ${V.border}`,
                    borderLeft: `3px solid ${isSel ? (t.color || V.primary) : "transparent"}`,
                    background: isSel ? V.todayTint : "#fff",
                    transition: "all .15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSel ? (t.color || V.primary) : V.text }}>{t.code}</span>
                    <span style={{ fontSize: 11, color: V.text3 }}>{sessCount} {isMonth ? "sess/mo" : "sess/wk"}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: V.text2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11, color: V.text3, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mappedText || "Unmapped"}
                  </div>
                </button>
              );
            })
          )}
        </Card>

        {/* Template Details & Editor */}
        {tmpl ? (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Header Card */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: tmpl.color || V.primary }} />
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{tmpl.name}</h2>
                    <span style={{ fontSize: 12, color: V.text3 }}>{tmpl.code}</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: V.text2, margin: "6px 0 0" }}>{tmpl.desc}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn size="sm" onClick={() => dispatch({ type: "templateDuplicate", id: tmpl.id })}>Duplicate</Btn>
                  <Btn size="sm" onClick={() => setEditing(tmpl)}>Edit Info</Btn>
                  <Btn size="sm" kind="danger" onClick={() => { dispatch({ type: "templateDelete", id: tmpl.id }); setSel(null); }}>Delete</Btn>
                </div>
              </div>
            </Card>

            {/* Scope Mapping Card */}
            <Card pad={false}>
              <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${V.border}`, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Mapped Business Units &amp; Sites</div>
                  <div style={{ fontSize: 11.5, color: V.text3, marginTop: 1 }}>Surfaced in Auto-Rostering when these units are selected.</div>
                </div>
                <Btn size="sm" kind="outline" onClick={() => setMappingModal(tmpl)}>Manage Mapping</Btn>
              </div>
              <div style={{ padding: "12px 18px", fontSize: 12.5, color: V.text2 }}>
                {(tmpl.mappedUnits || []).length === 0 ? (
                  <span style={{ color: V.text3, fontStyle: "italic" }}>No units mapped. Click Manage Mapping to add.</span>
                ) : (
                  <span>
                    {(tmpl.mappedUnits || []).map((uId) => orgUnit(uId)?.name || uId).join(" · ")}
                  </span>
                )}
              </div>
            </Card>

            {/* Day & Session Blueprint Card */}
            <Card pad={false}>
              <div style={{ padding: "12px 18px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {isMonthly ? "Monthly Session Blueprint" : "Weekly Session Blueprint"}
                  </div>
                  <div style={{ fontSize: 11.5, color: V.text3, marginTop: 2 }}>
                    {isMonthly ? "4-week schedule with independent timings per day." : "Independent session timings and slot counts per day."}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {isMonthly && (
                    <Btn
                      size="sm"
                      kind="primary"
                      onClick={() => {
                        dispatch({ type: "templateSyncMonthWeeks", templateId: tmpl.id });
                      }}
                      title="Duplicate Week 1 schedule and timings across Weeks 2, 3, and 4"
                    >
                      Reuse Week 1 for All Weeks
                    </Btn>
                  )}
                  <Btn
                    size="sm"
                    onClick={() => {
                      const standardDays = {
                        Mon: { active: true, label: "Monday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
                        Tue: { active: true, label: "Tuesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
                        Wed: { active: true, label: "Wednesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
                        Thu: { active: true, label: "Thursday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
                        Fri: { active: true, label: "Friday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
                        Sat: { active: true, isHalfDay: true, label: "Saturday (Half-Day)", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }] },
                        Sun: { active: false, isRestDay: true, label: "Sunday (Rest Day)", sessions: [] },
                      };
                      updateTemplateDays(standardDays);
                    }}
                  >
                    Reset 4+2 Preset
                  </Btn>
                </div>
              </div>

              {/* Monthly Template: Week Selector Tabs */}
              {isMonthly && (
                <div style={{ padding: "8px 18px", background: "#f8f8fb", borderBottom: `1px solid ${V.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: V.text2 }}>Cycle Week:</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["W1", "W2", "W3", "W4"].map((wkKey, idx) => {
                      const isCur = curWeek === wkKey;
                      return (
                        <button
                          key={wkKey}
                          onClick={() => setCurWeek(wkKey)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 5,
                            border: `1px solid ${isCur ? V.primary : V.border}`,
                            background: isCur ? V.primary : "#fff",
                            color: isCur ? "#fff" : V.text,
                            fontWeight: isCur ? 600 : 400,
                            fontSize: 11.5,
                            cursor: "pointer",
                          }}
                        >
                          Week {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Day selection tabs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f8f8fb", borderBottom: `1px solid ${V.border}` }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dKey) => {
                  const dCfg = activeDays[dKey] || {};
                  const isCur = selectedDay === dKey;
                  const count = dCfg.active && !dCfg.isRestDay ? (dCfg.sessions?.length || 0) : 0;
                  return (
                    <button
                      key={dKey}
                      onClick={() => setSelectedDay(dKey)}
                      style={{
                        padding: "10px 6px",
                        textAlign: "center",
                        border: 0,
                        cursor: "pointer",
                        background: isCur ? "#fff" : "transparent",
                        borderBottom: `2.5px solid ${isCur ? (isMonthly ? "#087ea4" : V.primary) : "transparent"}`,
                        borderRight: `1px solid ${V.border}`,
                        transition: "all .12s",
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: isCur ? 700 : 600, color: isCur ? (isMonthly ? "#087ea4" : V.primary) : V.text }}>{dKey}</div>
                      <div style={{ fontSize: 11, color: dCfg.isRestDay ? V.text3 : isCur ? (isMonthly ? "#087ea4" : V.primary) : V.text2, marginTop: 2 }}>
                        {dCfg.isRestDay ? "Rest day" : `${count} sessions`}
                      </div>
                      {dCfg.isHalfDay && <div style={{ fontSize: 10, color: "#9a5b06", marginTop: 2 }}>Half day</div>}
                    </button>
                  );
                })}
              </div>

              {/* Active Day Sessions Display & Quick Editor */}
              <div style={{ padding: 18 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>
                        {isMonthly ? `Week ${curWeek.replace("W", "")} · ` : ""}{curDay.label || selectedDay}
                      </span>
                      <span style={{ fontSize: 12, color: V.text3 }}>
                        {curDay.isRestDay ? "Rest day" : `${daySessions.length} sessions configured`}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Btn size="sm" onClick={toggleRest}>{curDay.isRestDay ? "Mark as Working Day" : "Mark as Rest Day"}</Btn>
                      {!curDay.isRestDay && (
                        <>
                          <Btn size="sm" kind="outline" onClick={() => setTimingEditorModal({ dayKey: selectedDay, sessions: [...daySessions], weekKey: curWeek })}>
                            Edit Timings
                          </Btn>
                          <Btn size="sm" kind="primary" onClick={addSlot}>
                            + Add Session Slot
                          </Btn>
                          <Btn size="sm" onClick={copyDayToWeekdays} title="Copy this day's slot count and timings to Tuesday–Friday">
                            Copy to Mon–Fri
                          </Btn>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quick Presets Bar for this Day */}
                  {!curDay.isRestDay && (
                    <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11.5, color: V.text2 }}>
                      <span style={{ fontWeight: 600 }}>Quick presets:</span>
                      <button onClick={() => applyPreset("std4")} style={{ padding: "3px 8px", fontSize: 11, borderRadius: 4, border: `1px solid ${V.border}`, background: "#fff", cursor: "pointer", color: V.text }}>4 sessions (09:00–18:15)</button>
                      <button onClick={() => applyPreset("three")} style={{ padding: "3px 8px", fontSize: 11, borderRadius: 4, border: `1px solid ${V.border}`, background: "#fff", cursor: "pointer", color: V.text }}>3 sessions (09:30–17:00)</button>
                      <button onClick={() => applyPreset("two")} style={{ padding: "3px 8px", fontSize: 11, borderRadius: 4, border: `1px solid ${V.border}`, background: "#fff", cursor: "pointer", color: V.text }}>2 sessions half-day</button>
                      <button onClick={() => applyPreset("heavy5")} style={{ padding: "3px 8px", fontSize: 11, borderRadius: 4, border: `1px solid ${V.border}`, background: "#fff", cursor: "pointer", color: V.text }}>5 sessions heavy</button>
                      {daySessions.length > 0 && (
                        <button onClick={() => updateTemplateDays({ ...activeDays, [selectedDay]: { ...curDay, sessions: [] } })} style={{ padding: "3px 8px", fontSize: 11, borderRadius: 4, border: `1px solid ${V.border}`, background: "#fff", color: "#b3261e", cursor: "pointer" }}>Clear</button>
                      )}
                    </div>
                  )}

                  {/* Active Blackout Break Windows for this Day */}
                  {!curDay.isRestDay && effectiveBreaks.filter((b) => b.mandatory && (!b.days || b.days.includes(selectedDay))).length > 0 && (
                    <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 6, background: "#fafafc", border: `1px solid ${V.border}`, fontSize: 11.5, color: V.text2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: V.text }}>Mandatory breaks:</span>
                      {effectiveBreaks.filter((b) => b.mandatory && (!b.days || b.days.includes(selectedDay))).map((brk, bi, arr) => (
                        <span key={brk.id}>
                          {brk.start}–{brk.end} ({brk.name}){bi < arr.length - 1 ? " · " : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  {curDay.isRestDay ? (
                    <div style={{ padding: "28px 20px", textAlign: "center", background: "#f8f8fb", borderRadius: 8, border: `1px dashed ${V.border}` }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Weekly Rest Day — No Sessions Scheduled</div>
                      <div style={{ fontSize: 11.5, color: V.text3, marginTop: 3 }}>Trainers receive designated rest to ensure fatigue compliance.</div>
                    </div>
                  ) : daySessions.length === 0 ? (
                    <EmptyState
                      title="No session slots configured for this day"
                      hint="Click '+ Add Session Slot' or choose a quick preset above to populate session timings."
                      action={<Btn size="sm" kind="primary" onClick={addSlot}>+ Add Session Slot</Btn>}
                    />
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
                      {daySessions.map((sn, sIdx) => {
                        const clash = checkSessionBreakCollision(sn.start, sn.end, selectedDay, effectiveBreaks);
                        return (
                          <div key={sIdx} style={{ border: `1px solid ${clash ? "#e0453b" : V.border}`, borderRadius: 8, padding: "12px 14px", background: clash ? "#fdf3f2" : "#ffffff", position: "relative" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: clash ? "#e0453b" : V.text3 }}>{sn.label || `Session ${sIdx + 1}`}</span>
                              <button onClick={() => removeSlot(sIdx)} title="Remove slot" style={{ border: 0, background: "transparent", cursor: "pointer", color: V.text3, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: V.text }}><Num>{sn.start} – {sn.end}</Num></div>
                            <div style={{ fontSize: 11.5, color: V.text2, marginTop: 3 }}>{sn.d} mins ({Math.round((sn.d / 60) * 10) / 10} hrs)</div>
                            {clash && (
                              <div style={{ fontSize: 10.5, color: "#b3261e", marginTop: 6, fontWeight: 600 }}>
                                ⚠ Break clash: {clash.reason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <EmptyState title="No template selected" hint="Pick a template from the list on the left or create a new one." />
        )}
      </div>

      {/* Modals */}
      {editing && (
        <WeeklyTemplateForm
          record={editing}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            dispatch({ type: editing.__new ? "templateAdd" : "templateEdit", id: editing.id, vals });
            setEditing(null);
          }}
        />
      )}
      {mappingModal && (
        <TemplateMapModal
          tmpl={mappingModal}
          onClose={() => setMappingModal(null)}
          onSave={(mappedUnits) => {
            dispatch({ type: "templateMap", id: mappingModal.id, mappedUnits });
            setMappingModal(null);
          }}
        />
      )}
      {settingsModal && (
        <TemplateSettingsModal
          tmpl={settingsModal}
          onClose={() => setSettingsModal(null)}
          onSave={(settings) => {
            dispatch({ type: "templateEdit", id: settingsModal.id, vals: { settings } });
            setSettingsModal(null);
          }}
        />
      )}
      {timingEditorModal && (
        <SessionTimingEditorModal
          tmpl={tmpl}
          dayKey={timingEditorModal.dayKey}
          weekKey={timingEditorModal.weekKey || curWeek}
          effectiveBreaks={effectiveBreaks}
          onClose={() => setTimingEditorModal(null)}
          onSave={(scope, sessions) => {
            dispatch({
              type: "templateUpdateSessionTimings",
              templateId: tmpl.id,
              weekKey: timingEditorModal.weekKey || curWeek,
              dayKey: timingEditorModal.dayKey,
              scope,
              sessions,
            });
            setTimingEditorModal(null);
          }}
        />
      )}
    </div>
  );
}

function WeeklyTemplateForm({ record, onClose, onSave }) {
  const defaultStandardDays = () => ({
    Mon: { active: true, label: "Monday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
    Tue: { active: true, label: "Tuesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
    Wed: { active: true, label: "Wednesday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
    Thu: { active: true, label: "Thursday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
    Fri: { active: true, label: "Friday", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }, { o: 300, d: 120, label: "Session 3", start: "14:00", end: "16:00" }, { o: 435, d: 120, label: "Session 4", start: "16:15", end: "18:15" }] },
    Sat: { active: true, isHalfDay: true, label: "Saturday (Half-Day)", sessions: [{ o: 0, d: 120, label: "Session 1", start: "09:00", end: "11:00" }, { o: 135, d: 120, label: "Session 2", start: "11:15", end: "13:15" }] },
    Sun: { active: false, isRestDay: true, label: "Sunday (Rest Day)", sessions: [] },
  });

  const [tab, setTab] = useState("info"); // "info" or "slots"
  const [v, setV] = useState({
    type: record.type || "weekly",
    code: record.code || "",
    name: record.name || "",
    desc: record.desc || "",
    color: record.color || (record.type === "monthly" ? "#087ea4" : V.primary),
    scopeLevel: record.scopeLevel || "site",
    mappedUnits: record.mappedUnits || ["SITE-MUNDRA"],
    days: record.days ? JSON.parse(JSON.stringify(record.days)) : defaultStandardDays(),
    weeks: record.weeks ? JSON.parse(JSON.stringify(record.weeks)) : {
      W1: { label: "Week 1", days: defaultStandardDays() },
      W2: { label: "Week 2", days: defaultStandardDays() },
      W3: { label: "Week 3", days: defaultStandardDays() },
      W4: { label: "Week 4", days: defaultStandardDays() },
    },
    settings: record.settings || {
      maxSessionsPerDay: 4,
      maxSessionsPerWeek: 22,
      maxSessionsPerMonth: 88,
      maxValidRejections: 3,
      minBufferMins: 15,
      maxConsecutiveDays: 6,
      noticeSlaHours: 48,
      requireSecondaryIfLearnersOver: 25,
      secondaryMandatoryForSkills: ["SK-CRANE"],
    },
  });

  const [formWeek, setFormWeek] = useState("W1");
  const [formDay, setFormDay] = useState("Mon");

  const currentDaysMap = v.type === "monthly" ? v.weeks[formWeek]?.days || v.days : v.days;
  const currentDayCfg = currentDaysMap[formDay] || { active: true, sessions: [] };
  const currentDaySessions = currentDayCfg.sessions || [];

  const updateFormDaySessions = (newSessions) => {
    if (v.type === "monthly") {
      setV((prev) => {
        const nextWeeks = {
          ...prev.weeks,
          [formWeek]: {
            ...prev.weeks[formWeek],
            days: {
              ...prev.weeks[formWeek].days,
              [formDay]: { ...prev.weeks[formWeek].days[formDay], active: true, isRestDay: false, sessions: newSessions },
            },
          },
        };
        return {
          ...prev,
          weeks: nextWeeks,
          days: formWeek === "W1" ? nextWeeks.W1.days : prev.days,
        };
      });
    } else {
      setV((prev) => ({
        ...prev,
        days: {
          ...prev.days,
          [formDay]: { ...prev.days[formDay], active: true, isRestDay: false, sessions: newSessions },
        },
      }));
    }
  };

  const addFormSlot = () => {
    const last = currentDaySessions[currentDaySessions.length - 1];
    const startMin = last ? toMins(last.end) + 15 : 540;
    const endMin = startMin + 120;
    const newSess = {
      o: last ? last.o + last.d + 15 : 0,
      d: 120,
      label: `Session ${currentDaySessions.length + 1}`,
      start: fmtT(startMin),
      end: fmtT(endMin),
    };
    updateFormDaySessions([...currentDaySessions, newSess]);
  };

  const removeFormSlot = (idx) => {
    updateFormDaySessions(currentDaySessions.filter((_, i) => i !== idx));
  };

  const updateFormSlotTime = (idx, field, val) => {
    const next = currentDaySessions.map((s, i) => (i === idx ? { ...s, [field]: val } : s));
    const sMin = toMins(next[idx].start);
    const eMin = toMins(next[idx].end);
    if (!isNaN(sMin) && !isNaN(eMin) && eMin > sMin) {
      next[idx].d = eMin - sMin;
    }
    updateFormDaySessions(next);
  };

  const syncWeek1ToAll = () => {
    const w1Days = JSON.parse(JSON.stringify(v.weeks.W1.days));
    setV((prev) => ({
      ...prev,
      weeks: {
        W1: { ...prev.weeks.W1, days: JSON.parse(JSON.stringify(w1Days)) },
        W2: { ...prev.weeks.W2, days: JSON.parse(JSON.stringify(w1Days)) },
        W3: { ...prev.weeks.W3, days: JSON.parse(JSON.stringify(w1Days)) },
        W4: { ...prev.weeks.W4, days: JSON.parse(JSON.stringify(w1Days)) },
      },
      days: JSON.parse(JSON.stringify(w1Days)),
    }));
  };

  return (
    <Modal
      title={record.__new ? "Create Roster Blueprint Template" : "Edit Roster Blueprint Template"}
      sub="Configure template cycle, session timing rules, and slot counts per day"
      onClose={onClose}
      width={680}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" disabled={!v.code || !v.name} onClick={() => onSave(v)}>
            Save Blueprint Template
          </Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        {/* Navigation Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${V.border}`, gap: 8 }}>
          <button
            onClick={() => setTab("info")}
            style={{
              padding: "8px 14px",
              border: 0,
              background: "transparent",
              borderBottom: `2.5px solid ${tab === "info" ? V.primary : "transparent"}`,
              fontWeight: tab === "info" ? 700 : 500,
              color: tab === "info" ? V.primary : V.text2,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            1. Template Info &amp; Type
          </button>
          <button
            onClick={() => setTab("slots")}
            style={{
              padding: "8px 14px",
              border: 0,
              background: "transparent",
              borderBottom: `2.5px solid ${tab === "slots" ? V.primary : "transparent"}`,
              fontWeight: tab === "slots" ? 700 : 500,
              color: tab === "slots" ? V.primary : V.text2,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            2. Daily Slots &amp; Timings Configurator
          </button>
        </div>

        {tab === "info" && (
          <div style={{ display: "grid", gap: 14 }}>
            {/* Template Type Choice */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: V.text, marginBottom: 8 }}>Select Blueprint Type:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label
                  onClick={() => setV({ ...v, type: "weekly", color: v.color === "#087ea4" ? V.primary : v.color })}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    border: `1.5px solid ${v.type === "weekly" ? V.primary : V.border}`,
                    background: v.type === "weekly" ? V.todayTint : "#fff",
                    cursor: "pointer",
                    display: "block",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, color: v.type === "weekly" ? V.primary : V.text }}>
                    <input type="radio" name="tmplType" checked={v.type === "weekly"} onChange={() => {}} />
                    ⚡ Weekly Blueprint (7 Days)
                  </div>
                  <div style={{ fontSize: 11.5, color: V.text2, marginTop: 4, paddingLeft: 24 }}>
                    Standard 1-week recurring schedule. Ideal for steady operational rosters.
                  </div>
                </label>

                <label
                  onClick={() => setV({ ...v, type: "monthly", color: v.color === V.primary ? "#087ea4" : v.color })}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    border: `1.5px solid ${v.type === "monthly" ? "#087ea4" : V.border}`,
                    background: v.type === "monthly" ? "#e1f4fc" : "#fff",
                    cursor: "pointer",
                    display: "block",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, color: v.type === "monthly" ? "#087ea4" : V.text }}>
                    <input type="radio" name="tmplType" checked={v.type === "monthly"} onChange={() => {}} />
                    📅 Monthly Blueprint (4 Weeks)
                  </div>
                  <div style={{ fontSize: 11.5, color: V.text2, marginTop: 4, paddingLeft: 24 }}>
                    Full 1-month blueprint with 4 rotating weeks and 1-click week reuse.
                  </div>
                </label>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Template Code">
                <Input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} placeholder={v.type === "monthly" ? "e.g. MT-PORT-OCT" : "e.g. WT-PORT-STD"} style={{ width: "100%" }} />
              </Field>
              <Field label="Theme Color">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={v.color} onChange={(e) => setV({ ...v, color: e.target.value })} style={{ width: 44, height: 34, border: `1px solid ${V.border}`, borderRadius: 6, cursor: "pointer" }} />
                  <Input value={v.color} onChange={(e) => setV({ ...v, color: e.target.value })} style={{ flex: 1 }} />
                </div>
              </Field>
            </div>
            <Field label="Template Name">
              <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder={v.type === "monthly" ? "e.g. Mundra Port Monthly Rotating Roster (4 Weeks)" : "e.g. Standard Port Operations Weekly Template"} style={{ width: "100%" }} />
            </Field>
            <Field label="Description">
              <Input value={v.desc} onChange={(e) => setV({ ...v, desc: e.target.value })} placeholder="Brief operational summary of this template" style={{ width: "100%" }} />
            </Field>
          </div>
        )}

        {tab === "slots" && (
          <div style={{ display: "grid", gap: 12 }}>
            {/* If Monthly, show Week Selector + 1-Click Sync */}
            {v.type === "monthly" && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "#e1f4fc", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#087ea4" }}>Editing Week:</span>
                  {["W1", "W2", "W3", "W4"].map((wk, i) => (
                    <button
                      key={wk}
                      type="button"
                      onClick={() => setFormWeek(wk)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 4,
                        border: `1px solid ${formWeek === wk ? "#087ea4" : V.border}`,
                        background: formWeek === wk ? "#087ea4" : "#fff",
                        color: formWeek === wk ? "#fff" : V.text,
                        fontWeight: formWeek === wk ? 700 : 500,
                        fontSize: 11.5,
                        cursor: "pointer",
                      }}
                    >
                      Week {i + 1}
                    </button>
                  ))}
                </div>
                <Btn size="sm" kind="primary" onClick={syncWeek1ToAll} title="Copy Week 1 daily slots and times to Weeks 2, 3, and 4">
                  ⚡ Copy Week 1 to Weeks 2, 3, 4
                </Btn>
              </div>
            )}

            {/* Day Selector */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dk) => {
                const isCur = formDay === dk;
                const dCfg = currentDaysMap[dk] || {};
                const sCount = dCfg.isRestDay ? 0 : (dCfg.sessions?.length || 0);
                return (
                  <button
                    key={dk}
                    type="button"
                    onClick={() => setFormDay(dk)}
                    style={{
                      padding: "8px 4px",
                      textAlign: "center",
                      borderRadius: 6,
                      border: `1px solid ${isCur ? V.primary : V.border}`,
                      background: isCur ? V.todayTint : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: isCur ? V.primary : V.text }}>{dk}</div>
                    <div style={{ fontSize: 10, color: dCfg.isRestDay ? V.text3 : isCur ? V.primary : V.text2 }}>
                      {dCfg.isRestDay ? "Rest" : `${sCount} slots`}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Day Config */}
            <div style={{ padding: 12, borderRadius: 8, border: `1px solid ${V.border}`, background: "#fafafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {v.type === "monthly" ? `Week ${formWeek.replace("W", "")} · ` : ""}{formDay} Schedule ({currentDaySessions.length} Slots)
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={addFormSlot}
                    style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${V.primary}`, background: V.primary, color: "#fff", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    + Add Slot
                  </button>
                </div>
              </div>

              {currentDaySessions.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: V.text3, fontSize: 12 }}>
                  No session slots for this day. Click "+ Add Slot" above to add custom timings.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8, maxHeight: "35vh", overflowY: "auto", paddingRight: 4 }}>
                  {currentDaySessions.map((sn, idx) => (
                    <div key={idx} style={{ padding: "8px 12px", background: "#fff", border: `1px solid ${V.border}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: V.primary, minWidth: 65 }}>Slot {idx + 1}:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: V.text2 }}>Start</span>
                        <input
                          type="time"
                          value={sn.start}
                          onChange={(e) => updateFormSlotTime(idx, "start", e.target.value)}
                          style={{ height: 28, fontSize: 11.5, padding: "0 6px", border: `1px solid ${V.border}`, borderRadius: 4 }}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: V.text2 }}>End</span>
                        <input
                          type="time"
                          value={sn.end}
                          onChange={(e) => updateFormSlotTime(idx, "end", e.target.value)}
                          style={{ height: 28, fontSize: 11.5, padding: "0 6px", border: `1px solid ${V.border}`, borderRadius: 4 }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: V.text2, minWidth: 60 }}>
                        {sn.d} mins
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFormSlot(idx)}
                        style={{ marginLeft: "auto", border: 0, background: "transparent", cursor: "pointer", color: "#b3261e", fontSize: 14 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Cascading BU → Site selection. Every site belongs to exactly one BU, so the
// picker is a tree: a BU id in `mappedUnits` means "the whole BU" (its sites
// inherit, which is how Auto-Rostering already resolves mappings), while site
// ids pin the template to individual sites. Unticking one inherited site
// overrides the BU mapping with its remaining sites; ticking every site of a
// BU collapses back into the BU mapping.
function normalizeUnitMapping(ids) {
  const set = new Set(ids);
  BUS.forEach((b) => {
    const sites = SITES.filter((s) => s.parentId === b.id).map((s) => s.id);
    if (set.has(b.id) || (sites.length && sites.every((id) => set.has(id)))) {
      set.add(b.id);
      sites.forEach((id) => set.delete(id));
    }
  });
  return [...set];
}

function TemplateMapModal({ tmpl, onClose, onSave }) {
  const [selected, setSelected] = useState(() => normalizeUnitMapping(tmpl.mappedUnits || []));
  const sitesOfBu = (buId) => SITES.filter((s) => s.parentId === buId);

  const toggleBu = (buId) => setSelected((prev) => {
    const siteIds = sitesOfBu(buId).map((s) => s.id);
    const rest = prev.filter((id) => id !== buId && !siteIds.includes(id));
    return prev.includes(buId) ? rest : [...rest, buId];
  });

  const toggleSite = (site) => setSelected((prev) => {
    if (prev.includes(site.parentId)) {
      // Override an inherited site: keep the BU's other sites, drop this one.
      const siblings = sitesOfBu(site.parentId).map((s) => s.id).filter((id) => id !== site.id);
      return [...prev.filter((id) => id !== site.parentId), ...siblings];
    }
    const next = prev.includes(site.id) ? prev.filter((id) => id !== site.id) : [...prev, site.id];
    return normalizeUnitMapping(next);
  });

  const coveredSites = SITES.filter((s) => selected.includes(s.id) || selected.includes(s.parentId));

  return (
    <Modal title={`Map ${tmpl.code} to BU or Site`} sub="Auto-Rostering will suggest this template for the selected Business Units and Sites" onClose={onClose} width={560}
      footer={<>
        <span style={{ marginRight: "auto", alignSelf: "center", fontSize: 12, color: V.text2 }}>
          {coveredSites.length ? `Covers ${coveredSites.length} of ${SITES.length} sites` : "Not mapped yet"}
        </span>
        <Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => onSave(selected)}>Save Mappings</Btn>
      </>}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: V.text2 }}>Business Units &amp; their sites</div>

        {BUS.map((b) => {
          const sites = sitesOfBu(b.id);
          const buChecked = selected.includes(b.id);
          const pickedSites = sites.filter((s) => selected.includes(s.id)).length;
          const partial = !buChecked && pickedSites > 0;
          return (
            <div key={b.id} style={{ border: `1px solid ${buChecked || partial ? V.primary : V.border}`, borderRadius: 10, overflow: "hidden" }}>
              <label onClick={(e) => { e.preventDefault(); toggleBu(b.id); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: buChecked ? V.todayTint : "#fff", cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>
                <input type="checkbox" checked={buChecked} ref={(el) => { if (el) el.indeterminate = partial; }} onChange={() => {}}
                  aria-label={`Map whole ${b.name} business unit`} style={{ accentColor: V.primary, width: 16, height: 16 }} />
                <span>🏢 {b.name}</span>
                <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 500, color: buChecked || partial ? V.primary : V.text3 }}>
                  {buChecked ? (sites.length === 1 ? "Its only site" : `All ${sites.length} sites`) : partial ? `${pickedSites} of ${sites.length} sites` : `${sites.length} site${sites.length === 1 ? "" : "s"}`}
                </span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, padding: "10px 12px 12px 38px",
                background: "#fafafd", borderTop: `1px solid ${V.border}` }}>
                {sites.map((s) => {
                  const inherited = buChecked;
                  const checked = inherited || selected.includes(s.id);
                  return (
                    <label key={s.id} onClick={(e) => { e.preventDefault(); toggleSite(s); }}
                      title={inherited ? `Inherited from ${b.name} — untick to override for this site` : undefined}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
                        border: `1px solid ${checked ? V.primary : V.border}`, background: checked ? (inherited ? "#f3f2fb" : V.todayTint) : "#fff",
                        cursor: "pointer", fontSize: 13, fontWeight: checked ? 600 : 400 }}>
                      <input type="checkbox" checked={checked} onChange={() => {}} style={{ accentColor: V.primary }} />
                      <span>📍 {s.name} ({s.code})</span>
                      {inherited && <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 600, color: V.text3 }}>inherited</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ fontSize: 11.5, color: V.text3, background: "#f8f8fb", padding: "10px 12px", borderRadius: 8 }}>
          💡 Tick a BU to map every site beneath it — sites added to that BU later inherit the template too. Untick a single site to override it.
        </div>
      </div>
    </Modal>
  );
}

function TemplateSettingsModal({ tmpl, onClose, onSave }) {
  const [s, setS] = useState({
    maxSessionsPerDay: tmpl.settings?.maxSessionsPerDay ?? 4,
    maxSessionsPerWeek: tmpl.settings?.maxSessionsPerWeek ?? 22,
    maxSessionsPerMonth: tmpl.settings?.maxSessionsPerMonth ?? 88,
    maxValidRejections: tmpl.settings?.maxValidRejections ?? 3,
    minBufferMins: tmpl.settings?.minBufferMins ?? 15,
    maxConsecutiveDays: tmpl.settings?.maxConsecutiveDays ?? 6,
    noticeSlaHours: tmpl.settings?.noticeSlaHours ?? 48,
    requireSecondaryIfLearnersOver: tmpl.settings?.requireSecondaryIfLearnersOver ?? 25,
    secondaryMandatoryForSkills: tmpl.settings?.secondaryMandatoryForSkills ?? ["SK-CRANE"],
  });

  return (
    <Modal title={`Configure Rostering Policy — ${tmpl.code}`} sub="Adjust compliance constraints and limits enforced during auto-rostering" onClose={onClose} width={540}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => onSave(s)}>Save Constraints</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Max Working Sessions / Day">
          <Input type="number" min={1} max={8} value={s.maxSessionsPerDay} onChange={(e) => setS({ ...s, maxSessionsPerDay: Number(e.target.value) })} style={{ width: "100%" }} />
        </Field>
        <Field label="Max Working Sessions / Week">
          <Input type="number" min={1} max={40} value={s.maxSessionsPerWeek} onChange={(e) => setS({ ...s, maxSessionsPerWeek: Number(e.target.value) })} style={{ width: "100%" }} />
        </Field>
        <Field label="Max Working Sessions / Month">
          <Input type="number" min={1} max={160} value={s.maxSessionsPerMonth} onChange={(e) => setS({ ...s, maxSessionsPerMonth: Number(e.target.value) })} style={{ width: "100%" }} />
        </Field>
        <Field label="Max Valid Rejections (Threshold)">
          <Input type="number" min={1} max={10} value={s.maxValidRejections} onChange={(e) => setS({ ...s, maxValidRejections: Number(e.target.value) })} style={{ width: "100%" }} />
        </Field>
        <Field label="Rest Buffer Between Sessions (Mins)">
          <Input type="number" min={0} max={60} step={5} value={s.minBufferMins} onChange={(e) => setS({ ...s, minBufferMins: Number(e.target.value) })} style={{ width: "100%" }} />
        </Field>
        <Field label="Notice Period Response SLA (Hours)">
          <Input type="number" min={12} max={120} step={12} value={s.noticeSlaHours} onChange={(e) => setS({ ...s, noticeSlaHours: Number(e.target.value) })} style={{ width: "100%" }} />
        </Field>
        <div style={{ gridColumn: "span 2" }}>
          <Field label="Secondary Trainer Required If Learners Exceed">
            <Input type="number" min={10} max={100} value={s.requireSecondaryIfLearnersOver} onChange={(e) => setS({ ...s, requireSecondaryIfLearnersOver: Number(e.target.value) })} style={{ width: "100%" }} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────────────── SESSION TIMING EDITOR MODAL ─────────────────────────────
   Allows schedulers to directly edit start/end times and add/delete individual slots in a template.
   Performs real-time validation against break-time blackout windows and session overlaps. */
function SessionTimingEditorModal({ tmpl, dayKey, weekKey, effectiveBreaks, onClose, onSave }) {
  const activeDays = getTemplateDays(tmpl, weekKey);
  const curSessions = activeDays[dayKey]?.sessions || [];
  const [slots, setSlots] = useState(curSessions.map((s) => ({ ...s })));
  const [scope, setScope] = useState("day");

  const updateSlotTime = (idx, field, val) => {
    setSlots((prev) => {
      const next = prev.map((s, i) => (i === idx ? { ...s, [field]: val } : { ...s }));
      const sMins = toMins(next[idx].start);
      const eMins = toMins(next[idx].end);
      if (!isNaN(sMins) && !isNaN(eMins) && eMins > sMins) {
        next[idx].d = eMins - sMins;
      }
      return next;
    });
  };

  const collisions = slots.map((s, idx) => {
    const brkClash = checkSessionBreakCollision(s.start, s.end, dayKey, effectiveBreaks);
    let overlapClash = null;
    if (idx > 0) {
      const prev = slots[idx - 1];
      if (toMins(s.start) < toMins(prev.end)) {
        overlapClash = `Starts at ${s.start}, before Session ${idx} ends at ${prev.end}`;
      }
    }
    return { idx, brkClash, overlapClash };
  });

  const hasAnyError = collisions.some((c) => c.brkClash || c.overlapClash);

  return (
    <Modal
      title={`Edit Session Timings — ${tmpl.code}`}
      sub={`Adjust timings for ${tmpl?.days?.[dayKey]?.label || dayKey}. Enforces mandatory blackout break windows.`}
      onClose={onClose}
      width={600}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" disabled={hasAnyError} onClick={() => onSave(scope, slots)}>
            {hasAnyError ? "Resolve Collisions to Save" : "Save & Apply Timings"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        {/* Active Blackout Breaks Notice */}
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f8f8fb", border: `1px solid ${V.border}` }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: V.text, marginBottom: 4 }}>
            Active Break Windows (Strict Blackout · No Sessions Permitted):
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {effectiveBreaks.filter((b) => b.mandatory).map((b) => (
              <span key={b.id} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#fff", border: "1px solid #fad2cf", color: "#b3261e", fontWeight: 600 }}>
                {b.type === "lunch" ? "🍽" : "☕"} {b.name}: {b.start}–{b.end} ({b.level.toUpperCase()})
              </span>
            ))}
          </div>
        </div>

        {/* Session Timing Editors */}
        <div style={{ display: "grid", gap: 10, maxHeight: "45vh", overflowY: "auto", paddingRight: 4 }}>
          {slots.map((s, idx) => {
            const err = collisions[idx];
            const hasErr = err.brkClash || err.overlapClash;
            return (
              <div key={idx} style={{ padding: 12, borderRadius: 8, border: `1px solid ${hasErr ? "#b3261e" : V.border}`, background: hasErr ? "#fdf3f2" : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: hasErr ? "#b3261e" : V.primary }}>{s.label || `Session ${idx + 1}`}</span>
                  <span style={{ fontSize: 11, color: V.text2, fontWeight: 600 }}>Duration: {s.d} mins ({Math.round((s.d / 60) * 10) / 10} hrs)</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Start Time (HH:MM)">
                    <Input type="time" value={s.start} onChange={(e) => updateSlotTime(idx, "start", e.target.value)} style={{ width: "100%" }} />
                  </Field>
                  <Field label="End Time (HH:MM)">
                    <Input type="time" value={s.end} onChange={(e) => updateSlotTime(idx, "end", e.target.value)} style={{ width: "100%" }} />
                  </Field>
                </div>
                {err.brkClash && (
                  <div style={{ fontSize: 11, color: "#b3261e", fontWeight: 600, marginTop: 6 }}>
                    ❌ Break Collision: {err.brkClash.reason}
                  </div>
                )}
                {err.overlapClash && (
                  <div style={{ fontSize: 11, color: "#b3261e", fontWeight: 600, marginTop: 6 }}>
                    ⚠️ Overlap Error: {err.overlapClash}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Apply Scope Selector */}
        <div style={{ padding: "12px 14px", borderRadius: 8, background: V.todayTint, border: `1px solid ${V.primarySoft}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: V.primary, marginBottom: 6 }}>Propagate Timings:</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" name="propScope" checked={scope === "day"} onChange={() => setScope("day")} />
              <span>Apply to this day only ({dayKey})</span>
            </label>
            {dayKey !== "Sat" && dayKey !== "Sun" && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" name="propScope" checked={scope === "weekdays"} onChange={() => setScope("weekdays")} />
                <span>Apply to all weekdays (Monday – Friday)</span>
              </label>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" name="propScope" checked={scope === "all"} onChange={() => setScope("all")} />
              <span>Apply to all working days (Mon–Sat)</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ROSTERING POLICY & COMPLIANCE CONSTRAINTS SCREEN
   Mandatory platform thresholds enforced across Central, BU, and Site tiers,
   with multi-tier Break-Time Master (Central, BU, Site level).
   ═══════════════════════════════════════════════════════════════════════ */
function RosteringPolicyScreen({ data, dispatch, role, root, scopeSite, scopeBu }) {
  const [tier, setTier] = useState(scopeSite ? "site" : scopeBu ? "bu" : "central");
  const [selBu, setSelBu] = useState(scopeBu || "BU-PORTS");
  const [selSite, setSelSite] = useState(scopeSite || "SITE-MUNDRA");
  const [policyEditModal, setPolicyEditModal] = useState(false);
  const [breakModal, setBreakModal] = useState(null);
  const [breakFilterLevel, setBreakFilterLevel] = useState("all");

  const policies = data.compliancePolicies || COMPLIANCE_POLICIES;
  const breakTimes = data.breakTimes || BREAK_TIMES;

  const activeScopeId = tier === "central" ? null : tier === "bu" ? selBu : selSite;
  const effPolicy = getEffectivePolicy(tier === "bu" ? selBu : siteOf(selSite)?.parentId, tier === "site" ? selSite : null, policies);
  const isOverridden = tier === "central" ? false : tier === "bu" ? !!policies.bu_overrides?.[selBu] : !!policies.site_overrides?.[selSite];

  const displayedBreaks = breakTimes.filter((b) => {
    if (breakFilterLevel === "all") return true;
    return b.level === breakFilterLevel;
  });

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Header Card */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 22 }}>⚖</div>
              <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Rostering Policy &amp; Compliance Constraints</h1>
            </div>
            <p style={{ fontSize: 13, color: V.text2, margin: "6px 0 0" }}>
              Mandatory platform thresholds and blackout break windows enforced across Central, BU, and Site tiers per BRD governance standards.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn size="sm" onClick={() => setPolicyEditModal(true)}>⚙ Configure Thresholds</Btn>
            <Btn size="sm" kind="primary" onClick={() => setBreakModal({ __new: true, name: "", level: tier, scopeId: activeScopeId, start: "13:15", end: "14:00", dur: 45, type: "lunch", mandatory: true, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] })}>+ Add Break Time</Btn>
          </div>
        </div>

        {/* Tier Scope Tabs */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setTier("central")} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${tier === "central" ? V.primary : V.border}`, background: tier === "central" ? V.todayTint : "#fff", color: tier === "central" ? V.primary : V.text2, fontWeight: tier === "central" ? 700 : 500, fontSize: 12.5, cursor: "pointer" }}>
              🌐 Central Group Baseline
            </button>
            <button onClick={() => setTier("bu")} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${tier === "bu" ? V.primary : V.border}`, background: tier === "bu" ? V.todayTint : "#fff", color: tier === "bu" ? V.primary : V.text2, fontWeight: tier === "bu" ? 700 : 500, fontSize: 12.5, cursor: "pointer" }}>
              🏢 Business Unit Overrides
            </button>
            <button onClick={() => setTier("site")} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${tier === "site" ? V.primary : V.border}`, background: tier === "site" ? V.todayTint : "#fff", color: tier === "site" ? V.primary : V.text2, fontWeight: tier === "site" ? 700 : 500, fontSize: 12.5, cursor: "pointer" }}>
              📍 Site-Specific Overrides
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {tier === "bu" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: V.text2 }}>Select BU:</span>
                <Select value={selBu} onChange={(e) => setSelBu(e.target.value)} style={{ height: 32, fontSize: 12 }}>
                  {BUS.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.id})</option>)}
                </Select>
              </div>
            )}
            {tier === "site" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: V.text2 }}>Select Site:</span>
                <Select value={selSite} onChange={(e) => setSelSite(e.target.value)} style={{ height: 32, fontSize: 12 }}>
                  {SITES.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                </Select>
              </div>
            )}
            {isOverridden ? (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "#fef2e0", color: "#9a5b06" }}>
                ⚡ Custom Overrides Active
              </span>
            ) : tier !== "central" ? (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "#e3f6ea", color: "#137a3f" }}>
                ✓ Inheriting from Parent Tier
              </span>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Mandatory Platform Thresholds */}
      <Card pad={false}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Mandatory Platform Thresholds (Enforced Roster Rules)</div>
            <div style={{ fontSize: 11.5, color: V.text2 }}>Hard limits validated during weekly template authoring and automated rostering cycles.</div>
          </div>
          <Btn size="sm" onClick={() => setPolicyEditModal(true)}>⚙ Edit Values</Btn>
        </div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div style={{ background: "#f8f8fb", padding: 14, borderRadius: 8, border: `1px solid ${V.border}` }}>
            <div style={{ fontSize: 11, color: V.text2, textTransform: "uppercase", fontWeight: 600 }}>Daily Workload Limit</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: V.primary, marginTop: 4 }}>
              <Num>{effPolicy.maxSessionsPerDay ?? 4}</Num> <span style={{ fontSize: 12, color: V.text3, fontWeight: 400 }}>sessions/day</span>
            </div>
            <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>Max allowed trainer delivery per day</div>
          </div>

          <div style={{ background: "#f8f8fb", padding: 14, borderRadius: 8, border: `1px solid ${V.border}` }}>
            <div style={{ fontSize: 11, color: V.text2, textTransform: "uppercase", fontWeight: 600 }}>Weekly Workload Ceiling</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: V.primary, marginTop: 4 }}>
              <Num>{effPolicy.maxSessionsPerWeek ?? 22}</Num> <span style={{ fontSize: 12, color: V.text3, fontWeight: 400 }}>sessions/week</span>
            </div>
            <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>Total weekly operational capacity</div>
          </div>

          <div style={{ background: "#f8f8fb", padding: 14, borderRadius: 8, border: `1px solid ${V.border}` }}>
            <div style={{ fontSize: 11, color: V.text2, textTransform: "uppercase", fontWeight: 600 }}>Monthly Capacity Cap</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: V.primary, marginTop: 4 }}>
              <Num>{effPolicy.maxSessionsPerMonth ?? 88}</Num> <span style={{ fontSize: 12, color: V.text3, fontWeight: 400 }}>sessions/month</span>
            </div>
            <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>Fatigue protection limit per trainer</div>
          </div>

          <div style={{ background: "#f8f8fb", padding: 14, borderRadius: 8, border: `1px solid ${V.border}` }}>
            <div style={{ fontSize: 11, color: V.text2, textTransform: "uppercase", fontWeight: 600 }}>Consecutive Working Days</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#137a3f", marginTop: 4 }}>
              <Num>{effPolicy.maxConsecutiveDays ?? 6}</Num> <span style={{ fontSize: 12, color: V.text3, fontWeight: 400 }}>days max</span>
            </div>
            <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>Day 7 mandatory 24h rest window</div>
          </div>

          <div style={{ background: "#f8f8fb", padding: 14, borderRadius: 8, border: `1px solid ${V.border}` }}>
            <div style={{ fontSize: 11, color: V.text2, textTransform: "uppercase", fontWeight: 600 }}>Max Valid Rejections / Month</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#9a5b06", marginTop: 4 }}>
              <Num>{effPolicy.maxValidRejections ?? 3}</Num> <span style={{ fontSize: 12, color: V.text3, fontWeight: 400 }}>rejections</span>
            </div>
            <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>Triggers managerial review &amp; audit flag</div>
          </div>

          <div style={{ background: "#f8f8fb", padding: 14, borderRadius: 8, border: `1px solid ${V.border}` }}>
            <div style={{ fontSize: 11, color: V.text2, textTransform: "uppercase", fontWeight: 600 }}>Inter-Session Rest Buffer</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: V.text, marginTop: 4 }}>
              <Num>{effPolicy.minBufferMins ?? 15}</Num> <span style={{ fontSize: 12, color: V.text3, fontWeight: 400 }}>mins minimum</span>
            </div>
            <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>Mandatory gap between consecutive sessions</div>
          </div>

          <div style={{ background: "#f8f8fb", padding: 14, borderRadius: 8, border: `1px solid ${V.border}` }}>
            <div style={{ fontSize: 11, color: V.text2, textTransform: "uppercase", fontWeight: 600 }}>Advance Publication Notice</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: V.text, marginTop: 4 }}>
              <Num>{effPolicy.noticeSlaHours ?? 48}</Num> <span style={{ fontSize: 12, color: V.text3, fontWeight: 400 }}>hours SLA</span>
            </div>
            <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>Lead time before session date</div>
          </div>

          <div style={{ background: "#f8f8fb", padding: 14, borderRadius: 8, border: `1px solid ${V.border}` }}>
            <div style={{ fontSize: 11, color: V.text2, textTransform: "uppercase", fontWeight: 600 }}>Multi-Trainer / Co-Trainer Rule</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: V.primaryDark, marginTop: 6 }}>
              Mandatory if learners &gt; {effPolicy.requireSecondaryIfLearnersOver ?? 20}
            </div>
            <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>
              Skills: {(effPolicy.secondaryMandatoryForSkills || []).join(", ") || "Crane Ops, Simulator"}
            </div>
          </div>
        </div>
      </Card>

      {/* Break-Time Master & Blackout Management */}
      <Card pad={false}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Break-Time Master &amp; Blackout Windows</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#fdf3f2", color: "#b3261e", fontWeight: 700 }}>Strict Policy Enforcement</span>
            </div>
            <div style={{ fontSize: 11.5, color: V.text2 }}>
              Rule: For any mandatory defined break-time, <strong>NO session is permitted in that time box</strong>. Defined at Central, BU, or Site level.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, background: "#f2f2f5", padding: 3, borderRadius: 6 }}>
              {["all", "central", "bu", "site"].map((lvl) => (
                <button key={lvl} onClick={() => setBreakFilterLevel(lvl)} style={{ border: 0, padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: breakFilterLevel === lvl ? 700 : 500, background: breakFilterLevel === lvl ? "#fff" : "transparent", color: breakFilterLevel === lvl ? V.primary : V.text2, cursor: "pointer" }}>
                  {lvl.toUpperCase()}
                </button>
              ))}
            </div>
            <Btn size="sm" kind="primary" onClick={() => setBreakModal({ __new: true, name: "", level: tier, scopeId: activeScopeId, start: "13:15", end: "14:00", dur: 45, type: "lunch", mandatory: true, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] })}>+ Add Break Time</Btn>
          </div>
        </div>

        {/* Break Times Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#f8f8fb", borderBottom: `1px solid ${V.border}`, textAlign: "left", color: V.text2 }}>
                <th style={{ padding: "10px 16px", fontWeight: 600 }}>Break Name</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Level / Scope</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Type</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Time Window</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Duration</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Days Applicable</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Enforcement</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedBreaks.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 30, textAlign: "center", color: V.text3 }}>No break times defined for this level filter.</td></tr>
              ) : (
                displayedBreaks.map((b) => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${V.border}` }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: V.text }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{b.type === "lunch" ? "🍽" : b.type === "tea" ? "☕" : "⏱"}</span>
                        <span>{b.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: b.level === "central" ? V.primarySoft : b.level === "bu" ? "#f2eafd" : "#e3f6ea", color: b.level === "central" ? V.primary : b.level === "bu" ? "#6d2fc4" : "#137a3f" }}>
                        {b.level === "central" ? "CENTRAL (Global)" : b.scopeId ? `${b.level.toUpperCase()}: ${orgUnit(b.scopeId)?.name || b.scopeId}` : b.level.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", textTransform: "capitalize", color: V.text2 }}>{b.type}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 700 }}><Num>{b.start} – {b.end}</Num></td>
                    <td style={{ padding: "12px 14px", color: V.text2 }}>{b.dur} mins</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {(b.days || []).map((d) => (
                          <span key={d} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "#f0f0f4", color: V.text2 }}>{d}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {b.mandatory ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#fdf3f2", color: "#b3261e" }}>
                          🛑 Mandatory Blackout
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "#f4f4f8", color: V.text3 }}>
                          ℹ Advisory
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Btn size="sm" onClick={() => setBreakModal(b)}>Edit</Btn>{" "}
                      <Btn size="sm" kind="danger" onClick={() => dispatch({ type: "breakDelete", id: b.id })}>×</Btn>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {policyEditModal && (
        <PolicyEditModal
          tier={tier}
          scopeId={activeScopeId}
          currentValues={effPolicy}
          onClose={() => setPolicyEditModal(false)}
          onSave={(vals) => {
            dispatch({ type: "policyUpdate", tier, scopeId: activeScopeId, vals });
            setPolicyEditModal(false);
          }}
        />
      )}

      {breakModal && (
        <BreakTimeModal
          record={breakModal}
          onClose={() => setBreakModal(null)}
          onSave={(vals) => {
            dispatch({ type: breakModal.__new ? "breakAdd" : "breakEdit", id: breakModal.id, vals });
            setBreakModal(null);
          }}
        />
      )}
    </div>
  );
}

function PolicyEditModal({ tier, scopeId, currentValues, onClose, onSave }) {
  const [v, setV] = useState({
    maxSessionsPerDay: currentValues.maxSessionsPerDay ?? 4,
    maxSessionsPerWeek: currentValues.maxSessionsPerWeek ?? 22,
    maxSessionsPerMonth: currentValues.maxSessionsPerMonth ?? 88,
    maxConsecutiveDays: currentValues.maxConsecutiveDays ?? 6,
    maxValidRejections: currentValues.maxValidRejections ?? 3,
    minBufferMins: currentValues.minBufferMins ?? 15,
    noticeSlaHours: currentValues.noticeSlaHours ?? 48,
    responseSlaHours: currentValues.responseSlaHours ?? 24,
    swapSlaHours: currentValues.swapSlaHours ?? 4,
    requireSecondaryIfLearnersOver: currentValues.requireSecondaryIfLearnersOver ?? 20,
    secondaryMandatoryForSkills: currentValues.secondaryMandatoryForSkills ?? ["SK-CRANE", "SK-SIM"],
  });

  return (
    <Modal
      title={`Configure Policy Thresholds (${tier.toUpperCase()}${scopeId ? `: ${scopeId}` : ""})`}
      sub="Configure mandatory platform constraints enforced across all sessions and templates."
      onClose={onClose}
      width={560}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" onClick={() => onSave(v)}>Save Policy Thresholds</Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Max Sessions / Day">
            <Input type="number" min={1} max={8} value={v.maxSessionsPerDay} onChange={(e) => setV({ ...v, maxSessionsPerDay: Number(e.target.value) })} style={{ width: "100%" }} />
          </Field>
          <Field label="Max Sessions / Week">
            <Input type="number" min={1} max={40} value={v.maxSessionsPerWeek} onChange={(e) => setV({ ...v, maxSessionsPerWeek: Number(e.target.value) })} style={{ width: "100%" }} />
          </Field>
          <Field label="Max Sessions / Month">
            <Input type="number" min={1} max={160} value={v.maxSessionsPerMonth} onChange={(e) => setV({ ...v, maxSessionsPerMonth: Number(e.target.value) })} style={{ width: "100%" }} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Max Consecutive Work Days">
            <Input type="number" min={1} max={14} value={v.maxConsecutiveDays} onChange={(e) => setV({ ...v, maxConsecutiveDays: Number(e.target.value) })} style={{ width: "100%" }} />
          </Field>
          <Field label="Max Valid Rejections / Month">
            <Input type="number" min={0} max={10} value={v.maxValidRejections} onChange={(e) => setV({ ...v, maxValidRejections: Number(e.target.value) })} style={{ width: "100%" }} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Min Rest Buffer (Mins)">
            <Input type="number" min={0} max={60} value={v.minBufferMins} onChange={(e) => setV({ ...v, minBufferMins: Number(e.target.value) })} style={{ width: "100%" }} />
          </Field>
          <Field label="Notice Lead Time (Hours)">
            <Input type="number" min={12} max={168} value={v.noticeSlaHours} onChange={(e) => setV({ ...v, noticeSlaHours: Number(e.target.value) })} style={{ width: "100%" }} />
          </Field>
          <Field label="Confirm/Decline SLA (Hours)">
            <Input type="number" min={1} max={72} value={v.responseSlaHours} onChange={(e) => setV({ ...v, responseSlaHours: Number(e.target.value) })} style={{ width: "100%" }} />
          </Field>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: "#f8f8fb", border: `1px solid ${V.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: V.primary }}>Multi-Trainer Co-Trainer Policy</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Require Co-Trainer if Learners >">
              <Input type="number" min={5} max={50} value={v.requireSecondaryIfLearnersOver} onChange={(e) => setV({ ...v, requireSecondaryIfLearnersOver: Number(e.target.value) })} style={{ width: "100%" }} />
            </Field>
            <Field label="Mandatory for Skills (Comma-sep)">
              <Input value={(v.secondaryMandatoryForSkills || []).join(", ")} onChange={(e) => setV({ ...v, secondaryMandatoryForSkills: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} style={{ width: "100%" }} />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function BreakTimeModal({ record, onClose, onSave }) {
  const [v, setV] = useState({
    name: record.name || "",
    level: record.level || "central",
    scopeId: record.scopeId || null,
    start: record.start || "13:15",
    end: record.end || "14:00",
    dur: record.dur || 45,
    type: record.type || "lunch",
    mandatory: record.mandatory !== false,
    days: record.days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  });

  const updateTimes = (startVal, endVal) => {
    const sM = toMins(startVal);
    const eM = toMins(endVal);
    const d = !isNaN(sM) && !isNaN(eM) && eM > sM ? eM - sM : v.dur;
    setV({ ...v, start: startVal, end: endVal, dur: d });
  };

  const toggleDay = (d) => {
    const cur = v.days || [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
    setV({ ...v, days: next });
  };

  return (
    <Modal
      title={record.__new ? "Add Break Time" : "Edit Break Time"}
      sub="Define a protected break period. Mandatory break windows enforce zero session overlaps."
      onClose={onClose}
      width={540}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" disabled={!v.name || !v.start || !v.end} onClick={() => onSave(v)}>Save Break Time</Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Break Name">
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Mandatory Lunch Break" style={{ width: "100%" }} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Break Level">
            <Select value={v.level} onChange={(e) => setV({ ...v, level: e.target.value, scopeId: e.target.value === "central" ? null : e.target.value === "bu" ? "BU-PORTS" : "SITE-MUNDRA" })} style={{ width: "100%" }}>
              <option value="central">Central (Global Group Level)</option>
              <option value="bu">Business Unit Level</option>
              <option value="site">Site Specific Level</option>
            </Select>
          </Field>

          {v.level === "bu" ? (
            <Field label="Select Business Unit">
              <Select value={v.scopeId || "BU-PORTS"} onChange={(e) => setV({ ...v, scopeId: e.target.value })} style={{ width: "100%" }}>
                {BUS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          ) : v.level === "site" ? (
            <Field label="Select Site">
              <Select value={v.scopeId || "SITE-MUNDRA"} onChange={(e) => setV({ ...v, scopeId: e.target.value })} style={{ width: "100%" }}>
                {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Scope">
              <Input value="All Business Units & Sites" disabled style={{ width: "100%", background: "#f8f8fb" }} />
            </Field>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Start Time (HH:MM)">
            <Input type="time" value={v.start} onChange={(e) => updateTimes(e.target.value, v.end)} style={{ width: "100%" }} />
          </Field>
          <Field label="End Time (HH:MM)">
            <Input type="time" value={v.end} onChange={(e) => updateTimes(v.start, e.target.value)} style={{ width: "100%" }} />
          </Field>
          <Field label="Break Type">
            <Select value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })} style={{ width: "100%" }}>
              <option value="lunch">Lunch Break</option>
              <option value="tea">Tea / Snack Break</option>
              <option value="turnover">Shift Turnover / Debrief</option>
              <option value="rest">Prayer / Rest Window</option>
            </Select>
          </Field>
        </div>

        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f8f8fb", border: `1px solid ${V.border}` }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: V.text2, marginBottom: 6 }}>Applicable Days:</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
              const active = (v.days || []).includes(d);
              return (
                <button key={d} type="button" onClick={() => toggleDay(d)} style={{ border: `1px solid ${active ? V.primary : V.border}`, background: active ? V.primarySoft : "#fff", color: active ? V.primary : V.text2, fontWeight: active ? 700 : 500, borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: v.mandatory ? "#fdf3f2" : "#f8f8fb", border: `1px solid ${v.mandatory ? "#fad2cf" : V.border}` }}>
          <input type="checkbox" id="mandBreak" checked={v.mandatory} onChange={(e) => setV({ ...v, mandatory: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer" }} />
          <label htmlFor="mandBreak" style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: v.mandatory ? "#b3261e" : V.text }}>
            Mandatory Blackout Window (Strict: Schedulers &amp; Templates cannot place any session during this time)
          </label>
        </div>
      </div>
    </Modal>
  );
}



/* ═══════════════════════════════════════════════════════════════════════
   SHIFT MASTER SCREEN — Switcher between Weekly Templates (New Master)
   and Single Shift Windows.
   ═══════════════════════════════════════════════════════════════════════ */
function ShiftMaster({ data, dispatch, toast, scopeSite, onGoLms }) {
  const [tab, setTab] = useState("weekly");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>Shift &amp; Template Master</h1>
          <p style={{ fontSize: 13, color: V.text2, margin: "4px 0 0" }}>
            Configure weekly blueprint templates, session timing patterns, and shift windows.
          </p>
        </div>
        <Toggle value={tab} onChange={setTab} items={[["weekly", "Weekly Templates"], ["shifts", "Single Shift Windows"]]} />
      </div>

      {tab === "weekly" ? (
        <WeeklyTemplateMaster data={data} dispatch={dispatch} toast={toast} scopeSite={scopeSite} />
      ) : (
        <SingleShiftMaster data={data} dispatch={dispatch} toast={toast} scopeSite={scopeSite} onGoLms={onGoLms} />
      )}
    </div>
  );
}

function SingleShiftMaster({ data, dispatch, toast, scopeSite, onGoLms }) {
  const shifts = scopeSite ? data.shifts.filter((s) => s.site === scopeSite) : data.shifts;
  const [sel, setSel] = useState(shifts[0]?.id ?? null);
  const [editing, setEditing] = useState(null); const [laneEdit, setLaneEdit] = useState(null);
  const shift = data.shifts.find((s) => s.id === sel) ?? shifts[0];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18, alignItems: "start" }}>
      <Card pad={false}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Shifts</span>
          <Btn size="sm" kind="primary" onClick={() => setEditing({ __new: true, code: "", name: "", site: scopeSite || SITES[0].id, color: V.primary, start: 480, sessions: [] })}>+ Add</Btn>
        </div>
        {shifts.map((s) => (
          <button key={s.id} onClick={() => setSel(s.id)} style={{ width: "100%", textAlign: "left", border: 0, cursor: "pointer",
            padding: "10px 16px", borderBottom: `1px solid ${V.border}`, borderLeft: `3px solid ${sel === s.id ? s.color : "transparent"}`,
            background: sel === s.id ? V.todayTint : "#fff" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{s.code}</div>
            <div style={{ fontSize: 11, color: V.text2 }}>{orgUnit(s.site)?.name} · {s.sessions.length} sessions</div>
          </button>))}
      </Card>
      {shift ? (
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between" }}><CardHead label={shift.name} sub={`${shift.code} · starts ${fmtT(shift.start)}`} />
              <div style={{ display: "flex", gap: 8 }}><Btn size="sm" onClick={() => setEditing(shift)}>Edit</Btn>
                <Btn size="sm" kind="danger" onClick={() => { dispatch({ type: "shiftDelete", id: shift.id }); setSel(null); }}>Delete</Btn></div></div>
          </Card>
          <Card pad={false}>
            <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <CardHead label="Sessions in this shift" sub="Each session is a time block only — module and trainers are chosen per date in Auto Rostering, not here." />
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {onGoLms && <Btn size="sm" onClick={onGoLms} title="Pull sessions and course mapping from Digii instead of adding them by hand">⟳ Sync from LMS instead</Btn>}
                <Btn size="sm" kind="primary" onClick={() => setLaneEdit({ __new: true, o: 0, d: 120 })}>+ Add session</Btn>
              </div>
            </div>
            {shift.sessions.length === 0 ? <div style={{ padding: "0 16px 16px" }}>
              <EmptyState title="No sessions in this shift" hint="Add a time block manually, or sync this site's course calendar from the LMS — module and trainer come later, in Auto Rostering." icon="▤" /></div> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["#", "Session", "Time", "Duration", ""].map((h, i) => <th key={i} style={{ ...thBase, textAlign: i === 0 ? "left" : "center" }}>{h}</th>)}</tr></thead>
                <tbody>{shift.sessions.map((ln, i) => (
                  <tr key={i}>
                    <td style={{ ...tdBase, borderRight: 0 }}>{i + 1}</td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "center", color: V.text2 }}>Session {i + 1}</td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "center" }}><Num>{fmtT(shift.start + ln.o)}–{fmtT(shift.start + ln.o + ln.d)}</Num></td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "center" }}>{ln.d} min</td>
                    <td style={{ ...tdBase, borderRight: 0, textAlign: "right" }}>
                      <Btn size="sm" onClick={() => setLaneEdit({ ...ln, index: i })}>Edit</Btn>{" "}
                      <Btn size="sm" kind="danger" onClick={() => dispatch({ type: "laneDelete", shiftId: shift.id, index: i })}>×</Btn></td>
                  </tr>))}</tbody>
              </table>
            )}
          </Card>
        </div>
      ) : <Card><EmptyState title="Select a shift" /></Card>}
      {editing && <ShiftForm record={editing} scopeSite={scopeSite} onClose={() => setEditing(null)}
        onSave={(vals) => { dispatch({ type: editing.__new ? "shiftAdd" : "shiftEdit", id: editing.id, vals }); setEditing(null); }} />}
      {laneEdit && shift && <LaneForm record={laneEdit} shift={shift} onClose={() => setLaneEdit(null)}
        onSave={(vals) => { dispatch({ type: laneEdit.__new ? "laneAdd" : "laneEdit", shiftId: shift.id, index: laneEdit.index, vals }); setLaneEdit(null); }} />}
    </div>
  );
}
function ShiftForm({ record, scopeSite, onClose, onSave }) {
  const [v, setV] = useState({ code: record.code, name: record.name, site: record.site, color: record.color, start: record.start });
  return (
    <Modal title={record.__new ? "Add Shift" : "Edit Shift"} onClose={onClose} width={520}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => onSave(v)}>Save</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Code"><Input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} style={{ width: "100%" }} /></Field>
        <Field label="Site"><Select value={v.site} disabled={!!scopeSite} onChange={(e) => setV({ ...v, site: e.target.value })} style={{ width: "100%" }}>
          {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <div style={{ gridColumn: "span 2" }}><Field label="Name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} style={{ width: "100%" }} /></Field></div>
        <Field label="Start time"><Input type="time" value={fmtT(v.start)} onChange={(e) => setV({ ...v, start: toMins(e.target.value) })} style={{ width: "100%" }} /></Field>
      </div>
    </Modal>
  );
}
function LaneForm({ record, shift, onClose, onSave }) {
  const [v, setV] = useState({ o: record.o, d: record.d });
  const clash = shift.sessions.some((s, i) => i !== record.index && v.o < s.o + s.d && s.o < v.o + v.d);
  return (
    <Modal title={record.__new ? "Add session" : "Edit session"} sub={`${shift.name} — module is chosen later, in Auto Rostering`} onClose={onClose} width={460}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={clash} onClick={() => onSave(v)}>Save</Btn></>}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Starts at"><Input type="time" value={fmtT(shift.start + v.o)} onChange={(e) => setV({ ...v, o: toMins(e.target.value) - shift.start })} style={{ width: "100%" }} /></Field>
          <Field label="Duration (min)"><Input type="number" step="15" value={v.d} onChange={(e) => setV({ ...v, d: Number(e.target.value) })} style={{ width: "100%" }} /></Field>
        </div>
        {clash && <div style={{ fontSize: 12, color: "#b3261e", background: "#fce8e8", padding: 10, borderRadius: 7 }}>Overlaps another session in this shift.</div>}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AUTO ROSTERING — pick scope (BU → Site → Department), a shift template
   and a date range; generate literal, dated session rows directly into
   the same sessions table the scheduler reads. One source of truth, no
   separate pattern/override bookkeeping.
   ═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   AUTO ROSTERING — Select cascading scope (BU → Site → Department),
   load the mapped Weekly Template (e.g. 4 weekday sessions, 2 Saturday
   half-day sessions), enforce template policy constraints, assign Primary
   and Secondary trainers, and generate literal sessions into the scheduler.
   ═══════════════════════════════════════════════════════════════════════ */
function PublishedBanner({ batch, sessions, onView }) {
  const rows = sessions.filter((s) => s.batch === batch.id);
  const withTrainer = rows.filter((s) => s.trainer).length;
  return (
    <Card style={{ marginTop: 16, background: "#eef8f2", border: "1.5px solid #28a862" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#137a3f" }}>✓ Published {batch.count} sessions — {batch.name}</div>
          <div style={{ fontSize: 12.5, color: V.text2, marginTop: 4 }}>
            {orgUnit(batch.dept)?.name}, {orgUnit(batch.site)?.name} · {fmtDay(batch.from)} – {fmtDay(batch.to)} ·{" "}
            {withTrainer} with a trainer (awaiting confirmation), {rows.length - withTrainer} open for assignment or auction</div>
        </div>
        <Btn onClick={() => onView("scheduler", batch)}>Open in Scheduler →</Btn>
        <Btn kind="primary" onClick={() => onView("dashboard", batch)}>View on Dashboard →</Btn>
      </div>
    </Card>
  );
}

function AutoRostering({ data, dispatch, toast, scopeSite, scopeBu, onView }) {
  const [mode, setMode] = useState("template");
  // Batches published during this visit — the newest gets a banner with jump links.
  const [seenBatches] = useState((data.rosterSchedules ?? []).length);
  const latestBatch = (data.rosterSchedules ?? []).length > seenBatches ? data.rosterSchedules[0] : null;
  // BU → Site → Department cascade. A BU Head is locked to their own BU and a
  // site-scoped user to their own site, so neither can roster outside their scope.
  const lockedBu = scopeBu || (scopeSite ? buOf(scopeSite)?.id : "") || "";
  const [bu, setBu] = useState(lockedBu); const [site, setSite] = useState(scopeSite || ""); const [dept, setDept] = useState("");
  const siteOptions = scopeSite ? [orgUnit(scopeSite)] : bu ? orgChildren(bu).filter((u) => u.level === "site") : [];
  const deptOptions = site ? orgChildren(site) : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>Auto Rostering</h1>
          <p style={{ fontSize: 13, color: V.text2, margin: "4px 0 0" }}>
            Configure the roster, map training modules, and assign trainers.
          </p>
        </div>
        <Toggle value={mode} onChange={setMode} items={[["template", "Weekly Template"], ["weekly", "Custom Pattern"], ["quick", "Quick Generate"]]} />
      </div>

      <Card style={{ marginBottom: 16, marginTop: 12 }}>
        <CardHead label="Scope Selection" sub="Each selection cascades to the next — choose a BU, Site, and Department to roster" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {!scopeSite && (
            <Field label="Business unit">
              <Select value={bu} disabled={!!scopeBu} onChange={(e) => { setBu(e.target.value); setSite(""); setDept(""); }} style={{ width: "100%" }}>
                <option value="">Select BU</option>
                {BUS.filter((b) => !scopeBu || b.id === scopeBu).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Site">
            <Select value={site} disabled={!!scopeSite || !bu} onChange={(e) => { setSite(e.target.value); setDept(""); }} style={{ width: "100%" }}>
              <option value="">{bu ? "Select site" : "Select a BU first"}</option>
              {siteOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Department">
            <Select value={dept} onChange={(e) => setDept(e.target.value)} style={{ width: "100%" }}>
              <option value="">Select department</option>
              {deptOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {mode === "template"
        ? <TemplateAutoRoster data={data} dispatch={dispatch} toast={toast} dept={dept} site={site} bu={bu} />
        : mode === "weekly"
        ? <WeeklyPatternRoster data={data} dispatch={dispatch} toast={toast} dept={dept} site={site} />
        : <QuickGenerate data={data} dispatch={dispatch} toast={toast} dept={dept} site={site} />}
      {latestBatch && onView && <PublishedBanner batch={latestBatch} sessions={data.sessions} onView={onView} />}
    </div>
  );
}

/* ─────────────────────── TEMPLATE AUTO ROSTER (NEW) ───────────────────────
   Picks from Weekly Templates mapped to the selected BU / Site; loads the 1-week
   schedule (Mon–Fri 4 sessions, Saturday 2 sessions half-day, Sunday off);
   allows mapping modules, Primary trainers, and Secondary trainers with live
   candidate ranking and policy limit validation (max sessions/day, max sessions/week).
   ────────────────────────────────────────────────────────────────────────── */
function TemplateAutoRoster({ data, dispatch, toast, dept, site, bu }) {
  const allTemplates = data.weeklyTemplates ?? [];
  // Find templates mapped to current site or BU
  const mappedTemplates = useMemo(() => {
    if (!site && !bu) return allTemplates;
    return allTemplates.filter((t) => {
      const units = t.mappedUnits || [];
      if (site && units.includes(site)) return true;
      if (site && buOf(site) && units.includes(buOf(site).id)) return true;
      if (bu && units.includes(bu)) return true;
      if (bu && orgChildren(bu).some((s) => units.includes(s.id))) return true;
      return false;
    });
  }, [allTemplates, site, bu]);

  const templateOptions = mappedTemplates.length > 0 ? mappedTemplates : allTemplates;
  const [templateId, setTemplateId] = useState(templateOptions[0]?.id ?? "");

  useEffect(() => {
    if (templateOptions.length && !templateOptions.some((t) => t.id === templateId)) {
      setTemplateId(templateOptions[0].id);
    }
  }, [site, bu, templateOptions]);

  const tmpl = allTemplates.find((t) => t.id === templateId) ?? templateOptions[0];

  const effectiveBreaks = getEffectiveBreakTimes(bu, site, data.breakTimes);
  const breakCollisions = useMemo(() => {
    if (!tmpl) return [];
    const list = [];
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((dk) => {
      const dayCfg = tmpl.days?.[dk];
      if (dayCfg && dayCfg.active && !dayCfg.isRestDay) {
        (dayCfg.sessions || []).forEach((sn, idx) => {
          const clash = checkSessionBreakCollision(sn.start, sn.end, dk, effectiveBreaks);
          if (clash) {
            list.push({ day: dk, idx: idx + 1, start: sn.start, end: sn.end, ...clash });
          }
        });
      }
    });
    return list;
  }, [tmpl, effectiveBreaks]);

  const isMonthly = tmpl?.type === "monthly";
  // Cycle range
  const [from, setFrom] = useState("2026-09-28"); // first Monday after the seeded fortnight
  const [to, setTo] = useState(tmpl?.type === "monthly" ? "2026-10-25" : "2026-10-04");
  const [generatedSuccess, setGeneratedSuccess] = useState(false);

  useEffect(() => {
    if (tmpl?.type === "monthly") {
      setTo(iso(addDays(parseD(from), 27)));
    }
  }, [tmpl?.id]);

  const [curWeek, setCurWeek] = useState("W1");
  const [curDay, setCurDay] = useState("Mon");

  // Daily modules state: { [weekKey]: { [dayKey]: { [slotIndex]: moduleId } } }
  const [modules, setModules] = useState(() => {
    const initMap = {};
    ["W1", "W2", "W3", "W4"].forEach((wk) => {
      initMap[wk] = {};
      ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((dk) => {
        initMap[wk][dk] = { 0: "MOD-SAFETY", 1: "MOD-CRANE", 2: "MOD-SOFT", 3: "MOD-QUALITY", 4: "MOD-FIRSTAID" };
      });
      initMap[wk]["Sat"] = { 0: "MOD-FIRSTAID", 1: "MOD-DIGITAL" };
      initMap[wk]["Sun"] = {};
    });
    return initMap;
  });

  // Optional manual assignments: { [weekKey]: { [dayKey]: { [slotIndex]: { primary, secondary } } } }
  const [assignments, setAssignments] = useState({});

  const setSlotModule = (wKey, dKey, slotIdx, modId) => {
    setModules((prev) => ({
      ...prev,
      [wKey]: {
        ...(prev[wKey] || {}),
        [dKey]: {
          ...(prev[wKey]?.[dKey] || {}),
          [slotIdx]: modId,
        },
      },
    }));
  };

  const setSlotTrainer = (wKey, dKey, slotIdx, role, empId) => {
    setAssignments((prev) => ({
      ...prev,
      [wKey]: {
        ...(prev[wKey] || {}),
        [dKey]: {
          ...(prev[wKey]?.[dKey] || {}),
          [slotIdx]: {
            ...(prev[wKey]?.[dKey]?.[slotIdx] || {}),
            [role]: empId,
          },
        },
      },
    }));
  };

  // Productivity helpers
  const copyDayToWeekdays = (srcDay, srcWeek) => {
    const src = modules[srcWeek]?.[srcDay] || {};
    setModules((prev) => {
      const next = { ...prev };
      next[srcWeek] = { ...(next[srcWeek] || {}) };
      ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((dk) => {
        next[srcWeek][dk] = { ...src };
      });
      return next;
    });
  };

  const copyW1ToAllWeeks = () => {
    const w1 = modules["W1"] || {};
    setModules((prev) => ({
      ...prev,
      W2: JSON.parse(JSON.stringify(w1)),
      W3: JSON.parse(JSON.stringify(w1)),
      W4: JSON.parse(JSON.stringify(w1)),
    }));
  };

  const sequenceCurriculum = (dKey, wKey) => {
    setModules((prev) => ({
      ...prev,
      [wKey]: {
        ...(prev[wKey] || {}),
        [dKey]: { 0: "MOD-SAFETY", 1: "MOD-CRANE", 2: "MOD-SOFT", 3: "MOD-QUALITY", 4: "MOD-FIRSTAID" },
      },
    }));
  };

  const fillDayWithModule = (modId, dKey, wKey, count) => {
    const obj = {};
    for (let i = 0; i < count; i++) obj[i] = modId;
    setModules((prev) => ({
      ...prev,
      [wKey]: {
        ...(prev[wKey] || {}),
        [dKey]: obj,
      },
    }));
  };

  // Date occurrences calculation
  const dates = useMemo(() => {
    if (!from || !to) return [];
    const out = []; let d = parseD(from); const end = parseD(to);
    while (d <= end) { out.push(new Date(d)); d = addDays(d, 1); }
    return out;
  }, [from, to]);

  const totalSessionsCount = useMemo(() => {
    if (!tmpl || !dates.length) return 0;
    const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const startD = parseD(from);
    return dates.reduce((acc, d) => {
      const dayKey = DAY_KEYS[d.getDay()];
      let dayCfg;
      if (tmpl.type === "monthly" && tmpl.weeks) {
        const diffDays = Math.max(0, Math.floor((d.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
        const wNum = (Math.floor(diffDays / 7) % 4) + 1;
        const wKey = `W${wNum}`;
        dayCfg = tmpl.weeks[wKey]?.days?.[dayKey] || tmpl.days?.[dayKey];
      } else {
        dayCfg = tmpl.days?.[dayKey];
      }
      if (dayCfg && dayCfg.active && !dayCfg.isRestDay) {
        return acc + (dayCfg.sessions?.length || 0);
      }
      return acc;
    }, 0);
  }, [tmpl, dates, from]);

  const isMappedToSite = tmpl && site && (tmpl.mappedUnits || []).includes(site);
  const isMappedToBu = tmpl && bu && (tmpl.mappedUnits || []).includes(bu);

  // Quick cycle setters
  const setQuickRange = (weeks) => {
    const start = parseD(from);
    const end = addDays(start, weeks * 7 - 1);
    setFrom(iso(start));
    setTo(iso(end));
  };

  // Calculation of overall modules mapped vs total configured slots across template
  const { totalSlotsToMap, mappedSlotsCount, unmappedSlotsCount } = useMemo(() => {
    if (!tmpl) return { totalSlotsToMap: 0, mappedSlotsCount: 0, unmappedSlotsCount: 0 };
    let total = 0;
    let mapped = 0;
    if (isMonthly && tmpl.weeks) {
      ["W1", "W2", "W3", "W4"].forEach((wk) => {
        const daysObj = tmpl.weeks[wk]?.days || {};
        Object.entries(daysObj).forEach(([dk, dCfg]) => {
          if (dCfg && dCfg.active && !dCfg.isRestDay && dCfg.sessions?.length) {
            dCfg.sessions.forEach((_, sIdx) => {
              total++;
              if (modules[wk]?.[dk]?.[sIdx]) mapped++;
            });
          }
        });
      });
    } else if (tmpl.days) {
      Object.entries(tmpl.days).forEach(([dk, dCfg]) => {
        if (dCfg && dCfg.active && !dCfg.isRestDay && dCfg.sessions?.length) {
          dCfg.sessions.forEach((_, sIdx) => {
            total++;
            if (modules["W1"]?.[dk]?.[sIdx] || modules[dk]?.[sIdx]) mapped++;
          });
        }
      });
    }
    return { totalSlotsToMap: total, mappedSlotsCount: mapped, unmappedSlotsCount: Math.max(0, total - mapped) };
  }, [tmpl, isMonthly, modules]);

  const allModulesMapped = totalSlotsToMap > 0 && mappedSlotsCount === totalSlotsToMap;

  const handleGenerate = () => {
    if (!dept || !tmpl || !allModulesMapped || breakCollisions.length > 0) return;
    dispatch({
      type: "rosterGenerateFromTemplate",
      templateId: tmpl.id,
      dept,
      from,
      to,
      modules,
      assignments,
    });
    setGeneratedSuccess(true);
  };

  // Current active day session slots
  const effectiveWeekDays = isMonthly && tmpl?.weeks ? tmpl.weeks[curWeek]?.days : tmpl?.days;
  const activeDayCfg = effectiveWeekDays?.[curDay] || { active: true, sessions: [] };
  const curSessions = activeDayCfg.sessions || [];

  // Mapped modules summary
  const totalSlotsConfigured = useMemo(() => {
    if (!tmpl) return 0;
    const daysObj = isMonthly && tmpl.weeks ? tmpl.weeks[curWeek]?.days : tmpl.days;
    if (!daysObj) return 0;
    return Object.values(daysObj).reduce((acc, d) => acc + (d.active && !d.isRestDay ? (d.sessions?.length || 0) : 0), 0);
  }, [tmpl, isMonthly, curWeek]);

  const currentDayMappedCount = curSessions.filter((_, idx) => modules[curWeek]?.[curDay]?.[idx]).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Template Selection Card */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Select Blueprint Template</span>
              <span style={{ fontSize: 12, color: V.text2 }}>
                {isMonthly ? "Monthly (4-week cycle)" : "Weekly (7-day blueprint)"}
                {(isMappedToSite || isMappedToBu) && ` · Mapped to ${site ? orgUnit(site)?.name : orgUnit(bu)?.name}`}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: V.text3, marginTop: 3 }}>
              Blueprints configured for this Business Unit or Site.
            </div>
          </div>
          <div style={{ minWidth: 280 }}>
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ width: "100%", height: 38, fontWeight: 600, fontSize: 13 }}>
              {templateOptions.map((t) => {
                const isMapped = (site && (t.mappedUnits || []).includes(site)) || (bu && (t.mappedUnits || []).includes(bu));
                return (
                  <option key={t.id} value={t.id}>
                    [{t.type === "monthly" ? "Month" : "Week"}] {t.code} — {t.name} {isMapped ? "★ [Mapped]" : ""}
                  </option>
                );
              })}
            </Select>
          </div>
        </div>

        {tmpl && (
          <div style={{ background: "#f8f8fb", borderRadius: 8, padding: "12px 14px", border: `1px solid ${V.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: tmpl.color || V.primary }} />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{tmpl.name}</span>
                {tmpl.desc && <span style={{ fontSize: 12, color: V.text2 }}>· {tmpl.desc}</span>}
              </div>
              <span style={{ fontSize: 12, color: V.text2, fontWeight: 500 }}>
                {isMonthly ? `~${countTemplateTotalSessions(tmpl)} sessions/month` : `${totalSlotsConfigured} sessions/week`}
              </span>
            </div>

            {/* Enforced Policies Metadata */}
            <div style={{ fontSize: 12, color: V.text3, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: V.text2 }}>Policies:</span>
              <span>Max {tmpl.settings?.maxSessionsPerDay ?? 4}/day</span>
              <span>·</span>
              <span>Max {tmpl.settings?.maxSessionsPerWeek ?? 22}/week</span>
              <span>·</span>
              <span>Max {tmpl.settings?.maxSessionsPerMonth ?? 88}/month</span>
              <span>·</span>
              <span>{tmpl.settings?.minBufferMins ?? 15}m rest buffer</span>
              <span>·</span>
              <span>Max {tmpl.settings?.maxValidRejections ?? 3} rejections</span>
            </div>
          </div>
        )}
      </Card>

      {/* Cycle Date Range Card */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Roster Cycle Range</div>
            <div style={{ fontSize: 12, color: V.text2, marginTop: 2 }}>
              {isMonthly ? "4-week monthly blueprint applies across this date range" : "The 1-week blueprint repeats across dates in this window"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {isMonthly ? (
                <>
                  <Btn size="sm" kind="primary" onClick={() => setQuickRange(4)}>Full Month (4 Weeks)</Btn>
                  <Btn size="sm" onClick={() => setQuickRange(2)}>2 Weeks (14d)</Btn>
                  <Btn size="sm" onClick={() => setQuickRange(1)}>1 Week (7d)</Btn>
                </>
              ) : (
                <>
                  <Btn size="sm" onClick={() => setQuickRange(1)}>1 Week (7d)</Btn>
                  <Btn size="sm" onClick={() => setQuickRange(2)}>2 Weeks (14d)</Btn>
                  <Btn size="sm" onClick={() => setQuickRange(4)}>4 Weeks (28d)</Btn>
                </>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 140 }} /></Field>
              <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 140 }} /></Field>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${V.border}`, fontSize: 12, color: V.text2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            {dates.length} calendar days · <strong>{totalSessionsCount} total sessions to generate</strong>
          </span>
          <span style={{ color: V.text2 }}>Rest days automatically receive 0 sessions</span>
        </div>
      </Card>

      {/* Daily Session-to-Module Mapping Grid */}
      <Card pad={false}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Map Training Modules &amp; Assign Trainers</div>
            <div style={{ fontSize: 12.5, color: V.text2, marginTop: 2 }}>
              Map each session slot to a module. Trainer assignment is optional.
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: allModulesMapped ? "#137a3f" : "#b45309", fontWeight: 600 }}>
              {allModulesMapped ? `${totalSlotsToMap}/${totalSlotsToMap} modules mapped` : `${mappedSlotsCount}/${totalSlotsToMap} modules mapped`}
            </span>
            <span style={{ fontSize: 12, color: V.text3 }}>Trainer optional</span>
          </div>
        </div>

        {/* Month Week Switcher (If Monthly) */}
        {isMonthly && (
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${V.border}`, background: "#fcfcff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: V.text2 }}>Month Weeks:</span>
              {["W1", "W2", "W3", "W4"].map((wk, idx) => (
                <button
                  key={wk}
                  onClick={() => setCurWeek(wk)}
                  style={{
                    border: `1px solid ${curWeek === wk ? V.primary : V.border}`,
                    background: curWeek === wk ? V.primary : "#fff",
                    color: curWeek === wk ? "#fff" : V.text,
                    borderRadius: 6,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Week {idx + 1} ({wk})
                </button>
              ))}
            </div>
            <Btn size="sm" onClick={copyW1ToAllWeeks} style={{ borderColor: V.primary, color: V.primary }}>
              Reuse Week 1 Modules for All 4 Weeks
            </Btn>
          </div>
        )}

        {/* Day Switcher Tabs */}
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "#fafafc" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dk) => {
              const dCfg = effectiveWeekDays?.[dk];
              const sCount = dCfg?.active && !dCfg?.isRestDay ? (dCfg.sessions?.length || 0) : 0;
              const isSelected = curDay === dk;
              return (
                <button
                  key={dk}
                  onClick={() => setCurDay(dk)}
                  style={{
                    border: `1.5px solid ${isSelected ? V.primary : V.border}`,
                    background: isSelected ? V.todayTint : "#fff",
                    color: isSelected ? V.primary : V.text,
                    borderRadius: 8,
                    padding: "7px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 80,
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{dk}</div>
                  <div style={{ fontSize: 10.5, color: isSelected ? V.primary : V.text2, marginTop: 1 }}>
                    {sCount === 0 ? "Rest Day" : `${sCount} slots`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Action Presets */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Btn size="sm" onClick={() => copyDayToWeekdays(curDay, curWeek)} title="Copy today's modules to Monday through Friday">
              Copy to Mon–Fri
            </Btn>
            <Btn size="sm" onClick={() => sequenceCurriculum(curDay, curWeek)} title="Apply standard sequential curriculum">
              Sequence Curriculum
            </Btn>
          </div>
        </div>

        {/* Session Slots List for Active Day */}
        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {activeDayCfg.label || curDay}
              </span>
              <span style={{ fontSize: 12, color: V.text2 }}>
                {curSessions.length} sessions · {currentDayMappedCount}/{curSessions.length} mapped
              </span>
            </div>
            {curSessions.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: V.text3 }}>Quick fill:</span>
                {MODULES.slice(0, 3).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => fillDayWithModule(m.id, curDay, curWeek, curSessions.length)}
                    style={{ border: `1px solid ${V.border}`, background: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 10.5, cursor: "pointer", color: V.text2 }}
                  >
                    {m.short}
                  </button>
                ))}
              </div>
            )}
          </div>

          {curSessions.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", background: "#f8f8fb", borderRadius: 8, border: `1px dashed ${V.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: V.text2 }}>Rest Day</div>
              <div style={{ fontSize: 12, color: V.text3, marginTop: 2 }}>
                No sessions configured for {curDay}.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {curSessions.map((slot, sIdx) => {
                const modId = modules[curWeek]?.[curDay]?.[sIdx] || "";
                const mod = moduleOf(modId);
                const assign = assignments[curWeek]?.[curDay]?.[sIdx] || {};
                const sMin = toMins(slot.start);
                const eMin = toMins(slot.end);

                // Candidates count
                const ranked = mod ? rankCandidates(data.employees, {
                  skillId: mod.skill, dateIso: from, startMin: sMin, endMin: eMin, siteId: site || "SITE-MUNDRA", skipSkillGate: mod.level === "foundation",
                }, data.sessions, data.weights) : { eligible: [], excluded: [] };

                return (
                  <div key={sIdx} style={{ border: `1px solid ${modId ? V.border : "#f0c27a"}`, borderRadius: 8, padding: "12px 14px", background: modId ? "#fafafc" : "#fffdf8" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "140px 1.2fr 1.1fr 1.1fr", gap: 12, alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{slot.label || `Session ${sIdx + 1}`}</div>
                        <div style={{ fontSize: 11.5, color: V.text2 }}><Num>{slot.start} – {slot.end}</Num></div>
                        <div style={{ fontSize: 10, color: "#28a862", marginTop: 2 }}>{slot.d} mins duration</div>
                        <div style={{ marginTop: 6 }}>
                          {assign.primary ? (
                            <span style={{ fontSize: 11, fontWeight: 500, color: "#0369a1", display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0284c7" }} />
                              Assigned
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 500, color: "#92400e", display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                              Open for auction
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Module Selection */}
                      <div>
                        <div style={{ fontSize: 10.5, color: V.text3, marginBottom: 3, fontWeight: 600, textTransform: "uppercase" }}>Training Module</div>
                        <Select
                          value={modId}
                          onChange={(e) => setSlotModule(curWeek, curDay, sIdx, e.target.value)}
                          style={{ width: "100%", height: 36, fontSize: 12.5, borderColor: modId ? V.border : "#f0c27a", background: "#fff" }}
                        >
                          <option value="">— Select Training Module —</option>
                          {MODULES.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.level}) — {skillOf(m.skill)?.name}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Primary Trainer Manual Selection */}
                      <div>
                        <div style={{ fontSize: 10.5, color: V.text3, marginBottom: 3, fontWeight: 600, textTransform: "uppercase" }}>Primary Trainer (Optional)</div>
                        <Select
                          value={assign.primary ?? ""}
                          onChange={(e) => setSlotTrainer(curWeek, curDay, sIdx, "primary", e.target.value)}
                          style={{ width: "100%", height: 36, fontSize: 12, borderColor: assign.primary ? "#0284c7" : V.border, background: assign.primary ? "#f0f9ff" : "#fff" }}
                        >
                          <option value="">— Unassigned (Open for Auction) —</option>
                          {ranked.eligible.map((c) => (
                            <option key={c.emp.id} value={c.emp.id}>
                              ★ {c.emp.name} · Match {c.total}%
                            </option>
                          ))}
                          {ranked.eligible.length === 0 && data.employees.map((e) => (
                            <option key={e.id} value={e.id}>{e.name} (General pool)</option>
                          ))}
                        </Select>
                      </div>

                      {/* Secondary Trainer Manual Selection */}
                      <div>
                        <div style={{ fontSize: 10.5, color: V.text3, marginBottom: 3, fontWeight: 600, textTransform: "uppercase" }}>Secondary (Optional)</div>
                        <Select
                          value={assign.secondary ?? ""}
                          onChange={(e) => setSlotTrainer(curWeek, curDay, sIdx, "secondary", e.target.value)}
                          style={{ width: "100%", height: 36, fontSize: 12, background: "#fff" }}
                        >
                          <option value="">— None —</option>
                          {ranked.eligible.filter((c) => c.emp.id !== assign.primary).map((c) => (
                            <option key={c.emp.id} value={c.emp.id}>
                              {c.emp.name} (Assist)
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Compliance Verification & Generate Action */}
      <Card style={{ background: breakCollisions.length > 0 ? "#fdf3f2" : V.todayTint, border: `1.5px solid ${breakCollisions.length > 0 ? "#fad2cf" : V.primarySoft}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: breakCollisions.length > 0 ? "#b3261e" : V.primary, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{breakCollisions.length > 0 ? "⚠️" : "✓"}</span> {breakCollisions.length > 0 ? `Break-Time Blackout Collision (${breakCollisions.length} Violations)` : "Policy & Break-Time Verification Passed"}
            </div>
            <div style={{ fontSize: 12.5, color: V.text2, marginTop: 4 }}>
              Template: <strong>{tmpl?.name}</strong> · Validated against <strong>Max {tmpl?.settings?.maxSessionsPerDay ?? 4} sessions/day</strong>, <strong>Max {tmpl?.settings?.maxSessionsPerWeek ?? 22} sessions/week</strong>, and <strong>Central/BU/Site break blackouts</strong>.
            </div>
            {breakCollisions.length > 0 && (
              <div style={{ fontSize: 12, color: "#b3261e", marginTop: 6, fontWeight: 600 }}>
                Rule: No session is permitted in defined break-time windows.
                <ul style={{ margin: "4px 0 0 16px", fontWeight: 400 }}>
                  {breakCollisions.map((c, i) => (
                    <li key={i}>{c.day} Session {c.idx} ({c.start}–{c.end}): {c.reason}</li>
                  ))}
                </ul>
                Please edit session timings in the Weekly Template Master to remove collisions before generating.
              </div>
            )}
            {!dept && (
              <div style={{ fontSize: 12, color: "#b3261e", marginTop: 4, fontWeight: 600 }}>
                ⚠️ Please select a Department in the Scope section above before generating the roster.
              </div>
            )}
            {!allModulesMapped && (
              <div style={{ fontSize: 12, color: "#b3261e", marginTop: 4, fontWeight: 600 }}>
                ⚠️ Every session must be mapped with a module before generating ({unmappedSlotsCount} session slot{unmappedSlotsCount > 1 ? "s" : ""} remaining). Trainer assignment is optional.
              </div>
            )}
            {allModulesMapped && (
              <div style={{ fontSize: 12, color: "#137a3f", marginTop: 4, fontWeight: 600 }}>
                ✓ All {totalSlotsToMap} session slots have modules mapped. Trainer assigning is optional — ready to create and publish!
              </div>
            )}
          </div>

          <Btn
            kind="primary"
            disabled={!dept || breakCollisions.length > 0 || !allModulesMapped}
            onClick={handleGenerate}
            style={{ height: 44, padding: "0 24px", fontSize: 14, fontWeight: 700 }}
          >
            {breakCollisions.length > 0
              ? "Resolve Break Collisions to Generate"
              : !allModulesMapped
              ? `Map All Modules to Generate (${mappedSlotsCount}/${totalSlotsToMap})`
              : `Create & Publish Roster (${totalSessionsCount} Sessions)`}
          </Btn>
        </div>

        {generatedSuccess && (
          <div style={{ marginTop: 14, fontSize: 12, color: "#15803d" }}>
            Assigned trainers have been notified to confirm in the ShiftEaze mobile app. Unassigned sessions are open for manual assignment or trainer auction.
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─────────────────────── WEEKLY PATTERN ROSTER (new) ───────────────────────
   Drag a shift onto a day of the week (or click the shift, then click the
   day) to build a repeating pattern; below, one group per shift used shows
   its session lanes with a ranked, engine-informed employee picker per lane
   — pick once and it repeats on every date that lane occurs across the
   whole cycle, matching "same employee each time." */
function WeeklyPatternRoster({ data, dispatch, toast, dept, site }) {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [picked, setPicked] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [pattern, setPattern] = useState(["", "", "", "", "", "", ""]);
  const [modules, setModules] = useState({}); // { [shiftCode]: { [laneIndex]: moduleId } }
  const [assignments, setAssignments] = useState({}); // { [shiftCode]: { [laneIndex]: { primary, secondary } } }
  const [from, setFrom] = useState("2026-09-28");
  const [to, setTo] = useState("2026-10-23");

  const shiftOptions = data.shifts.filter((s) => !site || s.site === site);
  const usedCodes = [...new Set(pattern.filter(Boolean))];
  const groups = usedCodes.map((code) => data.shifts.find((s) => s.code === code)).filter(Boolean);
  const totalLanes = groups.reduce((a, sh) => a + sh.sessions.length, 0);
  const modulesMapped = groups.reduce((a, sh) => a + sh.sessions.filter((_, i) => modules[sh.code]?.[i]).length, 0);
  const primariesAssigned = groups.reduce((a, sh) => a + sh.sessions.filter((_, i) => assignments[sh.code]?.[i]?.primary).length, 0);

  const setDay = (idx, code) => setPattern((p) => { const next = [...p]; next[idx] = code; return next; });
  const setModule = (code, laneIdx, modId) => setModules((m) => ({ ...m, [code]: { ...(m[code] ?? {}), [laneIdx]: modId } }));
  const setLane = (code, laneIdx, role, empId) => setAssignments((a) => ({ ...a, [code]: { ...(a[code] ?? {}), [laneIdx]: { ...(a[code]?.[laneIdx] ?? {}), [role]: empId } } }));

  const submit = () => {
    if (!dept || !usedCodes.length || modulesMapped < totalLanes) return;
    dispatch({ type: "rosterGenerateWeekly", dept, from, to, pattern, modules, assignments });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18, alignItems: "start" }}>
      {/* Shift palette */}
      <Card style={{ position: "sticky", top: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>Shift Master</span>
          <span style={{ fontSize: 11, color: V.text3 }}>drag to a day →</span></div>
        {!site ? <div style={{ fontSize: 12.5, color: V.text3 }}>Select a site above to see its shifts.</div> :
          shiftOptions.length === 0 ? <div style={{ fontSize: 12.5, color: V.text3 }}>No shifts defined for this site yet — add one in Shift Master.</div> :
          shiftOptions.map((sh) => (
            <div key={sh.id} draggable onDragStart={() => setPicked(sh.code)} onDragEnd={() => setPicked(null)}
              onClick={() => setPicked(picked === sh.code ? null : sh.code)}
              style={{ border: `1px solid ${picked === sh.code ? V.primary : V.border}`, borderRadius: 8, padding: "10px 12px",
                marginBottom: 9, background: picked === sh.code ? V.todayTint : "#f7f6fd", cursor: "grab", userSelect: "none",
                boxShadow: picked === sh.code ? "0 0 0 2px rgba(59,48,144,.18)" : "none" }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: sh.color }} />{sh.code}</div>
              <div style={{ fontSize: 11.5, color: V.text2, marginTop: 2 }}>{sh.name}</div>
              <span style={{ display: "inline-block", marginTop: 6, fontSize: 10, color: V.primary, background: V.primarySoft, padding: "2px 7px", borderRadius: 999 }}>
                {sh.sessions.length} sessions</span>
            </div>))}
        {picked && <div style={{ fontSize: 11, color: V.primary, marginTop: 4 }}>Now click a day to place {picked}.</div>}
      </Card>

      <div style={{ display: "grid", gap: 16 }}>
        <Card>
          <CardHead label="Weekly shift pattern" sub="Drag a shift onto a day, or click a shift then click a day — this is the pattern the cycle repeats on."
            right={<Btn size="sm" onClick={() => setPattern(["", "", "", "", "", "", ""])}>↺ Reset week</Btn>} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
            {DAYS.map((dl, i) => {
              const code = pattern[i];
              const sh = data.shifts.find((s) => s.code === code);
              return (
                <div key={i}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(null); if (picked) { setDay(i, picked); setPicked(null); } }}
                  onClick={() => { if (picked) { setDay(i, picked); setPicked(null); } }}
                  style={{ border: dragOver === i ? `1.5px solid ${V.primary}` : sh ? `1px solid ${sh.color}55` : "1.5px dashed #d3d1db",
                    borderRadius: 10, padding: "10px 8px", minHeight: 96, position: "relative",
                    background: dragOver === i ? "#f1f0fb" : sh ? `${sh.color}12` : "#fafafc",
                    boxShadow: dragOver === i ? "0 0 0 3px rgba(59,48,144,.14)" : "none",
                    cursor: picked ? "copy" : "default", transition: "background .15s,border-color .15s" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: V.text2 }}>{dl}</div>
                  {sh ? (<>
                    <div style={{ fontSize: 13, fontWeight: 700, color: sh.color, marginTop: 6 }}>{sh.code}</div>
                    <div style={{ fontSize: 10.5, color: V.text2, lineHeight: 1.4 }}>{fmtT(sh.start)}–{fmtT(sh.start + (sh.sessions.at(-1)?.o ?? 0) + (sh.sessions.at(-1)?.d ?? 0))}</div>
                    <div style={{ fontSize: 10, color: V.text3, marginTop: 2 }}>{sh.sessions.length} sessions</div>
                    <button onClick={(e) => { e.stopPropagation(); setDay(i, ""); }}
                      style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, border: 0, borderRadius: "50%",
                        background: "rgba(0,0,0,.08)", color: V.text2, cursor: "pointer", fontSize: 12, lineHeight: 1 }}>×</button>
                  </>) : <div style={{ color: V.text3, fontSize: 10.5, fontStyle: "italic", marginTop: 8 }}>Drop a shift</div>}
                </div>);
            })}
          </div>
        </Card>

        <Card>
          <CardHead label="Cycle date range" sub="The weekly pattern above repeats across every date in this range" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 400 }}>
            <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: "100%" }} /></Field>
            <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: "100%" }} /></Field>
          </div>
        </Card>

        <Card>
          <CardHead label="Map modules & assign trainers" sub="A module is required per session. Primary and secondary trainer assignments are optional."
            right={<div style={{ display: "flex", gap: 12, fontSize: 12, color: V.text2 }}>
              <span style={{ fontWeight: 600, color: modulesMapped === totalLanes && totalLanes > 0 ? "#137a3f" : V.text2 }}>
                {modulesMapped}/{totalLanes} modules mapped
              </span>
              <span style={{ color: V.text3 }}>·</span>
              <span>{primariesAssigned}/{totalLanes} trainers assigned</span>
            </div>} />
          {groups.length === 0 ? <EmptyState title="No sessions in this pattern" hint="Place a shift that has sessions onto the week above." icon="▤" /> :
            groups.map((sh) => {
              const modsDone = sh.sessions.filter((_, i) => modules[sh.code]?.[i]).length;
              return (
                <div key={sh.id} style={{ border: `1px solid ${V.border}`, borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{sh.code} — {sh.name}</div>
                      <div style={{ fontSize: 12, color: V.text2 }}>Runs on {pattern.map((c, i) => c === sh.code ? DAYS[i] : null).filter(Boolean).join(", ")}</div></div>
                    <span style={{ fontSize: 12, color: modsDone === sh.sessions.length ? "#137a3f" : V.text2, fontWeight: 500 }}>
                      {modsDone}/{sh.sessions.length} modules
                    </span>
                  </div>
                  {sh.sessions.map((ln, i) => {
                    const modId = modules[sh.code]?.[i]; const mod = moduleOf(modId);
                    const lane = assignments[sh.code]?.[i] ?? {};
                    const busy = new Set(sh.sessions.map((o, j) => (j !== i && ln.o < o.o + o.d && o.o < ln.o + ln.d) ? assignments[sh.code]?.[j]?.primary : null).filter(Boolean));
                    const ranked = mod ? rankCandidates(data.employees, {
                      skillId: mod.skill, dateIso: from, startMin: sh.start + ln.o, endMin: sh.start + ln.o + ln.d, siteId: sh.site, skipSkillGate: mod.level === "foundation",
                    }, data.sessions, data.weights) : { eligible: [], excluded: [] };
                    return (
                      <div key={i} style={{ padding: "11px 0", borderTop: i ? `1px solid ${V.border}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11.5, color: V.text3, width: 62, flexShrink: 0 }}>{fmtT(sh.start + ln.o)}–{fmtT(sh.start + ln.o + ln.d)}</span>
                          <Select value={modId ?? ""} onChange={(e) => setModule(sh.code, i, e.target.value)}
                            style={{ width: 230, height: 34, fontSize: 12.5, borderColor: modId ? V.border : "#f0c27a", background: modId ? "#fff" : "#fff9ef" }}>
                            <option value="">— Select module —</option>
                            {MODULES.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.level})</option>)}
                          </Select>
                          {mod && <Pill tone={mod.level === "skilled" ? "danger" : "muted"}>{mod.level}</Pill>}
                          {mod && <span style={{ fontSize: 11, color: V.text3 }}>needs {skillOf(mod.skill)?.name ?? "—"}</span>}
                        </div>
                        {mod && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingLeft: 72 }}>
                            <div>
                              <div style={{ fontSize: 10.5, color: V.text3, marginBottom: 3 }}>Primary trainer (optional)</div>
                              <Select value={lane.primary ?? ""} onChange={(e) => setLane(sh.code, i, "primary", e.target.value)}
                                style={{ width: "100%", height: 32, fontSize: 12, borderColor: V.border, background: "#fff" }}>
                                <option value="">— Optional —</option>
                                {ranked.eligible.map((c) => <option key={c.emp.id} value={c.emp.id} disabled={busy.has(c.emp.id)}>
                                  {c.emp.name} · {c.total}{busy.has(c.emp.id) ? " — busy" : ""}</option>)}
                                {ranked.excluded.length > 0 && <option disabled>──────────</option>}
                                {ranked.excluded.map((c) => <option key={c.emp.id} value="" disabled>{c.emp.name} — {c.fails[0]}</option>)}
                              </Select>
                            </div>
                            <div>
                              <div style={{ fontSize: 10.5, color: V.text3, marginBottom: 3 }}>Secondary trainer</div>
                              <Select value={lane.secondary ?? ""} onChange={(e) => setLane(sh.code, i, "secondary", e.target.value)}
                                style={{ width: "100%", height: 32, fontSize: 12, background: "#fff" }}>
                                <option value="">— Optional —</option>
                                {ranked.eligible.filter((c) => c.emp.id !== lane.primary).map((c) => <option key={c.emp.id} value={c.emp.id}>{c.emp.name} · {c.total}</option>)}
                              </Select>
                            </div>
                          </div>)}
                      </div>);
                  })}
                </div>);
            })}
          <div style={{ fontSize: 12, color: V.text3, marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${V.border}` }}>
            Foundation-level modules are open to anyone active, site-scoped and free at that time. Skilled modules only show trainers who pass the competency gate — disabled options show why.
          </div>
        </Card>

        <Btn kind="primary" disabled={!dept || !usedCodes.length || modulesMapped < totalLanes} onClick={submit}
          title={modulesMapped < totalLanes ? "Every session needs a module before you can generate the cycle" : ""}>
          ✓ Save &amp; apply — generate the cycle
        </Btn>
        {totalLanes > 0 && modulesMapped < totalLanes && <p style={{ fontSize: 11.5, color: "#9a5b06", marginTop: 6 }}>
          {totalLanes - modulesMapped} session(s) still need a module before you can generate.</p>}
      </div>
    </div>
  );
}

/* ─────────────────────── QUICK GENERATE (unchanged from the original build) ───────────────────────
   A single shift template applied across a plain date range, with an
   optional bulk auto-assign — kept as an alternative to the weekly-pattern
   flow above for a fast, no-frills cycle.  */
function QuickGenerate({ data, dispatch, toast, dept, site }) {
  const [shiftId, setShiftId] = useState(""); const [from, setFrom] = useState("2026-09-28"); const [to, setTo] = useState("2026-10-23");
  const [weekdaysOnly, setWeekdaysOnly] = useState(true); const [autoAssign, setAutoAssign] = useState(true);
  const [modules, setModules] = useState({}); // { [laneIndex]: moduleId }

  const shiftOptions = data.shifts.filter((s) => !site || s.site === site);
  const shift = data.shifts.find((s) => s.id === shiftId);

  const dates = useMemo(() => {
    if (!from || !to) return [];
    const out = []; let d = parseD(from); const end = parseD(to);
    while (d <= end) { if (!weekdaysOnly || d.getDay() !== 0) out.push(iso(d)); d = addDays(d, 1); }
    return out;
  }, [from, to, weekdaysOnly]);

  const preview = shift ? dates.length * shift.sessions.length : 0;
  const modulesMapped = shift ? shift.sessions.filter((_, i) => modules[i]).length : 0;
  const ready = shift && modulesMapped === shift.sessions.length;

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <CardHead label="Shift template & date range" />
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14, marginBottom: 12 }}>
          <Field label="Shift template"><Select value={shiftId} onChange={(e) => { setShiftId(e.target.value); setModules({}); }} style={{ width: "100%" }}>
            <option value="">Select a shift</option>{shiftOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: "100%" }} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: "100%" }} /></Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 8 }}>
          <input type="checkbox" checked={weekdaysOnly} onChange={(e) => setWeekdaysOnly(e.target.checked)} />Skip Sundays</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} />
          Auto-assign the top-ranked eligible primary trainer to each session (otherwise generated unassigned)</label>
      </Card>

      {shift && (
        <Card style={{ marginBottom: 16 }}>
          <CardHead label="Map a module to each session" sub="Required — this is how the required skill (or Foundation open eligibility) is derived" />
          {shift.sessions.map((ln, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i ? `1px solid ${V.border}` : "none", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: V.text3, width: 110 }}><Num>{fmtT(shift.start + ln.o)}–{fmtT(shift.start + ln.o + ln.d)}</Num></span>
              <Select value={modules[i] ?? ""} onChange={(e) => setModules({ ...modules, [i]: e.target.value })}
                style={{ width: 260, height: 34, fontSize: 12.5, borderColor: modules[i] ? V.border : "#f0c27a", background: modules[i] ? "#fff" : "#fff9ef" }}>
                <option value="">— Select module —</option>
                {MODULES.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.level})</option>)}
              </Select>
              {modules[i] && <Pill tone={moduleOf(modules[i])?.level === "skilled" ? "danger" : "muted"}>{moduleOf(modules[i])?.level}</Pill>}
            </div>))}
        </Card>
      )}

      {shift && (
        <Card style={{ marginBottom: 16, background: V.todayTint }}>
          <div style={{ fontSize: 13 }}><strong>{preview}</strong> sessions will be generated — {dates.length} dates × {shift.sessions.length} session(s) per day, at {orgUnit(dept || site)?.name ?? "the selected scope"}.</div>
        </Card>
      )}

      <Btn kind="primary" disabled={!dept || !shiftId || !dates.length || !ready} onClick={() => dispatch({ type: "rosterGenerate", dept, shiftId, dates, autoAssign, modules })}
        title={shift && !ready ? "Every session needs a module first" : ""}>
        Generate {preview || ""} sessions
      </Btn>
      {shift && !ready && <p style={{ fontSize: 11.5, color: "#9a5b06", marginTop: 6 }}>{shift.sessions.length - modulesMapped} session(s) still need a module.</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LEAVE MANAGEMENT — apply, conflict detection, approval with automatic
   session release.
   ═══════════════════════════════════════════════════════════════════════ */
const rangeDays = (from, to) => { const out = []; let d = parseD(from); const end = parseD(to); while (d <= end) { out.push(iso(d)); d = addDays(d, 1); } return out; };
function leaveClashes(sessions, empId, from, to) {
  return sessions.filter((s) => s.trainer === empId && s.date >= from && s.date <= to && s.status !== "travel");
}
function LeaveApprovals({ data, dispatch, toast, scopeSite, scopeBu }) {
  const [tab, setTab] = useState("pending");
  const visible = data.leaves.filter((l) => {
    const e = empOf(l.emp); if (!e) return false;
    if (scopeSite) return e.site === scopeSite;
    if (scopeBu) return buOf(e.site)?.id === scopeBu;
    return true;
  });
  const list = visible.filter((l) => tab === "pending" ? l.state === "pending" : l.state !== "pending");
  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Leave Approvals</h1>
      <p style={{ fontSize: 13, color: V.text2, marginBottom: 16 }}>Approving leave releases any clashing session straight back to the scheduler.</p>
      <Toggle value={tab} onChange={setTab} items={[["pending", `Pending (${visible.filter((l) => l.state === "pending").length})`], ["decided", "Decided"]]} />
      <div style={{ height: 14 }} />
      <Card pad={false}>
        {list.length === 0 ? <EmptyState title="Nothing waiting" /> : list.map((l) => {
          const e = empOf(l.emp); const c = leaveClashes(data.sessions, l.emp, l.from, l.to);
          return (
            <div key={l.id} style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{e?.name} <Pill tone={l.state === "pending" ? "warn" : l.state === "approved" ? "success" : "danger"}>{l.state}</Pill></div>
                  <div style={{ fontSize: 12, color: V.text2, marginTop: 3 }}>{l.type} · <Num>{fmtDay(l.from)}{l.to !== l.from ? ` – ${fmtDay(l.to)}` : ""}</Num> · {l.reason}</div>
                  {c.length > 0 && <div style={{ fontSize: 11.5, color: "#9a5b06", marginTop: 5, background: "#fef2e0", padding: "6px 9px", borderRadius: 6 }}>
                    Approving releases {c.length} session(s) back to the scheduler.</div>}
                </div>
                {l.state === "pending" && <div style={{ display: "flex", gap: 8 }}>
                  <Btn size="sm" kind="danger" onClick={() => dispatch({ type: "leaveDecide", id: l.id, decision: "rejected" })}>Reject</Btn>
                  <Btn size="sm" kind="primary" onClick={() => dispatch({ type: "leaveDecide", id: l.id, decision: "approved" })}>Approve</Btn></div>}
              </div>
            </div>);
        })}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ATTENDANCE — QR / geofence punch at session level, coordinator verify.
   ═══════════════════════════════════════════════════════════════════════ */
function AttendanceOverview({ data, dispatch, toast, scopeSite }) {
  const [tab, setTab] = useState("pending");
  const recs = scopeSite ? data.attendance.filter((r) => data.sessions.find((s) => s.id === r.session)?.site === scopeSite) : data.attendance;
  const list = tab === "pending" ? recs.filter((r) => r.state === "pending") : recs.filter((r) => r.state === "verified");
  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Attendance Overview</h1>
      <p style={{ fontSize: 13, color: V.text2, marginBottom: 16 }}>Session-level punches with geofence validation before anything is billed.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        <Kpi label="Recorded" value={recs.length} /><Kpi label="Pending" value={recs.filter((r) => r.state === "pending").length} tone="#9a5b06" />
        <Kpi label="Verified" value={recs.filter((r) => r.state === "verified").length} tone="#137a3f" />
      </div>
      <Toggle value={tab} onChange={setTab} items={[["pending", "Pending"], ["verified", "Verified"]]} />
      <div style={{ height: 14 }} />
      <Card pad={false}>
        {list.length === 0 ? <EmptyState title="Nothing here" /> : list.map((r) => {
          const s = data.sessions.find((x) => x.id === r.session); const e = empOf(r.emp);
          return (
            <div key={r.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div><strong>{e?.name}</strong> · {moduleOf(s?.mod)?.short} · <Num>{r.in}–{r.out ?? "—"}</Num>
                <div style={{ fontSize: 11, color: r.metres > (data.geofences.find((g) => g.site === s?.site)?.radius ?? 200) ? "#b3261e" : "#6b6b74" }}>
                  {r.method === "qr" ? "QR scan" : `${r.metres} m from fence`}</div></div>
              {r.state === "pending" ? <Btn size="sm" kind="primary" onClick={() => dispatch({ type: "attVerify", id: r.id })}>Verify</Btn> : <Pill tone="success">Verified</Pill>}
            </div>);
        })}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   COMPETENCY VERIFICATION — assessor queue
   ═══════════════════════════════════════════════════════════════════════ */
function CompetencyQueue({ data, dispatch, toast, readOnly }) {
  const queue = data.employees.flatMap((e) => e.competencies.map((c, i) => ({ e, c, i })).filter((x) => x.c.state !== "verified"));
  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Competency Queue</h1>
      <p style={{ fontSize: 13, color: V.text2, marginBottom: 16 }}>{readOnly ? "Oversight view — verification is performed by the Competency Assessor role." : "Nothing counts towards rostering until it is verified here."}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 18 }}>
        <Kpi label="Awaiting assessment" value={queue.length} tone={queue.length ? "#9a5b06" : V.text} />
        <Kpi label="Core-skill claims" value={queue.filter((x) => skillOf(x.c.skill)?.criticality === "core").length} />
      </div>
      <Card pad={false}>
        {queue.length === 0 ? <EmptyState title="Queue is clear" /> : queue.map(({ e, c, i }) => {
          const sk = skillOf(c.skill); const meets = sk && c.level >= sk.minLevel && c.score >= sk.minScore;
          return (
            <div key={e.id + i} style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{e.name} {sk?.criticality === "core" && <Pill tone="danger">Core skill</Pill>}</div>
                <div style={{ fontSize: 12, color: V.text2, marginTop: 3 }}>Claims {LEVEL_NAME[c.level]} with score {c.score} in {sk?.name}</div>
                <div style={{ fontSize: 11.5, color: meets ? "#137a3f" : "#9a5b06", marginTop: 2 }}>Gate is L{sk?.minLevel}/{sk?.minScore} — {meets ? "meets it" : "does not meet it"}</div></div>
              {readOnly ? <Pill>View only</Pill> : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn size="sm" kind="danger" onClick={() => dispatch({ type: "compReject", empId: e.id, index: i })}>Send back</Btn>
                  <Btn size="sm" kind="primary" onClick={() => dispatch({ type: "compVerify", empId: e.id, index: i })}>Verify</Btn></div>)}
            </div>);
        })}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BULK UPLOAD & ONBOARDING
   ═══════════════════════════════════════════════════════════════════════ */
const PCS_PARTS = [["identity", "Confirm your details", 10], ["contact", "Contact & languages", 10], ["education", "Education", 10],
  ["work", "Work experience", 15], ["certs", "Certifications", 15], ["competency", "Declare your skills", 25], ["availability", "Deployable scope", 15]];
const pcsOf = (done) => PCS_PARTS.reduce((a, [k, , w]) => a + (done?.[k] ? w : 0), 0);

function BulkUpload({ data, dispatch, toast }) {
  const [stage, setStage] = useState("idle");
  const rows = [
    { code: "E101", name: "Nikhil Rao", email: "nikhil.rao@rcsl.com", site: "SITE-MUNDRA", workType: "WT1", ok: true },
    { code: "E102", name: "Fatima Khan", email: "fatima.k@rcsl.com", site: "SITE-HAZIRA", workType: "WT1", ok: true },
    { code: "E001", name: "R. Solanki", email: "r.solanki@rcsl.com", site: "SITE-MUNDRA", workType: "WT1", ok: true, dup: true },
    { code: "E103", name: "—", email: "not-an-email", site: "unknown", workType: "?", ok: false },
  ];
  const create = rows.filter((r) => r.ok && !r.dup);
  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Bulk Employee Upload</h1>
      <p style={{ fontSize: 13, color: V.text2, marginBottom: 16 }}>Creates the account shell — each trainer completes their own profile through onboarding.</p>
      <Card style={{ marginBottom: 16 }}>
        {stage === "idle" ? (
          <button onClick={() => setStage("preview")} style={{ width: "100%", border: "2px dashed #cfcfd8", borderRadius: 8, padding: 36, textAlign: "center", background: "#fff", cursor: "pointer" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>⇧</div><strong>Drop the HR extract here</strong>
            <div style={{ fontSize: 12, color: "#9a9aa2", marginTop: 4 }}>XLSX or CSV</div></button>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
              <Kpi label="Will create" value={create.length} tone="#137a3f" /><Kpi label="Will update" value={rows.filter((r) => r.dup).length} /><Kpi label="Errors" value={rows.filter((r) => !r.ok).length} tone="#b3261e" />
            </div>
            {rows.map((r) => (
              <div key={r.code} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e3e3e8", fontSize: 12.5 }}>
                <span>{r.code} · {r.name} · {r.email}</span>
                {!r.ok ? <Pill tone="danger">Error</Pill> : r.dup ? <Pill tone="warn">Update</Pill> : <Pill tone="success">Create</Pill>}</div>))}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 14 }}>
              <Btn onClick={() => setStage("idle")}>Discard</Btn>
              <Btn kind="primary" onClick={() => { dispatch({ type: "empBulkCreate", file: "trainer-master.xlsx", rows: create }); setStage("idle"); }}>Create {create.length} accounts</Btn>
            </div>
          </div>
        )}
      </Card>
      <Card pad={false}>
        <div style={{ padding: 16 }}><CardHead label="Upload history" /></div>
        {data.uploads.length === 0 ? <EmptyState title="No uploads yet" /> : data.uploads.map((u) => (
          <div key={u.id} style={{ padding: "10px 16px", borderTop: "1px solid #e3e3e8", display: "flex", justifyContent: "space-between" }}>
            <span>{u.file} · {u.count} created</span><Btn size="sm" onClick={() => dispatch({ type: "empBulkRollback", id: u.id })}>Roll back</Btn></div>))}
      </Card>
    </div>
  );
}

function Onboarding({ me, data, dispatch }) {
  const [step, setStep] = useState(0);
  const done = me.done ?? {}; const pcs = pcsOf(done);
  const steps = PCS_PARTS.map(([k, label]) => ({ k, label })); const cur = steps[step];
  return (
    <div style={{ minHeight: "100vh", background: "#f2f2f5", fontFamily: "'Inter',-apple-system,sans-serif", padding: 24 }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>Welcome, {me.name.split(" ")[0].replace(".", "")}</h1>
            <p style={{ fontSize: 13, color: "#6b6b74" }}>Complete your profile so we can match you to sessions.</p></div>
          <Btn onClick={() => dispatch({ type: "logout" })}>Sign out</Btn>
        </div>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: pcs >= 75 ? "#28a862" : "#e0a233" }}>{pcs}%</span>
            <span style={{ fontSize: 12, color: "#9a9aa2" }}>Step {step + 1} of {steps.length}</span></div>
          <Bar v={pcs} color={pcs >= 75 ? "#28a862" : "#e0a233"} h={8} />
        </Card>
        <Card>
          <CardHead label={cur.label} />
          <p style={{ fontSize: 12.5, color: "#6b6b74", marginBottom: 14 }}>This step's fields are captured the same way they are in the full Employee Master.</p>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Btn disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>← Back</Btn>
            <div style={{ display: "flex", gap: 8 }}>
              {pcs >= 60 && <Btn kind="primary" onClick={() => dispatch({ type: "submitProfile", empId: me.id })}>Submit for verification</Btn>}
              <Btn onClick={() => { dispatch({ type: "completeStep", empId: me.id, key: cur.k }); setStep(Math.min(steps.length - 1, step + 1)); }}>{done[cur.k] ? "Next →" : "Save & continue →"}</Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LMS SYNC (DIGII)
   ═══════════════════════════════════════════════════════════════════════ */
function LmsSync({ data, dispatch, toast }) {
  const [resolving, setResolving] = useState(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div><h1 style={{ fontSize: 21, fontWeight: 700 }}>LMS Sync — Digii</h1><p style={{ fontSize: 13, color: V.text2, marginTop: 3 }}>Demand comes from Digii; outcomes are reported back.</p></div>
        <Btn kind="primary" onClick={() => dispatch({ type: "lmsSyncRun" })}>⟳ Run sync now</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        <Kpi label="Last sync" value={data.lastSync ? fmtDay(data.lastSync) : "Never"} /><Kpi label="Sync runs" value={data.lmsRuns} />
        <Kpi label="Mapping exceptions" value={data.lmsExceptions.length} tone={data.lmsExceptions.length ? "#9a5b06" : V.text} />
      </div>
      <Card pad={false}>
        <div style={{ padding: 16 }}><CardHead label="Mapping exceptions" /></div>
        {data.lmsExceptions.length === 0 ? <EmptyState title="No exceptions pending" /> : data.lmsExceptions.map((x) => (
          <div key={x.id} style={{ padding: "12px 16px", borderTop: "1px solid #e3e3e8", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div><strong>{x.course}</strong><div style={{ fontSize: 11.5, color: "#6b6b74" }}>{x.reason}</div></div>
            <Btn size="sm" onClick={() => setResolving(x)}>Map to a skill</Btn></div>))}
      </Card>
      {resolving && <LmsMapModal exception={resolving} onClose={() => setResolving(null)} dispatch={dispatch} />}
    </div>
  );
}
function LmsMapModal({ exception, onClose, dispatch }) {
  const [skillId, setSkillId] = useState(SKILLS[0]?.id ?? "");
  return (
    <Modal title="Map to a skill" sub={exception.course} onClose={onClose} width={440}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => { dispatch({ type: "lmsResolveException", id: exception.id, skillName: skillOf(skillId)?.name }); onClose(); }}>Confirm</Btn></>}>
      <Field label="Skill"><Select value={skillId} onChange={(e) => setSkillId(e.target.value)} style={{ width: "100%" }}>
        {SKILLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════════════ */
function init() {
  const employees = EMPLOYEES.map((e) => ({
    ...e, leaveDays: [], leaveBalance: { casual: 8, sick: 6, earned: 12 },
    profileState: e.id === "E007" ? "seeded" : "ready",
    done: e.id === "E007" ? { identity: 1 } : Object.fromEntries(PCS_PARTS.map(([k]) => [k, 1])),
  }));
  const sessions = seedSessions();
  const attendance = [];
  let n = 9500;
  sessions.filter((s) => s.date < TODAY && s.trainer && s.status !== "travel").slice(0, 6).forEach((s, i) => {
    s.status = "confirmed";
    attendance.push({ id: `AT${n++}`, session: s.id, emp: s.trainer, in: s.start, out: i % 3 === 0 ? null : s.end,
      method: i % 2 === 0 ? "qr" : "geo", metres: i % 4 === 0 ? 240 : 60, state: i % 3 === 1 ? "verified" : "pending" });
  });
  const leaves = [
    // Deliberately lands on a day this trainer is already booked, so the approver sees the release consequence.
    { id: "LV-101", emp: "E004", from: "2026-09-18", to: "2026-09-18", type: "Casual leave", reason: "Family function", state: "pending" },
    { id: "LV-102", emp: "E012", from: "2026-09-21", to: "2026-09-21", type: "Sick leave", reason: "Fever", state: "approved" },
    { id: "LV-103", emp: "E011", from: "2026-09-24", to: "2026-09-25", type: "Earned leave", reason: "Sister's wedding", state: "pending" },
    { id: "LV-104", emp: "E015", from: "2026-09-17", to: "2026-09-17", type: "Casual leave", reason: "Personal work", state: "pending" },
  ];
  // Auction bids (§11): every open-for-interest slot gets three bidders who pass
  // the hard filters, and every other slot a fourth who has since gone
  // ineligible — so re-validation (§11.1 rule 7) has something real to show.
  EMPLOYEES = employees; LEAVES = leaves;
  const bidNotes = ["Free that afternoon — happy to take it", "Taught this batch last month", "Can bring the simulator kit", "", "Close to my base site"];
  sessions.filter((s) => s.status === "auction").forEach((s, si) => {
    const m = moduleOf(s.mod);
    const r = rankCandidates(employees, { skillId: m.skill, dateIso: s.date, startMin: toMins(s.start), endMin: toMins(s.end), siteId: s.site,
      excludeId: s.id, skipSkillGate: m.level === "foundation" }, sessions, DEFAULT_WEIGHTS);
    const bidders = r.eligible.slice(si % 2, 3 + (si % 2)).map((c) => c.emp.id);
    const lapsed = r.excluded.find((c) => c.checks[5].ok && c.checks[9].ok);
    if (si % 2 === 0 && lapsed) bidders.push(lapsed.emp.id);
    s.interests = bidders;
    s.interestMeta = Object.fromEntries(bidders.map((id, bi) => [id,
      { at: `${fmtDay(iso(addDays(parseD(s.date), -2 - bi)))} ${pad(9 + bi * 2)}:${pad((si * 17 + bi * 13) % 60)}`, note: bidNotes[(si + bi) % bidNotes.length] }]));
  });
  return {
    sessions, employees, shifts: SHIFTS.map((s) => ({ ...s, sessions: s.sessions.map((x) => ({ ...x })) })),
    weeklyTemplates: WEEKLY_TEMPLATES.map((t) => ({ ...t, days: JSON.parse(JSON.stringify(t.days)), settings: { ...t.settings }, mappedUnits: [...t.mappedUnits] })),
    breakTimes: BREAK_TIMES.map((b) => ({ ...b, days: [...(b.days || [])] })),
    compliancePolicies: JSON.parse(JSON.stringify(COMPLIANCE_POLICIES)),
    skills: [...SKILLS], levels: [...LEVELS], designations: [...DESIGNATIONS], workTypes: [...WORK_TYPES],
    classrooms: [...CLASSROOMS], geofences: [...GEOFENCES],
    leaves, attendance, uploads: [], lmsRuns: 0, lastSync: null,
    lmsExceptions: [{ id: "LX1", course: "Reach Stacker Ops — Level 2", batch: "B-RS-04", reason: "No matching skill in our taxonomy" }],
    notifications: [
      { id: "N1", toRole: "site", toSite: "SITE-MUNDRA", text: "A. Pillai's profile is 10% complete — not yet rosterable", kind: "competency", at: TODAY, unread: true },
      { id: "N2", toRole: "assessor", text: "Competency submissions waiting for assessment", kind: "competency", at: TODAY, unread: true },
    ],
    rosterSchedules: [],
    weights: { ...DEFAULT_WEIGHTS },
    auth: { stage: "login", userId: null }, role: null, toast: null,
  };
}

// Every publish is recorded as a roster batch and its sessions carry the batch
// id, so the dashboard can list what was published and jump straight to it.
function publishBatch(state, made, meta) {
  if (!made.length) return { sessions: state.sessions };
  const id = uid("RB-");
  made.forEach((m) => { m.batch = id; });
  const dates = made.map((m) => m.date).sort();
  const batch = { id, ...meta, from: dates[0], to: dates[dates.length - 1], count: made.length, at: `${fmtDay(TODAY)}, just now` };
  return { sessions: [...state.sessions, ...made], rosterSchedules: [batch, ...(state.rosterSchedules ?? [])] };
}

function notify(list, entry) { return [{ id: uid("N"), at: TODAY, unread: true, ...entry }, ...(list ?? [])].slice(0, 80); }
function userForEmp(empId) {
  const found = DEMO_USERS.find((u) => u.emp === empId);
  if (found) return found;
  const emp = (EMPLOYEES || []).find((e) => e.id === empId);
  if (emp) return { id: `U-${empId}`, name: emp.name, role: "trainer", title: "Trainer", scope: "Own schedule", emp: empId };
  return null;
}

/* ── Hand-off to the trainer mobile app (see src/shared/mobileInbox.js) ── */
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const clock12 = (t) => { const [h, m] = t.split(":").map(Number); return `${pad(((h + 11) % 12) + 1)}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };

// A web session row, reshaped into the mobile app's lecture format. With no
// empId it is a BU-wide session — the phone fills in the signed-in trainer.
function sessionToLecture(s, empId) {
  const d = parseD(s.date);
  const mod = moduleOf(s.mod);
  const emp = empOf(empId);
  return {
    id: `WEB-${s.id}`, webSessionId: s.id, label: mod?.name ?? "Training session", sessionType: "Scheduled Training",
    category: "Technical", client: orgUnit(s.dept)?.name ?? "Training batch",
    date: s.date, dateLabel: `${WEEKDAY_SHORT[d.getDay()]}, ${pad(d.getDate())} ${MONTH_SHORT[d.getMonth()]}`,
    dayName: WEEKDAY_LONG[d.getDay()], dayNum: d.getDate(), start: s.start, end: s.end,
    time: `${clock12(s.start)} - ${clock12(s.end)}`, dur: s.dur, site: `${orgUnit(s.site)?.name ?? ""} Site`,
    room: "Room to be confirmed", learners: s.learners ?? 20, capacity: s.capacity ?? 25,
    status: "pending", denialReason: null, trainerName: emp?.name ?? "",
    trainerRole: !empId ? "" : s.trainer === empId ? "Primary trainer" : "Secondary trainer",
    trainerAvatar: emp ? initials(emp.name) : "",
  };
}

// One BU-wide entry per roster carrying every session in it — the BU's trainer
// confirms the whole roster in the app (Confirm whole month / manually). Plus a
// personal entry for each assigned trainer, which reaches trainers outside
// that BU; inside it the BU entry already covers them.
function rosterToMobileEntries(batch, sessions) {
  const rows = sessions.filter((s) => s.batch === batch.id);
  if (!rows.length || !batch.bu) return [];
  const bu = orgUnit(batch.bu), site = orgUnit(batch.site);
  const range = batch.from === batch.to ? fmtDay(batch.from) : `${fmtDay(batch.from)} – ${fmtDay(batch.to)}`;
  const createdAt = new Date().toISOString();
  const entries = [{
    id: `${batch.id}-bu`, batchId: batch.id, toBu: batch.bu, kind: "schedule", createdAt, date: batch.from,
    title: `New ${bu?.name ?? ""} schedule published`,
    message: `${rows.length} session${rows.length === 1 ? "" : "s"} at ${site?.name ?? "your site"} · ${range} — confirm in your schedule`,
    lectures: rows.map((s) => sessionToLecture(s, null)),
  }];
  const byTrainer = new Map();
  rows.forEach((s) => [s.trainer, s.secondaryTrainer].filter(Boolean).forEach((emp) => {
    if (!byTrainer.has(emp)) byTrainer.set(emp, []);
    byTrainer.get(emp).push(s);
  }));
  byTrainer.forEach((list, emp) => entries.push({
    id: `${batch.id}-${emp}`, batchId: batch.id, toEmp: emp, kind: "assignment", createdAt, date: list[0].date,
    title: `You've been assigned ${list.length} session${list.length === 1 ? "" : "s"}`,
    message: `${bu?.name ?? ""} · ${site?.name ?? ""} · ${range} — review and confirm in your schedule`,
    lectures: list.map((s) => sessionToLecture(s, emp)),
  }));
  return entries;
}

// Trainer-addressed web notifications (reassignments etc.) carry toUserId
// "U-<empId>" — forward those to the matching phone too.
function notificationToMobileEntry(n, sessions) {
  const empId = n.toUserId?.startsWith("U-") ? n.toUserId.slice(2) : null;
  if (!empId) return null;
  const sess = n.sessionId ? sessions.find((s) => s.id === n.sessionId) : null;
  const titles = { assignment: "Session assigned", leave: "Leave update", competency: "Skill verified", auction: "Open session — place a bid" };
  return {
    id: `web-${n.id}`, toEmp: empId, kind: n.kind === "assignment" ? "assignment" : "update", createdAt: new Date().toISOString(), date: sess?.date ?? TODAY,
    title: titles[n.kind] ?? "Schedule update", message: n.text, lectures: sess ? [sessionToLecture(sess, empId)] : undefined,
  };
}

function reducer(state, a) {
  const rowSiteId = (mkey, row) => (mkey === "classrooms" || mkey === "geofences") ? row.site : undefined;
  switch (a.type) {
    /* ── auth ── */
    case "login": {
      const u = DEMO_USERS.find((x) => x.id === a.userId);
      if (u.vendor) return { ...state, auth: { stage: "otp", userId: null, pending: u.id } };
      return { ...state, auth: { stage: "app", userId: u.id, homeUserId: u.id }, role: u.role };
    }
    case "loginOtp": { const u = DEMO_USERS.find((x) => x.id === a.userId); return { ...state, auth: { stage: "app", userId: u.id, homeUserId: u.id, pending: null }, role: u.role }; }
    case "logout": return { ...state, auth: { stage: "login", userId: null }, role: null };
    case "switchRole": {
      // Switching back to your own role returns to your own account (so a
      // Logistics BU Head lands on Logistics, not the Ports demo default).
      const home = DEMO_USERS.find((u) => u.id === state.auth.homeUserId);
      const newUserId = home?.role === a.role ? home.id : a.role === "bu" ? "U2" : a.role === "site" ? "U3" : "U1";
      return { ...state, role: a.role, auth: { ...state.auth, stage: "app", userId: newUserId } };
    }

    /* ── whole schedule confirmation (Stage 1) ── */
    case "scheduleConfirm": {
      const sched = (state.rosterSchedules || []).find((s) => s.id === a.id);
      const updatedSchedules = (state.rosterSchedules || []).map((s) => (s.id === a.id ? { ...s, status: "confirmed", confirmedAt: `${TODAY} now` } : s));
      const trainerEmp = state.employees.find((e) => e.id === a.trainerId);
      return {
        ...state,
        rosterSchedules: updatedSchedules,
        notifications: notify(state.notifications, {
          toRole: "scheduler",
          toSite: sched?.siteId,
          text: `✓ ${trainerEmp?.name || "Trainer"} confirmed their whole schedule for ${sched?.periodLabel || "the cycle"}`,
          kind: "schedule_roster",
        }),
        toast: `✓ Whole schedule confirmed! You have accepted your roster for the cycle.`,
      };
    }

    /* ── confirm all assigned sessions for a trainer ── */
    case "sessConfirmAll": {
      const empId = a.empId;
      const updatedSessions = state.sessions.map((s) => {
        let next = s;
        if (s.trainer === empId && s.status === "assigned") next = { ...next, status: "confirmed" };
        if (s.secondaryTrainer === empId && s.secondaryStatus === "assigned") next = { ...next, secondaryStatus: "confirmed" };
        return next;
      });
      return {
        ...state,
        sessions: updatedSessions,
        toast: `✓ All assigned sessions confirmed!`,
      };
    }

    /* ── session lifecycle (Central/BU/Site drawer + trainer self-service) ── */
    case "reassign":
      return { ...state, sessions: state.sessions.map((s) => s.id === a.id ? { ...s, trainer: a.trainer, status: "assigned", conflict: false, interests: [], updatedAt: `${TODAY} now` } : s),
        notifications: notify(state.notifications, { toUserId: userForEmp(a.trainer)?.id, text: `You have been assigned a session on ${fmtDay(state.sessions.find((s) => s.id === a.id)?.date)} — awaiting your confirmation`, kind: "assignment", sessionId: a.id }),
        toast: `${state.sessions.find((s) => s.id === a.id)?.trainer ? "Reassigned" : "Assigned"} to ${trainerOf(a.trainer)?.name}` };
    // Secondary trainer is a fully independent, optional assist role — its own
    // mini lifecycle (assigned/confirmed/declined) never gates the session's
    // overall status, which always reflects the primary trainer only.
    case "reassignSecondary":
      return { ...state, sessions: state.sessions.map((s) => s.id === a.id ? { ...s, secondaryTrainer: a.trainer, secondaryStatus: a.trainer ? "assigned" : null, updatedAt: `${TODAY} now` } : s),
        notifications: a.trainer ? notify(state.notifications, { toUserId: userForEmp(a.trainer)?.id, text: `You have been assigned as secondary trainer on a session on ${fmtDay(state.sessions.find((s) => s.id === a.id)?.date)} — awaiting your confirmation`, kind: "assignment", sessionId: a.id }) : state.notifications,
        toast: a.trainer ? `${trainerOf(a.trainer)?.name} set as secondary trainer` : "Secondary trainer removed" };
    case "cancel": return { ...state, sessions: state.sessions.filter((s) => s.id !== a.id), toast: "Session cancelled" };
    case "duplicate": {
      const src = state.sessions.find((s) => s.id === a.id);
      const copy = { ...src, id: uid("S-"), status: "unassigned", trainer: null, secondaryTrainer: null, secondaryStatus: null, conflict: false, updatedAt: `${TODAY} now` };
      return { ...state, sessions: [...state.sessions, copy], toast: `Duplicated as ${copy.id}` };
    }
    case "escalate": return { ...state, toast: "Escalated to the Site scheduler" };
    case "sessConfirm":
      return a.role === "secondary"
        ? { ...state, sessions: state.sessions.map((s) => s.id === a.id ? { ...s, secondaryStatus: "confirmed" } : s), toast: "Confirmed as secondary trainer" }
        : { ...state, sessions: state.sessions.map((s) => s.id === a.id ? { ...s, status: "confirmed" } : s), toast: "Session confirmed" };
    case "sessDecline": {
      const s = state.sessions.find((x) => x.id === a.id);
      const decliner = empOf(a.emp);
      if (a.role === "secondary")
        return { ...state, sessions: state.sessions.map((x) => x.id === a.id ? { ...x, secondaryTrainer: null, secondaryStatus: null, secondaryDeclineReason: a.reason } : x),
          notifications: notify(state.notifications, { toRole: "site", toSite: s.site, text: `${decliner?.name} declined as secondary trainer on a session on ${fmtDay(s.date)} — ${a.reason}`, kind: "decline" }) };
      return { ...state, sessions: state.sessions.map((x) => x.id === a.id ? { ...x, status: "unassigned", trainer: null, declineReason: a.reason, nominee: a.nominee || undefined } : x),
        notifications: notify(state.notifications, { toRole: "site", toSite: s.site, text: `${decliner?.name} declined a session on ${fmtDay(s.date)} — ${a.reason}${a.nominee ? `, recommended ${empOf(a.nominee)?.name}` : ""}`, kind: "decline" }) };
    }
    case "interestToggle":
      return { ...state, sessions: state.sessions.map((s) => { if (s.id !== a.id) return s;
        const cur = s.interests ?? []; const next = cur.includes(a.emp) ? cur.filter((x) => x !== a.emp) : [...cur, a.emp];
        // Registering interest on an unassigned session visually opens the auction; withdrawing
        // the last interest returns it to a plain unassigned slot. Any other status is untouched.
        const status = (s.status === "unassigned" || s.status === "auction") ? (next.length ? "auction" : "unassigned") : s.status;
        const interestMeta = { ...(s.interestMeta ?? {}) };
        if (next.includes(a.emp)) interestMeta[a.emp] = { at: `${fmtDay(TODAY)} now`, note: a.note ?? "" }; else delete interestMeta[a.emp];
        return { ...s, interests: next, interestMeta, status }; }) };

    /* ── generic masters (Skill / Level / Designation / Work Type / Classroom / Geofence) ── */
    case "masterAdd":
      return { ...state, [a.mkey]: [...(state[a.mkey] ?? []), { id: uid(a.mkey.slice(0, 2).toUpperCase()), ...a.vals }], toast: "Created" };
    case "masterEdit":
      return { ...state, [a.mkey]: state[a.mkey].map((r) => r.id === a.id ? { ...r, ...a.vals } : r), toast: "Saved" };
    case "masterDelete":
      return { ...state, [a.mkey]: state[a.mkey].filter((r) => r.id !== a.id), toast: "Deleted" };

    /* ── employee master ── */
    case "empAdd":
      return { ...state, employees: [...state.employees, { id: uid("E"), competencies: [], certs: [], education: [], work: [],
        feedback: 0, feedbackCount: 0, leaveDays: [], leaveBalance: { casual: 8, sick: 6, earned: 12 }, profileState: "ready",
        done: Object.fromEntries(PCS_PARTS.map(([k]) => [k, 1])), ...a.vals }], toast: "Employee created" };
    case "empEdit": return { ...state, employees: state.employees.map((e) => e.id === a.id ? { ...e, ...a.vals } : e) };
    case "empToggle":
      return { ...state, employees: state.employees.map((e) => e.id !== a.empId ? e
        : { ...e, [a.field]: e[a.field].includes(a.value) ? e[a.field].filter((x) => x !== a.value) : [...e[a.field], a.value] }) };
    case "compAdd":
      return { ...state, employees: state.employees.map((e) => e.id !== a.empId ? e : { ...e, competencies: [...e.competencies, a.vals] }),
        notifications: notify(state.notifications, { toRole: "assessor", text: `${empOf(a.empId)?.name} submitted a new competency claim`, kind: "competency" }), toast: "Skill added" };
    case "compEdit":
      return { ...state, employees: state.employees.map((e) => e.id !== a.empId ? e : { ...e, competencies: e.competencies.map((c, i) => i === a.index ? a.vals : c) }), toast: "Saved" };
    case "compVerify": {
      const emp = state.employees.find((e) => e.id === a.empId); const c = emp.competencies[a.index]; const sk = skillOf(c.skill);
      const toUser = userForEmp(a.empId);
      return { ...state, employees: state.employees.map((e) => e.id !== a.empId ? e : { ...e, competencies: e.competencies.map((x, i) => i === a.index ? { ...x, state: "verified" } : x) }),
        notifications: toUser ? notify(state.notifications, { toUserId: toUser.id, text: `${sk?.name} verified — you can now be recommended for it`, kind: "competency" }) : state.notifications,
        toast: `${sk?.name} verified for ${emp.name}` };
    }
    case "compReject":
      return { ...state, employees: state.employees.map((e) => e.id !== a.empId ? e : { ...e, competencies: e.competencies.map((x, i) => i === a.index ? { ...x, state: "draft" } : x) }) };
    case "compDelete":
      return { ...state, employees: state.employees.map((e) => e.id !== a.empId ? e : { ...e, competencies: e.competencies.filter((_, i) => i !== a.index) }), toast: "Removed" };
    case "subSave":
      return { ...state, employees: state.employees.map((e) => e.id !== a.empId ? e : { ...e, [a.kind]: a.index === -1 ? [...e[a.kind], a.rec] : e[a.kind].map((r, i) => i === a.index ? a.rec : r) }), toast: "Saved" };
    case "subDelete":
      return { ...state, employees: state.employees.map((e) => e.id !== a.empId ? e : { ...e, [a.kind]: e[a.kind].filter((_, i) => i !== a.index) }), toast: "Removed" };

    /* ── shift master ── */
    case "shiftAdd": return { ...state, shifts: [...state.shifts, { id: uid("SH"), sessions: [], ...a.vals }], toast: "Shift created" };
    case "shiftEdit": return { ...state, shifts: state.shifts.map((s) => s.id === a.id ? { ...s, ...a.vals } : s), toast: "Saved" };
    case "shiftDelete": return { ...state, shifts: state.shifts.filter((s) => s.id !== a.id), toast: "Deleted" };
    case "laneAdd": return { ...state, shifts: state.shifts.map((s) => s.id !== a.shiftId ? s : { ...s, sessions: [...s.sessions, a.vals].sort((x, y) => x.o - y.o) }) };
    case "laneEdit": return { ...state, shifts: state.shifts.map((s) => s.id !== a.shiftId ? s : { ...s, sessions: s.sessions.map((x, i) => i === a.index ? a.vals : x).sort((x, y) => x.o - y.o) }) };
    case "laneDelete": return { ...state, shifts: state.shifts.map((s) => s.id !== a.shiftId ? s : { ...s, sessions: s.sessions.filter((_, i) => i !== a.index) }) };

    /* ── template master (weekly & monthly) ── */
    case "templateAdd": {
      const isMon = a.vals.type === "monthly";
      return {
        ...state,
        weeklyTemplates: [...state.weeklyTemplates, { id: uid(isMon ? "MT-" : "WT-"), ...a.vals }],
        toast: `${isMon ? "Monthly (4-Week)" : "Weekly (7-Day)"} template created`,
      };
    }
    case "templateEdit":
      return {
        ...state,
        weeklyTemplates: state.weeklyTemplates.map((t) => (t.id === a.id ? { ...t, ...a.vals } : t)),
        toast: "Template saved",
      };
    case "templateDelete":
      return {
        ...state,
        weeklyTemplates: state.weeklyTemplates.filter((t) => t.id !== a.id),
        toast: "Template deleted",
      };
    case "templateMap":
      return {
        ...state,
        weeklyTemplates: state.weeklyTemplates.map((t) => (t.id === a.id ? { ...t, mappedUnits: a.mappedUnits } : t)),
        toast: "BU & Site mapping updated",
      };
    case "templateDuplicate": {
      const src = state.weeklyTemplates.find((t) => t.id === a.id);
      if (!src) return state;
      const isMon = src.type === "monthly";
      const copy = {
        ...src,
        id: uid(isMon ? "MT-" : "WT-"),
        code: `${src.code}-COPY`,
        name: `${src.name} (Copy)`,
        days: JSON.parse(JSON.stringify(src.days || {})),
        weeks: src.weeks ? JSON.parse(JSON.stringify(src.weeks)) : undefined,
        settings: { ...src.settings },
        mappedUnits: [...src.mappedUnits],
      };
      return { ...state, weeklyTemplates: [...state.weeklyTemplates, copy], toast: `Duplicated as ${copy.code}` };
    }
    case "templateSyncMonthWeeks": {
      const { templateId } = a;
      const tmpl = state.weeklyTemplates.find((t) => t.id === templateId);
      if (!tmpl || tmpl.type !== "monthly" || !tmpl.weeks) return state;
      const updated = JSON.parse(JSON.stringify(tmpl));
      const w1Days = updated.weeks.W1?.days || updated.days;
      ["W2", "W3", "W4"].forEach((wk) => {
        if (updated.weeks[wk]) {
          updated.weeks[wk].days = JSON.parse(JSON.stringify(w1Days));
        }
      });
      updated.days = JSON.parse(JSON.stringify(w1Days));
      return {
        ...state,
        weeklyTemplates: state.weeklyTemplates.map((t) => (t.id === templateId ? updated : t)),
        toast: `⚡ Reused Week 1 slots & timings across all 4 weeks of ${tmpl.code}!`,
      };
    }
    case "templateCopyDaySchedule": {
      const { templateId, weekKey, fromDayKey, toScope } = a;
      const tmpl = state.weeklyTemplates.find((t) => t.id === templateId);
      if (!tmpl) return state;
      const updated = JSON.parse(JSON.stringify(tmpl));
      const targetDays = updated.type === "monthly" && updated.weeks && weekKey ? updated.weeks[weekKey].days : updated.days;
      const srcSessions = JSON.parse(JSON.stringify(targetDays[fromDayKey]?.sessions || []));
      if (toScope === "weekdays") {
        ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((dk) => {
          if (targetDays[dk]) {
            targetDays[dk] = { ...targetDays[dk], active: true, isRestDay: false, sessions: JSON.parse(JSON.stringify(srcSessions)) };
          }
        });
      } else if (toScope === "all") {
        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((dk) => {
          if (targetDays[dk]) {
            targetDays[dk] = { ...targetDays[dk], active: true, isRestDay: false, sessions: JSON.parse(JSON.stringify(srcSessions)) };
          }
        });
      }
      if (updated.type === "monthly" && updated.weeks && updated.weeks.W1) {
        updated.days = JSON.parse(JSON.stringify(updated.weeks.W1.days));
      }
      return {
        ...state,
        weeklyTemplates: state.weeklyTemplates.map((t) => (t.id === templateId ? updated : t)),
        toast: `Copied ${fromDayKey}'s ${srcSessions.length} sessions to ${toScope === "weekdays" ? "Monday–Friday" : "all working days"}`,
      };
    }
    case "templateUpdateSessionTimings": {
      const { templateId, weekKey, dayKey, scope, sessions } = a;
      const tmpl = state.weeklyTemplates.find((t) => t.id === templateId);
      if (!tmpl) return state;
      const updated = JSON.parse(JSON.stringify(tmpl));

      const updateDayObj = (daysMap) => {
        if (!daysMap) return;
        if (scope === "day" || scope === "monthDay") {
          if (daysMap[dayKey]) daysMap[dayKey].sessions = JSON.parse(JSON.stringify(sessions));
        } else if (scope === "weekdays") {
          ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((dk) => {
            if (daysMap[dk] && !daysMap[dk].isRestDay) {
              daysMap[dk].sessions = JSON.parse(JSON.stringify(sessions));
            }
          });
        } else if (scope === "all") {
          ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((dk) => {
            if (daysMap[dk] && !daysMap[dk].isRestDay) {
              daysMap[dk].sessions = JSON.parse(JSON.stringify(sessions));
            }
          });
        }
      };

      if (updated.type === "monthly" && updated.weeks) {
        if (scope === "monthDay" || scope === "all") {
          Object.keys(updated.weeks).forEach((wk) => {
            updateDayObj(updated.weeks[wk].days);
          });
        } else {
          const wk = weekKey || "W1";
          if (updated.weeks[wk]) updateDayObj(updated.weeks[wk].days);
        }
        updated.days = JSON.parse(JSON.stringify(updated.weeks.W1.days));
      } else {
        updateDayObj(updated.days);
      }

      return {
        ...state,
        weeklyTemplates: state.weeklyTemplates.map((t) => (t.id === templateId ? updated : t)),
        toast: `Session timings updated (${scope === "weekdays" ? "applied across Monday–Friday" : scope === "monthDay" ? "applied to this day across all 4 weeks" : scope === "all" ? "applied to all working days" : dayKey})`,
      };
    }

    /* ── compliance policies & break times ── */
    case "policyUpdate": {
      const { tier, scopeId, vals } = a;
      const policies = JSON.parse(JSON.stringify(state.compliancePolicies || COMPLIANCE_POLICIES));
      if (tier === "central") {
        policies.central = { ...policies.central, ...vals };
      } else if (tier === "bu" && scopeId) {
        policies.bu_overrides = policies.bu_overrides || {};
        policies.bu_overrides[scopeId] = { ...(policies.bu_overrides[scopeId] || {}), ...vals };
      } else if (tier === "site" && scopeId) {
        policies.site_overrides = policies.site_overrides || {};
        policies.site_overrides[scopeId] = { ...(policies.site_overrides[scopeId] || {}), ...vals };
      }
      return { ...state, compliancePolicies: policies, toast: `Policy thresholds updated for ${tier.toUpperCase()}` };
    }
    case "breakAdd":
      return { ...state, breakTimes: [...(state.breakTimes || []), { id: uid("BRK-"), ...a.vals }], toast: `Break time "${a.vals.name}" created` };
    case "breakEdit":
      return { ...state, breakTimes: (state.breakTimes || []).map((b) => (b.id === a.id ? { ...b, ...a.vals } : b)), toast: `Break time updated` };
    case "breakDelete":
      return { ...state, breakTimes: (state.breakTimes || []).filter((b) => b.id !== a.id), toast: "Break time deleted" };

    case "rosterGenerateFromTemplate": {
      const tmpl = state.weeklyTemplates.find((t) => t.id === a.templateId);
      const dept = orgUnit(a.dept); const site = siteOf(a.dept); const bu = buOf(a.dept);
      let n = state.sessions.length + 40000;
      const made = [];
      const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      let d = parseD(a.from); const end = parseD(a.to);
      const startD = parseD(a.from);
      while (d <= end) {
        const dayKey = DAY_KEYS[d.getDay()];
        const diffDays = Math.max(0, Math.floor((d.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
        const wNum = (Math.floor(diffDays / 7) % 4) + 1;
        const wKey = tmpl?.type === "monthly" ? `W${wNum}` : "W1";
        let dayCfg;
        if (tmpl?.type === "monthly" && tmpl.weeks) {
          dayCfg = tmpl.weeks[wKey]?.days?.[dayKey] || tmpl.days?.[dayKey];
        } else {
          dayCfg = tmpl?.days?.[dayKey];
        }

        if (dayCfg && dayCfg.active && !dayCfg.isRestDay && dayCfg.sessions?.length) {
          dayCfg.sessions.forEach((ln, li) => {
            const isSat = dayKey === "Sat";
            const dayTypeKey = isSat ? "sat" : "weekday";
            const assign = a.assignments?.[wKey]?.[dayKey]?.[li] ?? a.assignments?.[dayKey]?.[li] ?? a.assignments?.[dayTypeKey]?.[li] ?? a.assignments?.default?.[li] ?? {};
            const modId = a.modules?.[wKey]?.[dayKey]?.[li] ?? a.modules?.[dayKey]?.[li] ?? a.modules?.[dayTypeKey]?.[li] ?? a.modules?.default?.[li] ?? null;
            const primaryId = assign.primary || null;
            const secondaryId = assign.secondary || null;
            made.push({
              id: `S-${n++}`,
              date: iso(d),
              start: ln.start,
              end: ln.end,
              dur: ln.d,
              dept: dept.id,
              site: site.id,
              bu: bu.id,
              mod: modId,
              learners: 22,
              capacity: 25,
              trainer: primaryId,
              secondaryTrainer: secondaryId,
              secondaryStatus: secondaryId ? "assigned" : null,
              status: primaryId ? "assigned" : "unassigned",
              conflict: false,
              updatedAt: `${TODAY} now`,
              createdBy: `Auto Rostering — ${tmpl.name}`,
              templateId: tmpl.id,
            });
          });
        }
        d = addDays(d, 1);
      }
      return {
        ...state,
        ...publishBatch(state, made, { name: tmpl?.name ?? "Template roster", source: `Template ${tmpl?.code ?? ""}`, dept: dept.id, site: site.id, bu: bu.id }),
        toast: `${made.length} sessions generated from ${tmpl?.code ?? "template"} (${made.filter((m) => m.trainer).length} primary, ${made.filter((m) => m.secondaryTrainer).length} secondary)`,
      };
    }

    /* ── auto rostering — generates literal, dated session rows ── */
    case "rosterGenerate": {
      const shift = state.shifts.find((s) => s.id === a.shiftId);
      const dept = orgUnit(a.dept); const site = siteOf(a.dept); const bu = buOf(a.dept);
      let n = state.sessions.length + 20000;
      const made = [];
      a.dates.forEach((date) => {
        shift.sessions.forEach((ln, li) => {
          const start = fmtT(shift.start + ln.o);
          const modId = a.modules?.[li] ?? null;
          const rowMod = moduleOf(modId);
          const row = { id: `S-${n++}`, date, start, end: fmtT(shift.start + ln.o + ln.d), dur: ln.d,
            dept: dept.id, site: site.id, bu: bu.id, mod: modId, learners: 20, capacity: 25, trainer: null, secondaryTrainer: null, secondaryStatus: null,
            status: "unassigned", conflict: false, updatedAt: `${TODAY} now`, createdBy: "Auto Rostering" };
          if (a.autoAssign && rowMod) {
            const ranked = rankCandidates(state.employees, { skillId: rowMod?.skill, dateIso: date, startMin: toMins(start), endMin: toMins(row.end), siteId: site.id, excludeId: row.id, skipSkillGate: rowMod?.level === "foundation" }, [...state.sessions, ...made], state.weights);
            if (ranked.eligible[0]) { row.trainer = ranked.eligible[0].emp.id; row.status = "assigned"; }
          }
          made.push(row);
        });
      });
      return { ...state, ...publishBatch(state, made, { name: shift?.name ?? "Quick roster", source: "Quick generate", dept: dept.id, site: site.id, bu: bu.id }), toast: `${made.length} sessions generated${a.autoAssign ? `, ${made.filter((m) => m.trainer).length} auto-assigned` : ""}` };
    }
    // Weekly-pattern rostering: a shift is dropped onto each weekday of a
    // repeating pattern, and — per shift used — a specific trainer is picked
    // once per session lane and repeats on every date that lane occurs across
    // the whole date range ("same employee each time"). Still lands in the
    // same sessions table as rosterGenerate above; this is additive, not a
    // replacement for it.
    case "rosterGenerateWeekly": {
      const dept = orgUnit(a.dept); const site = siteOf(a.dept); const bu = buOf(a.dept);
      let n = state.sessions.length + 30000;
      const made = [];
      let d = parseD(a.from); const end = parseD(a.to);
      while (d <= end) {
        const wd = (d.getDay() + 6) % 7; // 0=Mon..6=Sun
        const code = a.pattern[wd];
        const shift = code ? state.shifts.find((s) => s.code === code) : null;
        if (shift) {
          shift.sessions.forEach((ln, li) => {
            const start = fmtT(shift.start + ln.o);
            const modId = a.modules?.[code]?.[li] ?? null;
            const primaryId = a.assignments?.[code]?.[li]?.primary || null;
            const secondaryId = a.assignments?.[code]?.[li]?.secondary || null;
            made.push({ id: `S-${n++}`, date: iso(d), start, end: fmtT(shift.start + ln.o + ln.d), dur: ln.d,
              dept: dept.id, site: site.id, bu: bu.id, mod: modId, learners: 20, capacity: 25, trainer: primaryId,
              secondaryTrainer: secondaryId, secondaryStatus: secondaryId ? "assigned" : null,
              status: primaryId ? "assigned" : "unassigned", conflict: false, updatedAt: `${TODAY} now`, createdBy: "Auto Rostering — weekly pattern" });
          });
        }
        d = addDays(d, 1);
      }
      return { ...state, ...publishBatch(state, made, { name: `Custom pattern — ${dept.name}`, source: "Custom pattern", dept: dept.id, site: site.id, bu: bu.id }),
        toast: `${made.length} sessions generated across the cycle, ${made.filter((m) => m.trainer).length} with a primary trainer` };
    }

    /* ── leave ── */
    case "leaveApply": {
      const applicant = empOf(a.emp); const site = orgUnit(applicant.site);
      return { ...state, leaves: [...state.leaves, { id: `LV-${200 + state.leaves.length}`, emp: a.emp, from: a.from, to: a.to, type: a.leaveType, reason: a.reason, state: "pending" }],
        notifications: notify(notify(state.notifications, { toRole: "site", toSite: applicant.site, text: `${applicant.name} applied for leave ${fmtDay(a.from)}`, kind: "leave" }),
          { toRole: "central", text: `${applicant.name} applied for leave ${fmtDay(a.from)}`, kind: "leave" }) };
    }
    case "leaveDecide": {
      const lv = state.leaves.find((l) => l.id === a.id); const emp = empOf(lv.emp); const toUser = userForEmp(lv.emp);
      const leaves = state.leaves.map((l) => l.id === a.id ? { ...l, state: a.decision } : l);
      const notifyDecision = (text) => toUser ? notify(state.notifications, { toUserId: toUser.id, text, kind: "leave" }) : state.notifications;
      if (a.decision !== "approved") return { ...state, leaves, notifications: notifyDecision(`Your leave request was rejected`), toast: "Leave rejected" };
      const clash = leaveClashes(state.sessions, lv.emp, lv.from, lv.to);
      const sessions = state.sessions.map((s) => clash.some((c) => c.id === s.id) ? { ...s, status: "unassigned", trainer: null, declineReason: "On approved leave" } : s);
      const employees = state.employees.map((e) => e.id === lv.emp ? { ...e, leaveDays: [...(e.leaveDays ?? []), ...rangeDays(lv.from, lv.to)] } : e);
      return { ...state, leaves, sessions, employees, notifications: notifyDecision(`Your leave was approved${clash.length ? ` — ${clash.length} session(s) released` : ""}`),
        toast: clash.length ? `Leave approved — ${clash.length} session(s) released back to the scheduler` : "Leave approved" };
    }

    /* ── attendance ── */
    case "punchIn":
      return { ...state, attendance: [...state.attendance, { id: uid("AT"), session: a.sessionId, emp: a.emp, in: a.in, out: null, method: a.method, metres: a.metres, state: "pending" }] };
    case "punchOut": return { ...state, attendance: state.attendance.map((r) => r.id === a.id ? { ...r, out: a.out } : r) };
    case "attVerify": return { ...state, attendance: state.attendance.map((r) => r.id === a.id ? { ...r, state: "verified" } : r) };

    /* ── bulk upload ── */
    case "empBulkCreate": {
      const created = a.rows.map((r) => ({ id: uid("E"), code: r.code, name: r.name, email: r.email, phone: "", site: r.site, designation: "DSG4",
        workType: r.workType, doj: TODAY, trainerType: "foundation", competencies: [], certs: [], education: [], work: [], modes: ["classroom"],
        languages: [], scope: [r.site], feedback: 0, feedbackCount: 0, active: true, leaveDays: [], leaveBalance: { casual: 8, sick: 6, earned: 12 },
        profileState: "seeded", done: { identity: 1 } }));
      return { ...state, employees: [...state.employees, ...created], uploads: [{ id: uid("UP"), file: a.file, count: created.length, empIds: created.map((c) => c.id) }, ...state.uploads],
        toast: `${created.length} accounts created` };
    }
    case "empBulkRollback": {
      const batch = state.uploads.find((u) => u.id === a.id); if (!batch) return state;
      return { ...state, employees: state.employees.filter((e) => !batch.empIds.includes(e.id)), uploads: state.uploads.filter((u) => u.id !== a.id), toast: "Rolled back" };
    }

    /* ── onboarding ── */
    case "completeStep": return { ...state, employees: state.employees.map((e) => e.id !== a.empId ? e : { ...e, done: { ...e.done, [a.key]: 1 } }) };
    case "submitProfile": {
      const e = state.employees.find((x) => x.id === a.empId); const pcs = pcsOf(e.done);
      return { ...state, employees: state.employees.map((x) => x.id !== a.empId ? x : { ...x, profileState: pcs >= 75 ? "ready" : "enriching" }),
        notifications: notify(state.notifications, { toRole: "assessor", text: `${e.name} submitted their profile for verification`, kind: "competency" }),
        toast: pcs >= 75 ? "Profile submitted — an assessor will verify your skills" : "Saved" };
    }

    /* ── LMS sync ── */
    case "lmsSyncRun": return { ...state, lmsRuns: state.lmsRuns + 1, lastSync: TODAY, toast: "Sync complete" };
    case "lmsResolveException": return { ...state, lmsExceptions: state.lmsExceptions.filter((x) => x.id !== a.id), toast: `Mapped to ${a.skillName}` };

    /* ── notifications / weights / toast ── */
    case "notifRead": return { ...state, notifications: state.notifications.map((n) => a.ids.includes(n.id) ? { ...n, unread: false } : n) };
    case "weightSet": return { ...state, weights: { ...state.weights, [a.key]: a.value } };
    case "weightApply": return { ...state, weights: { ...a.value }, toast: "Weight profile applied" };
    case "toast": return { ...state, toast: a.msg };
    case "auctionInvite": {
      const s = state.sessions.find((x) => x.id === a.id);
      const notifications = a.emps.reduce((list, e) => { const u = userForEmp(e); return u ? notify(list, { toUserId: u.id, text: `You're invited to bid on an open ${moduleOf(s.mod)?.short} session on ${fmtDay(s.date)}`, kind: "auction" }) : list; }, state.notifications);
      return { ...state, notifications, toast: `Invited ${a.emps.map((e) => empOf(e)?.name).join(", ")} to register interest` };
    }
    case "clearToast": return { ...state, toast: null };
    default: return state;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   APP SHELL
   ═══════════════════════════════════════════════════════════════════════ */
// Demo build: every role gets the same menu, trimmed to the demo flow in
// walkthrough order — masters & onboarding → template creation → trainer
// assignment → schedule dashboard (recommendation/auction live in the session
// drawer) → leave. Each role's data scope (scopeSite/scopeBu/scopeVendor) still applies.
const DEMO_NAV = [
  ["masters", "☰", "Masters", [["employees", "Employee Master"], ["m-skills", "Skill Master"], ["m-levels", "Level Master"],
    ["m-designations", "Designation Master"], ["m-workTypes", "Work Type Master"], ["m-classrooms", "Classroom Master"], ["m-geofences", "Geofence Master"]]],
  ["overview", "▦", "Schedule Dashboard", [["dashboard", "Dashboard"], ["scheduler", "Scheduler"]]],
  ["rostering", "▤", "Schedule Creation", [["rostering-policies", "Policy & Compliance"], ["shift-master", "Template Creation"], ["auto-rostering", "Trainer Assignment"]]],
  ["approvals", "✓", "Leave", [["leave-approvals", "Leave Approvals"]]],
];
const NAV = Object.fromEntries(["central", "bu", "site", "scheduler", "coordinator", "assessor", "vendor_admin"].map((r) => [r, DEMO_NAV]));
const MASTER_ROUTES = { "m-skills": "skills", "m-levels": "levels", "m-designations": "designations", "m-workTypes": "workTypes", "m-classrooms": "classrooms", "m-geofences": "geofences" };
function notifVisible(n, user, role, scopeSite) {
  if (n.toUserId) return n.toUserId === user.id;
  if (n.toRole !== role) return false;
  if (n.toSite && scopeSite) return n.toSite === scopeSite;
  return true;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [groupId, setGroupId] = useState(null);
  const [route, setRoute] = useState(null);
  const [focusUnit, setFocusUnit] = useState(null);
  const [openSess, setOpenSess] = useState(null);
  const [openEmp, setOpenEmp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forceError, setForceError] = useState(false);
  const [bell, setBell] = useState(false);
  // Filters + anchor date carried into the Dashboard / Scheduler when jumping
  // from a published roster; cleared by any ordinary menu navigation.
  const [viewPreset, setViewPreset] = useState(null);

  // Render-time read-through sync: the reducer is the single source of
  // truth in state.*, but a handful of free helper functions (trainerOf,
  // skillOf, moduleOf-style lookups used deep in dashboard/scheduler code
  // that predates this rewrite) read these module-level bindings directly
  // rather than threading a data bag through every call site. Reassigning
  // them here, synchronously at the top of every render and before any
  // child component evaluates, keeps them correct without that refactor.
  EMPLOYEES = state.employees; SKILLS = state.skills ?? SKILLS; LEVELS = state.levels ?? LEVELS;
  DESIGNATIONS = state.designations ?? DESIGNATIONS; WORK_TYPES = state.workTypes ?? WORK_TYPES;
  CLASSROOMS = state.classrooms ?? CLASSROOMS; GEOFENCES = state.geofences ?? GEOFENCES; SHIFTS = state.shifts ?? SHIFTS;
  WEEKLY_TEMPLATES = state.weeklyTemplates ?? WEEKLY_TEMPLATES; LEAVES = state.leaves ?? [];
  BREAK_TIMES = state.breakTimes ?? BREAK_TIMES;
  COMPLIANCE_POLICIES = state.compliancePolicies ?? COMPLIANCE_POLICIES;

  const user = DEMO_USERS.find((u) => u.id === state.auth.userId);
  const role = state.role;
  // A signed-in user's own org unit wins over the role's demo default, so each
  // BU Head lands on their own BU.
  const root = role ? (user?.role === role && user.root ? user.root : ROLE_ROOT[role]) : null;
  const me = user?.emp ? state.employees.find((e) => e.id === user.emp) : null;
  const scopeSite = ["site", "scheduler", "coordinator"].includes(role) ? root : null;
  const scopeBu = role === "bu" ? root : null;
  const scopeVendor = role === "vendor_admin" ? user?.vendor : null;
  const nav = role ? NAV[role] : [];

  useEffect(() => { if (!state.toast) return; const t = setTimeout(() => dispatch({ type: "clearToast" }), 2800); return () => clearTimeout(t); }, [state.toast]);
  // Every newly published roster and trainer-addressed notification is handed
  // to the trainer mobile app. Delivery is keyed by id, so re-running this
  // effect (StrictMode, re-renders) never sends anything twice.
  const sentToMobile = useRef(new Set());
  useEffect(() => {
    const entries = [];
    (state.rosterSchedules ?? []).forEach((b) => {
      if (sentToMobile.current.has(b.id)) return;
      sentToMobile.current.add(b.id);
      entries.push(...rosterToMobileEntries(b, state.sessions));
    });
    (state.notifications ?? []).forEach((n) => {
      if (!n.toUserId || sentToMobile.current.has(n.id)) return;
      sentToMobile.current.add(n.id);
      const entry = notificationToMobileEntry(n, state.sessions);
      if (entry) entries.push(entry);
    });
    deliverToMobile(entries);
  }, [state.rosterSchedules, state.notifications]);
  useEffect(() => {
    if (!role) { setGroupId(null); setRoute(null); return; }
    setGroupId(NAV[role][0][0]); setRoute(NAV[role][0][3][0][0]); setFocusUnit(null); setOpenEmp(null);
  }, [role]);
  useEffect(() => {
    if (!role) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(t);
  }, [route, role]);

  if (state.auth.stage !== "app")
    return <Login onLogin={(userId) => dispatch({ type: "login", userId })} authStage={state.auth.stage}
      pendingUserId={state.auth.pending} onOtpVerify={(userId) => dispatch({ type: "loginOtp", userId })} />;

  // A trainer whose profile is still seeded-only is routed into onboarding
  // before they see anything else (Architecture v2.1 §4.2).
  if (me && me.profileState === "seeded") return <Onboarding me={me} data={state} dispatch={dispatch} />;

  const groupOf = (r) => nav.find((g) => g[3].some((i) => i[0] === r))?.[0];
  const go = (r, unit, focus) => { setRoute(r); setGroupId(groupOf(r) ?? groupId); setViewPreset(null); if (unit !== undefined) setFocusUnit(unit); if (focus) setFocusUnit(focus); setOpenSess(null); setOpenEmp(null); };
  const openBatch = (r, batch) => {
    go(r);
    setViewPreset({ key: `${batch.id}-${r}-${Date.now()}`, anchor: batch.from, filters: { bu: batch.bu, site: batch.site, dept: batch.dept, from: batch.from, to: batch.to }, batch });
  };
  const group = nav.find((g) => g[0] === groupId) ?? nav[0];
  const allowed = new Set(nav.flatMap((g) => g[3].map((i) => i[0])));
  const emp = openEmp && state.employees.find((e) => e.id === openEmp);
  const myNotifs = user ? state.notifications.filter((n) => notifVisible(n, user, role, scopeSite)) : [];
  const unreadCount = myNotifs.filter((n) => n.unread).length;

  let screen;
  if (route && !allowed.has(route)) screen = <EmptyState title="You don't have access to that page" hint="Pick something from the menu on the left." />;
  else if (route === "dashboard") screen = <Dashboard key={viewPreset?.key ?? "dash"} preset={viewPreset} batches={state.rosterSchedules ?? []} openBatch={openBatch} role={role} root={root ?? "CENTRAL"} allSessions={state.sessions} onOpenSession={setOpenSess} go={go} loading={loading} error={forceError} onRetry={() => setForceError(false)} />;
  else if (route === "scheduler") screen = <Scheduler key={viewPreset?.key ?? "sched"} preset={viewPreset} role={role} root={root ?? scopeSite ?? "CENTRAL"} allSessions={state.sessions} presetFocus={focusUnit} openSession={setOpenSess} dispatch={dispatch} loading={loading} error={forceError} onRetry={() => setForceError(false)} />;
  else if (route === "organization") screen = <Organization role={role} root={focusUnit ?? root} allSessions={state.sessions} go={go} openSession={setOpenSess} />;
  else if (route === "reports") screen = <Reports role={role} root={root} allSessions={state.sessions} />;
  else if (route === "employees") screen = emp
    ? <EmployeeDetail emp={emp} dispatch={dispatch} onBack={() => setOpenEmp(null)} />
    : <EmployeeMaster data={state} dispatch={dispatch} toast={() => {}} onOpen={setOpenEmp} scopeSite={scopeSite} scopeVendor={scopeVendor} />;
  else if (MASTER_ROUTES[route]) screen = <MasterScreen mkey={MASTER_ROUTES[route]} data={state} dispatch={dispatch} toast={() => {}} />;
  else if (route === "shift-master") screen = <ShiftMaster data={state} dispatch={dispatch} toast={() => {}} scopeSite={scopeSite} onGoLms={allowed.has("lms-sync") ? () => go("lms-sync") : null} />;
  else if (route === "auto-rostering") screen = <AutoRostering data={state} dispatch={dispatch} toast={() => {}} scopeSite={scopeSite} scopeBu={scopeBu} onView={openBatch} />;
  else if (route === "rostering-policies") screen = <RosteringPolicyScreen data={state} dispatch={dispatch} role={role} root={root} scopeSite={scopeSite} scopeBu={scopeBu} />;
  else if (route === "leave-approvals") screen = <LeaveApprovals data={state} dispatch={dispatch} toast={() => {}} scopeSite={scopeSite} scopeBu={scopeBu} />;
  else if (route === "attendance-overview") screen = <AttendanceOverview data={state} dispatch={dispatch} toast={() => {}} scopeSite={scopeSite} />;
  else if (route === "competency-queue") screen = <CompetencyQueue data={state} dispatch={dispatch} toast={() => {}} readOnly={role !== "assessor"} />;
  else if (route === "bulk-upload") screen = <BulkUpload data={state} dispatch={dispatch} toast={() => {}} />;
  else if (route === "lms-sync") screen = <LmsSync data={state} dispatch={dispatch} toast={() => {}} />;
  else screen = <EmptyState title="Pick something from the menu" />;

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif",
      background: V.page, color: V.text, minHeight: "100vh", fontSize: 14 }}>
      <style>{FONTS}{`@keyframes sh{0%{background-position:100% 0}100%{background-position:-100% 0}}@media(max-width:900px){.hide-sm{display:none!important}}`}</style>

      <div style={{ background: V.primary, color: "#fff", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 18px", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 2px 12px rgba(20,20,44,.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
              {Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ width: 4, height: 4, background: "#d8d5f2", borderRadius: 1 }} />)}
            </div>ShiftEaze
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", background: "rgba(255,255,255,.15)",
              padding: "2px 8px", borderRadius: 4, color: "#d8d5f2", fontWeight: 600 }}>{ROLE_LABEL[role]}</span>
          </div>
          {root && <span className="hide-sm" style={{ fontSize: 12, color: "#c9c5ea" }}>
            {[CENTRAL, ...(role !== "central" && buOf(root) ? [buOf(root)] : []), ...(["site", "scheduler", "coordinator"].includes(role) ? [orgUnit(root)] : [])].filter(Boolean).map((p) => p.name).join(" / ")}</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["central", "bu", "site"].includes(role) && (
            <div className="hide-sm" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.12)", borderRadius: 8, padding: 3 }}>
              <span style={{ fontSize: 10.5, color: "#d8d5f2", padding: "0 6px" }}>Viewing as</span>
              {["central", "bu", "site"].map((r) => (
                <button key={r} onClick={() => { dispatch({ type: "switchRole", role: r }); }}
                  style={{ border: 0, borderRadius: 6, padding: "4px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    background: role === r ? "#fff" : "transparent", color: role === r ? V.primary : "#e2e0f5" }}>
                  {ROLE_LABEL[r]}
                </button>))}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={() => { setBell(!bell); if (!bell && unreadCount) dispatch({ type: "notifRead", ids: myNotifs.map((n) => n.id) }); }}
              style={{ border: 0, background: "transparent", color: "#fff", cursor: "pointer", position: "relative", padding: 4, fontSize: 15 }}>
              🔔{unreadCount > 0 && <span style={{ position: "absolute", top: 0, right: 0, width: 15, height: 15, borderRadius: "50%",
                background: "#e0453b", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unreadCount}</span>}
            </button>
            {bell && (
              <div style={{ position: "absolute", right: 0, top: 32, width: 340, background: "#fff", borderRadius: 10, color: V.text,
                boxShadow: "0 16px 40px rgba(20,20,44,.25)", border: `1px solid ${V.border}`, zIndex: 50, maxHeight: 400, overflowY: "auto" }}>
                <div style={{ padding: "11px 14px", borderBottom: `1px solid ${V.border}`, fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Notifications</span>
                  <span style={{ fontSize: 10.5, color: V.text3 }}>{myNotifs.length} total</span>
                </div>
                {myNotifs.length === 0 ? <div style={{ padding: 20, textAlign: "center", fontSize: 12.5, color: V.text3 }}>Nothing new</div> :
                  myNotifs.map((n) => (
                    <div key={n.id} style={{ padding: "11px 14px", borderBottom: `1px solid ${V.border}`, background: n.unread ? V.todayTint : "#fff" }}>
                      <p style={{ fontSize: 12.5, fontWeight: n.unread ? 600 : 400 }}>{n.text}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontSize: 10.5, color: V.text3 }}>{n.kind} · {n.at}</span>
                      </div>
                    </div>))}
              </div>)}
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: V.primaryDark, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{initials(user.name)}</span>
            <span className="hide-sm" style={{ fontSize: 12.5 }}>{user.name}</span>
          </span>
          <button onClick={() => dispatch({ type: "logout" })} style={{ border: "1px solid rgba(255,255,255,.3)", background: "transparent",
            color: "#fff", borderRadius: 7, padding: "5px 11px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        <div className="hide-sm" style={{ width: 60, background: V.rail, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 0", flexShrink: 0 }}>
          {nav.map((g) => (
            <button key={g[0]} title={g[2]} onClick={() => { setGroupId(g[0]); go(g[3][0][0]); }}
              style={{ width: 34, height: 34, borderRadius: 9, border: 0, cursor: "pointer", fontSize: 15,
                background: groupId === g[0] ? "rgba(255,255,255,.16)" : "transparent", color: groupId === g[0] ? "#fff" : "#8b88b5" }}>{g[1]}</button>))}
        </div>
        <div className="hide-sm" style={{ width: 200, background: "#fff", borderRight: `1px solid ${V.border}`, flexShrink: 0, padding: "14px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: V.text3, padding: "0 18px 10px" }}>{group?.[2]}</div>
          {group?.[3].map(([r, label]) => (
            <button key={r} onClick={() => go(r)} style={{ width: "100%", textAlign: "left", border: 0, cursor: "pointer", fontFamily: "inherit",
              fontSize: 13.5, padding: "10px 18px", background: route === r ? V.todayTint : "transparent", color: route === r ? V.primary : V.text2,
              fontWeight: route === r ? 600 : 400, borderLeft: `3px solid ${route === r ? V.primary : "transparent"}` }}>{label}</button>))}
          <div style={{ margin: "16px 18px 0", paddingTop: 12, borderTop: `1px solid ${V.border}`, fontSize: 11, color: V.text3, lineHeight: 1.5 }}>
            {role === "central" ? "Full visibility — every BU, site and department." : role === "bu" ? `Scoped to ${orgUnit(root).name} and everything beneath it.`
              : scopeSite ? `Scoped to ${orgUnit(scopeSite).name} only.` : scopeVendor ? `Scoped to ${scopeVendor}'s own trainers.` : "Self-scoped — your own records only."}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, padding: 22 }}>{screen}</div>
      </div>

      {openSess && <SessionDrawer key={openSess.id} s={state.sessions.find((x) => x.id === openSess.id) ?? openSess} role={role} onClose={() => setOpenSess(null)} dispatch={dispatch} allSessions={state.sessions} weights={state.weights} />}

      {state.toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 90, background: V.text, color: "#fff",
          padding: "11px 18px", borderRadius: 8, fontSize: 13, boxShadow: "0 10px 32px rgba(20,20,44,.3)" }}>{state.toast}</div>)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   RECONCILIATION NOTES (read this before reviewing)
   ── Hierarchy: strictly Central → BU → Site → Department, one recursive
      org_unit shape, per Architecture v2.1 §5.1. No Terminal, no Batch —
      a further Batch/cohort layer was deliberately not introduced since
      the brief's own hierarchy diagram stops at Department; a session's
      "learners/capacity" fields stand in for a batch without a separate
      master, consistent with "do not invent entities not in the spec."
   ── Scope: this build now covers the full BRD operational surface —
      Employee Master (competency/certs/experience/availability/eligibility),
      Skill/Level/Designation/WorkType/Classroom/Geofence masters, Shift
      Master, Auto Rostering (generates literal dated sessions directly
      into the same table the scheduler reads — one source of truth, no
      separate pattern/override bookkeeping), Leave (apply/approve/
      auto-release), Attendance (QR/geofence punch + verify), Competency
      Verification, Bulk Upload + Onboarding, LMS Sync, and role-scoped
      Notifications — layered onto the Central/BU/Site dashboard,
      scheduler and organization-drilldown views from the original brief.
   ── Org units (BU/Site/Department) remain reference data rather than a
      fourth editable master in this pass — they change rarely in
      practice, and the effort went into the operational data that
      changes constantly instead. Said plainly rather than left implicit.
   ── Roles: Central/BU/Site keep the "Viewing as (demo)" quick-switcher
      from the original brief (§31) to demonstrate the org-scoping
      architecture. Scheduler, Coordinator, Assessor, Trainer and Vendor
      Admin sign in as themselves — their fixed scope is the point, not
      something to demo-switch. All 9 demo accounts are on the login
      screen; vendor accounts route through a one-time-code step first
      (Architecture v2.1 FR-IAM-005).
   ── A newly bulk-uploaded trainer (A. Pillai, U8) is routed into
      Onboarding on first login until their profile clears 75% complete.
   ══════════════════════════════════════════════════════════════════════ */

