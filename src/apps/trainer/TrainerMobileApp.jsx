import React, { useState, useEffect, useMemo, useRef } from "react";
import { COLOR, STATUS_SEMANTICS, RADIUS, SHADOW, TYPE, SPACING, MOTION } from "./theme/tokens";
import {
  Bell,
  Home,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarOff,
  Sparkles,
  User,
  MoreHorizontal,
  Smartphone,
  Wifi,
  Battery,
  Check,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  Star,
  Info,
  ChevronRight,
  ChevronLeft,
  Plane,
  Building2,
  Zap,
  Sun,
  MapPin,
  Users,
  Download,
  Shield,
  RotateCw,
  SlidersHorizontal,
  ArrowRight,
  BookOpen,
  Filter,
  Layers,
  Send,
  FileText,
  Radio,
  Plus,
  ArrowLeft,
  LayoutGrid,
  Headphones,
  ClipboardList,
  CalendarCheck,
  Globe,
  Gavel,
  LogIn,
  LogOut,
} from "lucide-react";
import TrainerSchedule from "./components/TrainerSchedule.jsx";
import TrainerUtilities from "./components/TrainerUtilities.jsx";
import TrainerHelpDesk from "./components/TrainerHelpDesk.jsx";
import TrainerAttendance from "./components/TrainerAttendance.jsx";
import StartupScheduleConfirmation from "./components/StartupScheduleConfirmation.jsx";
import TrainerAuctionScreen from "./components/TrainerAuctionScreen.jsx";
import ColleagueRecommendations, { colleagueName } from "./components/ColleagueRecommendations.jsx";
import TrainerSignIn from "./components/TrainerSignIn.jsx";
import { TrainerContext, TrainerInitials } from "./trainerContext.jsx";
import { TODAY_DATE, DEMO_CYCLE_START, inDemoCycle, formatLongDate } from "./demoClock.js";
import { readInbox, subscribeInbox, inboxFor, readReceipts, saveReceipts } from "../../shared/mobileInbox.js";

// Built-in demo month for the Ports account only; a signed-out app keeps it as the backdrop.
const usesDemoData = (acct) => !acct || !!acct.seedDemoSchedule;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
// "October 2026" when the cycle sits in one month, else "30 Oct – 30 Nov 2026".
function cycleLabelFor(sessions) {
  if (!sessions.length) { const [y, m] = TODAY_DATE.split("-").map(Number); return `${MONTH_NAMES[m - 1]} ${y}`; }
  const dates = sessions.map((s) => s.date).sort();
  const [y1, m1, d1] = dates[0].split("-").map(Number);
  const [y2, m2, d2] = dates[dates.length - 1].split("-").map(Number);
  if (y1 === y2 && m1 === m2) return `${MONTH_NAMES[m1 - 1]} ${y1}`;
  return `${d1} ${MONTH_SHORT[m1 - 1]} – ${d2} ${MONTH_SHORT[m2 - 1]} ${y2}`;
}

// A trainer's confirm/decline answers on web-published sessions, kept per
// account so a reload doesn't ask them to confirm the same roster again.
const statusKey = (email) => `shifteaze.mobileLectureStatus.v1.${email}`;
const readLectureStatus = (email) => {
  try { return JSON.parse(localStorage.getItem(statusKey(email)) || "{}"); } catch { return {}; }
};
const saveLectureStatus = (email, map) => {
  try { localStorage.setItem(statusKey(email), JSON.stringify(map)); } catch { /* non-critical */ }
};

const timeAgo = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

/* ======================================================================
   ShiftEaze Trainer Mobile Platform — Authentic iPhone 17 Pro Max Reflow
   Canvas Dimensions: 440 × 956 pt (Native iOS Touch Target & Safe Areas)
   Reflow Architecture:
   - Dynamic Island Safe Area clearance (top 54px buffer)
   - Bottom Home Indicator clearance (bottom 34px buffer)
   - 4-Tab Core Navigation: Home | Schedule | Leave | Profile
   - Home Header Action Group: Notifications 🔔 (with unread badge) + Profile 👤
   - Full Punch Flow: Schedule -> Session -> Punch In -> Punch Out
   - Contextual Notifications in Schedule and Session Details
   ====================================================================== */

// -- Demo schedule cycle (30 Oct – 30 Nov 2026) ------------------------
const FULL_MONTH_LECTURES = [
  // --- THE DEMO CYCLE, 30 OCT – 30 NOV 2026 (INITIAL STATE: ALL PENDING — trainer must confirm) ---
  { id: "LEC-0101", label: "RTG Crane Automation & Control Systems", sessionType: "Technical Training", category: "Technical", client: "John Doe", date: "2026-10-31", dateLabel: "Sat, 31 Oct", dayName: "Saturday", dayNum: 31, start: "09:00", end: "11:00", time: "09:00 AM - 11:00 AM", dur: 120, site: "Kochi Site", room: "Sim Bay B204", learners: 16, capacity: 20, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-0102", label: "Port Safety Induction & HSE Standards", sessionType: "Safety Induction", category: "Safety", client: "Sarah Patel", date: "2026-10-31", dateLabel: "Sat, 31 Oct", dayName: "Saturday", dayNum: 31, start: "14:00", end: "16:00", time: "02:00 PM - 04:00 PM", dur: 120, site: "Kochi Site", room: "Main Auditorium", learners: 28, capacity: 30, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-0301", label: "Heavy Container Stacking Precision", sessionType: "Operations Training", category: "Technical", client: "Priya Nair", date: "2026-11-02", dateLabel: "Mon, 02 Nov", dayName: "Monday", dayNum: 2, start: "09:30", end: "11:30", time: "09:30 AM - 11:30 AM", dur: 120, site: "Kochi Site", room: "Simulator Bay 1", learners: 12, capacity: 15, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-0401", label: "Hazardous Cargo Identification (IMDG)", sessionType: "Safety Training", category: "Safety", client: "Amit Verma", date: "2026-11-03", dateLabel: "Tue, 03 Nov", dayName: "Tuesday", dayNum: 3, start: "10:00", end: "12:00", time: "10:00 AM - 12:00 PM", dur: 120, site: "Kochi Site", room: "Hazmat Wing C", learners: 18, capacity: 20, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-0501", label: "Soft Skills & Team Leadership in Ops", sessionType: "Leadership Workshop", category: "Soft Skills", client: "Vikram Singh", date: "2026-11-05", dateLabel: "Thu, 05 Nov", dayName: "Thursday", dayNum: 5, start: "10:00", end: "12:00", time: "10:00 AM - 12:00 PM", dur: 120, site: "Kochi Site", room: "Outdoor Driving Track", learners: 16, capacity: 20, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-0701", label: "Tugboat Mooring Safety & Line Handling", sessionType: "Marine Operations", category: "Marine", client: "Ananya Rao", date: "2026-11-06", dateLabel: "Fri, 06 Nov", dayName: "Friday", dayNum: 6, start: "09:00", end: "11:30", time: "09:00 AM - 11:30 AM", dur: 150, site: "Kochi Site", room: "Berth 4 Pier", learners: 15, capacity: 20, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-0801", label: "STS Quay Crane Operation Basics", sessionType: "Technical Training", category: "Technical", client: "David Miller", date: "2026-11-07", dateLabel: "Sat, 07 Nov", dayName: "Saturday", dayNum: 7, start: "09:00", end: "11:30", time: "09:00 AM - 11:30 AM", dur: 150, site: "Kochi Site", room: "Sim Bay 2", learners: 12, capacity: 15, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-0901", label: "Berth Logistics & Vessel Scheduling", sessionType: "Logistics Training", category: "Logistics", client: "Fatima Al-Mansoor", date: "2026-11-09", dateLabel: "Mon, 09 Nov", dayName: "Monday", dayNum: 9, start: "10:30", end: "12:30", time: "10:30 AM - 12:30 PM", dur: 120, site: "Kochi Site", room: "TOS Lab 102", learners: 20, capacity: 25, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-1001", label: "Hydraulic Fluids & Pressure Testing", sessionType: "Technical Training", category: "Technical", client: "Kevin Chen", date: "2026-11-11", dateLabel: "Wed, 11 Nov", dayName: "Wednesday", dayNum: 11, start: "14:00", end: "16:00", time: "02:00 PM - 04:00 PM", dur: 120, site: "Kochi Site", room: "Maintenance Pit 1", learners: 14, capacity: 16, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-1101", label: "Conflict Resolution & Crew Communication", sessionType: "Soft Skills", category: "Soft Skills", client: "Neha Gupta", date: "2026-11-12", dateLabel: "Thu, 12 Nov", dayName: "Thursday", dayNum: 12, start: "09:30", end: "11:30", time: "09:30 AM - 11:30 AM", dur: 120, site: "Kochi Site", room: "Training Room 301", learners: 22, capacity: 25, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-1201", label: "Container Lashing & Twistlock Security", sessionType: "Operations Training", category: "Technical", client: "Suresh Menon", date: "2026-11-14", dateLabel: "Sat, 14 Nov", dayName: "Saturday", dayNum: 14, start: "10:00", end: "12:30", time: "10:00 AM - 12:30 PM", dur: 150, site: "Kochi Site", room: "Vessel Deck Mockup", learners: 18, capacity: 20, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-1401", label: "RTG Diagnostics & Electrical Interlocks", sessionType: "Technical Training", category: "Technical", client: "Rajesh Kulkarni", date: "2026-11-16", dateLabel: "Mon, 16 Nov", dayName: "Monday", dayNum: 16, start: "13:00", end: "15:30", time: "01:00 PM - 03:30 PM", dur: 150, site: "Kochi Site", room: "Electrical Workshop", learners: 14, capacity: 16, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-1701", label: "RTG Crane Automation & Control Systems", sessionType: "Technical Training", category: "Technical", client: "Elena Rostova", date: "2026-10-30", dateLabel: "Fri, 30 Oct", dayName: "Friday", dayNum: 30, start: "09:00", end: "11:00", time: "09:00 AM - 11:00 AM", dur: 120, site: "Kochi Site", room: "Sim Bay B204", learners: 16, capacity: 20, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-1702", label: "Crane Safety Refresher", sessionType: "Safety Training", category: "Safety", client: "Marcus Vance", date: "2026-10-30", dateLabel: "Fri, 30 Oct", dayName: "Friday", dayNum: 30, start: "14:00", end: "16:00", time: "02:00 PM - 04:00 PM", dur: 120, site: "Kochi Site", room: "Auditorium A", learners: 22, capacity: 30, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-1801", label: "Safety Induction & HSE Standards", sessionType: "Safety Induction", category: "Safety", client: "Marcus Vance", date: "2026-11-17", dateLabel: "Tue, 17 Nov", dayName: "Tuesday", dayNum: 17, start: "09:30", end: "11:30", time: "09:30 AM - 11:30 AM", dur: 120, site: "Kochi Site", room: "Main Training Hall", learners: 26, capacity: 30, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-1901", label: "Quality Fundamentals Workshop", sessionType: "Quality Standards", category: "Quality", client: "Aisha Siddiqui", date: "2026-11-18", dateLabel: "Wed, 18 Nov", dayName: "Wednesday", dayNum: 18, start: "10:00", end: "12:00", time: "10:00 AM - 12:00 PM", dur: 120, site: "Kochi Site", room: "Boardroom 2", learners: 15, capacity: 20, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-2001", label: "Harbor Tug Maneuver & Escort Drills", sessionType: "Marine Training", category: "Marine", client: "Carlos Mendez", date: "2026-11-20", dateLabel: "Fri, 20 Nov", dayName: "Friday", dayNum: 20, start: "11:00", end: "13:30", time: "11:00 AM - 01:30 PM", dur: 150, site: "Kochi Site", room: "Marine Ops Basin", learners: 10, capacity: 12, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-2101", label: "RTG Heavy Lifter Advanced Simulation", sessionType: "Technical Training", category: "Technical", client: "Deepa Krishnan", date: "2026-11-21", dateLabel: "Sat, 21 Nov", dayName: "Saturday", dayNum: 21, start: "09:00", end: "11:30", time: "09:00 AM - 11:30 AM", dur: 150, site: "Kochi Site", room: "Sim Bay 1", learners: 14, capacity: 16, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-2201", label: "High-Voltage Shore Power Connectivity", sessionType: "Technical Training", category: "Technical", client: "Arjun Das", date: "2026-11-23", dateLabel: "Mon, 23 Nov", dayName: "Monday", dayNum: 23, start: "10:00", end: "12:00", time: "10:00 AM - 12:00 PM", dur: 120, site: "Kochi Site", room: "Cold Ironing Substation", learners: 12, capacity: 15, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-2301", label: "Automated Gate OCR & License Plate Audit", sessionType: "Logistics Training", category: "Logistics", client: "Pooja Sharma", date: "2026-11-24", dateLabel: "Tue, 24 Nov", dayName: "Tuesday", dayNum: 24, start: "14:00", end: "16:00", time: "02:00 PM - 04:00 PM", dur: 120, site: "Kochi Site", room: "North Ingate Cabin", learners: 16, capacity: 20, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-2401", label: "Personal Training - Fall Arrest Systems", sessionType: "Personal Training", category: "Safety", client: "John Doe", date: "2026-11-26", dateLabel: "Thu, 26 Nov", dayName: "Thursday", dayNum: 26, start: "18:00", end: "19:00", time: "06:00 PM - 07:00 PM", dur: 60, site: "Kochi Site", room: "Tower Rig Rigging Yard", learners: 1, capacity: 1, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-2402", label: "Personal Training - Crane Anti-Sway", sessionType: "Personal Training", category: "Technical", client: "Sarah Patel", date: "2026-11-26", dateLabel: "Thu, 26 Nov", dayName: "Thursday", dayNum: 26, start: "19:00", end: "20:00", time: "07:00 PM - 08:00 PM", dur: 60, site: "Kochi Site", room: "Simulator Lab A", learners: 1, capacity: 1, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-2501", label: "Personal Training - Electric Forklift", sessionType: "Personal Training", category: "Technical", client: "Rahul Shah", date: "2026-11-27", dateLabel: "Fri, 27 Nov", dayName: "Friday", dayNum: 27, start: "18:00", end: "19:00", time: "06:00 PM - 07:00 PM", dur: 60, site: "Kochi Site", room: "Yard Workshop 3", learners: 1, capacity: 1, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-2601", label: "Root Cause Analysis for Yard Incidents", sessionType: "Safety Training", category: "Safety", client: "Operations Crew", date: "2026-11-28", dateLabel: "Sat, 28 Nov", dayName: "Saturday", dayNum: 28, start: "11:00", end: "13:00", time: "11:00 AM - 01:00 PM", dur: 120, site: "Kochi Site", room: "HSE Conference Suite", learners: 20, capacity: 24, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-2701", label: "Mobile Harbor Crane Multi-Rope Hoisting", sessionType: "Technical Training", category: "Technical", client: "Terminal Staff", date: "2026-11-30", dateLabel: "Mon, 30 Nov", dayName: "Monday", dayNum: 30, start: "13:30", end: "15:30", time: "01:30 PM - 03:30 PM", dur: 120, site: "Kochi Site", room: "Heavy Lift Berth 1", learners: 12, capacity: 15, status: "pending", denialReason: null, trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },

  // ======================================================================
  // --- OCTOBER 2026 FULL MONTH SCHEDULE (NEXT MONTH) ---
  // ======================================================================
  { id: "LEC-OCT-0101", label: "RTG Crane Automation Refresher", sessionType: "Technical Training", category: "Technical", client: "John Doe", date: "2026-10-01", dateLabel: "Thu, 01 Oct", dayName: "Thursday", dayNum: 1, start: "09:00", end: "11:00", time: "09:00 AM - 11:00 AM", dur: 120, site: "Kochi Site", room: "Sim Bay B204", learners: 16, capacity: 20, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-0201", label: "Port Safety Induction & HSE Standards", sessionType: "Safety Induction", category: "Safety", client: "Sarah Patel", date: "2026-10-02", dateLabel: "Fri, 02 Oct", dayName: "Friday", dayNum: 2, start: "10:00", end: "12:00", time: "10:00 AM - 12:00 PM", dur: 120, site: "Kochi Site", room: "Main Auditorium", learners: 28, capacity: 30, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-0501", label: "Heavy Container Stacking Precision", sessionType: "Operations Training", category: "Technical", client: "Priya Nair", date: "2026-10-05", dateLabel: "Mon, 05 Oct", dayName: "Monday", dayNum: 5, start: "09:30", end: "11:30", time: "09:30 AM - 11:30 AM", dur: 120, site: "Kochi Site", room: "Simulator Bay 1", learners: 12, capacity: 15, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-0601", label: "STS Quay Crane Operation Basics", sessionType: "Technical Training", category: "Technical", client: "David Miller", date: "2026-10-06", dateLabel: "Tue, 06 Oct", dayName: "Tuesday", dayNum: 6, start: "09:00", end: "11:30", time: "09:00 AM - 11:30 AM", dur: 150, site: "Kochi Site", room: "Sim Bay 2", learners: 14, capacity: 18, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-0701", label: "Hazardous Cargo Handling (IMDG)", sessionType: "Safety Training", category: "Safety", client: "Amit Verma", date: "2026-10-07", dateLabel: "Wed, 07 Oct", dayName: "Wednesday", dayNum: 7, start: "14:00", end: "16:00", time: "02:00 PM - 04:00 PM", dur: 120, site: "Kochi Site", room: "Hazmat Wing C", learners: 18, capacity: 20, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-0801", label: "Berth Logistics & Vessel Scheduling", sessionType: "Logistics Training", category: "Logistics", client: "Fatima Al-Mansoor", date: "2026-10-08", dateLabel: "Thu, 08 Oct", dayName: "Thursday", dayNum: 8, start: "10:30", end: "12:30", time: "10:30 AM - 12:30 PM", dur: 120, site: "Kochi Site", room: "TOS Lab 102", learners: 20, capacity: 25, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-0901", label: "Conflict Resolution & Crew Communication", sessionType: "Soft Skills", category: "Soft Skills", client: "Neha Gupta", date: "2026-10-09", dateLabel: "Fri, 09 Oct", dayName: "Friday", dayNum: 9, start: "09:30", end: "11:30", time: "09:30 AM - 11:30 AM", dur: 120, site: "Kochi Site", room: "Training Room 301", learners: 22, capacity: 25, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-1201", label: "Container Lashing & Twistlock Security", sessionType: "Operations Training", category: "Technical", client: "Suresh Menon", date: "2026-10-12", dateLabel: "Mon, 12 Oct", dayName: "Monday", dayNum: 12, start: "10:00", end: "12:30", time: "10:00 AM - 12:30 PM", dur: 150, site: "Kochi Site", room: "Vessel Deck Mockup", learners: 18, capacity: 20, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-1301", label: "Hydraulic Fluids & Pressure Testing", sessionType: "Technical Training", category: "Technical", client: "Kevin Chen", date: "2026-10-13", dateLabel: "Tue, 13 Oct", dayName: "Tuesday", dayNum: 13, start: "14:00", end: "16:00", time: "02:00 PM - 04:00 PM", dur: 120, site: "Kochi Site", room: "Maintenance Pit 1", learners: 14, capacity: 16, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-1401", label: "Tugboat Mooring Safety & Line Handling", sessionType: "Marine Operations", category: "Marine", client: "Ananya Rao", date: "2026-10-14", dateLabel: "Wed, 14 Oct", dayName: "Wednesday", dayNum: 14, start: "09:00", end: "11:30", time: "09:00 AM - 11:30 AM", dur: 150, site: "Kochi Site", room: "Berth 4 Pier", learners: 15, capacity: 20, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-1501", label: "RTG Diagnostics & Electrical Interlocks", sessionType: "Technical Training", category: "Technical", client: "Rajesh Kulkarni", date: "2026-10-15", dateLabel: "Thu, 15 Oct", dayName: "Thursday", dayNum: 15, start: "13:00", end: "15:30", time: "01:00 PM - 03:30 PM", dur: 150, site: "Kochi Site", room: "Electrical Workshop", learners: 14, capacity: 16, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-1601", label: "Automated Gate OCR & License Plate Audit", sessionType: "Logistics Training", category: "Logistics", client: "Pooja Sharma", date: "2026-10-16", dateLabel: "Fri, 16 Oct", dayName: "Friday", dayNum: 16, start: "14:00", end: "16:00", time: "02:00 PM - 04:00 PM", dur: 120, site: "Kochi Site", room: "North Ingate Cabin", learners: 16, capacity: 20, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-1901", label: "Quality Fundamentals Workshop", sessionType: "Quality Standards", category: "Quality", client: "Aisha Siddiqui", date: "2026-10-19", dateLabel: "Mon, 19 Oct", dayName: "Monday", dayNum: 19, start: "10:00", end: "12:00", time: "10:00 AM - 12:00 PM", dur: 120, site: "Kochi Site", room: "Boardroom 2", learners: 15, capacity: 20, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-2001", label: "High-Voltage Shore Power Connectivity", sessionType: "Technical Training", category: "Technical", client: "Arjun Das", date: "2026-10-20", dateLabel: "Tue, 20 Oct", dayName: "Tuesday", dayNum: 20, start: "10:00", end: "12:00", time: "10:00 AM - 12:00 PM", dur: 120, site: "Kochi Site", room: "Cold Ironing Substation", learners: 12, capacity: 15, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-2101", label: "Harbor Tug Maneuver & Escort Drills", sessionType: "Marine Training", category: "Marine", client: "Carlos Mendez", date: "2026-10-21", dateLabel: "Wed, 21 Oct", dayName: "Wednesday", dayNum: 21, start: "11:00", end: "13:30", time: "11:00 AM - 01:30 PM", dur: 150, site: "Kochi Site", room: "Marine Ops Basin", learners: 10, capacity: 12, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-2201", label: "RTG Heavy Lifter Advanced Simulation", sessionType: "Technical Training", category: "Technical", client: "Deepa Krishnan", date: "2026-10-22", dateLabel: "Thu, 22 Oct", dayName: "Thursday", dayNum: 22, start: "09:00", end: "11:30", time: "09:00 AM - 11:30 AM", dur: 150, site: "Kochi Site", room: "Sim Bay 1", learners: 14, capacity: 16, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-2301", label: "Personal Training - Fall Arrest Systems", sessionType: "Personal Training", category: "Safety", client: "John Doe", date: "2026-10-23", dateLabel: "Fri, 23 Oct", dayName: "Friday", dayNum: 23, start: "18:00", end: "19:00", time: "06:00 PM - 07:00 PM", dur: 60, site: "Kochi Site", room: "Tower Rig Rigging Yard", learners: 1, capacity: 1, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-2601", label: "Mobile Harbor Crane Multi-Rope Hoisting", sessionType: "Technical Training", category: "Technical", client: "Terminal Staff", date: "2026-10-26", dateLabel: "Mon, 26 Oct", dayName: "Monday", dayNum: 26, start: "13:30", end: "15:30", time: "01:30 PM - 03:30 PM", dur: 120, site: "Kochi Site", room: "Heavy Lift Berth 1", learners: 12, capacity: 15, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-2701", label: "Root Cause Analysis for Yard Incidents", sessionType: "Safety Training", category: "Safety", client: "Operations Crew", date: "2026-10-27", dateLabel: "Tue, 27 Oct", dayName: "Tuesday", dayNum: 27, start: "11:00", end: "13:00", time: "11:00 AM - 01:00 PM", dur: 120, site: "Kochi Site", room: "HSE Conference Suite", learners: 20, capacity: 24, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-2801", label: "Safety Induction & HSE Standards", sessionType: "Safety Induction", category: "Safety", client: "Marcus Vance", date: "2026-10-28", dateLabel: "Wed, 28 Oct", dayName: "Wednesday", dayNum: 28, start: "09:30", end: "11:30", time: "09:30 AM - 11:30 AM", dur: 120, site: "Kochi Site", room: "Main Training Hall", learners: 26, capacity: 30, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-2901", label: "Personal Training - Crane Anti-Sway", sessionType: "Personal Training", category: "Technical", client: "Sarah Patel", date: "2026-10-29", dateLabel: "Thu, 29 Oct", dayName: "Thursday", dayNum: 29, start: "19:00", end: "20:00", time: "07:00 PM - 08:00 PM", dur: 60, site: "Kochi Site", room: "Simulator Lab A", learners: 1, capacity: 1, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-OCT-3001", label: "Personal Training - Electric Forklift", sessionType: "Personal Training", category: "Technical", client: "Rahul Shah", date: "2026-10-28", dateLabel: "Wed, 28 Oct", dayName: "Wednesday", dayNum: 28, start: "18:00", end: "19:00", time: "06:00 PM - 07:00 PM", dur: 60, site: "Kochi Site", room: "Yard Workshop 3", learners: 1, capacity: 1, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },

  // ======================================================================
  // --- AUGUST 2026 SCHEDULE (PREVIOUS MONTH) ---
  // ======================================================================
  { id: "LEC-AUG-0301", label: "Port Machinery Safety Protocol", sessionType: "Safety Training", category: "Safety", client: "John Doe", date: "2026-08-03", dateLabel: "Mon, 03 Aug", dayName: "Monday", dayNum: 3, start: "09:00", end: "11:00", time: "09:00 AM - 11:00 AM", dur: 120, site: "Kochi Site", room: "Sim Bay B204", learners: 15, capacity: 20, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-AUG-0701", label: "RTG Basic Operational Skills", sessionType: "Technical Training", category: "Technical", client: "Sarah Patel", date: "2026-08-07", dateLabel: "Fri, 07 Aug", dayName: "Friday", dayNum: 7, start: "10:00", end: "12:30", time: "10:00 AM - 12:30 PM", dur: 150, site: "Kochi Site", room: "Simulator Bay 1", learners: 12, capacity: 15, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-AUG-1401", label: "Container Terminal Safety Drill", sessionType: "Safety Induction", category: "Safety", client: "David Miller", date: "2026-08-14", dateLabel: "Fri, 14 Aug", dayName: "Friday", dayNum: 14, start: "14:00", end: "16:00", time: "02:00 PM - 04:00 PM", dur: 120, site: "Kochi Site", room: "Main Auditorium", learners: 30, capacity: 30, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-AUG-2101", label: "Berth Crane Lashing Verification", sessionType: "Operations Training", category: "Technical", client: "Priya Nair", date: "2026-08-21", dateLabel: "Fri, 21 Aug", dayName: "Friday", dayNum: 21, start: "09:30", end: "11:30", time: "09:30 AM - 11:30 AM", dur: 120, site: "Kochi Site", room: "Vessel Deck Mockup", learners: 16, capacity: 20, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },
  { id: "LEC-AUG-2801", label: "Hydraulic Maintenance Evaluation", sessionType: "Technical Training", category: "Technical", client: "Kevin Chen", date: "2026-08-28", dateLabel: "Fri, 28 Aug", dayName: "Friday", dayNum: 28, start: "13:00", end: "15:00", time: "01:00 PM - 03:00 PM", dur: 120, site: "Kochi Site", room: "Maintenance Pit 1", learners: 14, capacity: 16, status: "confirmed", trainerName: "Ramesh Patel", trainerRole: "Senior Technical Trainer", trainerAvatar: "RP" },

];

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-1",
    type: "session",
    category: "Session Alert",
    title: "Punch In Available",
    message: "RTG Crane Automation & Control Systems · 09:00 AM",
    time: "10m ago",
    date: TODAY_DATE,
    unread: true,
    sessionId: "LEC-1701",
    actionLabel: "Go to Session",
  },
  {
    id: "notif-2",
    type: "schedule-day",
    category: "Schedule Status",
    title: "Today you have 2 sessions",
    message: "09:00 AM and 02:00 PM",
    time: "07:30 AM",
    date: TODAY_DATE,
    unread: true,
    actionLabel: "View Schedule",
    targetMode: "day",
  },
  {
    id: "notif-3",
    type: "schedule-month",
    category: "Schedule Updated",
    title: "New Schedule Published",
    message: "30 Oct – 30 Nov 2026 · 25 sessions to confirm",
    time: "Yesterday",
    date: "2026-10-29",
    unread: false,
    actionLabel: "Open Month",
    targetMode: "month",
  },
  {
    id: "notif-4",
    type: "session",
    category: "Room Update",
    title: "Room Changed",
    message: "Crane Safety Refresher moved to Auditorium A",
    time: "2 days ago",
    date: "2026-10-28",
    unread: false,
    sessionId: "LEC-1702",
    actionLabel: "Check Details",
  },
];

