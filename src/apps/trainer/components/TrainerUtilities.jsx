import React, { useState } from "react";
import { COLOR, RADIUS, SHADOW } from "../theme/tokens";
import { TrainerInitials } from "../trainerContext.jsx";
import {
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  BookOpen,
  FolderLock,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Plus,
  Eye,
  FileCheck,
  Shield,
  HelpCircle,
  Building,
  UserCheck,
  AlertTriangle,
  Send,
  X,
  Check,
  Bell,
} from "lucide-react";

// Shared visual styles (presentation only)
const backBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: 0,
  color: COLOR.primary,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 0",
};

const pageTitleStyle = { fontSize: 18, fontWeight: 700, color: COLOR.ink950 };

const smallPrimaryBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: COLOR.primary,
  color: COLOR.white,
  border: 0,
  padding: "7px 12px",
  borderRadius: RADIUS.pill,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryBtnStyle = {
  padding: "12px",
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
  gap: 6,
};

const dangerOutlineBtnStyle = {
  padding: "11px",
  borderRadius: RADIUS.md,
  background: COLOR.white,
  border: `1px solid ${COLOR.danger}`,
  color: COLOR.danger,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const cardStyle = {
  background: COLOR.white,
  borderRadius: RADIUS.card,
  border: `1px solid ${COLOR.border}`,
  boxShadow: SHADOW.card,
};

const sheetCloseBtnStyle = {
  border: 0,
  background: COLOR.surfaceMuted,
  width: 30,
  height: 30,
  borderRadius: "50%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const statusPill = (tone) => {
  const map = {
    success: { background: COLOR.successLight, color: COLOR.success },
    pending: { background: COLOR.warningLight, color: COLOR.warning },
    danger: { background: COLOR.dangerLight, color: COLOR.danger },
    info: { background: COLOR.infoLight, color: COLOR.info },
    brand: { background: COLOR.primary, color: COLOR.white },
    neutral: { background: COLOR.surfaceMuted, color: COLOR.ink700 },
  };
  return {
    ...(map[tone] || map.neutral),
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: RADIUS.pill,
    whiteSpace: "nowrap",
  };
};

function HubRow({ icon: Icon, title, badge, badgeTone = "neutral", tint = { color: COLOR.primary, bg: COLOR.primarySoft }, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...cardStyle,
        padding: "14px 16px",
        borderLeft: `4px solid ${tint.color}`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: RADIUS.comp,
          background: tint.bg,
          color: tint.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: COLOR.ink950 }}>
        {title}
      </div>
      {badge !== undefined && badge !== null && (
        <span style={statusPill(badgeTone)}>{badge}</span>
      )}
      <ChevronRight size={18} color={COLOR.ink400} />
    </div>
  );
}

