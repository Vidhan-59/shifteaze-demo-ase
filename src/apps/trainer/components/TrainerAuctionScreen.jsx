import React, { useState } from "react";
import { COLOR, RADIUS, SHADOW, TYPE } from "../theme/tokens";
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  ChevronRight,
  Award,
  RotateCcw,
  Sparkles,
} from "lucide-react";

// Sample open lectures shown to the Ports demo account.
const DEMO_OPEN_LECTURES = [
  {
    id: "LEC-301",
    title: "RTG Crane Automation & Control Systems",
    time: "09:00 AM - 11:00 AM",
    venue: "Sim Bay B204",
    applicantsCount: 3,
    endsIn: "45m",
    category: "Heavy Machinery",
    credential: "RTG Technical Level 2+",
  },
  {
    id: "LEC-302",
    title: "Port Hazmat Safety & HSE Induction",
    time: "02:00 PM - 04:00 PM",
    venue: "Main Auditorium A1",
    applicantsCount: 4,
    endsIn: "2h 15m",
    category: "Safety & Compliance",
    credential: "HSE Compliance Assessor",
  },
  {
    id: "LEC-303",
    title: "Hydraulic Fluids & High-Pressure Piping",
    time: "04:30 PM - 06:30 PM",
    venue: "Technical Lab C3",
    applicantsCount: 2,
    endsIn: "4h 00m",
    category: "Mechanical",
    credential: "Hydraulic Inspection",
  },
];

