import React, { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { COLOR, RADIUS, SHADOW } from "../theme/tokens";

/* ── Mock: September 2026 Attendance (30 days) ─────────────────────── */
export const SEPTEMBER_ATTENDANCE = [
  { day:1,  date:"2026-09-01", dayName:"Tue", status:"PRESENT",        punchIn:"08:55 AM", punchOut:"05:10 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:2,  date:"2026-09-02", dayName:"Wed", status:"PRESENT",        punchIn:"08:52 AM", punchOut:"05:05 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:3,  date:"2026-09-03", dayName:"Thu", status:"PRESENT",        punchIn:"09:00 AM", punchOut:"05:15 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:4,  date:"2026-09-04", dayName:"Fri", status:"PRESENT",        punchIn:"08:58 AM", punchOut:"05:08 PM", hours:8.1, shift:"General Shift (09:00 - 17:00)" },
  { day:5,  date:"2026-09-05", dayName:"Sat", status:"WEEK OFF",       punchIn:"--",       punchOut:"--",       hours:0,   shift:"Scheduled Roster Off" },
  { day:6,  date:"2026-09-06", dayName:"Sun", status:"WEEK OFF",       punchIn:"--",       punchOut:"--",       hours:0,   shift:"Scheduled Roster Off" },
  { day:7,  date:"2026-09-07", dayName:"Mon", status:"PRESENT",        punchIn:"08:54 AM", punchOut:"05:12 PM", hours:8.3, shift:"General Shift (09:00 - 17:00)" },
  { day:8,  date:"2026-09-08", dayName:"Tue", status:"HALF DAY",       punchIn:"08:50 AM", punchOut:"01:05 PM", hours:4.2, shift:"Morning Half (09:00 - 13:00)" },
  { day:9,  date:"2026-09-09", dayName:"Wed", status:"PRESENT",        punchIn:"08:57 AM", punchOut:"05:18 PM", hours:8.3, shift:"General Shift (09:00 - 17:00)" },
  { day:10, date:"2026-09-10", dayName:"Thu", status:"LEAVE",          punchIn:"--",       punchOut:"--",       hours:0,   shift:"Casual Leave (Approved)" },
  { day:11, date:"2026-09-11", dayName:"Fri", status:"PRESENT",        punchIn:"08:56 AM", punchOut:"05:11 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:12, date:"2026-09-12", dayName:"Sat", status:"COMPANY WORK",   punchIn:"09:30 AM", punchOut:"06:00 PM", hours:8.5, shift:"Outer Anchorage Duty - Vessel Berth 4" },
  { day:13, date:"2026-09-13", dayName:"Sun", status:"WEEK OFF",       punchIn:"--",       punchOut:"--",       hours:0,   shift:"Scheduled Roster Off" },
  { day:14, date:"2026-09-14", dayName:"Mon", status:"PRESENT",        punchIn:"08:51 AM", punchOut:"05:04 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:15, date:"2026-09-15", dayName:"Tue", status:"PRESENT",        punchIn:"08:59 AM", punchOut:"05:15 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:16, date:"2026-09-16", dayName:"Wed", status:"HOLIDAY",        punchIn:"--",       punchOut:"--",       hours:0,   shift:"Gazetted Public Holiday", holidayName:"Milad-un-Nabi" },
  { day:17, date:"2026-09-17", dayName:"Thu", status:"PRESENT",        punchIn:"08:53 AM", punchOut:"05:09 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:18, date:"2026-09-18", dayName:"Fri", status:"EMERGENCY LEAVE",punchIn:"--",       punchOut:"--",       hours:0,   shift:"Emergency Leave (Approved)" },
  { day:19, date:"2026-09-19", dayName:"Sat", status:"WEEK OFF",       punchIn:"--",       punchOut:"--",       hours:0,   shift:"Scheduled Roster Off" },
  { day:20, date:"2026-09-20", dayName:"Sun", status:"WEEK OFF",       punchIn:"--",       punchOut:"--",       hours:0,   shift:"Scheduled Roster Off" },
  { day:21, date:"2026-09-21", dayName:"Mon", status:"PRESENT",        punchIn:"08:55 AM", punchOut:"05:10 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:22, date:"2026-09-22", dayName:"Tue", status:"PRESENT",        punchIn:"08:58 AM", punchOut:"05:07 PM", hours:8.1, shift:"General Shift (09:00 - 17:00)" },
  { day:23, date:"2026-09-23", dayName:"Wed", status:"HALF DAY",       punchIn:"09:01 AM", punchOut:"01:10 PM", hours:4.1, shift:"Morning Half Shift" },
  { day:24, date:"2026-09-24", dayName:"Thu", status:"HALF DAY",       punchIn:"09:10 AM", punchOut:"01:20 PM", hours:4.1, shift:"General Shift (Regularization Pending)", regularizationStatus:"PENDING", regularizationType:"Emergency Half Day", regularizationReason:"Severe transit gantry breakdown on North Highway" },
  { day:25, date:"2026-09-25", dayName:"Fri", status:"PRESENT",        punchIn:"08:50 AM", punchOut:"05:14 PM", hours:8.4, shift:"General Shift (09:00 - 17:00)" },
  { day:26, date:"2026-09-26", dayName:"Sat", status:"HOLIDAY",        punchIn:"--",       punchOut:"--",       hours:0,   shift:"Regional Festival Holiday", holidayName:"Ganesh Chaturthi" },
  { day:27, date:"2026-09-27", dayName:"Sun", status:"WEEK OFF",       punchIn:"--",       punchOut:"--",       hours:0,   shift:"Scheduled Roster Off" },
  { day:28, date:"2026-09-28", dayName:"Mon", status:"PRESENT",        punchIn:"08:52 AM", punchOut:"05:06 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:29, date:"2026-09-29", dayName:"Tue", status:"PRESENT",        punchIn:"08:54 AM", punchOut:"05:11 PM", hours:8.2, shift:"General Shift (09:00 - 17:00)" },
  { day:30, date:"2026-09-30", dayName:"Wed", status:"PRESENT",        punchIn:"08:59 AM", punchOut:"05:08 PM", hours:8.1, shift:"General Shift (09:00 - 17:00)" },
];

const PERIOD_SUMMARIES = {
  month:        { label:"September 2026",             present:18, absent:1, halfDay:2, leave:1, holiday:2, companyWork:1, workingDays:22, pct:92 },
  three_months: { label:"Jul – Sep 2026 (3 Months)",  present:56, absent:3, halfDay:4, leave:4, holiday:6, companyWork:3, workingDays:68, pct:91 },
  six_months:   { label:"Apr – Sep 2026 (6 Months)",  present:114,absent:6, halfDay:7, leave:9, holiday:12,companyWork:6, workingDays:136,pct:90 },
  one_year:     { label:"Oct 2025 – Sep 2026 (1 Year)",present:232,absent:11,halfDay:12,leave:18,holiday:22,companyWork:11,workingDays:274,pct:92 },
};

/* ── ShiftEaze Semantic Status Tokens ───────────────────────────────── */
const STATUS_CFG = {
  "PRESENT":            { short:"P",   bg:COLOR.successLight, color:COLOR.success, dot:COLOR.successBorder },
  "ABSENT":             { short:"A",   bg:COLOR.dangerLight,  color:COLOR.danger,  dot:COLOR.dangerBorder },
  "HALF DAY":           { short:"H",   bg:COLOR.warningLight, color:COLOR.warning, dot:COLOR.warningBorder },
  "LEAVE":              { short:"L",   bg:COLOR.infoLight,    color:COLOR.info,    dot:COLOR.infoBorder },
  "HOLIDAY":            { short:"Hol", bg:COLOR.primarySoft,  color:COLOR.primary, dot:COLOR.primary },
  "WEEK OFF":           { short:"WO",  bg:COLOR.neutralLight, color:COLOR.neutral, dot:COLOR.neutralBorder },
  "COMPANY WORK":       { short:"CW",  bg:COLOR.successLight, color:COLOR.success, dot:COLOR.successBorder },
  "EMERGENCY LEAVE":    { short:"EL",  bg:COLOR.warningLight, color:COLOR.warning, dot:COLOR.warningBorder },
  "EMERGENCY HALF DAY": { short:"EH",  bg:COLOR.warningLight, color:COLOR.warning, dot:COLOR.warningBorder },
};

function StatusChip({ status }) {
  const cfg = STATUS_CFG[status] || { short: status[0], bg: COLOR.surfaceMuted, color: COLOR.textSecondary, dot: COLOR.borderStrong };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9.5, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: COLOR.cardBg, color: cfg.color }}>
      {cfg.short}
    </span>
  );
}

/* ── Main TrainerAttendance Component ──────────────────────────────── */
export default function TrainerAttendance({ onBack, showToast, attendanceOverrides, onRegularize }) {
  const [period,           setPeriod]           = useState("month");
  const [selectedDay,      setSelectedDay]       = useState(null);
  const [showRegModal,     setShowRegModal]      = useState(false);
  const [regType,          setRegType]           = useState("Emergency Half Day");
  const [regReason,        setRegReason]         = useState("");
  const [regError,         setRegError]          = useState("");

  const summary = PERIOD_SUMMARIES[period];
  // Merge overrides into base data
  const attendanceData = SEPTEMBER_ATTENDANCE.map(day => ({
    ...day,
    ...(attendanceOverrides[day.date] || {}),
  }));

  const selectedDayData = selectedDay ? attendanceData.find(d => d.day === selectedDay) : null;

  const handleSubmitReg = () => {
    if (!regReason.trim()) { setRegError("Please enter a reason."); return; }
    onRegularize(selectedDayData.date, regType, regReason);
    showToast("Request submitted");
    setShowRegModal(false);
    setRegReason("");
    setRegError("");
    setSelectedDay(null);
  };

  const PERIOD_TABS = [
    { id: "month",        label: "Month" },
    { id: "three_months", label: "3 Months" },
    { id: "six_months",   label: "6 Months" },
    { id: "one_year",     label: "1 Year" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15, position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ border: `1px solid ${COLOR.border}`, background: COLOR.cardBg, borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: SHADOW.subtle }}>
          <ArrowLeft size={17} color={COLOR.textPrimary} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, color: COLOR.textPrimary, letterSpacing: "-0.015em" }}>Attendance</div>
      </div>

      {/* Period Filter */}
      <div style={{ display: "flex", gap: 2, padding: 3, background: COLOR.surfaceMuted, borderRadius: RADIUS.md, border: `1px solid ${COLOR.border}` }}>
        {PERIOD_TABS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            flex: 1, padding: "7px 6px", borderRadius: RADIUS.sm, border: 0,
            background: period === p.id ? COLOR.primary : "transparent", color: period === p.id ? COLOR.white : COLOR.textSecondary,
            boxShadow: "none",
            fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            transition: "all 0.15s ease",
          }}>{p.label}</button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{ background: COLOR.cardBg, borderRadius: RADIUS.card, padding: "0 0 14px", border: `1px solid ${COLOR.border}`, boxShadow: SHADOW.card, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 12, background: COLOR.primary, padding: "12px 16px" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: COLOR.primary200 }}>{summary.label}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: COLOR.white }}>{summary.pct}%</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "0 16px" }}>
          {[
            { label:"Present",     value: summary.present,    dot:COLOR.successBorder, bg:COLOR.successLight,      color:COLOR.success },
            { label:"Absent",      value: summary.absent,     dot:COLOR.danger,        bg:COLOR.brandCrimsonLight, color:COLOR.danger },
            { label:"Half Day",    value: summary.halfDay,    dot:COLOR.warningBorder, bg:COLOR.warningLight,      color:COLOR.warning },
            { label:"Leave",       value: summary.leave,      dot:COLOR.infoBorder,    bg:COLOR.infoLight,         color:COLOR.info },
            { label:"Holiday",     value: summary.holiday,    dot:COLOR.primary,       bg:COLOR.primarySoft,       color:COLOR.primary },
            { label:"Company Work",value: summary.companyWork,dot:COLOR.successBorder, bg:COLOR.successLight,      color:COLOR.success },
          ].map(m => (
            <div key={m.label} style={{ background: m.bg, borderRadius: RADIUS.sm, padding: "8px 10px", border: `1px solid ${m.bg}` }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 500, color: COLOR.textSecondary, marginTop: 1, whiteSpace: "nowrap" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Calendar (September 2026) */}
      <div style={{ background: COLOR.cardBg, borderRadius: RADIUS.card, padding: "16px", border: `1px solid ${COLOR.border}`, boxShadow: SHADOW.card }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLOR.textPrimary }}>September 2026</span>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, textAlign: "center", paddingBottom: 6, borderBottom: `1px solid ${COLOR.border}`, marginBottom: 6 }}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
            <span key={d} style={{ fontSize: 10, fontWeight: 700, color: COLOR.textMuted }}>{d}</span>
          ))}
        </div>

        {/* Calendar grid — Sep 2026 starts on Tuesday (1 blank Mon cell) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          <div style={{ height: 50 }} /> {/* blank Monday */}
          {attendanceData.map(dayData => {
            const cfg = STATUS_CFG[dayData.status] || STATUS_CFG["WEEK OFF"];
            const isSelected = selectedDay === dayData.day;
            const hasReg = dayData.regularizationStatus;
            return (
              <button
                key={dayData.day}
                onClick={() => setSelectedDay(isSelected ? null : dayData.day)}
                style={{
                  height: 50, borderRadius: RADIUS.sm,
                  border: isSelected ? `2px solid ${COLOR.brandPrimary}` : `1px solid ${cfg.bg}`,
                  background: cfg.bg,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 2, cursor: "pointer", position: "relative",
                  transition: "all 0.1s ease",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 600, color: isSelected ? COLOR.brandPrimary : cfg.color }}>{dayData.day}</span>
                <StatusChip status={dayData.status} />
                {dayData.holidayName && (
                  <span style={{ fontSize: 7.5, color: COLOR.primary, fontWeight: 600, textAlign: "center", lineHeight: 1, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>
                    {dayData.holidayName.split(" ")[0]}
                  </span>
                )}
                {hasReg && (
                  <span style={{ position: "absolute", top: 2, right: 2, width: 6, height: 6, borderRadius: "50%", background: COLOR.warning, border: `1px solid ${COLOR.white}` }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${COLOR.border}` }}>
          {Object.entries(STATUS_CFG).slice(0, 6).map(([key, cfg]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
              <span style={{ fontSize: 10, color: COLOR.textSecondary, fontWeight: 500 }}>{key === "COMPANY WORK" ? "Co. Work" : key === "WEEK OFF" ? "Off" : key === "EMERGENCY LEAVE" ? "E. Leave" : key === "HALF DAY" ? "Half Day" : key.charAt(0) + key.slice(1).toLowerCase()}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLOR.warning }} />
            <span style={{ fontSize: 10, color: COLOR.textSecondary, fontWeight: 500 }}>Reg. Pending</span>
          </div>
        </div>
      </div>

      {/* Date Inspector */}
      {selectedDayData && (
        <div style={{ background: COLOR.cardBg, borderRadius: RADIUS.card, padding: "16px", border: `1px solid ${COLOR.border}`, borderLeft: `4px solid ${(STATUS_CFG[selectedDayData.status] || STATUS_CFG["WEEK OFF"]).dot}`, boxShadow: SHADOW.card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: COLOR.textPrimary }}>{selectedDayData.dayName}, {selectedDayData.day} September 2026</div>
              <div style={{ fontSize: 11.5, color: COLOR.textMuted, marginTop: 1 }}>{selectedDayData.shift}</div>
            </div>
            <button onClick={() => setSelectedDay(null)} style={{ border: `1px solid ${COLOR.border}`, background: COLOR.surfaceMuted, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={15} color={COLOR.textSecondary} />
            </button>
          </div>

          {/* Punch times */}
          {selectedDayData.status !== "HOLIDAY" && selectedDayData.status !== "WEEK OFF" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ background: COLOR.successLight, borderRadius: RADIUS.sm, padding: "10px 12px", textAlign: "center", border: `1px solid ${COLOR.successLight}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLOR.success, marginBottom: 2 }}>Punch In</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.textPrimary }}>{selectedDayData.punchIn}</div>
              </div>
              <div style={{ background: COLOR.brandCrimsonLight, borderRadius: RADIUS.sm, padding: "10px 12px", textAlign: "center", border: `1px solid ${COLOR.brandCrimsonLight}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLOR.brandCrimson, marginBottom: 2 }}>Punch Out</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.textPrimary }}>{selectedDayData.punchOut}</div>
              </div>
            </div>
          )}

          {selectedDayData.holidayName && (
            <div style={{ background: COLOR.primarySoft, borderRadius: RADIUS.sm, padding: "10px 14px", marginBottom: 12, border: `1px solid ${COLOR.primarySoft}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.primary }}>{selectedDayData.holidayName}</div>
            </div>
          )}

          {/* Regularization info if exists */}
          {selectedDayData.regularizationStatus && (
            <div style={{ background: COLOR.surface, borderRadius: RADIUS.sm, padding: "10px 14px", marginBottom: 12, border: `1px solid ${COLOR.border}`, borderLeft: `4px solid ${COLOR.warningBorder}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: COLOR.textPrimary }}>{selectedDayData.regularizationType}</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: RADIUS.pill, background: COLOR.warningLight, color: COLOR.warning, flexShrink: 0 }}>
                  {selectedDayData.regularizationStatus.charAt(0) + selectedDayData.regularizationStatus.slice(1).toLowerCase()}
                </span>
              </div>
              <div style={{ fontSize: 12, color: COLOR.textSecondary, marginTop: 4 }}>{selectedDayData.regularizationReason}</div>
            </div>
          )}

          {/* Regularize button — only for non-holiday, non-weekoff */}
          {!["HOLIDAY", "WEEK OFF", "PRESENT"].includes(selectedDayData.status) && !selectedDayData.regularizationStatus && (
            <button onClick={() => setShowRegModal(true)} style={{ width: "100%", padding: "11px", borderRadius: RADIUS.md, background: COLOR.brandPrimary, color: "#FFF", border: 0, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
              Regularize
            </button>
          )}
        </div>
      )}

      {/* Regularization Modal */}
      {showRegModal && selectedDayData && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "flex-end", padding: 0 }}>
          <div style={{ background: COLOR.cardBg, borderRadius: "24px 24px 0 0", width: "100%", padding: "22px 20px", maxHeight: "90%", boxShadow: SHADOW.modal }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16.5, fontWeight: 700, color: COLOR.textPrimary }}>Regularize Attendance</div>
                <div style={{ fontSize: 12, color: COLOR.textMuted, marginTop: 1 }}>{selectedDayData.dayName}, {selectedDayData.day} Sep 2026</div>
              </div>
              <button onClick={() => { setShowRegModal(false); setRegReason(""); setRegError(""); }}
                style={{ border: `1px solid ${COLOR.border}`, background: COLOR.surfaceMuted, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={16} color={COLOR.textSecondary} />
              </button>
            </div>

            {/* Request Type */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: COLOR.textSecondary, display: "block", marginBottom: 8 }}>Request Type *</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["Emergency Half Day", "Emergency Leave", "Company Work"].map(type => (
                  <button key={type} onClick={() => setRegType(type)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                    borderRadius: RADIUS.md, border: `1.5px solid ${regType === type ? COLOR.brandPrimary : COLOR.border}`,
                    background: regType === type ? COLOR.primarySoft : COLOR.cardBg, cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s ease",
                  }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${regType === type ? COLOR.brandPrimary : COLOR.borderStrong}`, background: regType === type ? COLOR.brandPrimary : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {regType === type && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFF" }} />}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: regType === type ? 700 : 500, color: regType === type ? COLOR.brandPrimary : COLOR.textPrimary }}>{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: COLOR.textSecondary, display: "block", marginBottom: 5 }}>Reason <span style={{ color: COLOR.danger }}>*</span></label>
              <textarea rows={3} value={regReason} onChange={e => { setRegReason(e.target.value); setRegError(""); }}
                placeholder="Reason"
                style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS.md, border: `1px solid ${regError ? COLOR.danger : COLOR.borderStrong}`, fontSize: 13.5, color: COLOR.textPrimary, resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: COLOR.cardBg }} />
              {regError && <div style={{ fontSize: 11.5, color: COLOR.danger, marginTop: 4 }}>{regError}</div>}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowRegModal(false); setRegReason(""); setRegError(""); }}
                style={{ flex: 1, padding: "11px", borderRadius: RADIUS.md, background: COLOR.cardBg, color: COLOR.textPrimary, border: `1px solid ${COLOR.borderStrong}`, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSubmitReg}
                style={{ flex: 2, padding: "11px", borderRadius: RADIUS.md, background: COLOR.brandPrimary, color: "#FFF", border: 0, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