// -- Mock Leave Requests History ----------------------------------------
const INITIAL_LEAVE_REQUESTS = [
  {
    id: "LEV-101",
    type: "Casual Leave",
    startDate: "2026-11-06",
    endDate: "2026-11-07",
    days: 2,
    reason: "Family personal commitment in Ernakulam.",
    status: "Approved",
    submittedAt: "27 Oct 2026",
    reviewerNote: "Approved by Site Operations Lead",
  },
  {
    id: "LEV-102",
    type: "Sick / Medical Leave",
    startDate: "2026-10-23",
    endDate: "2026-10-23",
    days: 1,
    reason: "Medical dental appointment and recovery.",
    status: "Approved",
    submittedAt: "21 Oct 2026",
    reviewerNote: "Medical fitness certificate verified",
  },
  {
    id: "LEV-103",
    type: "Privileged Leave",
    startDate: "2026-11-17",
    endDate: "2026-11-20",
    days: 4,
    reason: "Annual planned festival vacation.",
    status: "Pending",
    submittedAt: "29 Oct 2026",
    reviewerNote: "Under review with Rostering Committee",
  },
];

// -- Help Desk Tickets Mock Data ----------------------------------------
const INITIAL_TICKETS = [
  {
    id: "TKT-2026-00142",
    title: "Payroll Related - Incentives Not Credited",
    module: "Payroll",
    queryCategory: "Moves Mismatch",
    description: "Container na pisa nahi aaya",
    status: "OPEN",
    assignedTo: "HR",
    lastAssignedTo: "HR",
    createdAtDate: "2026-07-03",
    createdAtTime: "16:28:14",
    updatedAtDate: "2026-08-05",
    updatedAtTime: "13:01:38",
  },
  {
    id: "TKT-2026-00138",
    title: "Attendance - Wrong Punch at South Ingate",
    module: "Attendance",
    queryCategory: "Wrong Punch",
    description: "Biometric punched in as 14:15 instead of 13:45 due to scanner glitch at South Berth.",
    status: "IN PROGRESS",
    assignedTo: "Operations Lead",
    lastAssignedTo: "HR",
    createdAtDate: "2026-09-12",
    createdAtTime: "10:14:02",
    updatedAtDate: "2026-09-13",
    updatedAtTime: "11:22:50",
  },
];

// -- 2026 Company Holiday Calendar --------------------------------------
const COMPANY_HOLIDAYS_2026 = [
  { id: "H01", date: "2026-01-26", dayName: "Monday", name: "Republic Day", type: "National Holiday", month: "Jan" },
  { id: "H02", date: "2026-03-25", dayName: "Wednesday", name: "Holi (Festival of Colors)", type: "Festival Holiday", month: "Mar" },
  { id: "H03", date: "2026-04-11", dayName: "Saturday", name: "Eid-ul-Fitr", type: "Gazetted Holiday", month: "Apr" },
  { id: "H04", date: "2026-05-01", dayName: "Friday", name: "International Workers Day", type: "National Holiday", month: "May" },
  { id: "H05", date: "2026-08-15", dayName: "Saturday", name: "Independence Day", type: "National Holiday", month: "Aug" },
  { id: "H06", date: "2026-09-07", dayName: "Monday", name: "Janmashtami", type: "Festival Holiday", month: "Sep" },
  { id: "H07", date: "2026-09-16", dayName: "Wednesday", name: "Milad-un-Nabi", type: "Gazetted Holiday", month: "Sep" },
  { id: "H08", date: "2026-09-26", dayName: "Saturday", name: "Ganesh Chaturthi", type: "Regional Festival", month: "Sep" },
  { id: "H09", date: "2026-10-02", dayName: "Friday", name: "Gandhi Jayanti", type: "National Holiday", month: "Oct" },
  { id: "H10", date: "2026-10-20", dayName: "Tuesday", name: "Dussehra (Vijayadashami)", type: "Festival Holiday", month: "Oct" },
  { id: "H11", date: "2026-11-08", dayName: "Sunday", name: "Diwali (Deepavali)", type: "Festival Holiday", month: "Nov" },
  { id: "H12", date: "2026-12-25", dayName: "Friday", name: "Christmas Day", type: "Gazetted Holiday", month: "Dec" },
];

// -- Initial Leave Balance -----------------------------------------------
const INITIAL_LEAVE_BALANCE = {
  available: 24, used: 8, pending: 2, remaining: 16,
  types: [
    { id: "casual", name: "Casual Leave", available: 10, used: 3, remaining: 7, color: "#4F46E5", bg: "#FFFFFF" },
    { id: "sick", name: "Sick Leave", available: 8, used: 2, remaining: 6, color: "#4F46E5", bg: "#FFFFFF" },
    { id: "earned", name: "Earned Leave", available: 12, used: 3, remaining: 9, color: "#4F46E5", bg: "#FFFFFF" },
    { id: "emergency", name: "Emergency Leave", available: 4, used: 1, remaining: 3, color: "#4F46E5", bg: "#FFFFFF" },
  ],
};


const INITIAL_TRAINER = {
  id: "E001",
  empId: "EMP-10482",
  name: "Ramesh Patel",
  title: "Senior Technical Trainer",
  site: "Kochi Site (KOC)",
  siteCode: "KOC",
  phone: "+91 98250 11041",
  email: "ramesh.patel@workforce.internal",
  readinessScore: 78,
  status: "Available",
  tciScore: 87,
  weeklyLoad: 18,
  maxWeeklyLoad: 30,
  certifications: [
    {
      id: "CERT-RTG",
      name: "RTG Technical Certification",
      status: "valid",
      badge: "VALID",
      color: COLOR.success,
      bg: COLOR.successLight,
      expiry: "Expires 14 Nov 2026",
      no: "TCI-2024-8841",
    },
    {
      id: "CERT-STS",
      name: "STS Quay Crane Assessor",
      status: "valid",
      badge: "VALID",
      color: COLOR.success,
      bg: COLOR.successLight,
      expiry: "Expires 22 Jan 2027",
      no: "STS-QA-0492",
    },
    {
      id: "CERT-FA",
      name: "First Aid Level 3 (Workplace)",
      status: "expiring",
      badge: "EXPIRING IN 28 DAYS",
      color: COLOR.warning,
      bg: COLOR.warningLight,
      expiry: "Expires 15 Oct 2026",
      no: "FA3-2023-0199",
    },
    {
      id: "CERT-MED",
      name: "Annual Medical Fitness Certificate",
      status: "expired",
      badge: "EXPIRED (BLOCKING)",
      color: COLOR.danger,
      bg: COLOR.dangerLight,
      expiry: "Expired 01 Sep 2026",
      no: "MED-FIT-2025",
      blocked: true,
    },
  ],
  competencies: [
    { skill: "Rubber-Tired Gantry (RTG) Cranes", level: "Expert / Master Assessor", score: 94 },
    { skill: "Ship-to-Shore (STS) Cranes", level: "Advanced Trainer", score: 88 },
    { skill: "Forklift & Reach Stacker Operations", level: "Certified Instructor", score: 82 },
    { skill: "HSE Maritime Standards", level: "Certified Lead", score: 79 },
  ],
};

// -- Trainer Confirmation & Attendance Flow -----------------------------
// Flow: Whole-Schedule Confirmation (Stage 1, once) -> per-session
// Confirmation opening 12h before start (Stage 2) -> Punch In -> Punch Out.
// Declining at either stage requires a reason. Attendance is derived from
// completed punches, never a separate manually-set field.

function buildInitialSessionState() {
  const map = {};
  FULL_MONTH_LECTURES.forEach((lec) => {
    map[lec.id] = {
      stage1: lec.status === "confirmed" ? "confirmed" : lec.status === "denied" ? "declined" : "pending",
      stage1Reason: lec.denialReason || null,
      stage2: lec.date === TODAY_DATE ? (lec.status === "confirmed" ? "confirmed" : "pending") : "not_open",
      stage2Reason: null,
      punch: { status: "not_started", inAt: null, outAt: null },
    };
  });
  return map;
}