export default function TrainerAuctionScreen({
  trainer = { name: "Ramesh Patel", rating: "4.92 ★", id: "TR-881", role: "Senior Technical Trainer" },
  showToast = (msg) => console.log(msg),
  onOpenNotifications,
  onGoToSchedule,
  showDemoLectures = true,
}) {
  // Navigation tabs: "available" | "my_applications"
  const [activeTab, setActiveTab] = useState("available");

  // Open lectures to bid on — the built-in demo set for the Ports demo account,
  // none for trainers whose BU has nothing published.
  const [lectures, setLectures] = useState(() => (showDemoLectures ? DEMO_OPEN_LECTURES : []));

  // Trainer's Submitted Applications
  const [myApplications, setMyApplications] = useState([]);

  // Direct 1-tap Apply Flow: Directly applies and switches to My Applications
  const handleDirectApply = (lecture) => {
    // Prevent duplicate application
    if (myApplications.some((a) => a.lectureId === lecture.id)) {
      setActiveTab("my_applications");
      return;
    }

    const newApp = {
      id: `APP-${Date.now().toString().slice(-3)}`,
      lectureId: lecture.id,
      title: lecture.title,
      time: lecture.time,
      venue: lecture.venue,
      category: lecture.category,
      credential: lecture.credential,
      appliedAt: "Just now",
      status: "pending",
    };

    setMyApplications((prev) => [newApp, ...prev]);

    // Increment applicants counter
    setLectures((prev) =>
      prev.map((l) => (l.id === lecture.id ? { ...l, applicantsCount: l.applicantsCount + 1 } : l))
    );

    showToast(`Applied for ${lecture.title}`);

    // Direct switch to My Applications section
    setActiveTab("my_applications");
  };

  // Revoke Flow: Withdraws the application
  const handleRevoke = (appId, lectureId) => {
    setMyApplications((prev) => prev.filter((a) => a.id !== appId));

    // Decrement applicants counter
    setLectures((prev) =>
      prev.map((l) =>
        l.id === lectureId ? { ...l, applicantsCount: Math.max(0, l.applicantsCount - 1) } : l
      )
    );

    showToast("Application revoked");
  };

  const tabStyle = (isActive) => ({
    flex: 1,
    padding: "7px 12px",
    borderRadius: RADIUS.sm,
    border: "none",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    background: isActive ? COLOR.primary : "transparent",
    color: isActive ? COLOR.white : COLOR.textSecondary,
    boxShadow: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "all 0.15s ease",
  });

  const cardStyle = {
    background: COLOR.white,
    borderRadius: RADIUS.card,
    padding: "14px 16px",
    border: `1px solid ${COLOR.border}`,
    boxShadow: SHADOW.card,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  // Visual-only: rotating tint per category chip
  const CATEGORY_TINTS = [
    { bg: COLOR.infoLight, fg: COLOR.info },
    { bg: COLOR.successLight, fg: COLOR.success },
    { bg: COLOR.warningLight, fg: COLOR.warning },
    { bg: COLOR.primarySoft, fg: COLOR.primary },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ ...TYPE.pageTitle, color: COLOR.textPrimary }}>Lecture Allocation</div>
        <span
          style={{
            background: COLOR.primary,
            color: COLOR.white,
            border: `1px solid ${COLOR.primary}`,
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 9px",
            borderRadius: RADIUS.pill,
            flexShrink: 0,
          }}
        >
          {lectures.length} Open
        </span>
      </div>

      {/* Tab Switcher */}
      <div
        style={{
          background: COLOR.surfaceMuted,
          borderRadius: RADIUS.md,
          padding: 3,
          display: "flex",
          gap: 2,
          border: `1px solid ${COLOR.border}`,
        }}
      >
        <button type="button" onClick={() => setActiveTab("available")} style={tabStyle(activeTab === "available")}>
          Available ({lectures.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("my_applications")}
          style={tabStyle(activeTab === "my_applications")}
        >
          My Applications
          {myApplications.length > 0 && (
            <span
              style={{
                background: activeTab === "my_applications" ? COLOR.white : COLOR.primary,
                color: activeTab === "my_applications" ? COLOR.primary : COLOR.white,
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: RADIUS.pill,
              }}
            >
              {myApplications.length}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================================
          TAB 1: AVAILABLE LECTURES
          ====================================================================== */}
      {activeTab === "available" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lectures.length === 0 && (
            <div style={{ textAlign: "center", padding: "36px 12px", fontSize: 13.5, color: COLOR.textMuted }}>
              No open sessions to bid on right now.
            </div>
          )}
          {lectures.map((lec, lecIdx) => {
            const isApplied = myApplications.some((a) => a.lectureId === lec.id);
            const tint = CATEGORY_TINTS[lecIdx % CATEGORY_TINTS.length];
            return (
              <div
                key={lec.id}
                style={{
                  ...cardStyle,
                  border: `1px solid ${isApplied ? COLOR.primary200 : COLOR.border}`,
                  borderLeft: `4px solid ${isApplied ? COLOR.primary : COLOR.infoBorder}`,
                }}
              >
                {/* Category & Timer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      background: tint.bg,
                      color: tint.fg,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: RADIUS.pill,
                    }}
                  >
                    {lec.category}
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: COLOR.warning,
                      background: COLOR.warningLight,
                      padding: "2px 8px",
                      borderRadius: RADIUS.pill,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={12} color={COLOR.warning} />
                    {lec.endsIn} left
                  </span>
                </div>

                {/* Title */}
                <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.textPrimary, lineHeight: 1.3 }}>
                  {lec.title}
                </div>

                {/* Time, Venue & Credential */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "6px 12px",
                    fontSize: 12,
                    color: COLOR.textSecondary,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={13} color={COLOR.primary} />
                    {lec.time}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} color={COLOR.brandCrimson} />
                    {lec.venue}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Award size={13} color={COLOR.success} />
                    {lec.credential}
                  </span>
                </div>

                {/* Action Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 10,
                    borderTop: `1px solid ${COLOR.border}`,
                  }}
                >
                  <span style={{ fontSize: 12, color: COLOR.info, fontWeight: 600 }}>
                    {lec.applicantsCount} applied
                  </span>

                  {isApplied ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("my_applications")}
                      style={{
                        background: COLOR.primarySoft,
                        color: COLOR.primary,
                        border: `1px solid ${COLOR.primary200}`,
                        borderRadius: RADIUS.md,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <CheckCircle2 size={14} color={COLOR.primary} />
                      Applied
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDirectApply(lec)}
                      style={{
                        background: COLOR.primary,
                        color: COLOR.white,
                        border: "none",
                        borderRadius: RADIUS.md,
                        padding: "8px 22px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================================
          TAB 2: MY APPLICATIONS
          ====================================================================== */}
      {activeTab === "my_applications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {myApplications.length === 0 ? (
            <div
              style={{
                background: COLOR.white,
                borderRadius: RADIUS.card,
                padding: "32px 20px",
                textAlign: "center",
                border: `1px solid ${COLOR.border}`,
                fontSize: 13,
                fontWeight: 500,
                color: COLOR.textMuted,
              }}
            >
              No applications yet
            </div>
          ) : (
            myApplications.map((app) => (
              <div key={app.id} style={{ ...cardStyle, borderLeft: `4px solid ${COLOR.warningBorder}` }}>
                {/* Title & Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.textPrimary, lineHeight: 1.3 }}>
                      {app.title}
                    </div>
                    <div style={{ fontSize: 12, color: COLOR.textSecondary, marginTop: 3 }}>
                      {app.time} · {app.venue}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: RADIUS.pill,
                      background: COLOR.warningLight,
                      color: COLOR.warning,
                      flexShrink: 0,
                    }}
                  >
                    Pending
                  </span>
                </div>

                {/* Revoke Action Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 10,
                    borderTop: `1px solid ${COLOR.border}`,
                  }}
                >
                  <span style={{ fontSize: 12, color: COLOR.textMuted }}>Applied {app.appliedAt}</span>

                  <button
                    type="button"
                    onClick={() => handleRevoke(app.id, app.lectureId)}
                    style={{
                      background: COLOR.brandCrimsonLight,
                      color: COLOR.danger,
                      border: `1px solid ${COLOR.dangerLight}`,
                      borderRadius: RADIUS.md,
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <RotateCcw size={13} />
                    Revoke
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