export default function TrainerUtilities({
  trainer,
  showToast,
  onOpenHelpDesk,
  onOpenAttendance,
  onOpenNotifications,
  onOpenProfile,
  unreadCount = 0,
}) {
  // Navigation within Utilities: "hub" | "attendance" | "resignation" | "salary" | "policy" | "documents"
  const [activeSection, setActiveSection] = useState("hub");

  // ==========================================
  // Section 1: Attendance Regularization State
  // ==========================================
  const [attendanceRecords, setAttendanceRecords] = useState([
    {
      id: "ATT-102",
      date: "2026-09-14",
      session: "RTG Diagnostics & Electrical Interlocks",
      time: "01:00 PM - 03:30 PM",
      recordedIn: "01:14 PM",
      recordedOut: "03:32 PM",
      status: "pending_review",
      statusLabel: "Pending Approval",
      type: "Late In-Punch (Transit)",
      requestedAt: "2026-09-14 04:10 PM",
      reason: "Security gate biometric delay at South Checkpoint",
    },
    {
      id: "ATT-103",
      date: "2026-09-10",
      session: "Hydraulic Fluids & Pressure Testing",
      time: "02:00 PM - 04:00 PM",
      recordedIn: "01:58 PM",
      recordedOut: "04:05 PM",
      status: "approved",
      statusLabel: "Approved",
      type: "Regularized",
      requestedAt: "2026-09-10 05:00 PM",
      approvedBy: "Operations Lead (P. Sharma)",
    },
  ]);

  const [showRegModal, setShowRegModal] = useState(false);
  const [regDate, setRegDate] = useState("2026-09-16");
  const [regSession, setRegSession] = useState("Reach Stacker Precision Handling");
  const [regReasonType, setRegReasonType] = useState("Biometric scanner failure on site");
  const [regActualIn, setRegActualIn] = useState("09:00 AM");
  const [regActualOut, setRegActualOut] = useState("11:15 AM");
  const [regNotes, setRegNotes] = useState("");

  const handleApplyRegularization = (e) => {
    e.preventDefault();
    const newRecord = {
      id: `ATT-${Date.now().toString().slice(-3)}`,
      date: regDate,
      session: regSession,
      time: `${regActualIn} - ${regActualOut}`,
      recordedIn: regActualIn,
      recordedOut: regActualOut,
      status: "pending_review",
      statusLabel: "Pending Approval",
      type: regReasonType,
      requestedAt: "Just now",
      reason: regNotes || regReasonType,
    };
    setAttendanceRecords([newRecord, ...attendanceRecords]);
    setShowRegModal(false);
    setRegNotes("");
    showToast("Request submitted");
  };

  // ==========================================
  // Section 2: Resignation State
  // ==========================================
  const [resignationStatus, setResignationStatus] = useState("none"); // "none" | "submitted"
  const [resignationData, setResignationData] = useState(null);
  const [showResignModal, setShowResignModal] = useState(false);
  const [resignReason, setResignReason] = useState("Career Growth & Advancement");
  const [proposedLWD, setProposedLWD] = useState("2026-10-23"); // 30 days notice
  const [resignNotes, setResignNotes] = useState("");
  const [noticeAgreed, setNoticeAgreed] = useState(false);

  const handleSubmitResignation = (e) => {
    e.preventDefault();
    if (!noticeAgreed) return;

    setResignationStatus("submitted");
    setResignationData({
      submittedDate: "2026-09-23",
      proposedLWD: proposedLWD,
      reason: resignReason,
      notes: resignNotes,
      status: "Under HR Review",
      noticePeriod: "30 Calendar Days",
      hrContact: "hr-operations@shifteaze.corp",
    });
    setShowResignModal(false);
    showToast("Resignation submitted");
  };

  const handleWithdrawResignation = () => {
    setResignationStatus("none");
    setResignationData(null);
    showToast("Resignation withdrawn");
  };

  // ==========================================
  // Section 3: Salary Slip State
  // ==========================================
  const salarySlips = [
    {
      id: "PAY-2026-08",
      month: "August 2026",
      disbursedDate: "01 Sep 2026",
      gross: 94500,
      basic: 52000,
      sessionsAllowance: 28500,
      specialAllowance: 14000,
      pf: 4200,
      tax: 6800,
      net: 83500,
      sessionsCount: 26,
      status: "Disbursed",
    },
    {
      id: "PAY-2026-07",
      month: "July 2026",
      disbursedDate: "01 Aug 2026",
      gross: 91000,
      basic: 52000,
      sessionsAllowance: 25000,
      specialAllowance: 14000,
      pf: 4200,
      tax: 6200,
      net: 80600,
      sessionsCount: 23,
      status: "Disbursed",
    },
    {
      id: "PAY-2026-06",
      month: "June 2026",
      disbursedDate: "01 Jul 2026",
      gross: 96000,
      basic: 52000,
      sessionsAllowance: 30000,
      specialAllowance: 14000,
      pf: 4200,
      tax: 7100,
      net: 84700,
      sessionsCount: 28,
      status: "Disbursed",
    },
  ];
  const [selectedSlipId, setSelectedSlipId] = useState("PAY-2026-08");
  const activeSlip = salarySlips.find((s) => s.id === selectedSlipId) || salarySlips[0];

  const handleDownloadSlip = (month) => {
    showToast(`${month} slip downloaded`);
  };

  // ==========================================
  // Section 4: Policy State
  // ==========================================
  const policies = [
    {
      id: "POL-01",
      category: "Conduct & Attendance",
      title: "Trainer Code of Conduct & Punctuality Policy",
      updated: "15 Aug 2026",
      version: "v3.2",
      summary: "Guidelines on classroom punctuality, learner interactions, dress code, and professional ethics.",
      details: "Trainers are required to check into simulation bays 15 minutes before scheduled start time. Digital attendance logging must be completed within 10 minutes of session closure. Adherence to safety gear regulations is strictly mandatory.",
    },
    {
      id: "POL-02",
      category: "Safety & HSE",
      title: "Port Safety, PPE & Hazmat Operations Guideline",
      updated: "01 Jul 2026",
      version: "v4.0",
      summary: "Standard safety protocols, PPE standards (Level 2/3), emergency evacuation drills, and zero-tolerance safety standards.",
      details: "High-visibility vests, hard hats with chin straps, and steel-toed boots (S3 rating) are required in all terminal zones. Any near-miss safety incident must be documented in the HSE Incident Log within 2 hours.",
    },
    {
      id: "POL-03",
      category: "Compensation & Travel",
      title: "Overtime & Multi-Site Travel Reimbursement",
      updated: "20 Jun 2026",
      version: "v2.1",
      summary: "Reimbursement criteria for transit between Port Kochi and outer dry docks, per diem allowances, and overtime credits.",
      details: "Sessions exceeding scheduled duration by 30+ minutes qualify for incremental compensation. Inter-terminal transit fares are auto-approved via corporate RFID transit passes.",
    },
    {
      id: "POL-04",
      category: "Conduct & Attendance",
      title: "Attendance Regularization & Leave Encashment Rules",
      updated: "10 Aug 2026",
      version: "v1.8",
      summary: "Protocol for regularizing missed punches, biometric glitches, and annual privilege leave encashment limits.",
      details: "A maximum of 3 regularizations per calendar month may be submitted. Regularization requests must be filed within 72 hours of the session occurrence to be honored by payroll.",
    },
    {
      id: "POL-05",
      category: "Career & Resignation",
      title: "Employee Separation & Notice Period Norms",
      updated: "05 May 2026",
      version: "v2.0",
      summary: "Terms of resignation notice period, trainer knowledge transfer checklist, and final settlement timelines.",
      details: "Standard notice period for senior technical trainers is 30 calendar days. Comprehensive handover of training curriculum and simulation bay logs must be certified prior to final clearance.",
    },
  ];
  const [policyCategory, setPolicyCategory] = useState("All");
  const [activePolicyDetail, setActivePolicyDetail] = useState(null);

  const filteredPolicies = policyCategory === "All"
    ? policies
    : policies.filter((p) => p.category === policyCategory);

  // ==========================================
  // Section 5: My Documents State
  // ==========================================
  const [documents, setDocuments] = useState([
    {
      id: "DOC-01",
      name: "Master Trainer Accreditation - Heavy Equipment",
      type: "Certification",
      size: "2.4 MB",
      issuedDate: "12 Jan 2025",
      status: "Verified",
      format: "PDF",
    },
    {
      id: "DOC-02",
      name: "Government ID / Aadhaar Document",
      type: "Identity",
      size: "1.1 MB",
      issuedDate: "05 Mar 2024",
      status: "Verified",
      format: "PDF",
    },
    {
      id: "DOC-03",
      name: "Permanent Account Number (PAN) Card",
      type: "Tax / Finance",
      size: "850 KB",
      issuedDate: "10 Feb 2024",
      status: "Verified",
      format: "PDF",
    },
    {
      id: "DOC-04",
      name: "Senior Trainer Employment Agreement & Annexures",
      type: "Contract",
      size: "3.8 MB",
      issuedDate: "01 Jan 2024",
      status: "Verified",
      format: "PDF",
    },
    {
      id: "DOC-05",
      name: "Annual Medical Fitness & Audiometry Certificate",
      type: "Medical",
      size: "1.5 MB",
      issuedDate: "20 May 2026",
      status: "Verified",
      format: "PDF",
    },
  ]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadDocType, setUploadDocType] = useState("Certification");

  const handleUploadDocument = (e) => {
    e.preventDefault();
    if (!uploadDocName.trim()) return;

    const newDoc = {
      id: `DOC-${Date.now().toString().slice(-2)}`,
      name: uploadDocName.trim(),
      type: uploadDocType,
      size: "1.8 MB",
      issuedDate: "23 Sep 2026",
      status: "Pending Verification",
      format: "PDF",
    };
    setDocuments([newDoc, ...documents]);
    setShowUploadModal(false);
    setUploadDocName("");
    showToast("Document uploaded");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
      {/* ======================================================================
          UTILITIES HUB (Main Grid Screen)
          ====================================================================== */}
      {activeSection === "hub" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top Header Row with Notification & Profile Avatar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 2,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: COLOR.ink950, letterSpacing: "-0.02em" }}>
              Utilities
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
                        border: `2px solid ${COLOR.white}`,
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
                    color: COLOR.white,
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

          {/* Utilities List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <HubRow
              icon={ClipboardCheck}
              title="Attendance Regularization"
              badge="1 Pending"
              badgeTone="pending"
              tint={{ color: COLOR.primary, bg: COLOR.primarySoft }}
              onClick={() => setActiveSection("attendance")}
            />
            <HubRow
              icon={FileText}
              title="Resignation"
              badge={resignationStatus === "submitted" ? "Submitted" : "Active"}
              badgeTone={resignationStatus === "submitted" ? "pending" : "info"}
              tint={{ color: COLOR.brandCrimson, bg: COLOR.brandCrimsonLight }}
              onClick={() => setActiveSection("resignation")}
            />
            <HubRow
              icon={FileSpreadsheet}
              title="Salary Slip"
              badge="Ready"
              badgeTone="success"
              tint={{ color: COLOR.success, bg: COLOR.successLight }}
              onClick={() => setActiveSection("salary")}
            />
            <HubRow
              icon={BookOpen}
              title="Policy"
              badge={policies.length}
              badgeTone="brand"
              tint={{ color: COLOR.info, bg: COLOR.infoLight }}
              onClick={() => setActiveSection("policy")}
            />
            <HubRow
              icon={FolderLock}
              title="My Documents"
              badge={documents.length}
              badgeTone="brand"
              tint={{ color: COLOR.warning, bg: COLOR.warningLight }}
              onClick={() => setActiveSection("documents")}
            />
            {onOpenHelpDesk && (
              <HubRow
                icon={HelpCircle}
                title="Help Desk"
                tint={{ color: COLOR.insight, bg: COLOR.insightLight }}
                onClick={onOpenHelpDesk}
              />
            )}
          </div>
        </div>
      )}

      {/* ======================================================================
          SECTION 1: ATTENDANCE REGULARIZATION SUB-SCREEN
          ====================================================================== */}
      {activeSection === "attendance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Subscreen Topbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => setActiveSection("hub")} style={backBtnStyle}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <button onClick={() => setShowRegModal(true)} style={smallPrimaryBtnStyle}>
              <Plus size={14} />
              <span>New Request</span>
            </button>
          </div>

          <div style={pageTitleStyle}>Attendance Regularization</div>

          {/* Link to Full Monthly Attendance View */}
          {onOpenAttendance && (
            <button
              onClick={onOpenAttendance}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: RADIUS.card,
                background: COLOR.white,
                color: COLOR.primary,
                border: `1px solid ${COLOR.border}`,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={16} />
                <span>Monthly Attendance</span>
              </div>
              <ChevronRight size={16} />
            </button>
          )}

          {/* Records List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {attendanceRecords.map((r) => {
              const isNeeds = r.status === "needs_regularization";
              const isPending = r.status === "pending_review";
              const isApproved = r.status === "approved";

              return (
                <div
                  key={r.id}
                  style={{
                    ...cardStyle,
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: COLOR.ink500, fontWeight: 500 }}>
                        {r.date} · {r.time}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink950, marginTop: 2 }}>
                        {r.session}
                      </div>
                    </div>

                    <span style={statusPill(isApproved ? "success" : isPending ? "pending" : "danger")}>
                      {isApproved ? "Approved" : isPending ? "Pending" : r.statusLabel}
                    </span>
                  </div>

                  <div
                    style={{
                      background: COLOR.surface,
                      borderRadius: RADIUS.sm,
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: COLOR.ink700,
                    }}
                  >
                    <span>In: <strong>{r.recordedIn}</strong></span>
                    <span>Out: <strong>{r.recordedOut}</strong></span>
                  </div>

                  {isNeeds && (
                    <button
                      onClick={() => {
                        setRegDate(r.date);
                        setRegSession(r.session);
                        setShowRegModal(true);
                      }}
                      style={{
                        marginTop: 4,
                        padding: "8px",
                        borderRadius: RADIUS.sm,
                        background: COLOR.white,
                        border: `1px solid ${COLOR.border}`,
                        color: COLOR.primary,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Clock size={13} />
                      <span>Regularize</span>
                    </button>
                  )}

                  {isPending && (
                    <div style={{ fontSize: 11.5, color: COLOR.ink500 }}>
                      {r.reason}
                    </div>
                  )}

                  {isApproved && (
                    <div style={{ fontSize: 11.5, color: COLOR.ink500 }}>
                      Approved by {r.approvedBy}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modal for Regularization Request */}
          {showRegModal && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.5)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
              onClick={() => setShowRegModal(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: COLOR.white,
                  borderTopLeftRadius: RADIUS.modal,
                  borderTopRightRadius: RADIUS.modal,
                  padding: "20px 22px 30px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  maxHeight: "90%",
                  overflowY: "auto",
                }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 2, background: COLOR.border, alignSelf: "center" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: COLOR.ink950 }}>
                    Regularization
                  </div>
                  <button onClick={() => setShowRegModal(false)} style={sheetCloseBtnStyle}>
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleApplyRegularization} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                      Session & Date
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${regDate} · ${regSession}`}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.border}`, background: COLOR.surface, fontSize: 12.5, boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                      Reason
                    </label>
                    <select
                      value={regReasonType}
                      onChange={(e) => setRegReasonType(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.borderStrong}`, background: COLOR.white, fontSize: 12.5, boxSizing: "border-box" }}
                    >
                      <option value="Biometric scanner failure on site">Biometric scanner failure on site</option>
                      <option value="Session extended for learner overtime">Session extended for learner overtime</option>
                      <option value="Network / device offline at dock berth">Network / device offline at dock berth</option>
                      <option value="Transit delay between simulator bays">Transit delay between simulator bays</option>
                      <option value="Other administrative discrepancy">Other administrative discrepancy</option>
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                        Punch In
                      </label>
                      <input
                        type="text"
                        value={regActualIn}
                        onChange={(e) => setRegActualIn(e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.borderStrong}`, fontSize: 12.5, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                        Punch Out
                      </label>
                      <input
                        type="text"
                        value={regActualOut}
                        onChange={(e) => setRegActualOut(e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.borderStrong}`, fontSize: 12.5, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                      Remarks
                    </label>
                    <textarea
                      value={regNotes}
                      onChange={(e) => setRegNotes(e.target.value)}
                      placeholder="Optional"
                      rows={2}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.borderStrong}`, fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>

                  <button type="submit" style={{ ...primaryBtnStyle, marginTop: 6, padding: "13px" }}>
                    <Send size={15} />
                    <span>Submit</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================
          SECTION 2: RESIGNATION SUB-SCREEN
          ====================================================================== */}
      {activeSection === "resignation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Subscreen Topbar */}
          <button onClick={() => setActiveSection("hub")} style={{ ...backBtnStyle, alignSelf: "flex-start" }}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div style={pageTitleStyle}>Resignation</div>

          {/* Current Status Card */}
          {resignationStatus === "submitted" && resignationData ? (
            <div
              style={{
                ...cardStyle,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.ink950 }}>
                    Resignation Submitted
                  </div>
                  <div style={{ fontSize: 12, color: COLOR.ink500, marginTop: 2 }}>
                    {resignationData.submittedDate}
                  </div>
                </div>
                <span style={statusPill("pending")}>{resignationData.status}</span>
              </div>

              <div
                style={{
                  background: COLOR.surface,
                  borderRadius: RADIUS.sm,
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12.5,
                  color: COLOR.ink700,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span>Last Working Day</span>
                  <strong style={{ color: COLOR.ink950 }}>{resignationData.proposedLWD}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span>Notice Period</span>
                  <strong style={{ color: COLOR.ink950 }}>{resignationData.noticePeriod}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span>Reason</span>
                  <strong style={{ color: COLOR.ink950, textAlign: "right" }}>{resignationData.reason}</strong>
                </div>
                {resignationData.notes && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span>Remarks</span>
                    <span style={{ color: COLOR.ink950, textAlign: "right" }}>{resignationData.notes}</span>
                  </div>
                )}
              </div>

              {/* Progress Milestones */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLOR.success }}>
                  <CheckCircle2 size={13} /> <span>Submitted</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLOR.warning }}>
                  <Clock size={13} /> <span>HR Approval</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLOR.ink500 }}>
                  <Clock size={13} /> <span>Handover</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLOR.ink500 }}>
                  <Clock size={13} /> <span>Final Settlement</span>
                </div>
              </div>

              <button onClick={handleWithdrawResignation} style={dangerOutlineBtnStyle}>
                Withdraw
              </button>
            </div>
          ) : (
            <div
              style={{
                ...cardStyle,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: RADIUS.comp,
                    background: COLOR.primarySoft,
                    color: COLOR.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserCheck size={18} />
                </div>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: COLOR.ink950 }}>
                  Employment
                </div>
                <span style={statusPill("success")}>Active</span>
              </div>

              <div
                style={{
                  background: COLOR.surface,
                  borderRadius: RADIUS.sm,
                  padding: "10px 12px",
                  fontSize: 12.5,
                  color: COLOR.ink700,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Notice Period</span>
                <strong style={{ color: COLOR.ink950 }}>30 Days</strong>
              </div>

              <button onClick={() => setShowResignModal(true)} style={dangerOutlineBtnStyle}>
                <FileText size={15} />
                <span>Resign</span>
              </button>
            </div>
          )}

          {/* Resignation Submission Modal */}
          {showResignModal && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.5)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
              onClick={() => setShowResignModal(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: COLOR.white,
                  borderTopLeftRadius: RADIUS.modal,
                  borderTopRightRadius: RADIUS.modal,
                  padding: "20px 22px 30px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  maxHeight: "90%",
                  overflowY: "auto",
                }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 2, background: COLOR.border, alignSelf: "center" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: COLOR.ink950 }}>
                    Resignation
                  </div>
                  <button onClick={() => setShowResignModal(false)} style={sheetCloseBtnStyle}>
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSubmitResignation} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                      Reason
                    </label>
                    <select
                      value={resignReason}
                      onChange={(e) => setResignReason(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.borderStrong}`, background: COLOR.white, fontSize: 12.5, boxSizing: "border-box" }}
                    >
                      <option value="Career Growth & Advancement">Career Growth & Advancement</option>
                      <option value="Higher Education / Certification">Higher Education / Certification</option>
                      <option value="Relocation / Family Relocation">Relocation / Family Relocation</option>
                      <option value="Health / Personal Reasons">Health / Personal Reasons</option>
                      <option value="Other Opportunity">Other Opportunity</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                      Last Working Day
                    </label>
                    <input
                      type="date"
                      value={proposedLWD}
                      onChange={(e) => setProposedLWD(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.borderStrong}`, fontSize: 12.5, boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                      Remarks
                    </label>
                    <textarea
                      value={resignNotes}
                      onChange={(e) => setResignNotes(e.target.value)}
                      placeholder="Optional"
                      rows={3}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.borderStrong}`, fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>

                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: COLOR.ink700, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={noticeAgreed}
                      onChange={(e) => setNoticeAgreed(e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <span>I accept the 30-day notice period and handover.</span>
                  </label>

                  <button
                    type="submit"
                    disabled={!noticeAgreed}
                    style={{
                      ...primaryBtnStyle,
                      marginTop: 6,
                      padding: "13px",
                      background: noticeAgreed ? COLOR.danger : COLOR.ink300,
                      cursor: noticeAgreed ? "pointer" : "not-allowed",
                    }}
                  >
                    <Send size={15} />
                    <span>Submit</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================
          SECTION 3: SALARY SLIP SUB-SCREEN
          ====================================================================== */}
      {activeSection === "salary" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Subscreen Topbar */}
          <button onClick={() => setActiveSection("hub")} style={{ ...backBtnStyle, alignSelf: "flex-start" }}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div style={pageTitleStyle}>Salary Slips</div>

          {/* Month & Year Selector */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {salarySlips.map((s) => {
              const isSel = selectedSlipId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSlipId(s.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: RADIUS.pill,
                    border: `1px solid ${isSel ? COLOR.primary : COLOR.border}`,
                    background: isSel ? COLOR.primary : COLOR.white,
                    color: isSel ? COLOR.white : COLOR.ink800,
                    fontSize: 12.5,
                    fontWeight: isSel ? 600 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.month}
                </button>
              );
            })}
          </div>

          {/* Selected Salary Breakdown Card */}
          <div
            style={{
              ...cardStyle,
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: COLOR.ink500, fontWeight: 500 }}>
                  Net Pay
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLOR.ink950, letterSpacing: "-0.02em" }}>
                  ₹{activeSlip.net.toLocaleString()}
                </div>
                <div style={{ fontSize: 11.5, color: COLOR.ink500, marginTop: 2 }}>
                  {activeSlip.disbursedDate}
                </div>
              </div>
              <span style={statusPill("success")}>{activeSlip.status}</span>
            </div>

            {/* Earnings & Deductions Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: COLOR.surface, borderRadius: RADIUS.sm, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: COLOR.ink500 }}>Sessions</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.ink950, marginTop: 2 }}>
                  {activeSlip.sessionsCount}
                </div>
              </div>
              <div style={{ background: COLOR.surface, borderRadius: RADIUS.sm, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: COLOR.ink500 }}>Gross</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.ink950, marginTop: 2 }}>
                  ₹{activeSlip.gross.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Itemized Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, borderTop: `1px solid ${COLOR.border}`, paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: COLOR.ink700 }}>
                <span>Basic</span>
                <strong>₹{activeSlip.basic.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: COLOR.ink700 }}>
                <span>Session Allowance</span>
                <strong>₹{activeSlip.sessionsAllowance.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: COLOR.ink700 }}>
                <span>Special Allowance</span>
                <strong>₹{activeSlip.specialAllowance.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: COLOR.danger }}>
                <span>PF</span>
                <strong>-₹{activeSlip.pf.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: COLOR.danger }}>
                <span>Income Tax</span>
                <strong>-₹{activeSlip.tax.toLocaleString()}</strong>
              </div>
            </div>

            {/* Download Action */}
            <button onClick={() => handleDownloadSlip(activeSlip.month)} style={{ ...primaryBtnStyle, width: "100%", gap: 8 }}>
              <Download size={16} />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================
          SECTION 4: POLICY SUB-SCREEN
          ====================================================================== */}
      {activeSection === "policy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Subscreen Topbar */}
          <button onClick={() => setActiveSection("hub")} style={{ ...backBtnStyle, alignSelf: "flex-start" }}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div style={pageTitleStyle}>Policies</div>

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {["All", "Safety & HSE", "Conduct & Attendance", "Compensation & Travel", "Career & Resignation"].map((c) => {
              const isSel = policyCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => setPolicyCategory(c)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: RADIUS.pill,
                    border: `1px solid ${isSel ? COLOR.primary : COLOR.border}`,
                    background: isSel ? COLOR.primary : COLOR.white,
                    color: isSel ? COLOR.white : COLOR.ink700,
                    fontSize: 11.5,
                    fontWeight: isSel ? 600 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Policies List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredPolicies.map((p) => (
              <div
                key={p.id}
                onClick={() => setActivePolicyDetail(p)}
                style={{
                  ...cardStyle,
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink950 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: COLOR.ink500, marginTop: 3 }}>
                    {p.category} · {p.version} · {p.updated}
                  </div>
                </div>
                <ChevronRight size={16} color={COLOR.ink400} />
              </div>
            ))}
          </div>

          {/* Policy Detail Modal */}
          {activePolicyDetail && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.5)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
              onClick={() => setActivePolicyDetail(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: COLOR.white,
                  borderTopLeftRadius: RADIUS.modal,
                  borderTopRightRadius: RADIUS.modal,
                  padding: "20px 22px 30px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  maxHeight: "88%",
                  overflowY: "auto",
                }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 2, background: COLOR.border, alignSelf: "center" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 16.5, fontWeight: 700, color: COLOR.ink950 }}>
                      {activePolicyDetail.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: COLOR.ink500, marginTop: 3 }}>
                      {activePolicyDetail.category} · {activePolicyDetail.version} · {activePolicyDetail.updated}
                    </div>
                  </div>
                  <button onClick={() => setActivePolicyDetail(null)} style={sheetCloseBtnStyle}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ background: COLOR.surface, borderRadius: RADIUS.sm, padding: "12px", fontSize: 12.5, color: COLOR.ink800, lineHeight: 1.55 }}>
                  {activePolicyDetail.details}
                </div>

                <button
                  onClick={() => {
                    showToast("Policy downloaded");
                    setActivePolicyDetail(null);
                  }}
                  style={{ ...primaryBtnStyle, gap: 8 }}
                >
                  <Download size={16} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================
          SECTION 5: MY DOCUMENTS SUB-SCREEN
          ====================================================================== */}
      {activeSection === "documents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Subscreen Topbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => setActiveSection("hub")} style={backBtnStyle}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <button onClick={() => setShowUploadModal(true)} style={smallPrimaryBtnStyle}>
              <Upload size={13} />
              <span>Upload</span>
            </button>
          </div>

          <div style={pageTitleStyle}>My Documents</div>

          {/* Document Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {documents.map((d) => (
              <div
                key={d.id}
                style={{
                  ...cardStyle,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: RADIUS.comp,
                      background: COLOR.primarySoft,
                      color: COLOR.primary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileCheck size={20} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.ink950 }}>
                      {d.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: COLOR.ink500, marginTop: 2 }}>
                      {d.type} · {d.size} · {d.issuedDate}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={() => showToast("Opening preview")}
                    style={{
                      border: `1px solid ${COLOR.border}`,
                      background: COLOR.white,
                      color: COLOR.ink700,
                      padding: "6px",
                      borderRadius: RADIUS.sm,
                      cursor: "pointer",
                    }}
                    title="View Document"
                  >
                    <Eye size={15} />
                  </button>

                  <button
                    onClick={() => showToast("Document downloaded")}
                    style={{
                      border: 0,
                      background: COLOR.primarySoft,
                      color: COLOR.primary,
                      padding: "6px",
                      borderRadius: RADIUS.sm,
                      cursor: "pointer",
                    }}
                    title="Download Document"
                  >
                    <Download size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Document Modal */}
          {showUploadModal && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.5)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
              onClick={() => setShowUploadModal(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: COLOR.white,
                  borderTopLeftRadius: RADIUS.modal,
                  borderTopRightRadius: RADIUS.modal,
                  padding: "20px 22px 30px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  maxHeight: "90%",
                  overflowY: "auto",
                }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 2, background: COLOR.border, alignSelf: "center" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: COLOR.ink950 }}>
                    Upload Document
                  </div>
                  <button onClick={() => setShowUploadModal(false)} style={sheetCloseBtnStyle}>
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleUploadDocument} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      value={uploadDocName}
                      onChange={(e) => setUploadDocName(e.target.value)}
                      placeholder="e.g. Quay Crane Level 3 Certification"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.borderStrong}`, fontSize: 12.5, boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: COLOR.ink700, display: "block", marginBottom: 4 }}>
                      Type
                    </label>
                    <select
                      value={uploadDocType}
                      onChange={(e) => setUploadDocType(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: RADIUS.sm, border: `1px solid ${COLOR.borderStrong}`, background: COLOR.white, fontSize: 12.5, boxSizing: "border-box" }}
                    >
                      <option value="Certification">Accreditation / Certification</option>
                      <option value="Identity">Government ID / Passport</option>
                      <option value="Tax / Finance">Tax PAN / Banking Proof</option>
                      <option value="Contract">Employment Contract</option>
                      <option value="Medical">Medical Fitness Certificate</option>
                    </select>
                  </div>

                  {/* Dropzone preview */}
                  <div
                    style={{
                      border: `1.5px dashed ${COLOR.borderStrong}`,
                      background: COLOR.surface,
                      borderRadius: RADIUS.card,
                      padding: "22px 16px",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <Upload size={24} color={COLOR.primary} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.ink950 }}>
                      Choose File
                    </div>
                    <div style={{ fontSize: 11.5, color: COLOR.ink500 }}>
                      PDF, PNG, JPG · Max 10 MB
                    </div>
                  </div>

                  <button type="submit" style={{ ...primaryBtnStyle, marginTop: 6, padding: "13px" }}>
                    <Upload size={15} />
                    <span>Upload</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
