import React, { useState, useMemo, useRef, useEffect } from "react";
import { COLOR, RADIUS, SHADOW, TYPE } from "../theme/tokens";
import { TrainerInitials } from "../trainerContext.jsx";
import {
  Calendar,
  CalendarDays,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MapPin,
  Users,
  Check,
  X,
  FileText,
  ArrowRight,
  Info,
  CheckCheck,
  Sparkles,
  Bell,
} from "lucide-react";

// Predefined quick denial reasons
const DENIAL_REASONS = [
  "Unable to attend due to a personal commitment.",
  "Scheduling conflict with another assigned session.",
  "Transit or logistical constraint at terminal.",
  "Medical or health leave requested.",
  "Equipment or curriculum certification mismatch.",
];

// Visual-only: status accent colour for strips and calendar dots
// pending -> amber, confirmed -> navy, completed -> green, denied -> red
const statusAccent = (session) => {
  if (session?.punch?.status === "completed") return COLOR.successBorder;
  if (session?.status === "confirmed") return COLOR.primary;
  if (session?.status === "denied") return COLOR.danger;
  return COLOR.warningBorder;
};

// Months definition (Sunday-first for standard calendar layout)
const MONTHS_DATA = [
  { id: "2026-08", name: "August 2026", shortName: "Aug 2026", daysInMonth: 31, startDayOffset: 6, isCurrent: false },
  { id: "2026-09", name: "September 2026", shortName: "Sep 2026", daysInMonth: 30, startDayOffset: 2, isCurrent: true },
  { id: "2026-10", name: "October 2026", shortName: "Oct 2026", daysInMonth: 31, startDayOffset: 4, isCurrent: false },
  // Room for rosters published from the web dashboard further ahead.
  { id: "2026-11", name: "November 2026", shortName: "Nov 2026", daysInMonth: 30, startDayOffset: 0, isCurrent: false },
  { id: "2026-12", name: "December 2026", shortName: "Dec 2026", daysInMonth: 31, startDayOffset: 2, isCurrent: false },
];

