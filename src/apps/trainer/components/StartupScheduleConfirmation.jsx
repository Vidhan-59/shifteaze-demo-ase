import React from "react";
import { COLOR, RADIUS, SHADOW } from "../theme/tokens";
import { CalendarDays, CalendarCheck, ListChecks } from "lucide-react";

export default function StartupScheduleConfirmation({
  monthName = "September 2026",
  sessions = [],
  onConfirmWholeMonth,
  onConfirmManually,
}) {
  // Compute summary statistics
  const total = sessions.length;
  const confirmed = sessions.filter((s) => s.status === "confirmed").length;
  const pending = sessions.filter((s) => s.status === "pending").length;
  const denied = sessions.filter((s) => s.status === "denied").length;

  const stats = [
    { label: "Total", value: total, color: COLOR.textPrimary },
    { label: "Confirmed", value: confirmed, color: COLOR.success },
    { label: "Pending", value: pending, color: pending > 0 ? COLOR.warning : COLOR.textMuted },
    { label: "Denied", value: denied, color: denied > 0 ? COLOR.danger : COLOR.textMuted },
  ];

  const optionStyle = {
    width: "100%",
    background: COLOR.cardBg,
    borderRadius: RADIUS.card,
    padding: "16px",
    border: `1px solid ${COLOR.border}`,
    boxShadow: SHADOW.card,
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  };

  const iconTile = (primary) => ({
    width: 40,
    height: 40,
    borderRadius: RADIUS.comp,
    background: primary ? COLOR.primary : COLOR.primarySoft,
    color: primary ? COLOR.white : COLOR.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingBottom: 36,
        animation: "fadeIn 0.25s ease-out",
      }}
    >
      {/* Header */}
      <div style={{ padding: "4px 2px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: COLOR.textPrimary, letterSpacing: "-0.02em" }}>
          Confirm Schedule
        </div>
        <div
          style={{
            marginTop: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: COLOR.textSecondary,
          }}
        >
          <CalendarDays size={15} color={COLOR.primary} />
          <span>{monthName}</span>
        </div>
      </div>

      {/* Month summary */}
      <div
        style={{
          background: COLOR.cardBg,
          borderRadius: RADIUS.card,
          border: `1px solid ${COLOR.border}`,
          boxShadow: SHADOW.card,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          padding: "14px 4px",
        }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              textAlign: "center",
              borderLeft: i === 0 ? "none" : `1px solid ${COLOR.border}`,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: COLOR.textSecondary, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Option 1: Confirm whole month */}
      <button type="button" onClick={onConfirmWholeMonth} style={{ ...optionStyle, border: `1.5px solid ${COLOR.primary}` }}>
        <div style={iconTile(true)}>
          <CalendarCheck size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.textPrimary }}>Confirm Whole Month</div>
          <div style={{ fontSize: 12.5, color: COLOR.textSecondary, marginTop: 2 }}>All sessions at once</div>
        </div>
      </button>

      {/* Option 2: Confirm manually */}
      <button type="button" onClick={onConfirmManually} style={optionStyle}>
        <div style={iconTile(false)}>
          <ListChecks size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.textPrimary }}>Confirm Manually</div>
          <div style={{ fontSize: 12.5, color: COLOR.textSecondary, marginTop: 2 }}>One session at a time</div>
        </div>
      </button>
    </div>
  );
}