// -- Helper Status Badge Component --------------------------------------
function StatusPill({ status }) {
  const map = {
    confirmed: { label: "Confirmed", bg: COLOR.successLight, text: COLOR.success, border: COLOR.successBorder, icon: CheckCircle2 },
    upcoming: { label: "Upcoming", bg: COLOR.infoLight, text: COLOR.info, border: COLOR.infoBorder, icon: Clock },
    ongoing: { label: "Ongoing", bg: COLOR.warningLight, text: COLOR.warning, border: COLOR.warningBorder, icon: Radio },
    completed: { label: "Completed", bg: COLOR.neutralLight, text: COLOR.neutral, border: COLOR.neutralBorder, icon: Check },
    cancelled: { label: "Cancelled", bg: COLOR.dangerLight, text: COLOR.danger, border: COLOR.dangerBorder, icon: X },
    assigned: { label: "Assigned", bg: COLOR.infoLight, text: COLOR.info, border: COLOR.infoBorder, icon: Clock },
    declined: { label: "Declined", bg: COLOR.dangerLight, text: COLOR.danger, border: COLOR.dangerBorder, icon: X },
    denied: { label: "Denied", bg: COLOR.dangerLight, text: COLOR.danger, border: COLOR.dangerBorder, icon: X },
    pending: { label: "Pending", bg: COLOR.warningLight, text: COLOR.warning, border: COLOR.warningBorder, icon: AlertTriangle },
    available: { label: "Available", bg: COLOR.infoLight, text: COLOR.info, border: COLOR.infoBorder, icon: Clock },
    pending_confirmation: { label: "Pending", bg: COLOR.warningLight, text: COLOR.warning, border: COLOR.warningBorder, icon: AlertTriangle },
  };
  const c = map[status] || map.confirmed;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: RADIUS.pill,
        background: c.bg,
        color: c.text,
        fontSize: 11.5,
        fontWeight: 600,
      }}
    >
      {c.label}
    </span>
  );
}

/* ======================================================================
   SCREEN 1: HOME SCREEN (iPhone 17 Pro Max Proportions)
   - Home header: Greeting on left, Notification 🔔 + Profile 👤 on right
   - REMOVED: "View Schedule" and "Apply Leave" action buttons
   - Rebalanced content space: natural expansion for session list & stats
   ====================================================================== */