export default function TrainerSchedule({
  sessions = [],
  onUpdateSessionStatus,
  onOpenSession,
  selectedDate,
  setSelectedDate,
  showToast,
  isStartupFlow = false,
  isManualMode = false,
  isWholeMonthConfirmed = false,
  onConfirmAll,
  cycleLabel = "September 2026",
  cyclePendingCount,
  onContinueToApp,
  onOpenNotifications,
  onOpenProfile,
  unreadCount = 0,
  themeMode = "white", // "white" | "dark"
}) {
  const isWhite = themeMode === "white";
  const [activeMonthIndex, setActiveMonthIndex] = useState(1); // September 2026
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "pending" | "confirmed" | "denied"
  const [viewMode, setViewMode] = useState("day"); // "day" | "all-month"

  // Selected Session for Details Modal/Bottom Sheet
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState(null);

  // Denial Modal State
  const [denialTargetSession, setDenialTargetSession] = useState(null);
  const [denialReasonText, setDenialReasonText] = useState("");
  const [denialPreset, setDenialPreset] = useState("");
  const [denialError, setDenialError] = useState("");

  // Long-press date select (startup flow)
  const [selectedDates, setSelectedDates] = useState([]);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);

  const currentMonthMeta = MONTHS_DATA[activeMonthIndex] || MONTHS_DATA[1];

  // Follow the selected date across months — e.g. a roster published for
  // October opens the calendar on October, not the default September.
  useEffect(() => {
    const idx = MONTHS_DATA.findIndex((m) => selectedDate?.startsWith(m.id));
    if (idx >= 0) setActiveMonthIndex(idx);
  }, [selectedDate]);

  // Filter sessions for the active month
  const monthSessions = useMemo(() => {
    return sessions.filter((s) => s.date.startsWith(currentMonthMeta.id));
  }, [sessions, currentMonthMeta]);

  // Statistics for this month
  const stats = useMemo(() => {
    const total = monthSessions.length;
    const confirmed = monthSessions.filter((s) => s.status === "confirmed").length;
    const pending = monthSessions.filter((s) => s.status === "pending").length;
    const denied = monthSessions.filter((s) => s.status === "denied").length;
    return { total, confirmed, pending, denied };
  }, [monthSessions]);

  // Sessions for currently selected date
  const daySessions = useMemo(() => {
    let list = monthSessions.filter((s) => s.date === selectedDate);
    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }
    return list;
  }, [monthSessions, selectedDate, statusFilter]);

  // All month sessions grouped by date (for full month overview)
  const groupedMonthSessions = useMemo(() => {
    const groups = {};
    const sorted = [...monthSessions].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return;
      if (!groups[s.date]) groups[s.date] = [];
      groups[s.date].push(s);
    });
    return groups;
  }, [monthSessions, statusFilter]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (activeMonthIndex > 0) {
      const newIdx = activeMonthIndex - 1;
      setActiveMonthIndex(newIdx);
      const newMonth = MONTHS_DATA[newIdx];
      setSelectedDate(`${newMonth.id}-01`);
    }
  };

  const handleNextMonth = () => {
    if (activeMonthIndex < MONTHS_DATA.length - 1) {
      const newIdx = activeMonthIndex + 1;
      setActiveMonthIndex(newIdx);
      const newMonth = MONTHS_DATA[newIdx];
      setSelectedDate(`${newMonth.id}-01`);
    }
  };

  const handleGoToToday = () => {
    setActiveMonthIndex(1); // September 2026
    setSelectedDate("2026-09-17");
  };

  // Compute 7 days of the week around selectedDate (Mon - Sun)
  const weekDays = useMemo(() => {
    const baseDateStr = selectedDate || "2026-09-17";
    const parts = baseDateStr.split("-").map(Number);
    const current = new Date(parts[0], parts[1] - 1, parts[2]);

    // Monday as start of week: in JS, Sun is 0, Mon is 1 ... Sat is 6
    const dayOfWeek = (current.getDay() + 6) % 7;
    const monday = new Date(current);
    monday.setDate(current.getDate() - dayOfWeek);

    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const list = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      const yr = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, "0");
      const da = String(dt.getDate()).padStart(2, "0");
      const iso = `${yr}-${mo}-${da}`;

      const dayLecs = sessions.filter((s) => s.date === iso);
      let dotColor = "#64748B"; // default grey dot
      let dotType = "none";
      if (dayLecs.length > 0) {
        const isCompleted = dayLecs.some(
          (s) => s.status === "confirmed" || s.punch?.status === "completed"
        );
        if (isCompleted) {
          dotColor = COLOR.success;
          dotType = "completed";
        } else {
          dotColor = COLOR.primary;
          dotType = "scheduled";
        }
      }

      list.push({
        isoDate: iso,
        dayName: dayNames[i],
        dayNum: dt.getDate(),
        sessions: dayLecs,
        dotColor,
        dotType,
        isSelected: iso === selectedDate,
        hasSessions: dayLecs.length > 0,
      });
    }
    return list;
  }, [selectedDate, sessions]);

  // Navigate by week
  const handlePrevWeek = () => {
    const [y, m, d] = (selectedDate || "2026-09-17").split("-").map(Number);
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() - 7);
    const newIso = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`;
    setSelectedDate(newIso);
  };

  const handleNextWeek = () => {
    const [y, m, d] = (selectedDate || "2026-09-17").split("-").map(Number);
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() + 7);
    const newIso = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`;
    setSelectedDate(newIso);
  };

  // Dot color helper for month calendar grid
  const getMonthDayDotColor = (dateIso) => {
    const dayLecs = monthSessions.filter((s) => s.date === dateIso);
    if (dayLecs.length === 0) return "#475569"; // subtle dark grey
    const isCompleted = dayLecs.some(
      (s) => s.status === "confirmed" || s.punch?.status === "completed"
    );
    if (isCompleted) return COLOR.success;
    return COLOR.primary;
  };

  // Confirm Individual Session (Section 11)
  const handleConfirmSingleSession = (e, session) => {
    if (e) e.stopPropagation();
    onUpdateSessionStatus(session.id, "confirmed", null);

    // Update selected session details modal if open
    if (selectedSessionForDetails && selectedSessionForDetails.id === session.id) {
      setSelectedSessionForDetails((prev) => ({ ...prev, status: "confirmed" }));
    }
    showToast("Session confirmed");
  };

  // Open Deny Modal (Section 12)
  const handleOpenDenyModal = (e, session) => {
    if (e) e.stopPropagation();
    setDenialTargetSession(session);
    setDenialPreset(session.denialReason || "");
    setDenialReasonText(session.denialReason || "");
    setDenialError("");
  };

  // Submit Denial with Validation (Section 13 & 14)
  const handleSubmitDenial = () => {
    const finalReason = (denialReasonText || denialPreset).trim();
    if (!finalReason) {
      setDenialError("Please enter a reason before denying this session.");
      return;
    }

    if (denialTargetSession) {
      onUpdateSessionStatus(denialTargetSession.id, "denied", finalReason);

      // Update selected session details modal if open
      if (selectedSessionForDetails && selectedSessionForDetails.id === denialTargetSession.id) {
        setSelectedSessionForDetails((prev) => ({
          ...prev,
          status: "denied",
          denialReason: finalReason,
        }));
      }
      showToast("Session denied");
    }

    setDenialTargetSession(null);
    setDenialReasonText("");
    setDenialPreset("");
    setDenialError("");
  };

  // Long-press date select (startup flow): long-press a date to start
  // selecting, tap more dates to add/remove them, then confirm every pending
  // session on the selected dates in one go.
  const pendingOn = (dateIso) => monthSessions.filter((s) => s.date === dateIso && s.status === "pending");
  const selectedPending = useMemo(
    () => monthSessions.filter((s) => s.status === "pending" && selectedDates.includes(s.date)),
    [monthSessions, selectedDates]
  );
  const selectMode = isStartupFlow && selectedDates.length > 0;
  // Under the calendar: the focused day normally, or every session about to be confirmed while selecting
  const listedSessions = selectMode ? [...selectedPending].sort((a, b) => a.date.localeCompare(b.date)) : daySessions;

  const toggleDate = (dateIso) => {
    if (selectedDates.includes(dateIso)) { setSelectedDates((prev) => prev.filter((d) => d !== dateIso)); return; }
    if (!pendingOn(dateIso).length) { showToast("No pending sessions on that date"); return; }
    setSelectedDates((prev) => [...prev, dateIso]);
  };
  const startLongPress = (dateIso) => {
    if (!isStartupFlow) return;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (!selectedDates.includes(dateIso)) toggleDate(dateIso);
    }, 500);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);
  const handleDateClick = (dateIso) => {
    if (longPressFired.current) { longPressFired.current = false; return; }
    if (selectMode) { toggleDate(dateIso); return; }
    setSelectedDate(dateIso);
    setViewMode("day");
  };
  const handleConfirmSelectedDates = () => {
    if (!selectedPending.length) return;
    selectedPending.forEach((s) => onUpdateSessionStatus(s.id, "confirmed", null));
    showToast(`${selectedPending.length} session${selectedPending.length > 1 ? "s" : ""} confirmed on ${selectedDates.length} date${selectedDates.length > 1 ? "s" : ""}`);
    setSelectedDates([]);
  };

  // Format date readable
  const formatDateLabel = (isoDate) => {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    const d = parseInt(parts[2], 10);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const m = months[parseInt(parts[1], 10) - 1];
    return `${d} ${m}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
      <style>{`
        @keyframes sessionCardFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .cal-day-cell {
          transition: background-color 0.15s ease, color 0.15s ease;
        }
      `}</style>

      {/* Main Tab Header with Notification & Profile Avatar */}
      {!isStartupFlow && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 2,
          }}
        >
          <div style={{ ...TYPE.pageTitle, color: isWhite ? COLOR.textPrimary : "#FFFFFF" }}>
            Schedule
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
                  background: isWhite ? COLOR.primarySoft : "rgba(255, 255, 255, 0.08)",
                  border: isWhite ? `1px solid ${COLOR.primary200}` : "1px solid rgba(255, 255, 255, 0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                  boxShadow: "none",
                  transition: "background-color 0.15s ease",
                }}
              >
                <Bell size={20} color={isWhite ? COLOR.primary : "#FFFFFF"} />
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
                      border: `2px solid ${isWhite ? "#FFFFFF" : "#0F172A"}`,
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
                  background: isWhite ? COLOR.primary : "#1E293B",
                  color: "#FFFFFF",
                  border: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "none",
                }}
              >
                <TrainerInitials />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BULK STARTUP FLOW: Confirm All banner (pending state only)          */}
      {/* ------------------------------------------------------------------ */}
      {isStartupFlow && !isManualMode && !isWholeMonthConfirmed && !selectMode && (
        <div
          style={{
            background: COLOR.primary,
            borderRadius: RADIUS.card,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxShadow: "none",
            border: `1px solid ${COLOR.primary}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CalendarCheck size={20} color={COLOR.primary200} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...TYPE.section, color: COLOR.textWhite }}>
                Confirm {cycleLabel}
              </div>
              <div style={{ ...TYPE.metadata, color: COLOR.primary200, marginTop: 2 }}>
                {cyclePendingCount ?? stats.pending} pending
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onConfirmAll}
            style={{
              width: "100%",
              padding: "13px 18px",
              borderRadius: RADIUS.md,
              background: COLOR.white,
              color: COLOR.primary,
              border: 0,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "none",
            }}
          >
            <CheckCheck size={17} />
            <span>Confirm All</span>
          </button>
        </div>
      )}



      {/* ------------------------------------------------------------------ */}
      {/* LONG-PRESS DATE SELECT (startup flow, Confirm All + Confirm Manually) */}
      {/* ------------------------------------------------------------------ */}
      {selectMode && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: COLOR.primary,
            borderRadius: RADIUS.card,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...TYPE.section, color: COLOR.textWhite }}>
                {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""} selected
              </div>
              <div style={{ ...TYPE.metadata, color: COLOR.primary200, marginTop: 2 }}>
                {selectedPending.length} pending session{selectedPending.length !== 1 ? "s" : ""} · tap dates to add or remove
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDates([])}
              style={{ background: "transparent", border: `1px solid ${COLOR.primary200}`, color: COLOR.textWhite,
                borderRadius: RADIUS.pill, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
          <button
            type="button"
            onClick={handleConfirmSelectedDates}
            style={{ width: "100%", padding: "12px 16px", borderRadius: RADIUS.md, background: COLOR.white, color: COLOR.primary, border: 0,
              fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <CheckCheck size={17} />
            <span>Confirm {selectedPending.length} Session{selectedPending.length !== 1 ? "s" : ""}</span>
          </button>
        </div>
      )}

      {isStartupFlow && !selectMode && monthSessions.some((s) => s.status === "pending") && (
        <div style={{ ...TYPE.metadata, color: COLOR.textSecondary, display: "flex", alignItems: "center", gap: 6, padding: "0 2px" }}>
          <Info size={13} color={COLOR.primary} />
          <span>Tip: long-press a date to select several dates and confirm them together</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MONTH CALENDAR CONTAINER                                           */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          background: isWhite ? COLOR.white : "#0F172A",
          borderRadius: RADIUS.card,
          padding: "16px 14px",
          border: isWhite ? `1px solid ${COLOR.border}` : "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: isWhite ? SHADOW.card : "none",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Month Title & Chevron Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={activeMonthIndex === 0}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: isWhite
                ? `1px solid ${activeMonthIndex === 0 ? COLOR.border : COLOR.primary200}`
                : "1px solid rgba(255, 255, 255, 0.14)",
              background: activeMonthIndex === 0
                ? (isWhite ? COLOR.surfaceMuted : "rgba(255, 255, 255, 0.02)")
                : (isWhite ? COLOR.primarySoft : "rgba(255, 255, 255, 0.06)"),
              color: activeMonthIndex === 0
                ? (isWhite ? COLOR.ink400 : "rgba(255, 255, 255, 0.2)")
                : (isWhite ? COLOR.primary : "#E2E8F0"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: activeMonthIndex === 0 ? "not-allowed" : "pointer",
            }}
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>

          <div style={{ textAlign: "center" }}>
            <div style={{ ...TYPE.section, color: isWhite ? COLOR.textPrimary : "#FFFFFF" }}>
              {currentMonthMeta.name}
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={activeMonthIndex === MONTHS_DATA.length - 1}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: isWhite
                ? `1px solid ${activeMonthIndex === MONTHS_DATA.length - 1 ? COLOR.border : COLOR.primary200}`
                : "1px solid rgba(255, 255, 255, 0.14)",
              background: activeMonthIndex === MONTHS_DATA.length - 1
                ? (isWhite ? COLOR.surfaceMuted : "rgba(255, 255, 255, 0.02)")
                : (isWhite ? COLOR.primarySoft : "rgba(255, 255, 255, 0.06)"),
              color: activeMonthIndex === MONTHS_DATA.length - 1
                ? (isWhite ? COLOR.ink400 : "rgba(255, 255, 255, 0.2)")
                : (isWhite ? COLOR.primary : "#E2E8F0"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: activeMonthIndex === MONTHS_DATA.length - 1 ? "not-allowed" : "pointer",
            }}
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Weekday headers: Sun Mon Tue Wed Thu Fri Sat */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            textAlign: "center",
            paddingBottom: 2,
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <span key={d} style={{ fontSize: 12, fontWeight: 600, color: isWhite ? COLOR.ink600 : "#94A3B8" }}>
              {d}
            </span>
          ))}
        </div>

        {/* 7-Column Days Grid with Multiple Session Dots per Day */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {Array.from({ length: currentMonthMeta.startDayOffset }).map((_, idx) => (
            <div key={`offset-${idx}`} style={{ height: 42, background: "transparent" }} />
          ))}

          {Array.from({ length: currentMonthMeta.daysInMonth }, (_, i) => i + 1).map((dayNum) => {
            const dateIso = `${currentMonthMeta.id}-${String(dayNum).padStart(2, "0")}`;
            const isPicked = selectMode && selectedDates.includes(dateIso);
            const isSelected = !selectMode && selectedDate === dateIso;
            const isToday = currentMonthMeta.isCurrent && dayNum === 17;
            const daySessionsForDate = monthSessions.filter((s) => s.date === dateIso);

            return (
              <button
                key={dayNum}
                type="button"
                className="cal-day-cell"
                onClick={() => handleDateClick(dateIso)}
                onPointerDown={() => startLongPress(dateIso)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onContextMenu={(e) => isStartupFlow && e.preventDefault()}
                style={{
                  height: 42,
                  borderRadius: 12,
                  border: isPicked ? `1.5px solid ${COLOR.primary}` : "1.5px solid transparent",
                  background: isPicked ? COLOR.primarySoft : "transparent",
                  position: "relative",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  cursor: "pointer",
                  padding: 1,
                  transform: "scale(1)",
                  transition: "color 0.15s ease",
                }}
              >
                {isPicked && (
                  <span style={{ position: "absolute", top: 2, right: 3, width: 13, height: 13, borderRadius: "50%", background: COLOR.primary,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={9} color="#FFFFFF" strokeWidth={3.5} />
                  </span>
                )}
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: isSelected || isToday || isPicked ? 700 : 500,
                    color: isSelected
                      ? "#FFFFFF"
                      : isPicked
                        ? COLOR.primary
                        : isToday
                        ? COLOR.brandCrimson
                        : isWhite ? COLOR.textPrimary : "#F1F5F9",
                    background: isSelected ? (isWhite ? COLOR.primary : "#334155") : "transparent",
                    border: isToday && !isSelected
                      ? `1.5px solid ${COLOR.brandCrimson}`
                      : "1.5px solid transparent",
                    boxSizing: "border-box",
                    borderRadius: "50%",
                    width: 30,
                    height: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {dayNum}
                </span>

                {/* Multiple dots corresponding to sessions on that day */}
                <div style={{ display: "flex", gap: 2.5, alignItems: "center", justifyContent: "center", minHeight: 6, marginTop: 1 }}>
                  {daySessionsForDate.length === 0 ? (
                    <span
                      style={{
                        width: 3.5,
                        height: 3.5,
                        borderRadius: "50%",
                        background: isWhite ? "transparent" : "#475569",
                        display: "inline-block",
                      }}
                    />
                  ) : (
                    daySessionsForDate.slice(0, 3).map((session, sIdx) => {
                      const dotColor = isWhite ? statusAccent(session) : "#CBD5E1";
                      return (
                        <span
                          key={sIdx}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: dotColor,
                            display: "inline-block",
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day's Session Card(s) - Matching the mockup */}
        <div
          style={{
            marginTop: 4,
            paddingTop: 12,
            borderTop: isWhite ? `1px solid ${COLOR.border}` : "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {listedSessions.length === 0 ? (
            <div
              style={{
                background: isWhite ? COLOR.surface : "#1E293B",
                borderRadius: RADIUS.md,
                padding: "16px",
                textAlign: "center",
                border: isWhite ? `1px solid ${COLOR.border}` : "1px solid rgba(255, 255, 255, 0.06)",
                animation: "sessionCardFade 0.2s ease",
              }}
            >
              <div style={{ ...TYPE.bodyMedium, color: isWhite ? COLOR.textSecondary : "#94A3B8" }}>
                No sessions on {formatDateLabel(selectedDate)}
              </div>
              {selectedDate !== "2026-09-17" && (
                <button
                  type="button"
                  onClick={handleGoToToday}
                  style={{
                    marginTop: 10,
                    padding: "6px 14px",
                    borderRadius: RADIUS.pill,
                    background: isWhite ? COLOR.primarySoft : "rgba(255, 255, 255, 0.06)",
                    color: isWhite ? COLOR.primary : "#E2E8F0",
                    border: isWhite ? `1px solid ${COLOR.primary200}` : "1px solid rgba(255, 255, 255, 0.14)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Today
                </button>
              )}
            </div>
          ) : (
            listedSessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedSessionForDetails(s)}
                style={{
                  background: isWhite ? COLOR.white : "#1E293B",
                  borderRadius: RADIUS.md,
                  padding: "12px 14px",
                  border: isWhite ? `1px solid ${COLOR.border}` : "1px solid rgba(255, 255, 255, 0.08)",
                  borderLeft: `4px solid ${statusAccent(s)}`,
                  boxShadow: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  animation: "sessionCardFade 0.2s ease",
                  transition: "background-color 0.15s ease",
                }}
              >
                <div style={{ ...TYPE.cardTitle, color: isWhite ? COLOR.textPrimary : "#FFFFFF" }}>
                  {s.label || s.sessionType}
                </div>
                <div style={{ ...TYPE.metadata, color: isWhite ? COLOR.textSecondary : "#94A3B8" }}>
                  {selectMode ? `${formatDateLabel(s.date)} · ` : ""}{s.time || "09:00 AM - 11:00 AM"} · {s.room || "Sim Bay B204"}
                </div>
                {(s.status === "confirmed" || s.status === "denied") && (
                  <div style={{ marginTop: 2 }}>
                    {s.status === "confirmed" ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: RADIUS.pill,
                          background: isWhite ? COLOR.successLight : "rgba(19, 122, 63, 0.16)",
                          color: isWhite ? COLOR.success : "#34D399",
                          border: 0,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Confirmed
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: RADIUS.pill,
                          background: isWhite ? COLOR.dangerLight : "rgba(179, 38, 30, 0.2)",
                          color: isWhite ? COLOR.danger : "#F2B8B5",
                          border: 0,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Denied
                      </span>
                    )}
                  </div>
                )}

                {/* Quick actions for pending sessions */}
                {s.status === "pending" && (!isStartupFlow || isManualMode) && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginTop: 6,
                      paddingTop: 8,
                      borderTop: isWhite ? `1px solid ${COLOR.border}` : "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleConfirmSingleSession(e, s)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: RADIUS.sm,
                        background: COLOR.primary,
                        color: "#FFFFFF",
                        border: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                      }}
                    >
                      <Check size={13} />
                      <span>Confirm</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleOpenDenyModal(e, s)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: RADIUS.sm,
                        background: isWhite ? COLOR.white : "transparent",
                        color: isWhite ? COLOR.danger : "#F2B8B5",
                        border: isWhite ? `1px solid ${COLOR.border}` : "1px solid rgba(255, 255, 255, 0.14)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                      }}
                    >
                      <X size={13} />
                      <span>Deny</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. OPTIONAL VIEW TOGGLE (CALENDAR VIEW VS WHOLE MONTH LIST)        */}
      {/* ------------------------------------------------------------------ */}
      {!selectMode && (!isStartupFlow || isManualMode || isWholeMonthConfirmed) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "day" ? "all-month" : "day")}
            style={{
              background: isWhite ? COLOR.primarySoft : "rgba(255, 255, 255, 0.06)",
              border: isWhite ? `1px solid ${COLOR.primary200}` : "1px solid rgba(255, 255, 255, 0.14)",
              borderRadius: RADIUS.pill,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: isWhite ? COLOR.primary : "#E2E8F0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "none",
              transition: "background-color 0.15s ease",
            }}
          >
            {viewMode === "day" ? (
              <CalendarDays size={14} color={isWhite ? COLOR.primary : "#E2E8F0"} />
            ) : (
              <ChevronLeft size={14} color={isWhite ? COLOR.primary : "#E2E8F0"} />
            )}
            <span>{viewMode === "day" ? "Month List" : "Calendar"}</span>
          </button>

          {viewMode === "all-month" && (
            <div style={{ display: "flex", gap: 4 }}>
              {["all", "pending", "confirmed", "denied"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    border: statusFilter === f
                      ? `1px solid ${COLOR.primary}`
                      : (isWhite ? `1px solid ${COLOR.border}` : "1px solid rgba(255, 255, 255, 0.12)"),
                    background: statusFilter === f ? COLOR.primary : (isWhite ? COLOR.white : "rgba(15, 23, 42, 0.6)"),
                    color: statusFilter === f ? "#FFFFFF" : (isWhite ? COLOR.textSecondary : "#94A3B8"),
                    padding: "3px 8px",
                    borderRadius: RADIUS.pill,
                    fontSize: 11,
                    fontWeight: statusFilter === f ? 600 : 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Whole Month Grouped List (only shown when user toggles to all-month) */}
      {!selectMode && viewMode === "all-month" && (!isStartupFlow || isManualMode || isWholeMonthConfirmed) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Object.keys(groupedMonthSessions).length === 0 ? (
            <div
              style={{
                background: isWhite ? COLOR.white : "#0F172A",
                borderRadius: RADIUS.card,
                padding: "24px 16px",
                textAlign: "center",
                border: isWhite ? `1px solid ${COLOR.border}` : "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ ...TYPE.bodyMedium, color: isWhite ? COLOR.textSecondary : "#94A3B8" }}>
                No {statusFilter !== "all" ? statusFilter : ""} sessions in {currentMonthMeta.name}
              </div>
            </div>
          ) : (
            Object.keys(groupedMonthSessions).map((dateKey) => (
              <div key={dateKey} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    ...TYPE.metadata,
                    fontWeight: 600,
                    color: isWhite ? COLOR.textSecondary : "#FFFFFF",
                    padding: "0 2px",
                  }}
                >
                  <span>{formatDateLabel(dateKey)}</span>
                </div>

                {groupedMonthSessions[dateKey].map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onSelectSession={() => setSelectedSessionForDetails(s)}
                    onConfirm={(e) => handleConfirmSingleSession(e, s)}
                    onDeny={(e) => handleOpenDenyModal(e, s)}
                    showActions={!isStartupFlow || isManualMode}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BOTTOM "CONTINUE TO TRAINER APP" BUTTON (manual startup mode only) */}
      {/* ------------------------------------------------------------------ */}
      {isStartupFlow && onContinueToApp && isManualMode && !selectMode && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={onContinueToApp}
            style={{
              width: "100%",
              padding: "13px 18px",
              borderRadius: RADIUS.md,
              background: COLOR.primary,
              color: COLOR.white,
              border: 0,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "none",
            }}
          >
            <span>Continue</span>
            <ArrowRight size={17} />
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* SESSION DETAILS MODAL / BOTTOM SHEET (Section 10)                  */}
      {/* ================================================================== */}
      {selectedSessionForDetails && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            zIndex: 110,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            animation: "fadeIn 0.15s ease",
          }}
          onClick={() => setSelectedSessionForDetails(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLOR.white,
              borderTopLeftRadius: RADIUS.modal,
              borderTopRightRadius: RADIUS.modal,
              padding: "16px 20px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              maxHeight: "88%",
              overflowY: "auto",
              boxShadow: SHADOW.sheet,
              borderTop: `1px solid ${COLOR.border}`,
            }}
          >
            {/* Grab handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: COLOR.border, alignSelf: "center" }} />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ ...TYPE.section, color: COLOR.textPrimary }}>
                Session Details
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionForDetails(null)}
                style={{
                  border: `1px solid ${COLOR.border}`,
                  background: COLOR.white,
                  color: COLOR.textSecondary,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Details Fields (Section 10) */}
            <div
              style={{
                background: COLOR.surface,
                borderRadius: RADIUS.md,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                border: `1px solid ${COLOR.border}`,
                borderLeft: `4px solid ${statusAccent(selectedSessionForDetails)}`,
              }}
            >
              <div>
                <div style={{ ...TYPE.caption, color: COLOR.textMuted }}>Date</div>
                <div style={{ ...TYPE.cardTitle, color: COLOR.textPrimary, marginTop: 2 }}>
                  {formatDateLabel(selectedSessionForDetails.date)} 2026
                </div>
              </div>

              <div>
                <div style={{ ...TYPE.caption, color: COLOR.textMuted }}>Time</div>
                <div style={{ ...TYPE.cardTitle, color: COLOR.textPrimary, marginTop: 2 }}>
                  {selectedSessionForDetails.time}
                </div>
              </div>

              <div>
                <div style={{ ...TYPE.caption, color: COLOR.textMuted }}>Client</div>
                <div style={{ ...TYPE.cardTitle, color: COLOR.textPrimary, marginTop: 2 }}>
                  {selectedSessionForDetails.client || "John Doe"}
                </div>
              </div>

              <div>
                <div style={{ ...TYPE.caption, color: COLOR.textMuted }}>Session Type</div>
                <div style={{ ...TYPE.cardTitle, color: COLOR.textPrimary, marginTop: 2 }}>
                  {selectedSessionForDetails.sessionType || "Personal Training"}
                </div>
              </div>

              <div>
                <div style={{ ...TYPE.caption, color: COLOR.textMuted }}>Status</div>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={selectedSessionForDetails.status} />
                </div>
              </div>

              {selectedSessionForDetails.status === "denied" && selectedSessionForDetails.denialReason && (
                <div
                  style={{
                    background: COLOR.dangerLight,
                    border: 0,
                    borderRadius: RADIUS.sm,
                    padding: "10px 12px",
                    marginTop: 2,
                  }}
                >
                  <div style={{ ...TYPE.caption, color: COLOR.danger }}>Reason</div>
                  <div style={{ ...TYPE.body, color: COLOR.textPrimary, marginTop: 2 }}>
                    {selectedSessionForDetails.denialReason}
                  </div>
                </div>
              )}
            </div>

            {/* Actions: Confirm, Deny (Section 10) - Only shown in manual mode or outside startup flow */}
            {(!isStartupFlow || isManualMode) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  onClick={(e) => handleConfirmSingleSession(e, selectedSessionForDetails)}
                  style={{
                    padding: "13px",
                    borderRadius: RADIUS.md,
                    background: selectedSessionForDetails.status === "confirmed" ? COLOR.surfaceMuted : COLOR.primary,
                    color: selectedSessionForDetails.status === "confirmed" ? COLOR.success : COLOR.white,
                    border: selectedSessionForDetails.status === "confirmed" ? `1px solid ${COLOR.border}` : 0,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Check size={16} />
                  <span>{selectedSessionForDetails.status === "confirmed" ? "Confirmed" : "Confirm"}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleOpenDenyModal(e, selectedSessionForDetails)}
                  style={{
                    padding: "13px",
                    borderRadius: RADIUS.md,
                    background: COLOR.white,
                    color: COLOR.danger,
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
                  <X size={16} />
                  <span>{selectedSessionForDetails.status === "denied" ? "Edit Denial" : "Deny"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DENY SESSION MODAL (Section 12, 13, 14)                            */}
      {/* ================================================================== */}
      {denialTargetSession && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            zIndex: 130,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            animation: "fadeIn 0.15s ease",
          }}
          onClick={() => {
            setDenialTargetSession(null);
            setDenialError("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 380,
              background: COLOR.cardBg,
              border: `1px solid ${COLOR.border}`,
              borderRadius: RADIUS.modal,
              padding: "22px 20px",
              boxShadow: SHADOW.modal,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ ...TYPE.section, color: COLOR.textPrimary }}>
                Deny Session
              </div>

              <button
                type="button"
                onClick={() => {
                  setDenialTargetSession(null);
                  setDenialError("");
                }}
                style={{
                  border: `1px solid ${COLOR.border}`,
                  background: COLOR.surfaceMuted,
                  color: COLOR.textSecondary,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Session summary */}
            <div
              style={{
                background: COLOR.surfaceMuted,
                borderRadius: RADIUS.sm,
                padding: "9px 12px",
                border: `1px solid ${COLOR.border}`,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: COLOR.textPrimary }}>
                {denialTargetSession.time} · {denialTargetSession.client || "Client"}
              </div>
              <div style={{ color: COLOR.textSecondary, marginTop: 2 }}>
                {denialTargetSession.sessionType || denialTargetSession.label}
              </div>
            </div>

            {/* Preset quick selection */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLOR.textSecondary, marginBottom: 6 }}>
                Quick Reasons
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {DENIAL_REASONS.slice(0, 3).map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDenialPreset(r);
                      setDenialReasonText(r);
                      setDenialError("");
                    }}
                    style={{
                      textAlign: "left",
                      padding: "7px 10px",
                      borderRadius: RADIUS.sm,
                      border: denialReasonText === r ? `1px solid ${COLOR.danger}` : `1px solid ${COLOR.border}`,
                      background: denialReasonText === r ? COLOR.dangerLight : COLOR.cardBg,
                      color: denialReasonText === r ? COLOR.danger : COLOR.textPrimary,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Required Reason Field */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: COLOR.textSecondary,
                  marginBottom: 6,
                }}
              >
                Reason <span style={{ color: COLOR.danger }}>*</span>
              </label>
              <textarea
                value={denialReasonText}
                onChange={(e) => {
                  setDenialReasonText(e.target.value);
                  setDenialError("");
                }}
                placeholder="Enter reason..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: RADIUS.md,
                  border: `1px solid ${denialError ? COLOR.danger : COLOR.borderStrong}`,
                  background: COLOR.cardBg,
                  color: COLOR.textPrimary,
                  fontSize: 13,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  outline: "none",
                  resize: "vertical",
                }}
              />
              {denialError && (
                <div style={{ color: COLOR.danger, fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>
                  {denialError}
                </div>
              )}
            </div>

            {/* Buttons: Cancel & Submit Denial */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setDenialTargetSession(null);
                  setDenialError("");
                }}
                style={{
                  padding: "11px",
                  borderRadius: RADIUS.pill,
                  background: COLOR.surfaceMuted,
                  color: COLOR.textPrimary,
                  border: `1px solid ${COLOR.border}`,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitDenial}
                style={{
                  padding: "11px 16px",
                  borderRadius: RADIUS.pill,
                  background: COLOR.danger,
                  color: COLOR.white,
                  border: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "none",
                }}
              >
                <span>Deny</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// HELPER: Status Badge (ShiftEaze Semantic Standard)
// ----------------------------------------------------------------------
function StatusBadge({ status }) {
  if (status === "confirmed") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: RADIUS.pill,
          background: COLOR.successLight,
          color: COLOR.success,
          border: 0,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        <Check size={12} />
        <span>Confirmed</span>
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: RADIUS.pill,
          background: COLOR.dangerLight,
          color: COLOR.danger,
          border: 0,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        <X size={12} />
        <span>Denied</span>
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: RADIUS.pill,
        background: COLOR.warningLight,
        color: COLOR.warning,
        border: 0,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      <AlertTriangle size={12} />
      <span>Pending</span>
    </span>
  );
}

// ----------------------------------------------------------------------
// HELPER: Session Card (ShiftEaze Enterprise Card Layout)
// ----------------------------------------------------------------------
function SessionCard({ session, onSelectSession, onConfirm, onDeny, showActions = true, hidePendingBadge = false }) {
  const isConfirmed = session.status === "confirmed";
  const isPending = session.status === "pending";
  const isDenied = session.status === "denied";

  return (
    <div
      onClick={onSelectSession}
      style={{
        background: COLOR.cardBg,
        borderRadius: RADIUS.card,
        padding: "14px 16px",
        border: `1px solid ${COLOR.border}`,
        borderLeft: `4px solid ${statusAccent(session)}`,
        boxShadow: SHADOW.card,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "background-color 0.15s ease",
      }}
    >
      {/* Time & Client / Label */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.brandPrimary, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} color={COLOR.brandPrimary} />
            <span>{session.time || "06:00 PM"}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.textPrimary, marginTop: 3 }}>
            {session.label || session.sessionType}
          </div>
          <div style={{ fontSize: 11.5, color: COLOR.textMuted, marginTop: 3, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
            <span>Client: <strong style={{ color: COLOR.textSecondary }}>{session.client || "Client"}</strong></span>
            {session.room && (
              <>
                <span>•</span>
                <span>{session.room}</span>
              </>
            )}
            {session.learners && (
              <>
                <span>•</span>
                <span>{session.learners} Learners</span>
              </>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isConfirmed && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: RADIUS.pill,
                background: COLOR.successLight,
                color: COLOR.success,
                border: 0,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <Check size={12} />
              <span>Confirmed</span>
            </span>
          )}

          {isPending && !hidePendingBadge && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: RADIUS.pill,
                background: COLOR.warningLight,
                color: COLOR.warning,
                border: 0,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <AlertTriangle size={12} />
              <span>Pending</span>
            </span>
          )}

          {isDenied && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: RADIUS.pill,
                background: COLOR.dangerLight,
                color: COLOR.danger,
                border: 0,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <X size={12} />
              <span>Denied</span>
            </span>
          )}
        </div>
      </div>

      {/* Denial Reason Note if Denied */}
      {isDenied && session.denialReason && (
        <div
          style={{
            background: COLOR.dangerLight,
            borderRadius: RADIUS.sm,
            padding: "6px 10px",
            fontSize: 11.5,
            color: COLOR.danger,
            border: 0,
          }}
        >
          <strong>Reason:</strong> {session.denialReason}
        </div>
      )}

      {/* Pending Quick Actions: [ Confirm ] [ Deny ] */}
      {isPending && showActions && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginTop: 4,
            paddingTop: 8,
            borderTop: `1px solid ${COLOR.border}`,
          }}
        >
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "8px 12px",
              borderRadius: RADIUS.sm,
              background: COLOR.primary,
              color: COLOR.white,
              border: 0,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              boxShadow: "none",
            }}
          >
            <Check size={13} />
            <span>Confirm</span>
          </button>

          <button
            type="button"
            onClick={onDeny}
            style={{
              padding: "8px 12px",
              borderRadius: RADIUS.sm,
              background: COLOR.cardBg,
              color: COLOR.danger,
              border: `1px solid ${COLOR.border}`,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <X size={13} />
            <span>Deny</span>
          </button>
        </div>
      )}
    </div>
  );
}
