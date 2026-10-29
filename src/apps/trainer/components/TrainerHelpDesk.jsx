import React, { useState } from "react";
import {
  ArrowLeft, ChevronDown, X, AlertCircle,
  Inbox, Headphones, Send, Tag,
  Wallet, Clock, CalendarDays, QrCode, CalendarClock, Users, HelpCircle,
} from "lucide-react";
import { COLOR, RADIUS, SHADOW } from "../theme/tokens";

const HELPDESK_MODULES = [
  { id: "payroll",    label: "Payroll" },
  { id: "attendance", label: "Attendance" },
  { id: "leave",      label: "Leave" },
  { id: "gate_pass",  label: "Gate Pass" },
  { id: "roster",     label: "Roster / Shift" },
  { id: "hr",         label: "HR" },
  { id: "general",    label: "General" },
];

const QUERY_CATS = {
  payroll:    ["Salary Issue","Incentive Issue","Payslip","Deduction","Moves Mismatch","Overtime Rate Discrepancy","Other"],
  attendance: ["Missing Attendance","Wrong Punch","Regularization","Shift Issue","Biometric Failure","Other"],
  leave:      ["Leave Balance","Leave Request","Leave Cancellation","Emergency Leave Credit","Leave Encashment","Other"],
  gate_pass:  ["Gate Entry Delay","QR Code Expired","Security Clearance","Terminal Access Pass","Vehicle Pass","Other"],
  roster:     ["Shift Timing Conflict","Shift Swap Request","Night Shift Allowance","Roster Not Published","Reliever Allocation","Other"],
  hr:         ["ID Card Replacement","PF / ESIC Query","Policy Query","Medical Insurance Card","Personal Details Update","Other"],
  general:    ["Facilities & Canteen","Uniform / Safety Gear (PPE)","Transportation / Shuttle","Grievance","Other"],
};

const STATUS_STYLES = {
  "OPEN":        { bg: COLOR.infoLight,    color: COLOR.info,    border: COLOR.infoBorder },
  "IN PROGRESS": { bg: COLOR.warningLight, color: COLOR.warning, border: COLOR.warningBorder },
  "RESOLVED":    { bg: COLOR.successLight, color: COLOR.success, border: COLOR.successBorder },
  "CLOSED":      { bg: COLOR.neutralLight, color: COLOR.neutral, border: COLOR.neutralBorder },
  "CANCELLED":   { bg: COLOR.dangerLight,  color: COLOR.danger,  border: COLOR.dangerBorder },
};

/* Tinted icon tile per module (visual only, keyed by module label) */
const MODULE_TILES = {
  "Payroll":        { Icon: Wallet,        bg: COLOR.successLight,      color: COLOR.success },
  "Attendance":     { Icon: Clock,         bg: COLOR.primarySoft,       color: COLOR.primary },
  "Leave":          { Icon: CalendarDays,  bg: COLOR.infoLight,         color: COLOR.info },
  "Gate Pass":      { Icon: QrCode,        bg: COLOR.warningLight,      color: COLOR.warning },
  "Roster / Shift": { Icon: CalendarClock, bg: COLOR.primarySoft,       color: COLOR.primary },
  "HR":             { Icon: Users,         bg: COLOR.brandCrimsonLight, color: COLOR.brandCrimson },
  "General":        { Icon: HelpCircle,    bg: COLOR.infoLight,         color: COLOR.info },
};