function HomeScreen({
  trainer,
  heroSession,
  heroState,
  listSessions,
  listMode,
  sessionState,
  todayCompletedCount,
  todayTotalCount,
  nextUpcoming,
  onOpenSession,
  onStage2Confirm,
  onPunchIn,
  onPunchOut,
  onSetDemoState,
  onOpenNotifications,
  onOpenProfile,
  unreadCount,
  onOpenSchedule,
  onOpenAuction,
  onOpenLeave,
  loadLabel = "4.0h",
  monthCount = 37,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* --- Safe Area Header: Greeting Left | [🔔 Notif + 👤 Profile] Action Group Right --- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 4,
        }}
      >
        {/* Left: Greeting and Status */}
        <div>
          <div style={{ fontSize: 13, color: COLOR.ink500, fontWeight: 600, letterSpacing: "0.01em" }}>
            Good morning,
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLOR.ink950, letterSpacing: "-0.02em" }}>
            {trainer.name}
          </div>
        </div>

        {/* Right: Notification & Profile Header Action Group */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Notification Bell with Badge */}
          <button
            onClick={onOpenNotifications}
            aria-label="Notifications"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: COLOR.primarySoft,
              border: `1px solid ${COLOR.primary200}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.15s ease",
            }}
          >
            <Bell size={20} color={COLOR.primary} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 7,
                  right: 7,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: COLOR.danger,
                  border: "2px solid #FFFFFF",
                }}
              />
            )}
          </button>

          {/* Profile Avatar Button */}
          <button
            onClick={onOpenProfile}
            aria-label="Profile"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#262B75",
              color: "#FFFFFF",
              border: `2px solid #FFFFFF`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            <TrainerInitials />
          </button>
        </div>
      </div>

      {/* --- Date Banner & Duty Pill (solid ShiftEaze navy) --- */}
      <div
        style={{
          background: COLOR.primary,
          borderRadius: RADIUS.card,
          padding: "13px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={16} color={COLOR.primary200} />
          <span style={{ fontSize: 14, fontWeight: 700, color: COLOR.white }}>
            {formatLongDate(TODAY_DATE)}
          </span>
        </div>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: COLOR.success,
            background: COLOR.successLight,
            padding: "4px 10px",
            borderRadius: RADIUS.pill,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLOR.successBorder }} />
          On Duty
        </span>
      </div>

      {/* --- HERO LIVE STATUS CARD (Confirmation -> Punch In -> Punch Out) --- */}
      {heroSession ? (() => {
        const isDeclined = heroState.stage1 === "declined" || heroState.stage2 === "declined";
        const isPendingConfirm = heroState.stage2 === "pending" || heroState.stage2 === "not_open";
        const isReadyPunchIn = heroState.stage2 === "confirmed" && heroState.punch.status === "not_started";
        const isPunchedIn = heroState.punch.status === "active";
        const isCompleted = heroState.punch.status === "completed";
        const currentStep = isDeclined ? null : isPendingConfirm ? 1 : isReadyPunchIn ? 2 : isPunchedIn ? 3 : 4;
        // Accent strip follows the live state of the session
        const accent = isDeclined
          ? COLOR.danger
          : isPendingConfirm
            ? listMode === "upcoming" ? COLOR.primary : COLOR.warningBorder
            : isReadyPunchIn
              ? COLOR.primary
              : COLOR.successBorder;

        return (
          <div
            style={{
              background: COLOR.white,
              borderRadius: RADIUS.card,
              padding: "16px 16px 16px",
              color: COLOR.textPrimary,
              border: `1px solid ${COLOR.border}`,
              borderTop: `4px solid ${accent}`,
              boxShadow: SHADOW.cardHover,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative",
              overflowY: "auto",
              maxHeight: 390,
            }}
          >
            {/* Top row: when + status */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: COLOR.textSecondary }}>
                {listMode === "upcoming" ? `Tomorrow · ${heroSession.dateLabel || "Fri, 18 Sep"}` : "Today"}
              </span>

              {(() => {
                const badge = isDeclined
                  ? { label: "Declined", color: COLOR.danger, bg: COLOR.dangerLight }
                  : isPendingConfirm
                    ? listMode === "upcoming"
                      ? { label: "Upcoming", color: COLOR.primary, bg: COLOR.primarySoft }
                      : { label: "Pending", color: COLOR.warning, bg: COLOR.warningLight }
                    : isReadyPunchIn
                      ? { label: "Confirmed", color: COLOR.primary, bg: COLOR.primarySoft }
                      : isPunchedIn
                        ? { label: "In Progress", color: COLOR.success, bg: COLOR.successLight }
                        : { label: "Completed", color: COLOR.success, bg: COLOR.successLight };
                return (
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.color,
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: RADIUS.pill,
                    }}
                  >
                    {badge.label}
                  </span>
                );
              })()}
            </div>

            {/* Session info — tap to open full session controls */}
            <div
              onClick={() => onOpenSession(heroSession)}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", zIndex: 2 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLOR.textPrimary, lineHeight: 1.3 }}>
                  {heroSession.label}
                </div>
                <div style={{ fontSize: 12.5, color: COLOR.textSecondary, marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 12px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Clock size={13} color={COLOR.textMuted} /> {heroSession.time}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} color={COLOR.textMuted} /> {heroSession.room} · {heroSession.site}
                  </span>
                </div>
                {heroState.punch.inAt && (
                  <div style={{ marginTop: 6, fontSize: 12, color: COLOR.textSecondary }}>
                    In {heroState.punch.inAt}
                    {heroState.punch.outAt && ` · Out ${heroState.punch.outAt}`}
                  </div>
                )}
              </div>
              <ChevronRight size={18} color={COLOR.textMuted} style={{ flexShrink: 0 }} />
            </div>

            {/* PART 2: UPCOMING SHIFT vs TODAY'S ACTIVE SHIFT */}
            {listMode === "upcoming" ? (
              /* TOMORROW'S SHIFT BRIEFING: Show Punch-In unlock timing & actions instead of live punch stepper */
              <div style={{ zIndex: 2, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: COLOR.textSecondary }}>
                  <Clock size={14} color={COLOR.primary} />
                  <span>Punch In opens at 09:15 AM</span>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSession(heroSession);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: RADIUS.pill,
                      background: COLOR.primary,
                      color: COLOR.white,
                      border: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Details
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSession(heroSession);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: RADIUS.pill,
                      background: COLOR.white,
                      color: COLOR.danger,
                      border: `1px solid ${COLOR.border}`,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Can't Attend
                  </button>
                </div>
              </div>
            ) : (
              /* TODAY'S LIVE ACTIVE SHIFT: 3-Step Live Stepper & Punch Controls */
              <>
                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background: "#E2E8F0",
                    margin: "1px 0",
                    zIndex: 2,
                  }}
                />

                {/* Stepper */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    position: "relative",
                    padding: "2px 2px",
                    zIndex: 2,
                  }}
                >
                  {[
                    { num: 1, label: "Confirm" },
                    { num: 2, label: "Punch In" },
                    { num: 3, label: "Punch Out" },
                  ].map((step, idx, arr) => {
                    const isDone = currentStep > step.num;
                    const isCurrent = currentStep === step.num;
                    return (
                      <React.Fragment key={step.num}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, zIndex: 2 }}>
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 800,
                              background: isDone
                                ? COLOR.success
                                : isCurrent
                                  ? "#262B75"
                                  : "#F1F5F9",
                              color: isDone
                                ? "#FFFFFF"
                                : isCurrent
                                  ? "#FFFFFF"
                                  : "#64748B",
                              border: isCurrent
                                ? "2px solid #262B75"
                                : isDone
                                  ? `2px solid ${COLOR.success}`
                                  : "1.5px solid #E2E8F0",
                              boxShadow: isCurrent ? "0 0 0 3px rgba(38, 43, 117, 0.2)" : "none",
                            }}
                          >
                            {isDone ? <Check size={11} strokeWidth={3} /> : step.num}
                          </div>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: isCurrent ? 800 : 600,
                              color: isCurrent ? "#0F172A" : isDone ? COLOR.success : "#94A3B8",
                              textAlign: "center",
                            }}
                          >
                            {step.label}
                          </span>
                        </div>

                        {idx < arr.length - 1 && (
                          <div
                            style={{
                              flex: 1,
                              height: 2,
                              background: currentStep > idx + 1 ? COLOR.success : "#E2E8F0",
                              marginTop: -14,
                              zIndex: 1,
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Double Buttons & Actions */}
                <div style={{ zIndex: 2, display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Step 1: Double Buttons (Confirm & Decline side-by-side) */}
                  {isPendingConfirm && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStage2Confirm(heroSession.id);
                        }}
                        style={{
                          flex: 1,
                          padding: "12px 18px",
                          borderRadius: RADIUS.pill,
                          background: COLOR.primary,
                          color: COLOR.white,
                          border: 0,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <Check size={16} strokeWidth={2.5} />
                        <span>Confirm</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSession(heroSession);
                        }}
                        style={{
                          flex: 1,
                          padding: "12px 18px",
                          borderRadius: RADIUS.pill,
                          background: COLOR.white,
                          color: COLOR.textSecondary,
                          border: `1px solid ${COLOR.border}`,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <X size={15} />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}

                  {/* Step 2: Punch In Now */}
                  {isReadyPunchIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPunchIn(heroSession.id);
                      }}
                      style={{
                        width: "100%",
                        padding: "13px",
                        borderRadius: RADIUS.pill,
                        background: COLOR.primary,
                        color: COLOR.white,
                        border: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <LogIn size={17} />
                      <span>Punch In</span>
                    </button>
                  )}

                  {/* Step 3: Punch Out Now */}
                  {isPunchedIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPunchOut(heroSession.id);
                      }}
                      style={{
                        width: "100%",
                        padding: "13px",
                        borderRadius: RADIUS.pill,
                        background: COLOR.danger,
                        color: COLOR.white,
                        border: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <LogOut size={17} />
                      <span>Punch Out</span>
                    </button>
                  )}

                  {/* Step 4: Attendance Completed */}
                  {isCompleted && (
                    <div
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: RADIUS.pill,
                        background: COLOR.successLight,
                        color: COLOR.success,
                        fontSize: 13,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        boxSizing: "border-box",
                      }}
                    >
                      <Check size={15} strokeWidth={2.5} />
                      <span>Attendance Recorded</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })() : (
        <div
          style={{
            background: COLOR.white, borderRadius: 24, padding: "24px 20px", textAlign: "center",
            border: `1px solid ${COLOR.ink200}`, boxShadow: SHADOW.card,
          }}
        >
          <div style={{ fontSize: 14.5, fontWeight: 700, color: COLOR.ink800 }}>No sessions scheduled right now</div>
          <div style={{ fontSize: 12.5, color: COLOR.ink500, marginTop: 4 }}>You're all caught up.</div>
        </div>
      )}

      {/* --- Today's Shift Metrics --- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          background: COLOR.white,
          borderRadius: RADIUS.card,
          border: `1px solid ${COLOR.border}`,
          boxShadow: SHADOW.card,
          padding: "14px 4px",
        }}
      >
        {[
          { label: "Today", value: `${todayCompletedCount}/${todayTotalCount}`, icon: CheckCircle2, color: COLOR.success, bg: COLOR.successLight },
          { label: "Load", value: loadLabel, icon: Clock, color: COLOR.info, bg: COLOR.infoLight },
          { label: "This Month", value: String(monthCount), icon: CalendarDays, color: COLOR.brandCrimson, bg: COLOR.brandCrimsonLight },
        ].map((m, i) => (
          <div key={m.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", borderLeft: i === 0 ? "none" : `1px solid ${COLOR.border}` }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
              <m.icon size={15} color={m.color} />
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: COLOR.textPrimary }}>{m.value}</div>
            <div style={{ fontSize: 11.5, color: COLOR.textSecondary, fontWeight: 500, marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* --- Quick Actions Row --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "Schedule", icon: CalendarDays, onClick: onOpenSchedule, color: COLOR.primary, bg: COLOR.primarySoft },
          { label: "Auction", icon: Gavel, onClick: onOpenAuction, color: COLOR.brandCrimson, bg: COLOR.brandCrimsonLight },
          { label: "Leave", icon: ClipboardList, onClick: onOpenLeave, color: COLOR.success, bg: COLOR.successLight },
        ].map(({ label, icon: Icon, onClick, color, bg }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              background: COLOR.white,
              borderRadius: RADIUS.card,
              padding: "14px 10px",
              border: `1px solid ${COLOR.border}`,
              boxShadow: SHADOW.card,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={19} color={color} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: COLOR.textPrimary }}>{label}</span>
          </button>
        ))}
      </div>

      {/* --- Session List --- */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: COLOR.textPrimary }}>
            {listMode === "none" ? "No Sessions" : "Today's Sessions"}
          </span>
          {listSessions.length > 0 && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: COLOR.white, background: COLOR.primary, borderRadius: RADIUS.pill, padding: "2px 8px" }}>
              {listSessions.length}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {listSessions.map((lec) => {
            const st = sessionState[lec.id];
            const displayStatus =
              st.stage1 === "declined" || st.stage2 === "declined"
                ? "declined"
                : st.punch.status === "completed"
                  ? "completed"
                  : st.stage2 === "pending"
                    ? "pending_confirmation"
                    : lec.status;
            const strip =
              displayStatus === "declined"
                ? COLOR.danger
                : displayStatus === "completed"
                  ? COLOR.successBorder
                  : displayStatus === "pending_confirmation" || displayStatus === "pending"
                    ? COLOR.warningBorder
                    : COLOR.primary;
            return (
              <div
                key={lec.id}
                onClick={() => onOpenSession(lec)}
                style={{
                  background: COLOR.white,
                  borderRadius: RADIUS.card,
                  padding: "16px 18px",
                  border: `1px solid ${COLOR.ink200}`,
                  borderLeft: `4px solid ${strip}`,
                  boxShadow: SHADOW.card,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      color: COLOR.ink950,
                    }}
                  >
                    <Clock size={14} color={COLOR.primary700} />
                    <span>{lec.time}</span>
                    <span style={{ fontSize: 11, color: COLOR.ink500, fontWeight: 500 }}>({lec.dur}m)</span>
                  </div>
                  <StatusPill status={displayStatus} />
                </div>

                <div style={{ fontSize: 15.5, fontWeight: 800, color: COLOR.ink950, lineHeight: 1.35 }}>
                  {lec.label}
                </div>

                <div
                  style={{
                    background: COLOR.primary050,
                    borderRadius: RADIUS.sm,
                    padding: "9px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    color: COLOR.ink700,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} color={COLOR.brandCrimson} />
                    <span>{lec.room} · {lec.site}</span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Users size={13} color={COLOR.info} />
                    <span>{lec.learners} / {lec.capacity}</span>
                  </span>
                </div>
              </div>
            );
          })}
          {listSessions.length === 0 && (
            <div style={{ padding: "18px 12px", textAlign: "center", fontSize: 12.5, color: COLOR.ink500 }}>
              Nothing scheduled — check back soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   SCREEN 2: SCHEDULE SCREEN (Day | Month Strictly)
   - Notifications banner contextual to Schedule: "Today you have 2 sessions"
   - Complete 30-day month calendar & day drill-down
   ====================================================================== */
function ScheduleScreen({
  selectedDate,
  setSelectedDate,
  scheduleMode,
  setScheduleMode,
  onOpenSession,
}) {
  const allLectures = FULL_MONTH_LECTURES;

  // Filter sessions for selected date
  const dayLectures = useMemo(() => {
    return allLectures.filter((l) => l.date === selectedDate);
  }, [allLectures, selectedDate]);

  const selectedDayNum = parseInt((selectedDate || "2026-09-17").split("-")[2], 10);
  const selectedDateObj = new Date(2026, 8, selectedDayNum);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const formattedDateTitle = `${dayNames[selectedDateObj.getDay()]}, ${String(selectedDayNum).padStart(2, "0")} Sep 2026`;

  const handlePrevDay = () => {
    const prevDay = Math.max(1, selectedDayNum - 1);
    setSelectedDate(`2026-09-${String(prevDay).padStart(2, "0")}`);
  };

  const handleNextDay = () => {
    const nextDay = Math.min(30, selectedDayNum + 1);
    setSelectedDate(`2026-09-${String(nextDay).padStart(2, "0")}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Schedule Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLOR.ink950, letterSpacing: "-0.01em" }}>
            Schedule
          </div>
          <div style={{ fontSize: 12.5, color: COLOR.ink500, marginTop: 2 }}>
            September 2026 · {allLectures.length} Total Sessions
          </div>
        </div>

        {selectedDate !== "2026-09-17" && (
          <button
            onClick={() => setSelectedDate("2026-09-17")}
            style={{
              border: `1px solid ${COLOR.primary300}`,
              background: COLOR.primary100,
              color: COLOR.primary800,
              padding: "5px 12px",
              borderRadius: RADIUS.pill,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Jump to Today
          </button>
        )}
      </div>

      {/* --- Contextual Notification Strip for Schedule Screen --- */}
      <div
        style={{
          background: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: RADIUS.card,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Sparkles size={16} color="#2563EB" />
        <div style={{ flex: 1, fontSize: 12.5, color: "#1E40AF" }}>
          <strong>Schedule Updated:</strong> Today you have 2 sessions rostered at Kochi site.
        </div>
      </div>

      {/* Segmented Switcher: Day | Month */}
      <div
        style={{
          background: COLOR.ink100,
          borderRadius: RADIUS.comp,
          padding: 3,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
        }}
      >
        <button
          onClick={() => setScheduleMode("day")}
          style={{
            border: 0,
            padding: "9px 0",
            borderRadius: RADIUS.sm,
            background: scheduleMode === "day" ? COLOR.white : "transparent",
            color: scheduleMode === "day" ? COLOR.primary900 : COLOR.ink600,
            fontWeight: scheduleMode === "day" ? 800 : 500,
            fontSize: 13.5,
            cursor: "pointer",
            boxShadow: scheduleMode === "day" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <CalendarDays size={15} />
          <span>Day</span>
        </button>

        <button
          onClick={() => setScheduleMode("month")}
          style={{
            border: 0,
            padding: "9px 0",
            borderRadius: RADIUS.sm,
            background: scheduleMode === "month" ? COLOR.white : "transparent",
            color: scheduleMode === "month" ? COLOR.primary900 : COLOR.ink600,
            fontWeight: scheduleMode === "month" ? 800 : 500,
            fontSize: 13.5,
            cursor: "pointer",
            boxShadow: scheduleMode === "month" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Calendar size={15} />
          <span>Month</span>
        </button>
      </div>

      {/* --- DAY VIEW --- */}
      {scheduleMode === "day" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Day Navigator */}
          <div
            style={{
              background: COLOR.white,
              borderRadius: RADIUS.card,
              padding: "13px 16px",
              border: `1px solid ${COLOR.ink200}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: SHADOW.card,
            }}
          >
            <button
              onClick={handlePrevDay}
              disabled={selectedDayNum === 1}
              style={{
                border: `1px solid ${COLOR.ink200}`,
                background: selectedDayNum === 1 ? COLOR.ink100 : COLOR.white,
                color: selectedDayNum === 1 ? COLOR.ink300 : COLOR.ink800,
                width: 34,
                height: 34,
                borderRadius: RADIUS.sm,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: selectedDayNum === 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: COLOR.ink950 }}>
                {formattedDateTitle}
              </div>
              <div style={{ fontSize: 11.5, color: COLOR.ink500, marginTop: 1 }}>
                {selectedDate === "2026-09-17" ? (
                  <span style={{ color: COLOR.success, fontWeight: 700 }}>• TODAY'S AGENDA</span>
                ) : (
                  `${dayLectures.length} ${dayLectures.length === 1 ? "Session Scheduled" : "Sessions Scheduled"}`
                )}
              </div>
            </div>

            <button
              onClick={handleNextDay}
              disabled={selectedDayNum === 30}
              style={{
                border: `1px solid ${COLOR.ink200}`,
                background: selectedDayNum === 30 ? COLOR.ink100 : COLOR.white,
                color: selectedDayNum === 30 ? COLOR.ink300 : COLOR.ink800,
                width: 34,
                height: 34,
                borderRadius: RADIUS.sm,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: selectedDayNum === 30 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Session Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dayLectures.length === 0 ? (
              <div
                style={{
                  background: COLOR.white,
                  borderRadius: RADIUS.card,
                  padding: "40px 24px",
                  textAlign: "center",
                  border: `1px solid ${COLOR.ink200}`,
                }}
              >
                <Sun size={40} color={COLOR.warning} style={{ margin: "0 auto 12px", display: "block" }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: COLOR.ink950 }}>
                  No Sessions Scheduled
                </div>
                <div style={{ fontSize: 13, color: COLOR.ink500, marginTop: 6, lineHeight: 1.5 }}>
                  You have no training sessions scheduled for {formattedDateTitle}.
                </div>
                <button
                  onClick={() => setSelectedDate("2026-09-17")}
                  style={{
                    marginTop: 16,
                    padding: "9px 18px",
                    borderRadius: RADIUS.pill,
                    background: COLOR.primary800,
                    color: COLOR.white,
                    border: 0,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Return to Today (17 Sep)
                </button>
              </div>
            ) : (
              dayLectures.map((lec) => (
                <div
                  key={lec.id}
                  onClick={() => onOpenSession(lec)}
                  style={{
                    background: COLOR.white,
                    borderRadius: RADIUS.card,
                    padding: "16px 18px",
                    border: `1px solid ${COLOR.ink200}`,
                    boxShadow: SHADOW.card,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        color: COLOR.ink950,
                      }}
                    >
                      <Clock size={14} color={COLOR.primary700} />
                      <span>{lec.time}</span>
                      <span style={{ fontSize: 11, color: COLOR.ink500, fontWeight: 500 }}>
                        ({lec.dur}m)
                      </span>
                    </div>
                    <StatusPill status={lec.status} />
                  </div>

                  <div style={{ fontSize: 15.5, fontWeight: 800, color: COLOR.ink950, lineHeight: 1.35 }}>
                    {lec.label}
                  </div>

                  <div
                    style={{
                      background: COLOR.surface,
                      borderRadius: RADIUS.sm,
                      padding: "9px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: COLOR.ink700,
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={13} color={COLOR.ink500} />
                      <span>{lec.room} · {lec.site}</span>
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Users size={13} color={COLOR.ink500} />
                      <span>{lec.learners} / {lec.capacity}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- MONTH VIEW --- */}
      {scheduleMode === "month" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: COLOR.white,
              borderRadius: RADIUS.card,
              padding: "18px 16px",
              border: `1px solid ${COLOR.ink200}`,
              boxShadow: SHADOW.card,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: COLOR.ink950 }}>
                September 2026
              </span>
              <span style={{ fontSize: 11.5, color: COLOR.ink500, fontWeight: 600 }}>
                Tap date to inspect sessions
              </span>
            </div>

            {/* 7-Column Headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 4,
                textAlign: "center",
                borderBottom: `1px solid ${COLOR.ink100}`,
                paddingBottom: 8,
              }}
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} style={{ fontSize: 11.5, fontWeight: 700, color: COLOR.ink400 }}>
                  {d}
                </span>
              ))}
            </div>

            {/* 7-Column Aligned Dates Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {/* September 2026 starts on a Tuesday, so 1 blank cell on Monday */}
              <div style={{ height: 48, background: "transparent" }} />

              {Array.from({ length: 30 }, (_, i) => i + 1).map((dayNum) => {
                const dateIso = `2026-09-${String(dayNum).padStart(2, "0")}`;
                const lecs = allLectures.filter((l) => l.dayNum === dayNum);
                const isToday = dayNum === 17;
                const isSelected = selectedDate === dateIso;

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDate(dateIso)}
                    style={{
                      height: 48,
                      borderRadius: RADIUS.sm,
                      border: isSelected
                        ? `2px solid ${COLOR.primary800}`
                        : isToday
                          ? `1.5px solid ${COLOR.success}`
                          : `1px solid ${COLOR.ink200}`,
                      background: isSelected
                        ? COLOR.primary100
                        : isToday
                          ? "#ECFDF5"
                          : COLOR.surface,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected || isToday ? 800 : 500,
                        color: isSelected
                          ? COLOR.primary900
                          : isToday
                            ? "#065F46"
                            : COLOR.ink900,
                      }}
                    >
                      {dayNum}
                    </span>

                    {lecs.length > 0 && (
                      <div style={{ display: "flex", gap: 2 }}>
                        {lecs.slice(0, 3).map((_, idx) => (
                          <span
                            key={idx}
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: isSelected ? COLOR.primary800 : COLOR.primary600,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 8,
                borderTop: `1px solid ${COLOR.ink100}`,
                fontSize: 11.5,
                color: COLOR.ink500,
              }}
            >
              <span>• Blue dots: Scheduled sessions</span>
              <span style={{ color: COLOR.success, fontWeight: 700 }}>Green: Today (17 Sep)</span>
            </div>
          </div>

          {/* Selected Date Inspector Card */}
          <div
            style={{
              background: COLOR.white,
              borderRadius: RADIUS.card,
              padding: "16px",
              border: `1px solid ${COLOR.ink200}`,
              boxShadow: SHADOW.card,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 800, color: COLOR.ink950 }}>
                  {formattedDateTitle}
                </span>
                <span style={{ fontSize: 12, color: COLOR.ink500, display: "block" }}>
                  {dayLectures.length} {dayLectures.length === 1 ? "session rostered" : "sessions rostered"}
                </span>
              </div>

              <button
                onClick={() => setScheduleMode("day")}
                style={{
                  padding: "7px 14px",
                  borderRadius: RADIUS.pill,
                  background: COLOR.primary800,
                  color: COLOR.white,
                  border: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Open Day View →
              </button>
            </div>

            {dayLectures.map((lec) => (
              <div
                key={lec.id}
                onClick={() => onOpenSession(lec)}
                style={{
                  background: COLOR.surface,
                  borderRadius: RADIUS.sm,
                  padding: "11px 12px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: COLOR.ink950 }}>
                    {lec.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: COLOR.ink500, marginTop: 2 }}>
                    {lec.time} · {lec.room}
                  </div>
                </div>
                <StatusPill status={lec.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   SCREEN 3: LEAVE SCREEN (Enhanced — 4 tabs + balance summary)
   ====================================================================== */
function LeaveScreen({ leaveRequests, onSubmitLeave, leaveBalance, onOpenNotifications, onOpenProfile, unreadCount = 0 }) {
  const [leaveTab, setLeaveTab] = useState("apply");
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [startDate, setStartDate] = useState("2026-11-02");
  const [endDate, setEndDate] = useState("2026-11-02");
  const [reason, setReason] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [calMonth, setCalMonth] = useState(TODAY_DATE.slice(0, 7)); // "YYYY-MM", opens on the current month

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmitLeave({ type: leaveType, startDate, endDate, reason });
    setSubmitSuccess(true);
    setReason("");
    setTimeout(() => { setSubmitSuccess(false); setLeaveTab("requests"); }, 1200);
  };

  // Leave Calendar — every day of each request, keyed by ISO date
  const leaveCalDates = leaveRequests.reduce((acc, req) => {
    if (!req.startDate) return acc;
    for (let d = new Date(`${req.startDate}T00:00:00`), end = new Date(`${req.endDate || req.startDate}T00:00:00`); d <= end; d.setDate(d.getDate() + 1)) {
      acc[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`] = req.status;
    }
    return acc;
  }, {});
  const [calY, calM] = calMonth.split("-").map(Number);
  const calDays = new Date(calY, calM, 0).getDate();
  const calLead = (new Date(calY, calM - 1, 1).getDay() + 6) % 7; // Monday-first blanks
  const shiftCalMonth = (n) => { const d = new Date(calY, calM - 1 + n, 1); setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };

  // Holiday Calendar — group by upcoming
  const upcomingHolidays = COMPANY_HOLIDAYS_2026.filter(h => h.date >= TODAY_DATE);

  const tabStyle = (id) => ({
    flex: 1, padding: "8px 0", border: 0, borderRadius: RADIUS.pill,
    background: leaveTab === id ? COLOR.primary : "transparent",
    fontSize: 12, fontWeight: leaveTab === id ? 700 : 500,
    color: leaveTab === id ? COLOR.white : COLOR.ink600,
    cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s ease",
  });

  // One hue per leave type so the balance cards read at a glance
  const leaveTypeTheme = {
    casual: { color: COLOR.info, bg: COLOR.infoLight },
    sick: { color: COLOR.brandCrimson, bg: COLOR.brandCrimsonLight },
    earned: { color: COLOR.success, bg: COLOR.successLight },
    emergency: { color: COLOR.warning, bg: COLOR.warningLight },
  };
  const statusStrip = (status) =>
    status === "Approved" ? COLOR.successBorder : status === "Pending" ? COLOR.warningBorder : COLOR.danger;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header with Notification & Profile Avatar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: COLOR.ink950 }}>Leave</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label="Notifications"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: COLOR.primarySoft,
                border: `1px solid ${COLOR.primary200}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.15s ease",
              }}
            >
              <Bell size={20} color={COLOR.primary} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 7,
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: COLOR.danger,
                    border: "2px solid #FFFFFF",
                  }}
                />
              )}
            </button>
          )}

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              aria-label="Profile"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: COLOR.primary,
                color: "#FFFFFF",
                border: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              <TrainerInitials />
            </button>
          )}
        </div>
      </div>

      {/* Leave Balance Summary (solid ShiftEaze navy) */}
      <div
        style={{
          background: COLOR.primary,
          borderRadius: RADIUS.card,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          padding: "15px 4px",
        }}
      >
        {[
          { label: "Available", value: leaveBalance.available },
          { label: "Used", value: leaveBalance.used },
          { label: "Pending", value: leaveBalance.pending, highlight: leaveBalance.pending > 0 },
          { label: "Remaining", value: leaveBalance.remaining },
        ].map((s, i) => (
          <div key={s.label} style={{ textAlign: "center", borderLeft: i === 0 ? "none" : "1px solid rgba(255, 255, 255, 0.16)" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: s.highlight ? COLOR.warningBorder : COLOR.white }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: COLOR.primary200, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leave Type Balance - one hue per type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {leaveBalance.types.map(lt => {
          const t = leaveTypeTheme[lt.id] || { color: COLOR.primary, bg: COLOR.primarySoft };
          return (
            <div
              key={lt.id}
              style={{
                background: COLOR.white,
                borderRadius: RADIUS.card,
                padding: "14px 14px",
                border: `1px solid ${COLOR.border}`,
                borderLeft: `4px solid ${t.color}`,
                boxShadow: SHADOW.card,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, color: COLOR.textSecondary, marginBottom: 4 }}>{lt.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: t.color }}>{lt.remaining}</span>
                <span style={{ fontSize: 11, color: COLOR.textMuted }}>of {lt.available}</span>
              </div>
              <div style={{ height: 5, borderRadius: RADIUS.pill, background: t.bg, marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: `${(lt.remaining / lt.available) * 100}%`, height: "100%", background: t.color, borderRadius: RADIUS.pill }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs (4 tabs) — segmented, navy selected */}
      <div style={{ display: "flex", background: COLOR.surfaceMuted, borderRadius: RADIUS.pill, padding: 4, gap: 2 }}>
        <button onClick={() => setLeaveTab("apply")} style={tabStyle("apply")}>Apply</button>
        <button onClick={() => setLeaveTab("requests")} style={tabStyle("requests")}>Requests ({leaveRequests.length})</button>
        <button onClick={() => setLeaveTab("calendar")} style={tabStyle("calendar")}>Calendar</button>
        <button onClick={() => setLeaveTab("holidays")} style={tabStyle("holidays")}>Holidays</button>
      </div>

      {/* -- Apply Leave Tab --------------------------------------- */}
      {leaveTab === "apply" && (
        <form onSubmit={handleSubmit} style={{ background: COLOR.white, borderRadius: RADIUS.card, padding: "18px 16px", border: `1px solid ${COLOR.ink200}`, boxShadow: SHADOW.card, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.ink900, display: "block", marginBottom: 5 }}>Leave Type</label>
            <select value={leaveType} onChange={e => setLeaveType(e.target.value)} style={{ width: "100%", padding: "11px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.ink300}`, fontSize: 14, color: COLOR.ink900, background: COLOR.white }}>
              <option value="Casual Leave">Casual Leave (CL)</option>
              <option value="Sick / Medical Leave">Sick / Medical Leave (ML)</option>
              <option value="Earned / Annual Leave">Earned / Annual Leave (EL)</option>
              <option value="Emergency Leave">Emergency Leave</option>
              <option value="Emergency Duty Off">Emergency Duty Off</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.ink900, display: "block", marginBottom: 5 }}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.ink300}`, fontSize: 13.5, color: COLOR.ink900 }} />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.ink900, display: "block", marginBottom: 5 }}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.ink300}`, fontSize: 13.5, color: COLOR.ink900 }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.ink900, display: "block", marginBottom: 5 }}>Reason <span style={{ color: COLOR.danger }}>*</span></label>
            <textarea required rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason" style={{ width: "100%", padding: "11px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.ink300}`, fontSize: 14, color: COLOR.ink900, resize: "none", fontFamily: "inherit" }} />
          </div>

          <button type="submit" style={{ padding: "13px 20px", borderRadius: RADIUS.pill, background: COLOR.primary, color: "#FFFFFF", border: 0, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Send size={15} /><span>Submit</span>
          </button>

          {submitSuccess && (
            <div style={{ background: COLOR.successLight, color: COLOR.success, padding: "11px", borderRadius: RADIUS.sm, textAlign: "center", fontSize: 13, fontWeight: 600 }}>
              Request submitted
            </div>
          )}
        </form>
      )}

      {/* -- My Requests Tab --------------------------------------- */}
      {leaveTab === "requests" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {leaveRequests.length === 0 ? (
            <div style={{ background: COLOR.white, borderRadius: RADIUS.card, padding: "32px 24px", textAlign: "center", border: `1px solid ${COLOR.ink200}`, boxShadow: SHADOW.card }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink800 }}>No leave requests yet</div>
            </div>
          ) : (
            leaveRequests.map(req => (
              <div key={req.id} style={{ background: COLOR.white, borderRadius: RADIUS.card, padding: "16px", border: `1px solid ${COLOR.ink200}`, borderLeft: `4px solid ${statusStrip(req.status)}`, boxShadow: SHADOW.card, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: COLOR.ink950 }}>{req.type}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: RADIUS.pill, background: req.status === "Approved" ? COLOR.successLight : req.status === "Pending" ? COLOR.warningLight : COLOR.dangerLight, color: req.status === "Approved" ? COLOR.success : req.status === "Pending" ? COLOR.warning : COLOR.danger }}>
                    {req.status}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: COLOR.ink600 }}>{req.startDate} {req.startDate !== req.endDate ? `to ${req.endDate}` : ""} · {req.days} {req.days === 1 ? "day" : "days"}</div>
                <div style={{ fontSize: 13, color: COLOR.ink700 }}>{req.reason}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* -- Leave Calendar Tab ------------------------------------- */}
      {leaveTab === "calendar" && (
        <div style={{ background: COLOR.white, borderRadius: RADIUS.card, padding: "16px", border: `1px solid ${COLOR.ink200}`, boxShadow: SHADOW.card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <button type="button" onClick={() => shiftCalMonth(-1)} style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 18, color: COLOR.primary, padding: "0 6px" }}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLOR.ink950 }}>{MONTH_NAMES[calM - 1]} {calY}</span>
            <button type="button" onClick={() => shiftCalMonth(1)} style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 18, color: COLOR.primary, padding: "0 6px" }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center", paddingBottom: 6, borderBottom: `1px solid ${COLOR.ink100}`, marginBottom: 6 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <span key={d} style={{ fontSize: 10.5, fontWeight: 700, color: COLOR.ink400 }}>{d}</span>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {Array.from({ length: calLead }, (_, i) => <div key={`b${i}`} style={{ height: 42 }} />)}
            {Array.from({ length: calDays }, (_, i) => i + 1).map(day => {
              const dateIso = `${calMonth}-${String(day).padStart(2, "0")}`;
              const leaveStatus = leaveCalDates[dateIso];
              const isHoliday = COMPANY_HOLIDAYS_2026.some(h => h.date === dateIso);
              const isToday = dateIso === TODAY_DATE;
              return (
                <div key={day} style={{
                  height: 42, borderRadius: RADIUS.sm,
                  background: leaveStatus ? (leaveStatus === "Approved" ? COLOR.successLight : leaveStatus === "Pending" ? COLOR.warningLight : COLOR.dangerLight) : isHoliday ? COLOR.primarySoft : COLOR.white,
                  border: `1px solid ${isToday ? COLOR.primary : COLOR.border}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                }}>
                  <span style={{ fontSize: 12.5, fontWeight: isToday ? 700 : 500, color: leaveStatus === "Approved" ? COLOR.success : leaveStatus ? COLOR.warning : isHoliday ? COLOR.primary : COLOR.ink800 }}>{day}</span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${COLOR.ink200}`, flexWrap: "wrap" }}>
            {[
              { color: COLOR.successLight, label: "Approved" },
              { color: COLOR.warningLight, label: "Pending" },
              { color: COLOR.primarySoft, label: "Holiday" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: COLOR.textSecondary }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -- Holiday Calendar Tab ----------------------------------- */}
      {leaveTab === "holidays" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {COMPANY_HOLIDAYS_2026.map(holiday => {
            const isPast = holiday.date < TODAY_DATE;
            const isNext = upcomingHolidays[0]?.id === holiday.id;
            // National = navy, festival = red, everything else = blue; next holiday filled solid
            const hue = holiday.type.startsWith("National")
              ? { color: COLOR.primary, bg: COLOR.primarySoft }
              : holiday.type.includes("Festival")
                ? { color: COLOR.brandCrimson, bg: COLOR.brandCrimsonLight }
                : { color: COLOR.info, bg: COLOR.infoLight };
            return (
              <div key={holiday.id} style={{ background: COLOR.white, borderRadius: RADIUS.card, padding: "12px 14px", border: `1px solid ${isNext ? hue.color : COLOR.border}`, boxShadow: SHADOW.card, display: "flex", gap: 14, alignItems: "center", opacity: isPast ? 0.55 : 1 }}>
                <div style={{ background: isNext ? hue.color : hue.bg, borderRadius: RADIUS.sm, padding: "6px 8px", textAlign: "center", minWidth: 44, flexShrink: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: isNext ? COLOR.white : hue.color }}>{holiday.date.split("-")[2]}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: isNext ? COLOR.white : hue.color }}>{holiday.month}</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink950 }}>{holiday.name}</div>
                  <div style={{ fontSize: 12, color: COLOR.textSecondary, marginTop: 2 }}>{holiday.dayName} · {holiday.type}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function ProfileScreen({ trainer, attendance, onSaveProfile, onBack, onSignOut }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable form state — pre-filled from trainer data
  const [form, setForm] = useState({
    name: trainer.name,
    phone: trainer.phone,
    email: trainer.email,
    title: trainer.title,
    preferredShift: trainer.availability?.preferredShift || "Morning (08:00 - 16:30)",
    bio: "Experienced crane operations trainer with 10+ years across major Indian port terminals. Specialises in RTG, STS, and heavy machinery simulation training.",
    emergencyContact: trainer.emergencyContact || "",
    certifications: trainer.certifications.map((c) => ({ ...c })),
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCertChange = (certId, field, value) => {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.map((c) =>
        c.id === certId ? { ...c, [field]: value } : c
      ),
    }));
  };

  const handleSave = () => {
    onSaveProfile({
      name: form.name,
      phone: form.phone,
      email: form.email,
      title: form.title,
      emergencyContact: form.emergencyContact,
      certifications: form.certifications,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 1600);
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 13px",
    borderRadius: RADIUS.sm,
    border: `1.5px solid ${COLOR.ink300}`,
    fontSize: 14,
    color: COLOR.ink900,
    background: COLOR.white,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease",
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: COLOR.ink700,
    display: "block",
    marginBottom: 5,
  };

  // ---- EDIT PROFILE VIEW ----
  if (isEditing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Edit Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                border: 0,
                background: COLOR.ink100,
                width: 34,
                height: 34,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLOR.ink950 }}>
                Edit Profile
              </div>
            </div>
          </div>
        </div>

        {/* Avatar Edit Banner */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 20,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            border: "1px solid #E2E8F0",
            boxShadow: SHADOW.card,
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: "50%",
              background: COLOR.primary,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              position: "relative",
              cursor: "pointer",
            }}
          >
            {form.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            <div
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: COLOR.primary,
                border: "2px solid #FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={11} color="#FFFFFF" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>
              {form.name}
            </div>
            <div style={{ fontSize: 12.5, color: "#475569", marginTop: 2 }}>
              {trainer.empId} · {trainer.siteCode}
            </div>
          </div>
        </div>

        {/* Edit Form Fields */}
        <div
          style={{
            background: COLOR.white,
            borderRadius: RADIUS.card,
            padding: "18px 16px",
            border: `1px solid ${COLOR.ink200}`,
            boxShadow: SHADOW.card,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.ink900 }}>
            Personal Information
          </div>

          {/* Full Name */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              style={inputStyle}
              placeholder="Enter your full name"
            />
          </div>

          {/* Title / Role */}
          <div>
            <label style={labelStyle}>Job Title / Role</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              style={inputStyle}
              placeholder="e.g. Senior Technical Trainer"
            />
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>Professional Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              style={{ ...inputStyle, resize: "none" }}
              placeholder="Brief professional summary..."
            />
          </div>
        </div>

        {/* Contact Details */}
        <div
          style={{
            background: COLOR.white,
            borderRadius: RADIUS.card,
            padding: "18px 16px",
            border: `1px solid ${COLOR.ink200}`,
            boxShadow: SHADOW.card,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.ink900 }}>
            Contact Details
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>Mobile Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              style={inputStyle}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Official Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              style={inputStyle}
              placeholder="email@domain.com"
            />
          </div>
        </div>

        {/* Work Preferences */}
        <div
          style={{
            background: COLOR.white,
            borderRadius: RADIUS.card,
            padding: "18px 16px",
            border: `1px solid ${COLOR.ink200}`,
            boxShadow: SHADOW.card,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.ink900 }}>
            Work Preferences
          </div>

          {/* Preferred Shift */}
          <div>
            <label style={labelStyle}>Preferred Shift</label>
            <select
              value={form.preferredShift}
              onChange={(e) => handleChange("preferredShift", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="Morning (08:00 - 16:30)">Morning (08:00 - 16:30)</option>
              <option value="Afternoon (12:00 - 20:30)">Afternoon (12:00 - 20:30)</option>
              <option value="Night (20:00 - 04:30)">Night (20:00 - 04:30)</option>
              <option value="Flexible / Rotating">Flexible / Rotating</option>
            </select>
          </div>

          {/* Read-only Site — cannot be changed by trainer */}
          <div>
            <label style={labelStyle}>
              Home Site <span style={{ fontWeight: 500, color: COLOR.ink400 }}>(managed by HR)</span>
            </label>
            <div
              style={{
                padding: "11px 13px",
                borderRadius: RADIUS.sm,
                border: `1.5px solid ${COLOR.ink200}`,
                fontSize: 14,
                color: COLOR.ink500,
                background: COLOR.surface,
              }}
            >
              {trainer.site}
            </div>
          </div>
        </div>

        {/* Certifications Editing */}
        <div
          style={{
            background: COLOR.white,
            borderRadius: RADIUS.card,
            padding: "18px 16px",
            border: `1px solid ${COLOR.ink200}`,
            boxShadow: SHADOW.card,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.ink900 }}>
            Certifications & Licenses
          </div>

          {form.certifications.map((cert) => (
            <div
              key={cert.id}
              style={{
                padding: "12px 13px",
                borderRadius: RADIUS.sm,
                border: `1.5px solid ${cert.color}50`,
                background: cert.bg,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Badge row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: cert.color,
                    padding: "2px 8px",
                    borderRadius: RADIUS.pill,
                    background: COLOR.white,
                    border: `1px solid ${cert.color}40`,
                  }}
                >
                  {cert.badge}
                </span>
                <span style={{ fontSize: 10.5, color: COLOR.ink400 }}>{cert.id}</span>
              </div>

              {/* Cert Name */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.ink600, display: "block", marginBottom: 4 }}>Certificate Name</label>
                <input
                  type="text"
                  value={cert.name}
                  onChange={(e) => handleCertChange(cert.id, "name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 11px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLOR.ink300}`,
                    fontSize: 13,
                    color: COLOR.ink900,
                    background: COLOR.white,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Expiry & Cert No — side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.ink600, display: "block", marginBottom: 4 }}>Expiry</label>
                  <input
                    type="text"
                    value={cert.expiry}
                    onChange={(e) => handleCertChange(cert.id, "expiry", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 9px",
                      borderRadius: RADIUS.sm,
                      border: `1.5px solid ${COLOR.ink300}`,
                      fontSize: 12,
                      color: COLOR.ink900,
                      background: COLOR.white,
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    placeholder="Expires DD MMM YYYY"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.ink600, display: "block", marginBottom: 4 }}>Cert No.</label>
                  <input
                    type="text"
                    value={cert.no}
                    onChange={(e) => handleCertChange(cert.id, "no", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 9px",
                      borderRadius: RADIUS.sm,
                      border: `1.5px solid ${COLOR.ink300}`,
                      fontSize: 12,
                      color: COLOR.ink900,
                      background: COLOR.white,
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    placeholder="e.g. TCI-2024-8841"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Contact */}
        <div
          style={{
            background: COLOR.white,
            borderRadius: RADIUS.card,
            padding: "18px 16px",
            border: `1px solid ${COLOR.ink200}`,
            boxShadow: SHADOW.card,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.ink900 }}>
            Emergency Contact
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLOR.ink700, display: "block", marginBottom: 5 }}>Name & Phone</label>
            <input
              type="text"
              value={form.emergencyContact}
              onChange={(e) => handleChange("emergencyContact", e.target.value)}
              style={{
                width: "100%",
                padding: "11px 13px",
                borderRadius: RADIUS.sm,
                border: `1.5px solid ${COLOR.ink300}`,
                fontSize: 14,
                color: COLOR.ink900,
                background: COLOR.white,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="e.g. Sunita Patel · +91 98765 43210"
            />
          </div>
        </div>

        {/* Save & Cancel Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleSave}
            style={{
              padding: "15px",
              borderRadius: RADIUS.pill,
              background: COLOR.primary,
              color: "#FFFFFF",
              border: 0,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Check size={17} />
            <span>Save</span>
          </button>

          {saveSuccess && (
            <div
              style={{
                background: COLOR.successLight,
                color: COLOR.success,
                padding: "11px",
                borderRadius: RADIUS.sm,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Profile updated
            </div>
          )}

          <button
            onClick={() => setIsEditing(false)}
            style={{
              padding: "13px",
              borderRadius: RADIUS.pill,
              background: COLOR.ink100,
              color: COLOR.ink700,
              border: 0,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---- VIEW PROFILE MODE ----
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                border: 0,
                background: COLOR.ink100,
                width: 34,
                height: 34,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Back to Home"
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLOR.ink950 }}>
              Profile
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            border: `1px solid ${COLOR.border}`,
            background: COLOR.white,
            color: COLOR.primary,
            padding: "7px 14px",
            borderRadius: RADIUS.pill,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <SlidersHorizontal size={13} />
          Edit
        </button>
      </div>

      {/* Identity Card */}
      <div
        style={{
          background: COLOR.white,
          borderRadius: RADIUS.card,
          padding: 18,
          boxShadow: SHADOW.card,
          border: `1px solid ${COLOR.ink200}`,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflow: "hidden",
        }}
      >
        {/* Identity header (solid ShiftEaze navy) */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: COLOR.primary, margin: -18, marginBottom: 0, padding: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: COLOR.white,
              color: COLOR.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {form.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLOR.white }}>
              {form.name}
            </div>
            <div style={{ fontSize: 13.5, color: COLOR.primary200 }}>{form.title}</div>
            <div style={{ fontSize: 12, color: COLOR.primary300, marginTop: 4 }}>{trainer.empId}</div>
          </div>
        </div>

        {/* Bio Section */}
        {form.bio && (
          <div
            style={{
              background: COLOR.surface,
              borderRadius: RADIUS.sm,
              padding: "10px 12px",
              fontSize: 12.5,
              color: COLOR.ink700,
              lineHeight: 1.55,
            }}
          >
            {form.bio}
          </div>
        )}

        {/* Contact Details Row */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingTop: 10,
            borderTop: `1px solid ${COLOR.ink100}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: COLOR.ink500 }}>Phone</span>
            <strong style={{ color: COLOR.ink900 }}>{form.phone}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: COLOR.ink500 }}>Email</span>
            <strong style={{ color: COLOR.ink900, fontSize: 11.5 }}>{form.email}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: COLOR.ink500 }}>Shift</span>
            <strong style={{ color: COLOR.ink900 }}>{form.preferredShift}</strong>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            paddingTop: 10,
            borderTop: `1px solid ${COLOR.ink100}`,
          }}
        >
          <div style={{ background: COLOR.infoLight, padding: 10, borderRadius: RADIUS.sm }}>
            <div style={{ fontSize: 11.5, color: COLOR.textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} color={COLOR.info} /> Home Site
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.info, marginTop: 2 }}>
              {trainer.site}
            </div>
          </div>

          <div style={{ background: COLOR.successLight, padding: 10, borderRadius: RADIUS.sm }}>
            <div style={{ fontSize: 11.5, color: COLOR.textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
              <Star size={12} color={COLOR.success} /> TCI Score
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.success, marginTop: 2 }}>
              {trainer.tciScore} / 100
            </div>
          </div>
        </div>
      </div>

      {/* Attendance — derived from completed punches, never set manually */}
      <div
        style={{
          background: COLOR.white,
          borderRadius: RADIUS.card,
          padding: 18,
          boxShadow: SHADOW.card,
          border: `1px solid ${COLOR.ink200}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLOR.ink950 }}>Attendance</div>
          <span
            style={{
              fontSize: 11.5, fontWeight: 600, color: attendance.pct >= 90 ? COLOR.success : attendance.pct >= 75 ? COLOR.warning : COLOR.danger,
              background: attendance.pct >= 90 ? COLOR.successLight : attendance.pct >= 75 ? COLOR.warningLight : COLOR.dangerLight,
              padding: "3px 9px", borderRadius: RADIUS.pill,
            }}
          >
            {attendance.pct}%
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: attendance.recent.length ? 14 : 0 }}>
          <div style={{ background: COLOR.successLight, padding: "10px 8px", borderRadius: RADIUS.sm, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLOR.success }}>{attendance.present}</div>
            <div style={{ fontSize: 11, color: COLOR.ink500, fontWeight: 500, marginTop: 2 }}>Present</div>
          </div>
          <div style={{ background: COLOR.brandCrimsonLight, padding: "10px 8px", borderRadius: RADIUS.sm, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLOR.danger }}>{attendance.declined}</div>
            <div style={{ fontSize: 11, color: COLOR.ink500, fontWeight: 500, marginTop: 2 }}>Declined</div>
          </div>
          <div style={{ background: COLOR.primarySoft, padding: "10px 8px", borderRadius: RADIUS.sm, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLOR.primary }}>{attendance.totalDue}</div>
            <div style={{ fontSize: 11, color: COLOR.ink500, fontWeight: 500, marginTop: 2 }}>Due</div>
          </div>
        </div>

        {attendance.recent.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: `1px solid ${COLOR.ink100}` }}>
            {attendance.recent.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                <span style={{ color: COLOR.ink700 }}>{r.dateLabel} · {r.label}</span>
                <StatusPill status={r.present ? "completed" : "declined"} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certifications */}
      <div
        style={{
          background: COLOR.white,
          borderRadius: RADIUS.card,
          padding: 18,
          boxShadow: SHADOW.card,
          border: `1px solid ${COLOR.ink200}`,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: COLOR.ink950, marginBottom: 12 }}>
          Certifications
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {trainer.certifications.map((cert) => (
            <div
              key={cert.id}
              style={{
                padding: "11px 13px",
                borderRadius: RADIUS.sm,
                border: `1px solid ${COLOR.border}`,
                borderLeft: `4px solid ${cert.color}`,
                background: COLOR.white,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.ink950 }}>
                  {cert.name}
                </div>
                <div style={{ fontSize: 12, color: COLOR.ink600, marginTop: 2 }}>
                  {cert.expiry} · #{cert.no}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: cert.color,
                  padding: "3px 10px",
                  borderRadius: RADIUS.pill,
                  background: cert.bg,
                  flexShrink: 0,
                }}
              >
                {cert.status === "valid" ? "Valid" : cert.status === "expiring" ? "Expiring" : "Expired"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          style={{
            height: 48,
            borderRadius: RADIUS.comp,
            border: `1px solid ${COLOR.dangerBorder}`,
            background: COLOR.white,
            color: COLOR.danger,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <LogOut size={17} /> Sign out
        </button>
      )}
    </div>
  );
}

/* ======================================================================
   NOTIFICATIONS PANEL (Accessible from Header Bell 🔔)
   ====================================================================== */
function NotificationsPanel({
  notifications,
  onClose,
  onOpenNotificationAction,
  onMarkAllRead,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              border: 0,
              background: COLOR.ink100,
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLOR.ink950 }}>
            Notifications
          </div>
        </div>

        <button
          onClick={onMarkAllRead}
          style={{
            border: 0,
            background: "transparent",
            color: COLOR.primary,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Mark all read
        </button>
      </div>

      <div
        style={{
          background: COLOR.white,
          borderRadius: RADIUS.card,
          border: `1px solid ${COLOR.border}`,
          boxShadow: SHADOW.card,
          overflow: "hidden",
        }}
      >
        {notifications.map((item, i) => {
          // Colour-coded icon tile per notification kind
          const kind =
            item.type === "schedule-month"
              ? { icon: CalendarDays, color: COLOR.info, bg: COLOR.infoLight }
              : item.type === "schedule-day"
                ? { icon: Calendar, color: COLOR.success, bg: COLOR.successLight }
                : item.category === "Room Update"
                  ? { icon: MapPin, color: COLOR.brandCrimson, bg: COLOR.brandCrimsonLight }
                  : { icon: Clock, color: COLOR.primary, bg: COLOR.primarySoft };
          return (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenNotificationAction(item)}
            style={{
              width: "100%",
              background: item.unread ? COLOR.primary050 : COLOR.white,
              border: 0,
              borderTop: i === 0 ? "none" : `1px solid ${COLOR.border}`,
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              textAlign: "left",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: kind.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <kind.icon size={17} color={kind.color} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: item.unread ? 600 : 500, color: COLOR.ink950 }}>{item.title}</span>
                <span style={{ fontSize: 11.5, color: COLOR.textMuted, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {item.unread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLOR.brandCrimson }} />}
                  {item.time}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: COLOR.textSecondary, marginTop: 3 }}>{item.message}</div>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}

/* ======================================================================
   STAGE 1 — WHOLE-SCHEDULE CONFIRMATION (blocks Home until resolved)
   Two paths: confirm the whole roster in one tap, or review + confirm/
   decline each of this week's sessions individually.
   ====================================================================== */
function ScheduleConfirmationModal({ totalSessions, onConfirmAll, onStartManual }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0, background: "rgba(11, 18, 32, 0.6)", backdropFilter: "blur(5px)",
        zIndex: 95, display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
    >
      <div style={{ background: COLOR.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: "24px 22px 34px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: COLOR.ink300, alignSelf: "center" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: COLOR.primary100, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CalendarRange size={21} color={COLOR.primary800} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: COLOR.primary700 }}>
              New Schedule Published
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLOR.ink950 }}>September 2026 Roster</div>
          </div>
        </div>

        <div style={{ fontSize: 13.5, color: COLOR.ink600, lineHeight: 1.55 }}>
          Your roster of <strong>{totalSessions} sessions</strong> this month is ready. Confirm your whole schedule in
          one go, or review and confirm each session yourself.
        </div>

        <button
          onClick={onConfirmAll}
          style={{
            width: "100%", padding: "16px", borderRadius: RADIUS.pill, background: "#262B75", color: "#FFFFFF",
            border: 0, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8, boxShadow: "0 8px 20px -4px rgba(38, 43, 117, 0.35)",
          }}
        >
          <CheckCircle2 size={18} />
          <span>Confirm Whole Schedule</span>
        </button>

        <button
          onClick={onStartManual}
          style={{
            width: "100%", padding: "15px", borderRadius: RADIUS.pill, background: "#FFFFFF", color: "#262B75",
            border: "1.5px solid #262B75", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
          }}
        >
          Confirm Each Session Manually
        </button>
      </div>
    </div>
  );
}

function ManualScheduleConfirmSheet({ weekSessions, sessionState, onConfirmOne, onDeclineOne, onBack, onDone }) {
  const [decliningId, setDecliningId] = useState(null);
  const [reasonDraft, setReasonDraft] = useState("");

  const resolvedCount = weekSessions.filter((s) => sessionState[s.id].stage1 !== "pending").length;
  const allResolved = resolvedCount === weekSessions.length;

  return (
    <div
      style={{
        position: "absolute", inset: 0, background: "rgba(11, 18, 32, 0.6)", backdropFilter: "blur(5px)",
        zIndex: 95, display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
    >
      <div style={{ background: COLOR.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: "20px 22px 30px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "88%", overflowY: "auto" }}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: COLOR.ink300, alignSelf: "center" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onBack}
            style={{ border: 0, background: COLOR.ink100, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: COLOR.ink950 }}>Confirm This Week's Schedule</div>
            <div style={{ fontSize: 12, color: COLOR.ink500, marginTop: 1 }}>{resolvedCount} of {weekSessions.length} reviewed</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {weekSessions.map((s) => {
            const st = sessionState[s.id];
            return (
              <div key={s.id} style={{ background: COLOR.surface, borderRadius: RADIUS.card, padding: "13px 14px", border: `1px solid ${COLOR.ink200}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: COLOR.ink500, fontWeight: 600 }}>{s.dateLabel} · {s.time}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.ink950, marginTop: 2 }}>{s.label}</div>
                  </div>
                  {st.stage1 !== "pending" && <StatusPill status={st.stage1} />}
                </div>

                {st.stage1 === "pending" && decliningId !== s.id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => onConfirmOne(s.id)}
                      style={{ flex: 1, padding: "9px", borderRadius: RADIUS.sm, background: COLOR.primary800, color: "#FFFFFF", border: 0, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setDecliningId(s.id); setReasonDraft(""); }}
                      style={{ flex: 1, padding: "9px", borderRadius: RADIUS.sm, background: COLOR.white, color: "#B91C1C", border: "1.5px solid #FCA5A5", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {decliningId === s.id && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <textarea
                      autoFocus
                      value={reasonDraft}
                      onChange={(e) => setReasonDraft(e.target.value)}
                      placeholder="Reason"
                      rows={2}
                      style={{ width: "100%", padding: "9px 11px", borderRadius: RADIUS.sm, border: `1.5px solid ${COLOR.ink300}`, fontSize: 12.5, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none" }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setDecliningId(null)} style={{ flex: 1, padding: "9px", borderRadius: RADIUS.sm, background: COLOR.ink100, color: COLOR.ink800, border: 0, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                        Cancel
                      </button>
                      <button
                        disabled={!reasonDraft.trim()}
                        onClick={() => { onDeclineOne(s.id, reasonDraft.trim()); setDecliningId(null); }}
                        style={{ flex: 1, padding: "9px", borderRadius: RADIUS.sm, border: 0, fontSize: 12.5, fontWeight: 700, cursor: reasonDraft.trim() ? "pointer" : "not-allowed", background: reasonDraft.trim() ? "#DC2626" : COLOR.ink200, color: reasonDraft.trim() ? "#FFFFFF" : COLOR.ink500 }}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}

                {st.stage1 === "declined" && (
                  <div style={{ fontSize: 11.5, color: "#991B1B", marginTop: 8 }}>Reason: {st.stage1Reason}</div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onDone}
          disabled={!allResolved}
          style={{
            width: "100%", padding: "15px", borderRadius: RADIUS.pill, border: 0, fontSize: 14.5, fontWeight: 700,
            cursor: allResolved ? "pointer" : "not-allowed",
            background: allResolved ? "#262B75" : COLOR.ink200, color: allResolved ? "#FFFFFF" : COLOR.ink500,
            boxShadow: allResolved ? "0 8px 20px -4px rgba(38, 43, 117, 0.35)" : "none",
          }}
        >
          {allResolved ? "Done — Confirm Schedule" : `Review all ${weekSessions.length} sessions to continue`}
        </button>
      </div>
    </div>
  );
}

/* ======================================================================
   FULL SESSION DETAIL SHEET WITH INTEGRATED PUNCH IN / PUNCH OUT FLOW
   Schedule -> Session -> Punch In -> Punch Out Flow
   - Punch In becomes available 1 hour before scheduled session
   - Replaced by Punch Out after Punch In
   - Completed attendance state recorded
   - Contextual session notifications: "Punch In available", "You are punched in"
   ====================================================================== */
function SessionDetailSheet({
  session,
  sessionState,
  onClose,
  onStage2Confirm,
  onStage2Decline,
  onPunchIn,
  onPunchOut,
  onSetDemoState,
}) {
  const [showDeclineBox, setShowDeclineBox] = useState(false);
  const [declineDraft, setDeclineDraft] = useState("");
  const [declineNominee, setDeclineNominee] = useState(null);

  useEffect(() => {
    setShowDeclineBox(false);
    setDeclineDraft("");
  }, [session?.id]);

  if (!session || !sessionState) return null;

  const { stage1, stage1Reason, stage2, stage2Reason, stage2Nominee, punch } = sessionState;
  const nominee = stage2Nominee || session.recommendedColleague;

  const submitDecline = () => {
    if (!declineDraft.trim()) return;
    onStage2Decline(session.id, declineDraft.trim(), declineNominee);
    setShowDeclineBox(false);
  };

  const isDeclined = stage1 === "declined" || stage2 === "declined";
  const isNotOpen = stage2 === "not_open";
  const currentStep = isDeclined || isNotOpen
    ? null
    : stage2 === "pending"
      ? 1
      : punch.status === "active"
        ? 3
        : punch.status === "completed"
          ? 4
          : 2;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(11, 18, 32, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLOR.white,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          padding: "20px 22px 30px",
          display: "flex",
          flexDirection: "column",
          gap: 13,
          maxHeight: "94%",
          overflowY: "auto",
          boxShadow: SHADOW.sheet,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Handle */}
        <div style={{ width: 44, height: 5, borderRadius: 3, background: COLOR.ink300, alignSelf: "center" }} />

        {/* Sheet Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLOR.textSecondary }}>
              {session.category} · {session.site}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLOR.textPrimary, marginTop: 4, lineHeight: 1.3 }}>
              {session.label}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 0,
              background: COLOR.ink100,
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Session details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${COLOR.border}`,
            borderRadius: RADIUS.card,
          }}
        >
          {[
            { label: "Date", value: session.dateLabel || session.date },
            { label: "Time", value: session.time },
            { label: "Room", value: session.room },
            { label: "Trainer", value: session.trainerName },
            { label: "Learners", value: `${session.learners} / ${session.capacity}` },
          ].map((row, i) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                padding: "10px 14px",
                borderTop: i === 0 ? "none" : `1px solid ${COLOR.border}`,
              }}
            >
              <span style={{ color: COLOR.textSecondary }}>{row.label}</span>
              <span style={{ color: COLOR.textPrimary, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* --- LIVE INTEGRATED WORKFLOW: Confirm -> Punch In -> Punch Out -> Close --- */}
        {isDeclined ? (
          <div
            style={{
              background: COLOR.dangerLight,
              borderRadius: RADIUS.md,
              padding: "12px 14px",
              fontSize: 13,
              color: COLOR.danger,
            }}
          >
            <strong>Declined:</strong> {stage2 === "declined" ? stage2Reason : stage1Reason}
            {nominee && <div style={{ marginTop: 4 }}><strong>Recommended:</strong> {colleagueName(nominee)}</div>}
          </div>
        ) : isNotOpen ? (
          <div
            style={{
              background: COLOR.surfaceMuted,
              borderRadius: RADIUS.md,
              padding: "12px",
              textAlign: "center",
              fontSize: 13,
              color: COLOR.textSecondary,
            }}
          >
            Confirmation opens 12h before start
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              paddingTop: 2,
            }}
          >
            {/* Live Progress Stepper */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
                padding: "4px 2px 6px",
              }}
            >
              {[
                { num: 1, label: "Confirm" },
                { num: 2, label: "Punch In" },
                { num: 3, label: "Punch Out" },
              ].map((step, idx, arr) => {
                const isDone = currentStep > step.num;
                const isCurrent = currentStep === step.num;
                return (
                  <React.Fragment key={step.num}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        zIndex: 2,
                        minWidth: 52,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11.5,
                          fontWeight: 800,
                          background: isDone
                            ? COLOR.success
                            : isCurrent
                              ? COLOR.primary
                              : COLOR.surfaceMuted,
                          color: isDone || isCurrent ? "#FFFFFF" : COLOR.textMuted,
                          border: isCurrent
                            ? `2px solid ${COLOR.primary}`
                            : isDone
                              ? `2px solid ${COLOR.success}`
                              : `1.5px solid ${COLOR.border}`,
                          transition: "all 0.25s ease",
                        }}
                      >
                        {isDone ? <Check size={14} strokeWidth={3} /> : step.num}
                      </div>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent
                            ? COLOR.textPrimary
                            : isDone
                              ? COLOR.success
                              : COLOR.textMuted,
                          textAlign: "center",
                          lineHeight: 1.1,
                        }}
                      >
                        {step.label}
                      </span>
                    </div>

                    {idx < arr.length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: 2,
                          background: currentStep > idx + 1 ? COLOR.success : COLOR.border,
                          marginTop: -16,
                          zIndex: 1,
                          transition: "background 0.25s ease",
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Step 1: Trainer Confirms Session */}
            {currentStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {!showDeclineBox ? (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => onStage2Confirm(session.id)}
                      style={{
                        flex: 1.4,
                        padding: "13px",
                        borderRadius: RADIUS.pill,
                        background: COLOR.primary,
                        color: "#FFFFFF",
                        border: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <Check size={18} strokeWidth={2.5} />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => setShowDeclineBox(true)}
                      style={{
                        flex: 0.9,
                        padding: "13px",
                        borderRadius: RADIUS.pill,
                        background: COLOR.white,
                        color: COLOR.danger,
                        border: `1px solid ${COLOR.border}`,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <X size={16} /> Decline
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <textarea
                      autoFocus
                      value={declineDraft}
                      onChange={(e) => setDeclineDraft(e.target.value)}
                      placeholder="Reason"
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: RADIUS.sm,
                        border: `1.5px solid ${COLOR.ink300}`,
                        fontSize: 13,
                        fontFamily: "inherit",
                        resize: "vertical",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                    <ColleagueRecommendations session={session} value={declineNominee} onChange={setDeclineNominee} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => { setShowDeclineBox(false); setDeclineDraft(""); setDeclineNominee(null); }}
                        style={{
                          flex: 1,
                          padding: "12px",
                          borderRadius: RADIUS.md,
                          background: COLOR.ink100,
                          color: COLOR.ink800,
                          border: 0,
                          fontSize: 13.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitDecline}
                        disabled={!declineDraft.trim()}
                        style={{
                          flex: 1,
                          padding: "12px",
                          borderRadius: RADIUS.md,
                          border: 0,
                          fontSize: 13.5,
                          fontWeight: 600,
                          cursor: declineDraft.trim() ? "pointer" : "not-allowed",
                          background: declineDraft.trim() ? COLOR.danger : COLOR.ink200,
                          color: declineDraft.trim() ? "#FFFFFF" : COLOR.ink500,
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Session Confirmed -> Punch In Now */}
            {currentStep === 2 && (
              <button
                onClick={() => onPunchIn(session.id)}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: RADIUS.pill,
                  background: COLOR.primary,
                  color: "#FFFFFF",
                  border: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <LogIn size={18} />
                <span>Punch In</span>
              </button>
            )}

            {/* Step 3: Punched In -> Punch Out Now */}
            {currentStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, color: COLOR.textSecondary, textAlign: "center" }}>
                  In at {punch.inAt || "09:00 AM"}
                </div>
                <button
                  onClick={() => onPunchOut(session.id)}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: RADIUS.pill,
                    background: COLOR.danger,
                    color: "#FFFFFF",
                    border: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <LogOut size={18} />
                  <span>Punch Out</span>
                </button>
              </div>
            )}

            {/* Step 4: Attendance Completed */}
            {currentStep === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    background: COLOR.successLight,
                    borderRadius: RADIUS.md,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: COLOR.success, fontWeight: 600 }}>
                    <CheckCircle2 size={16} />
                    <span>Attendance Recorded</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: COLOR.textSecondary, paddingLeft: 24 }}>
                    In {punch.inAt || "09:00 AM"} · Out {punch.outAt || "11:00 AM"} · {session.dur / 60 || 2}h
                  </div>
                </div>

                <button
                  onClick={onClose}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: RADIUS.pill,
                    background: COLOR.primary,
                    color: "#FFFFFF",
                    border: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            )}

            {/* Test Simulation Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTop: `1px solid ${COLOR.ink200}` }}>
              <span style={{ fontSize: 10.5, color: COLOR.ink500 }}>
                Test State:
              </span>
              <div style={{ display: "flex", gap: 5 }}>
                {[
                  { id: "pending_confirm", label: "Ready" },
                  { id: "not_started", label: "Confirmed" },
                  { id: "active", label: "Punched In" },
                  { id: "completed", label: "Punched Out" },
                ].map((s) => {
                  const isSelected =
                    (s.id === "pending_confirm" && currentStep === 1) ||
                    (s.id === "not_started" && currentStep === 2) ||
                    (s.id === "active" && currentStep === 3) ||
                    (s.id === "completed" && currentStep === 4);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSetDemoState(session.id, s.id)}
                      style={{
                        border: `1px solid ${isSelected ? COLOR.primary800 : COLOR.ink300}`,
                        background: isSelected ? COLOR.primary800 : COLOR.white,
                        color: isSelected ? "#FFFFFF" : COLOR.ink700,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 7px",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentStep !== 4 && (
          <button
            onClick={onClose}
            style={{
              padding: "13px",
              borderRadius: RADIUS.md,
              background: COLOR.ink100,
              color: COLOR.ink800,
              border: 0,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   MAIN EXPORT: TrainerMobileApp (iPhone 17 Pro Max Framing & Reflow)
   Viewport: 440 × 956 pt
   Bottom Navigation: 4 Core Tabs strictly (Home | Schedule | Leave | Profile)
   Notifications: Header 🔔 on Home
   ====================================================================== */
export default function TrainerMobileApp() {
  const [activeTab, setActiveTab] = useState("home"); // home | schedule | utilities | leave
  const [isViewingNotifications, setIsViewingNotifications] = useState(false);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [isViewingHelpDesk, setIsViewingHelpDesk] = useState(false);
  const [isViewingAttendance, setIsViewingAttendance] = useState(false);
  // Signed-in trainer account (one per BU). Only the Ports account uses the
  // built-in demo month; the others start empty — see usesDemoData().
  // Nobody is signed in when the app opens: it always starts on the business-unit picker.
  const [account, setAccount] = useState(null);
  const demoData = usesDemoData(account);
  const [allLectures, setAllLectures] = useState(() => (demoData ? FULL_MONTH_LECTURES : []));
  const [trainer, setTrainer] = useState(INITIAL_TRAINER);
  const [selectedDate, setSelectedDate] = useState(TODAY_DATE);
  const [scheduleMode, setScheduleMode] = useState("day"); // "day" | "month"
  const [notifications, setNotifications] = useState(() => (demoData ? INITIAL_NOTIFICATIONS : []));
  const [leaveRequests, setLeaveRequests] = useState(INITIAL_LEAVE_REQUESTS);
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [leaveBalance, setLeaveBalance] = useState(INITIAL_LEAVE_BALANCE);
  const [attendanceOverrides, setAttendanceOverrides] = useState({});
  const [activeSessionDetail, setActiveSessionDetail] = useState(null);
  const [toast, setToast] = useState(null);

  // The inbox the web dashboard writes published rosters into — see src/shared/mobileInbox.js.
  const [inbox, setInbox] = useState(readInbox);
  const [readIds, setReadIds] = useState(() => (account ? readReceipts(account.email) : new Set()));
  const myInbox = useMemo(() => inboxFor(account, inbox), [account, inbox]);

  const [scheduleConfirmation, setScheduleConfirmation] = useState({ status: "pending", method: null });
  const [showManualConfirm, setShowManualConfirm] = useState(false);
  const [sessionState, setSessionState] = useState(() => (demoData ? buildInitialSessionState() : {}));

  // --- Startup Schedule Confirmation Workflow State ---
  // The demo account opens on its September confirmation; the others only
  // get it once the web publishes sessions for them (see the effect below).
  const [hasPendingScheduleConfirmation, setHasPendingScheduleConfirmation] = useState(demoData);
  const [startupWorkflow, setStartupWorkflow] = useState(demoData ? "startup" : null); // "startup" | "calendar_bulk" | "calendar_manual" | null
  const [isAppLaunching, setIsAppLaunching] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLaunching(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const septemberSessions = useMemo(() => {
    return allLectures.filter((s) => inDemoCycle(s.date));
  }, [allLectures]);

  const septemberPendingCount = useMemo(() => {
    return septemberSessions.filter((s) => s.status === "pending").length;
  }, [septemberSessions]);

  // The schedule cycle the startup confirmation is about: the demo September
  // for the Ports demo account, otherwise every session published to this
  // trainer from the web dashboard.
  const cycleSessions = useMemo(
    () => (demoData ? septemberSessions : allLectures.filter((l) => l.webSessionId)),
    [demoData, septemberSessions, allLectures]
  );
  const cyclePendingCount = useMemo(() => cycleSessions.filter((s) => s.status === "pending").length, [cycleSessions]);
  const cycleStart = useMemo(
    () => (demoData ? DEMO_CYCLE_START : cycleSessions.map((s) => s.date).sort()[0] ?? TODAY_DATE),
    [demoData, cycleSessions]
  );
  const cycleLabel = useMemo(() => cycleLabelFor(cycleSessions), [cycleSessions]);

  const toastTimer = useRef(null);
  const showToast = (msg) => {
    // Strip legacy "✓ " prefixes and trailing "!" so every toast reads calmly
    const clean = String(msg).replace(/^[✓✔]\s*/, "").replace(/!+$/, "");
    clearTimeout(toastTimer.current);
    setToast(clean);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  // --- Account: the signed-in trainer's profile and their copy of the schedule ---
  useEffect(() => {
    if (!account) return;
    const { profile } = account;
    const avatar = profile.name.split(/[\s.]+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
    const siteName = profile.site.replace(/\s*\(.*\)$/, "");
    setTrainer({ ...INITIAL_TRAINER, ...profile, id: account.empId, email: account.email });
    setReadIds(readReceipts(account.email));
    if (usesDemoData(account)) {
      // Ports: the built-in demo month, opening on its September confirmation.
      setAllLectures(FULL_MONTH_LECTURES.map((l) => ({ ...l, site: siteName, trainerName: profile.name, trainerRole: profile.title, trainerAvatar: avatar })));
      setNotifications(INITIAL_NOTIFICATIONS);
      setSessionState(buildInitialSessionState());
      setHasPendingScheduleConfirmation(true);
      setStartupWorkflow("startup");
    } else {
      // Other BUs: nothing until the web dashboard publishes a schedule for them.
      setAllLectures([]);
      setNotifications([]);
      setSessionState({});
      setHasPendingScheduleConfirmation(false);
      setStartupWorkflow(null);
    }
  }, [account]);

  // Live inbox: the web dashboard writes here when it publishes; the broadcast
  // wakes this tab immediately, and other tabs pick it up via the storage event.
  useEffect(() => subscribeInbox(setInbox), []);

  // New arrivals for this trainer: announce them, and merge any sessions they
  // were assigned into the schedule (pending their confirmation).
  const announced = useRef(null);
  useEffect(() => {
    if (!account) return;
    const ids = new Set(myInbox.map((e) => e.id));
    if (announced.current?.email === account.email) {
      const fresh = myInbox.filter((e) => !announced.current.ids.has(e.id));
      if (fresh.length) showToast(`🔔 ${fresh[0].title}`);
    }
    announced.current = { email: account.email, ids };

    // Re-apply any answers this trainer already gave, so a reload doesn't
    // ask them to confirm the same roster again.
    const answered = readLectureStatus(account.email);
    const { profile } = account;
    const avatar = profile.name.split(/[\s.]+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
    const incoming = myInbox.flatMap((e) => e.lectures ?? []).map((l) => ({
      ...l,
      // BU-wide sessions arrive without a trainer — they are this trainer's to confirm.
      trainerName: l.trainerName || profile.name, trainerRole: l.trainerRole || profile.title, trainerAvatar: l.trainerAvatar || avatar,
      ...(answered[l.id] || {}),
    }));
    if (!incoming.length) return;
    setAllLectures((prev) => {
      const have = new Set(prev.map((l) => l.id));
      const add = incoming.filter((l) => !have.has(l.id));
      return add.length ? [...prev, ...add] : prev;
    });
    setSessionState((prev) => {
      const missing = incoming.filter((l) => !prev[l.id]);
      if (!missing.length) return prev;
      const next = { ...prev };
      missing.forEach((l) => {
        const stage1 = l.status === "confirmed" ? "confirmed" : l.status === "denied" ? "declined" : "pending";
        next[l.id] = { stage1, stage1Reason: l.denialReason || null, stage2: l.date === TODAY_DATE ? "pending" : "not_open", stage2Reason: null,
          punch: { status: "not_started", inAt: null, outAt: null } };
      });
      return next;
    });
  }, [account, myInbox]);

  // Remember the trainer's answers on web-published sessions (per account).
  useEffect(() => {
    if (!account) return;
    const mine = new Set(myInbox.flatMap((e) => e.lectures ?? []).map((l) => l.id));
    const answered = allLectures.filter((l) => mine.has(l.id) && l.status !== "pending");
    if (!answered.length) return;
    const map = readLectureStatus(account.email);
    answered.forEach((l) => { map[l.id] = { status: l.status, denialReason: l.denialReason ?? null }; });
    saveLectureStatus(account.email, map);
  }, [account, myInbox, allLectures]);

  // A newly published schedule for a non-demo trainer opens the "Confirm
  // whole month / Confirm manually" screen — and only then. Counting from 0 on
  // every sign-in means an already-answered roster doesn't reopen it.
  const lastPending = useRef({ email: null, count: 0 });
  useEffect(() => {
    if (!account || usesDemoData(account)) { lastPending.current = { email: null, count: 0 }; return; }
    const prev = lastPending.current.email === account.email ? lastPending.current.count : 0;
    if (cyclePendingCount > prev) {
      setHasPendingScheduleConfirmation(true);
      setStartupWorkflow("startup");
      setIsViewingNotifications(false);
      setIsViewingProfile(false);
    }
    lastPending.current = { email: account.email, count: cyclePendingCount };
  }, [account, cyclePendingCount]);

  const handleSignIn = (acct) => {
    setAccount(acct);
    setActiveTab("home");
    showToast(`Signed in as ${acct.profile.name}`);
  };

  const handleSignOut = () => {
    setAccount(null);
    announced.current = null;
    setIsViewingProfile(false);
    setIsViewingNotifications(false);
    setActiveSessionDetail(null);
    setActiveTab("home");
    // Clear the schedule so the next account starts from its own data, not this one's.
    setAllLectures([]);
    setNotifications([]);
    setSessionState({});
    setHasPendingScheduleConfirmation(false);
    setStartupWorkflow(null);
    lastPending.current = { email: null, count: 0 };
  };

  // Startup whole month — navigate to calendar first so trainer reviews before confirming
  const handleStartupConfirmWholeMonth = () => {
    setStartupWorkflow("calendar_bulk");
    setSelectedDate(cycleStart);
  };

  // Continue to Trainer App
  const handleContinueToTrainerHome = () => {
    setHasPendingScheduleConfirmation(false);
    setStartupWorkflow(null);
    setActiveTab("home");
  };

  // Called from within the calendar_bulk view — confirms every session in the
  // cycle and lands the trainer straight on the dashboard
  const handleConfirmAllFromCalendar = () => {
    const cycleIds = new Set(cycleSessions.map((s) => s.id));
    setAllLectures((prev) =>
      prev.map((s) => (cycleIds.has(s.id) ? { ...s, status: "confirmed", denialReason: null } : s))
    );
    handleContinueToTrainerHome();
    showToast("All sessions confirmed");
  };

  // Startup confirm manually
  const handleStartupConfirmManually = () => {
    setStartupWorkflow("calendar_manual");
    setSelectedDate(cycleStart);
  };

  // Manual review or bulk select: once nothing is left pending, go straight to the dashboard
  useEffect(() => {
    if (!hasPendingScheduleConfirmation || !["calendar_manual", "calendar_bulk"].includes(startupWorkflow) || cyclePendingCount > 0) return;
    const timer = setTimeout(() => {
      handleContinueToTrainerHome();
      showToast("Schedule confirmed");
    }, 600);
    return () => clearTimeout(timer);
  }, [hasPendingScheduleConfirmation, startupWorkflow, cyclePendingCount]);

  // Simulation helpers for testing all states
  const handleSimulateResetPending = () => {
    setAllLectures(FULL_MONTH_LECTURES);
    setSessionState(buildInitialSessionState());
    setHasPendingScheduleConfirmation(true);
    setStartupWorkflow("startup");
    setIsAppLaunching(true);
    setTimeout(() => setIsAppLaunching(false), 700);
    showToast("Simulation: Launch with 7 pending & 2 denied sessions");
  };

  const handleSimulateConfirmAllInScreen = () => {
    setAllLectures((prev) =>
      prev.map((s) => (inDemoCycle(s.date) ? { ...s, status: "confirmed", denialReason: null } : s))
    );
    setHasPendingScheduleConfirmation(true);
    setStartupWorkflow("startup");
    showToast("✓ Changed 7 pending & 2 denied to Confirmed (25/25 Confirmed)");
  };

  const handleSimulateAllConfirmedLaunch = () => {
    setAllLectures((prev) =>
      prev.map((s) => (inDemoCycle(s.date) ? { ...s, status: "confirmed" } : s))
    );
    setHasPendingScheduleConfirmation(false);
    setStartupWorkflow(null);
    setActiveTab("home");
    setIsAppLaunching(true);
    setTimeout(() => setIsAppLaunching(false), 700);
    showToast("Simulation: Launch direct to Home (all confirmed)");
  };

  const handleUpdateSessionStatus = (sessionId, status, denialReason = null, nominee = null) => {
    setAllLectures((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
            ...s,
            status,
            denialReason: denialReason !== undefined ? denialReason : s.denialReason,
            recommendedColleague: status === "denied" ? nominee : null,
          }
          : s
      )
    );
    setSessionState((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        stage1: status === "denied" ? "declined" : status,
        stage1Reason: denialReason,
      },
    }));
  };

  // -- Stage 1: whole-schedule confirmation ------------------------------
  const handleConfirmWholeSchedule = () => {
    setSessionState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id].stage1 === "pending") next[id] = { ...next[id], stage1: "confirmed" };
      });
      return next;
    });
    setScheduleConfirmation({ status: "confirmed", method: "bulk" });
    showToast("✓ Whole schedule confirmed!");
  };

  const handleStartManualConfirm = () => setShowManualConfirm(true);

  const handleStage1ConfirmOne = (id) => {
    setSessionState((prev) => ({ ...prev, [id]: { ...prev[id], stage1: "confirmed" } }));
  };

  const handleStage1DeclineOne = (id, reason) => {
    setSessionState((prev) => ({ ...prev, [id]: { ...prev[id], stage1: "declined", stage1Reason: reason } }));
  };

  const handleFinishManualConfirm = () => {
    // Reviewing this week resolves Stage 1 for the whole roster — any
    // session outside this week that's still untouched is accepted as part
    // of confirming the schedule; explicit declines during review stand.
    setSessionState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id].stage1 === "pending") next[id] = { ...next[id], stage1: "confirmed" };
      });
      return next;
    });
    setScheduleConfirmation({ status: "confirmed", method: "manual" });
    setShowManualConfirm(false);
    showToast("✓ Schedule reviewed and confirmed!");
  };

  // -- Stage 2: per-session confirmation (opens 12h before start) -------
  const handleStage2Confirm = (id) => {
    setSessionState((prev) => ({ ...prev, [id]: { ...prev[id], stage2: "confirmed" } }));
    setAllLectures((prev) => prev.map((l) => (l.id === id ? { ...l, status: "confirmed" } : l)));
    showToast("✓ Session confirmed. Punch In is now open.");
  };

  const handleStage2Decline = (id, reason, nominee = null) => {
    setSessionState((prev) => ({ ...prev, [id]: { ...prev[id], stage2: "declined", stage2Reason: reason, stage2Nominee: nominee } }));
    setAllLectures((prev) => prev.map((l) => (l.id === id ? { ...l, status: "denied", denialReason: reason } : l)));
    showToast(nominee ? `Session declined — recommended ${colleagueName(nominee)}` : "Session declined.");
  };

  // -- Punch In / Punch Out (per session) --------------------------------
  const handlePunchIn = (id) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setSessionState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        stage2: "confirmed",
        punch: { ...prev[id].punch, status: "active", inAt: timeStr },
      },
    }));
    showToast("✓ Punched in successfully! Session is now active.");
  };

  const handlePunchOut = (id) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setSessionState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        punch: { ...prev[id].punch, status: "completed", outAt: timeStr },
      },
    }));
    showToast("✓ Punched out! Session attendance completed.");
  };

  const handleSetDemoPunch = (id, st) => {
    setSessionState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        stage2: st === "pending_confirm" ? "pending" : "confirmed",
        punch:
          st === "not_started" || st === "pending_confirm"
            ? { status: "not_started", inAt: null, outAt: null }
            : st === "active"
              ? { status: "active", inAt: "08:52 AM", outAt: null }
              : { status: "completed", inAt: "08:52 AM", outAt: "11:04 AM" },
      },
    }));
  };

  const handleAddLeave = (req) => {
    const newEntry = {
      id: `LEV-${Date.now().toString().slice(-4)}`,
      type: req.type,
      startDate: req.startDate,
      endDate: req.endDate,
      days: req.startDate === req.endDate ? 1 : 2,
      reason: req.reason,
      status: "Pending",
      submittedAt: "Just now",
      reviewerNote: "Under review with Site Operations",
    };
    setLeaveRequests((prev) => [newEntry, ...prev]);
    showToast("✓ Leave request submitted!");
  };

  const handleAddTicket = (ticket) => {
    setTickets((prev) => [ticket, ...prev]);
  };

  const handleCancelTicket = (id) => {
    setTickets((prev) => prev.map(t => t.id === id ? { ...t, status: 'CANCELLED' } : t));
  };

  const handleRegularize = (date, type, reason) => {
    setAttendanceOverrides((prev) => ({
      ...prev,
      [date]: { regularizationStatus: 'PENDING', regularizationType: type, regularizationReason: reason },
    }));
  };

  // Web-published entries first (newest on top), then the app's own notifications.
  const inboxNotifications = myInbox.map((e) => ({
    id: e.id, fromWeb: true, date: e.date,
    type: e.kind === "schedule" ? "schedule-month" : "schedule-day",
    category: e.kind === "schedule" ? "Schedule Published" : "Schedule Update",
    title: e.title, message: e.message, time: timeAgo(e.createdAt), unread: !readIds.has(e.id),
  }));
  const allNotifications = [...inboxNotifications, ...notifications];

  const markInboxRead = (ids) => {
    if (!account) return;
    setReadIds((prev) => {
      const next = new Set([...prev, ...ids]);
      saveReceipts(account.email, next);
      return next;
    });
  };

  const handleNotificationAction = (notif) => {
    setIsViewingNotifications(false);
    if (notif.fromWeb) {
      // Open the schedule on the roster's first day so the new sessions are in view.
      markInboxRead([notif.id]);
      setHasPendingScheduleConfirmation(false);
      setStartupWorkflow(null);
      setActiveTab("schedule");
      setScheduleMode("day");
      if (notif.date) setSelectedDate(notif.date);
      return;
    }
    if (notif.type === "session") {
      const found = FULL_MONTH_LECTURES.find((l) => l.id === notif.sessionId) || FULL_MONTH_LECTURES[0];
      setActiveSessionDetail(found);
    } else if (notif.type === "schedule-month") {
      setActiveTab("schedule");
      setScheduleMode("month");
    } else if (notif.type === "schedule-day") {
      setActiveTab("schedule");
      setScheduleMode("day");
      setSelectedDate(TODAY_DATE);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    markInboxRead(myInbox.map((e) => e.id));
    showToast("All notifications marked as read.");
  };

  const unreadNotifCount = allNotifications.filter((n) => n.unread).length;

  // Home surfaces today's sessions; today's shift remains accessible in the card
  // so the trainer sees the live workflow state and can reset or replay anytime.
  const todaySessionsAll = allLectures.filter((l) => l.date === TODAY_DATE);
  const todayPending = todaySessionsAll.filter((l) => sessionState[l.id]?.punch?.status !== "completed");
  const todayCompletedCount = todaySessionsAll.length - todayPending.length;

  // Once today's session is punched out (completed), remove it from the hero card
  // and promote tomorrow's upcoming session to the hero card
  // A declined session never holds the hero card: it moves on to the day's next
  // live session (confirm → punch in → punch out), else to tomorrow's.
  const isDeclinedLec = (l) => l.status === "denied" || sessionState[l.id]?.stage1 === "declined" || sessionState[l.id]?.stage2 === "declined";
  const todayHero = todayPending.filter((l) => !isDeclinedLec(l)).sort((a, b) => a.start.localeCompare(b.start))[0] || null;
  const nextUpcoming = allLectures.find((l) => l.date > TODAY_DATE && sessionState[l.id]?.punch?.status !== "completed") || null;

  const heroSession = todayHero || nextUpcoming || null;
  const listMode = todayHero ? "today" : nextUpcoming ? "upcoming" : "none";
  const listSessions = todaySessionsAll.length > 0 ? todaySessionsAll : nextUpcoming ? [nextUpcoming] : [];
  const heroState = heroSession ? sessionState[heroSession.id] : null;

  // Manual Stage 1 review scope: this week only (Mon 26 Oct – Sun 1 Nov).
  const weekSessions = allLectures.filter((l) => l.date >= "2026-10-26" && l.date <= "2026-11-01");
  // Home tiles: the demo account keeps its showcase numbers; others count their own sessions.
  // Load: hours assigned today (declined sessions excluded) against the daily threshold.
  const DAILY_LOAD_LIMIT_HOURS = 8;
  const loadHours = todaySessionsAll.filter((l) => !isDeclinedLec(l)).reduce((sum, l) => sum + (l.dur || 0), 0) / 60;
  const fmtHours = (h) => (Number.isInteger(h) ? String(h) : h.toFixed(1));
  const homeLoadLabel = `${fmtHours(loadHours)}/${DAILY_LOAD_LIMIT_HOURS}h`;
  // Demo: the month-long cycle (30 Oct – 30 Nov); others: sessions this calendar month.
  const homeMonthCount = demoData ? cycleSessions.length : allLectures.filter((l) => l.date?.startsWith(TODAY_DATE.slice(0, 7))).length;

  // Attendance — always derived from completed/declined sessions, never set directly.
  const sessionsDueSoFar = allLectures.filter((l) => l.date <= TODAY_DATE);
  const presentSessions = sessionsDueSoFar.filter((l) => sessionState[l.id]?.punch?.status === "completed");
  const declinedSessions = sessionsDueSoFar.filter((l) => sessionState[l.id]?.stage1 === "declined" || sessionState[l.id]?.stage2 === "declined");
  const attendance = {
    present: presentSessions.length,
    declined: declinedSessions.length,
    totalDue: sessionsDueSoFar.length,
    pct: sessionsDueSoFar.length ? Math.round((presentSessions.length / sessionsDueSoFar.length) * 100) : 100,
    recent: sessionsDueSoFar
      .slice(-6)
      .reverse()
      .map((l) => ({ id: l.id, label: l.label, dateLabel: l.dateLabel, present: sessionState[l.id]?.punch?.status === "completed" }))
      .filter((r) => r.present || declinedSessions.some((d) => d.id === r.id)),
  };

  return (
    <TrainerContext.Provider value={trainer}>
    <div
      style={{
        minHeight: "100vh",
        background: "#080c14",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: TYPE.fontFamily,
        padding: "24px 12px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -6px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Device Info Badge */}
      <div
        style={{
          marginBottom: 12,
          color: "#94A3B8",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Smartphone size={14} color="#38BDF8" />
        <span>Apple iPhone 17 Pro Max • 440 × 956 pt Canvas</span>
      </div>


      {/* Prototype Simulator Toolbar (Section 7) — Ports demo account only, since it replays the built-in demo month */}
      {account && demoData && (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "rgba(30, 41, 59, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          padding: "8px 18px",
          borderRadius: "999px",
          marginBottom: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={handleSimulateResetPending}
          style={{
            background: COLOR.success,
            color: "#FFFFFF",
            border: "none",
            borderRadius: "999px",
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>🚀 App Launch (25 Confirmed)</span>
        </button>

        <button
          type="button"
          onClick={handleSimulateAllConfirmedLaunch}
          style={{
            background: COLOR.primary,
            color: "#FFFFFF",
            border: "none",
            borderRadius: "999px",
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>⚡ Launch Direct to Home</span>
        </button>

        <button
          type="button"
          onClick={handleSimulateResetPending}
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            color: "#E2E8F0",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "999px",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span>↺ Reset (25 Confirmed)</span>
        </button>
      </div>
      )}

      {/* --- iPhone 17 Pro Max Canvas: 440 × 956 pt --- */}
      <div
        style={{
          width: "440px",
          maxWidth: "100%",
          height: "956px",
          background: "#FFFFFF",
          borderRadius: "56px",
          border: "10px solid #1c1c20",
          boxShadow: "0 35px 90px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.12)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "background 0.25s ease",
        }}
      >
            {/* Startup Splash Overlay */}
            {isAppLaunching && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: COLOR.white,
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  color: COLOR.textPrimary,
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 18,
                    background: COLOR.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CalendarCheck size={34} color="#FFFFFF" />
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>ShiftEaze Trainer</div>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: `2.5px solid ${COLOR.border}`,
                    borderTopColor: COLOR.primary,
                    animation: "spin 0.8s linear infinite",
                    marginTop: 8,
                  }}
                />
              </div>
            )}

            {/* Sign-in gate — covers the app until a trainer account signs in */}
            {!account && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 55,
                  background: COLOR.white,
                  overflowY: "auto",
                  padding: "64px 24px 40px",
                }}
              >
                <TrainerSignIn onSignIn={handleSignIn} />
              </div>
            )}

            {/* Dynamic Island Safe Area */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                width: 126,
                height: 36,
                borderRadius: 20,
                background: "#000000",
                zIndex: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px",
              }}
            >
              <div
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#091224",
                  border: "1px solid #1f293d",
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#051329",
                }}
              />
            </div>

            {/* iOS Native Status Bar */}
            <div
              style={{
                height: 52,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                padding: "0 28px 8px",
                fontSize: 14.5,
                fontWeight: 700,
                color: COLOR.ink950,
                zIndex: 40,
                pointerEvents: "none",
                transition: "color 0.25s ease",
              }}
            >
              <span>9:41</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>5G</span>
                <Wifi size={14} />
                <Battery size={16} fill={COLOR.ink950} />
              </div>
            </div>

            {/* Main Scrollable Content Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px 20px 96px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {isViewingNotifications ? (
                <NotificationsPanel
                  notifications={allNotifications}
                  onClose={() => setIsViewingNotifications(false)}
                  onOpenNotificationAction={handleNotificationAction}
                  onMarkAllRead={handleMarkAllRead}
                />
              ) : isViewingProfile ? (
                <ProfileScreen
                  trainer={trainer}
                  attendance={attendance}
                  onBack={() => setIsViewingProfile(false)}
                  onSignOut={handleSignOut}
                  onSaveProfile={(updated) => {
                    setTrainer((prev) => ({ ...prev, ...updated }));
                    showToast("Profile updated successfully.");
                  }}
                />
              ) : isViewingHelpDesk ? (
                <TrainerHelpDesk
                  tickets={tickets}
                  onAddTicket={handleAddTicket}
                  onCancelTicket={handleCancelTicket}
                  onBack={() => setIsViewingHelpDesk(false)}
                  showToast={showToast}
                />
              ) : isViewingAttendance ? (
                <TrainerAttendance
                  attendanceOverrides={attendanceOverrides}
                  onRegularize={handleRegularize}
                  onBack={() => setIsViewingAttendance(false)}
                  showToast={showToast}
                />
              ) : hasPendingScheduleConfirmation && startupWorkflow === "startup" ? (
                <StartupScheduleConfirmation
                  sessions={cycleSessions}
                  monthName={cycleLabel}
                  onConfirmWholeMonth={handleStartupConfirmWholeMonth}
                  onConfirmManually={handleStartupConfirmManually}
                  showToast={showToast}
                />
              ) : hasPendingScheduleConfirmation && startupWorkflow === "calendar_bulk" ? (
                <TrainerSchedule
                  sessions={allLectures}
                  onUpdateSessionStatus={handleUpdateSessionStatus}
                  onOpenSession={(lec) => setActiveSessionDetail(lec)}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  showToast={showToast}
                  isStartupFlow={true}
                  isWholeMonthConfirmed={cyclePendingCount === 0}
                  cycleLabel={cycleLabel}
                  cyclePendingCount={cyclePendingCount}
                  isManualMode={false}
                  onConfirmAll={handleConfirmAllFromCalendar}
                  onContinueToApp={handleContinueToTrainerHome}
                />
              ) : hasPendingScheduleConfirmation && startupWorkflow === "calendar_manual" ? (
                <TrainerSchedule
                  sessions={allLectures}
                  onUpdateSessionStatus={handleUpdateSessionStatus}
                  onOpenSession={(lec) => setActiveSessionDetail(lec)}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  showToast={showToast}
                  isStartupFlow={true}
                  isWholeMonthConfirmed={cyclePendingCount === 0}
                  cycleLabel={cycleLabel}
                  cyclePendingCount={cyclePendingCount}
                  isManualMode={true}
                  onContinueToApp={handleContinueToTrainerHome}
                />
              ) : (
                <>
                  {activeTab === "home" && (
                    <HomeScreen
                      trainer={trainer}
                      heroSession={heroSession}
                      heroState={heroState}
                      listSessions={listSessions}
                      listMode={listMode}
                      sessionState={sessionState}
                      todayCompletedCount={todayCompletedCount}
                      todayTotalCount={todaySessionsAll.length}
                      nextUpcoming={nextUpcoming}
                      onOpenSession={(lec) => setActiveSessionDetail(lec)}
                      onStage2Confirm={handleStage2Confirm}
                      onPunchIn={handlePunchIn}
                      onPunchOut={handlePunchOut}
                      onSetDemoState={handleSetDemoPunch}
                      onOpenNotifications={() => setIsViewingNotifications(true)}
                      onOpenProfile={() => setIsViewingProfile(true)}
                      unreadCount={unreadNotifCount}
                      onOpenSchedule={() => setActiveTab("schedule")}
                      onOpenAuction={() => setActiveTab("auction")}
                      loadLabel={homeLoadLabel}
                      monthCount={homeMonthCount}
                      onOpenLeave={() => {
                        setActiveTab("leave");
                        setIsViewingHelpDesk(false);
                        setIsViewingAttendance(false);
                        setIsViewingProfile(false);
                        setIsViewingNotifications(false);
                      }}
                    />
                  )}

                  {activeTab === "schedule" && (
                    <TrainerSchedule
                      sessions={allLectures}
                      onUpdateSessionStatus={handleUpdateSessionStatus}
                      onOpenSession={(lec) => setActiveSessionDetail(lec)}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      showToast={showToast}
                      onOpenNotifications={() => setIsViewingNotifications(true)}
                      onOpenProfile={() => setIsViewingProfile(true)}
                      unreadCount={unreadNotifCount}
                    />
                  )}

                  {activeTab === "auction" && (
                    <TrainerAuctionScreen
                      key={account?.email ?? "signed-out"}
                      trainer={trainer}
                      buId={account?.buId ?? "BU-PORTS"}
                      mySessions={allLectures}
                      showToast={showToast}
                      onOpenNotifications={() => setIsViewingNotifications(true)}
                      onAddNotification={(notif) => {
                        setNotifications((prev) => [notif, ...prev]);
                      }}
                      onGoToSchedule={() => setActiveTab("schedule")}
                    />
                  )}

                  {activeTab === "utilities" && (
                    <TrainerUtilities
                      trainer={trainer}
                      showToast={showToast}
                      onOpenHelpDesk={() => {
                        setIsViewingHelpDesk(true);
                        setIsViewingAttendance(false);
                        setIsViewingProfile(false);
                        setIsViewingNotifications(false);
                      }}
                      onOpenAttendance={() => {
                        setIsViewingAttendance(true);
                        setIsViewingHelpDesk(false);
                        setIsViewingProfile(false);
                        setIsViewingNotifications(false);
                      }}
                      onOpenNotifications={() => setIsViewingNotifications(true)}
                      onOpenProfile={() => setIsViewingProfile(true)}
                      unreadCount={unreadNotifCount}
                    />
                  )}

                  {activeTab === "leave" && (
                    <LeaveScreen
                      leaveRequests={leaveRequests}
                      onSubmitLeave={handleAddLeave}
                      leaveBalance={leaveBalance}
                      onOpenNotifications={() => setIsViewingNotifications(true)}
                      onOpenProfile={() => setIsViewingProfile(true)}
                      unreadCount={unreadNotifCount}
                    />
                  )}

                  {activeTab === "profile" && (
                    <ProfileScreen
                      trainer={trainer}
                      attendance={attendance}
                      onBack={() => setActiveTab("home")}
                      onSignOut={handleSignOut}
                      onSaveProfile={(updated) => {
                        setTrainer((prev) => ({ ...prev, ...updated }));
                        showToast("Profile updated successfully.");
                      }}
                    />
                  )}
                </>
              )}
            </div>

            {/* --- Native iOS Bottom Navigation Bar (Hidden during startup schedule confirmation) --- */}
            {!(hasPendingScheduleConfirmation && (startupWorkflow === "startup" || startupWorkflow === "calendar_manual")) && (

              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 80,
                  background: "rgba(255, 255, 255, 0.96)",
                  backdropFilter: "blur(20px)",
                  borderTop: `1px solid ${COLOR.border}`,
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  padding: "0 4px 16px",
                  zIndex: 50,
                }}
              >
                {[
                  { id: "home", label: "Home", icon: Home },
                  { id: "schedule", label: "Schedule", icon: CalendarDays },
                  { id: "auction", label: "Auction", icon: Gavel },
                  { id: "utilities", label: "Utilities", icon: LayoutGrid },
                  { id: "leave", label: "Leave", icon: CalendarOff },
                ].map((tab) => {
                  const isSel = activeTab === tab.id && !isViewingNotifications && !isViewingProfile && !isViewingHelpDesk && !isViewingAttendance;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsViewingNotifications(false);
                        setIsViewingProfile(false);
                        setIsViewingHelpDesk(false);
                        setIsViewingAttendance(false);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        background: "transparent",
                        border: 0,
                        color: isSel ? COLOR.brandPrimary : COLOR.textMuted,
                        cursor: "pointer",
                        transition: "color 0.15s ease",
                      }}
                    >
                      <span
                        style={{
                          width: 46,
                          height: 28,
                          borderRadius: RADIUS.pill,
                          background: isSel ? COLOR.primarySoft : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <Icon size={20} strokeWidth={isSel ? 2.4 : 1.8} />
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: isSel ? 700 : 500,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* iOS Home Indicator Bar */}
            <div
              style={{
                position: "absolute",
                bottom: 7,
                left: "50%",
                transform: "translateX(-50%)",
                width: 136,
                height: 4.5,
                borderRadius: 10,
                background: "#000000",
                zIndex: 70,
                pointerEvents: "none",
                opacity: 0.8,
              }}
            />

            {/* Toast Alert */}
            {toast && (
              <div
                key={toast}
                role="status"
                style={{
                  position: "absolute",
                  top: 58,
                  left: "50%",
                  transform: "translateX(-50%)",
                  maxWidth: "calc(100% - 48px)",
                  background: COLOR.white,
                  color: COLOR.textPrimary,
                  border: `1px solid ${COLOR.border}`,
                  padding: "9px 14px",
                  borderRadius: RADIUS.md,
                  fontSize: 13,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: SHADOW.floating,
                  zIndex: 90,
                  animation: "toastIn 0.2s ease-out",
                }}
              >
                <CheckCircle2 size={16} color={COLOR.primary} style={{ flexShrink: 0 }} />
                <span>{toast}</span>
              </div>
            )}

            {/* Full Flow Session Detail Sheet (Confirm -> Punch In -> Punch Out) */}
            <SessionDetailSheet
              session={activeSessionDetail}
              sessionState={activeSessionDetail ? sessionState[activeSessionDetail.id] : null}
              onClose={() => setActiveSessionDetail(null)}
              onStage2Confirm={handleStage2Confirm}
              onStage2Decline={handleStage2Decline}
              onPunchIn={handlePunchIn}
              onPunchOut={handlePunchOut}
              onSetDemoState={handleSetDemoPunch}
            />
          </div>
    </div>
    </TrainerContext.Provider>
  );
}