function ModuleTile({ module }) {
  const t = MODULE_TILES[module] || { Icon: Headphones, bg: COLOR.primarySoft, color: COLOR.primary };
  const { Icon } = t;
  return (
    <span style={{ width: 36, height: 36, borderRadius: RADIUS.comp, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={18} color={t.color} />
    </span>
  );
}

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES["OPEN"];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: RADIUS.pill, background: s.bg, color: s.color, whiteSpace: "nowrap", flexShrink: 0 }}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function Sheet({ title, items, onSelect, onClose }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ background: COLOR.cardBg, borderRadius: "24px 24px 0 0", maxHeight: "72%", display: "flex", flexDirection: "column", boxShadow: SHADOW.sheet }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: COLOR.borderStrong }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 10px" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: COLOR.textPrimary }}>{title}</span>
          <button onClick={onClose} style={{ border: `1px solid ${COLOR.border}`, background: COLOR.surfaceMuted, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={15} color={COLOR.textSecondary} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "0 14px 24px" }}>
          {items.map((item) => {
            const label = typeof item === "string" ? item : item.label;
            const id    = typeof item === "string" ? item : item.id;
            return (
              <button key={id} onClick={() => onSelect(id)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 6, borderRadius: RADIUS.md, border: `1px solid ${COLOR.border}`, background: COLOR.cardBg, fontSize: 13.5, color: COLOR.textPrimary, fontWeight: 500, cursor: "pointer", transition: "all 0.1s ease" }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TrainerHelpDesk({ tickets, onAddTicket, onCancelTicket, onBack, showToast }) {
  const [tab,           setTab]           = useState("create");
  const [module,        setModule]        = useState("");
  const [category,      setCategory]      = useState("");
  const [desc,          setDesc]          = useState("");
  const [showModSheet,  setShowModSheet]  = useState(false);
  const [showCatSheet,  setShowCatSheet]  = useState(false);
  const [errors,        setErrors]        = useState({});
  const [toCancel,      setToCancel]      = useState(null);
  const [submitOk,      setSubmitOk]      = useState(false);

  const modLabel    = HELPDESK_MODULES.find(m => m.id === module)?.label || "";
  const cats        = module ? (QUERY_CATS[module] || []) : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = {};
    if (!module)      err.module   = "Please select a module.";
    if (!category)    err.category = "Please select a query category.";
    if (!desc.trim()) err.desc     = "Please describe your issue.";
    if (Object.keys(err).length) { setErrors(err); return; }

    const now = new Date();
    onAddTicket({
      id:             `TKT-2026-${String(tickets.length + 143).padStart(5,"0")}`,
      title:          `${modLabel} Related - ${category}`,
      module:         modLabel,
      queryCategory:  category,
      description:    desc.trim(),
      status:         "OPEN",
      assignedTo:     "HR",
      lastAssignedTo: "HR",
      createdAtDate:  now.toISOString().split("T")[0],
      createdAtTime:  now.toTimeString().split(" ")[0],
      updatedAtDate:  now.toISOString().split("T")[0],
      updatedAtTime:  now.toTimeString().split(" ")[0],
    });

    setSubmitOk(true);
    setModule(""); setCategory(""); setDesc(""); setErrors({});
    setTimeout(() => { setSubmitOk(false); setTab("my_tickets"); }, 1200);
    showToast("Ticket submitted");
  };

  const dropStyle = (hasErr) => ({
    width: "100%", padding: "11px 14px", borderRadius: RADIUS.md, fontSize: 13.5,
    color: COLOR.textPrimary, background: COLOR.cardBg, display: "flex",
    justifyContent: "space-between", alignItems: "center", cursor: "pointer",
    border: `1.5px solid ${hasErr ? COLOR.danger : COLOR.borderStrong}`,
    transition: "border-color 0.15s ease",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button onClick={onBack} style={{ border: `1px solid ${COLOR.border}`, background: COLOR.cardBg, borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: SHADOW.subtle }}>
          <ArrowLeft size={17} color={COLOR.textPrimary} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, color: COLOR.textPrimary, letterSpacing: "-0.015em" }}>Help Desk</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, padding: 3, background: COLOR.surfaceMuted, borderRadius: RADIUS.md, border: `1px solid ${COLOR.border}`, marginBottom: 16 }}>
        {[{ id:"create", label:"New Ticket" }, { id:"my_tickets", label:`My Tickets (${tickets.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "8px 0", border: 0, borderRadius: RADIUS.sm,
            background: tab === t.id ? COLOR.primary : "transparent",
            fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
            color: tab === t.id ? COLOR.white : COLOR.textSecondary,
            cursor: "pointer", transition: "all 0.15s ease",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Create Ticket */}
      {tab === "create" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: COLOR.cardBg, borderRadius: RADIUS.card, padding: "16px 16px", border: `1px solid ${COLOR.border}`, borderLeft: `4px solid ${COLOR.primary}`, boxShadow: SHADOW.card, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Module dropdown */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: COLOR.textSecondary, display: "block", marginBottom: 5 }}>Module <span style={{ color: COLOR.danger }}>*</span></label>
              <button type="button" onClick={() => setShowModSheet(true)} style={dropStyle(!!errors.module)}>
                <span style={{ color: module ? COLOR.textPrimary : COLOR.textMuted }}>{modLabel || "Select Module"}</span>
                <ChevronDown size={16} color={COLOR.primary} />
              </button>
              {errors.module && <div style={{ fontSize: 11.5, color: COLOR.danger, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={12} />{errors.module}</div>}
            </div>

            {/* Category dropdown */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: COLOR.textSecondary, display: "block", marginBottom: 5 }}>Query Category <span style={{ color: COLOR.danger }}>*</span></label>
              <button type="button" onClick={() => module ? setShowCatSheet(true) : setErrors(p => ({ ...p, module: "Please select a module first." }))}
                style={{ ...dropStyle(!!errors.category), opacity: module ? 1 : 0.6 }}>
                <span style={{ color: category ? COLOR.textPrimary : COLOR.textMuted }}>{category || "Select Query Category"}</span>
                <ChevronDown size={16} color={COLOR.primary} />
              </button>
              {errors.category && <div style={{ fontSize: 11.5, color: COLOR.danger, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={12} />{errors.category}</div>}
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: COLOR.textSecondary, display: "block", marginBottom: 5 }}>Description <span style={{ color: COLOR.danger }}>*</span></label>
              <textarea rows={4} value={desc} onChange={e => { setDesc(e.target.value); setErrors(p => ({ ...p, desc: null })); }}
                placeholder="Describe the issue"
                style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS.md, border: `1px solid ${errors.desc ? COLOR.danger : COLOR.borderStrong}`, fontSize: 13.5, color: COLOR.textPrimary, resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: COLOR.cardBg }} />
              {errors.desc && <div style={{ fontSize: 11.5, color: COLOR.danger, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={12} />{errors.desc}</div>}
            </div>
          </div>

          <button type="submit" style={{ padding: "12px", borderRadius: RADIUS.md, background: COLOR.brandPrimary, color: "#FFF", border: 0, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Send size={15} /><span>Submit</span>
          </button>

          {submitOk && (
            <div style={{ background: COLOR.successLight, color: COLOR.success, padding: 10, borderRadius: RADIUS.md, textAlign: "center", fontSize: 13, fontWeight: 600 }}>
              Ticket submitted
            </div>
          )}
        </form>
      )}

      {/* My Tickets */}
      {tab === "my_tickets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tickets.length === 0 ? (
            <div style={{ background: COLOR.cardBg, borderRadius: RADIUS.card, padding: "36px 20px", textAlign: "center", border: `1px solid ${COLOR.border}`, boxShadow: SHADOW.card }}>
              <Inbox size={32} color={COLOR.primary300} style={{ margin: "0 auto 10px", display: "block" }} />
              <div style={{ fontSize: 13.5, fontWeight: 600, color: COLOR.textSecondary }}>No tickets yet</div>
              <button onClick={() => setTab("create")} style={{ marginTop: 14, padding: "9px 20px", borderRadius: RADIUS.md, background: COLOR.brandPrimary, color: COLOR.white, border: 0, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>New Ticket</button>
            </div>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} style={{ background: COLOR.cardBg, borderRadius: RADIUS.card, padding: "16px", border: `1px solid ${COLOR.border}`, borderLeft: `4px solid ${(STATUS_STYLES[ticket.status] || STATUS_STYLES["OPEN"]).border}`, boxShadow: SHADOW.card, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLOR.textSecondary, fontFamily: "monospace" }}>{ticket.id}</span>
                  <StatusPill status={ticket.status} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ModuleTile module={ticket.module} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.textPrimary, lineHeight: 1.35 }}>{ticket.title}</div>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Tag size={12} color={COLOR.primary} />
                  <span style={{ fontSize: 12, color: COLOR.textSecondary, fontWeight: 600 }}>{ticket.queryCategory}</span>
                </div>
                <div style={{ background: COLOR.surface, borderRadius: RADIUS.sm, padding: "9px 12px", fontSize: 12.5, color: COLOR.textSecondary, lineHeight: 1.5, border: `1px solid ${COLOR.border}` }}>{ticket.description}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 11, color: COLOR.textMuted }}>
                  <div><span style={{ color: COLOR.textMuted }}>Assigned To: </span><span style={{ color: COLOR.textPrimary, fontWeight: 600 }}>{ticket.assignedTo}</span></div>
                  <div><span style={{ color: COLOR.textMuted }}>Last Assigned: </span><span style={{ color: COLOR.textPrimary, fontWeight: 600 }}>{ticket.lastAssignedTo}</span></div>
                  <div><span style={{ color: COLOR.textMuted }}>Created: </span>{ticket.createdAtDate} {ticket.createdAtTime}</div>
                  <div><span style={{ color: COLOR.textMuted }}>Updated: </span>{ticket.updatedAtDate} {ticket.updatedAtTime}</div>
                </div>
                {(ticket.status === "OPEN" || ticket.status === "IN PROGRESS") && (
                  <button onClick={() => setToCancel(ticket)} style={{ padding: "9px", borderRadius: RADIUS.md, background: COLOR.brandCrimsonLight, color: COLOR.danger, border: `1px solid ${COLOR.dangerLight}`, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.1s ease" }}>
                    Cancel Ticket
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom sheets */}
      {showModSheet && <Sheet title="Select Module" items={HELPDESK_MODULES} onSelect={(id) => { setModule(id); setCategory(""); setShowModSheet(false); setErrors(p => ({ ...p, module: null })); }} onClose={() => setShowModSheet(false)} />}
      {showCatSheet && <Sheet title="Select Query Category" items={cats} onSelect={(id) => { setCategory(id); setShowCatSheet(false); setErrors(p => ({ ...p, category: null })); }} onClose={() => setShowCatSheet(false)} />}

      {/* Cancel Confirmation Modal */}
      {toCancel && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: COLOR.cardBg, borderRadius: RADIUS.modal, padding: "22px 20px", width: "100%", maxWidth: 360, boxShadow: SHADOW.modal }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: COLOR.textPrimary, marginBottom: 6 }}>Cancel Ticket?</div>
            <div style={{ fontSize: 13, color: COLOR.textSecondary, lineHeight: 1.5, marginBottom: 18, fontFamily: "monospace" }}>
              {toCancel.id}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setToCancel(null)} style={{ flex: 1, padding: "11px", borderRadius: RADIUS.md, background: COLOR.cardBg, color: COLOR.textPrimary, border: `1px solid ${COLOR.borderStrong}`, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Keep</button>
              <button onClick={() => { onCancelTicket(toCancel.id); showToast("Ticket cancelled"); setToCancel(null); }}
                style={{ flex: 1, padding: "11px", borderRadius: RADIUS.md, background: COLOR.danger, color: "#FFF", border: 0, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
