import React, { useMemo, useState } from "react";
import { COLOR, RADIUS, SHADOW, TYPE } from "../theme/tokens";
import { TODAY_DATE } from "../demoClock.js";
import {
  Clock,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Award,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

// Open-session catalogue per business unit. A trainer only ever sees their own
// BU's tracks plus Foundation & Behavioural, which every BU runs.
const BU_CATALOG = {
  "BU-PORTS": {
    label: "Ports",
    venues: ["Sim Bay B204", "Main Auditorium A1", "Technical Lab C3", "Berth 3 OJT Yard"],
    tracks: [
      ["QC Trainer", [["QC — Container Inspection & Damage Survey", "QC Inspector L3"], ["QC — Crane Load Test Verification", "QC Inspector L4"],
        ["QC — Reefer Container Quality Checks", "QC Inspector L3"], ["QC — Lashing & Securing Audit", "QC Inspector L3"]]],
      ["Crane Operations", [["RTG Crane Automation & Control Systems", "RTG Technical L2+"], ["STS Quay Crane Operation Basics", "Crane Ops L4"], ["Container Stacking Precision", "Crane Ops L3"]]],
    ],
  },
  "BU-LOGISTICS": {
    label: "Logistics",
    venues: ["Kochi Fleet Yard", "Warehouse HQ W-12", "Ahmedabad Fleet Office 301", "Driving Track B"],
    tracks: [
      ["ITV Driver", [["ITV Driver — Terminal Tractor Fundamentals", "ITV Licence L2"], ["ITV Driver — Night Shift Yard Safety", "ITV Licence L2"], ["ITV Driver — Refresher & Road Test", "ITV Assessor"]]],
      ["EVO Driver", [["EVO Driver — Electric Vehicle Operations", "EVO Certified"], ["EVO Driver — Charging & Battery Care", "EVO Certified"], ["EVO Driver — Defensive Driving", "EVO Certified"]]],
      ["Diploma Courses", [["Diploma in Logistics — Warehousing Module", "Diploma Faculty"], ["Diploma in Supply Chain — Inventory Control", "Diploma Faculty"], ["Diploma in Port Logistics — Documentation", "Diploma Faculty"]]],
    ],
  },
  "BU-ENERGY": {
    label: "Energy",
    venues: ["Dahej Cell Line 1", "Dahej Module Hall M2", "Process Block P-05"],
    tracks: [
      ["Wind / Solar · Cell", [["Solar Cell — Wafer Handling & Line Safety", "Cell Line L3"], ["Solar Cell — Diffusion & Coating Ops", "Cell Line L3"], ["Solar Cell — Quality & EL Testing", "Cell Line L4"]]],
      ["Wind / Solar · M-Cell", [["M-Cell — Module Lamination", "M-Cell L3"], ["M-Cell — Stringing & Tabbing", "M-Cell L3"], ["M-Cell — Framing & Junction Box", "M-Cell L3"]]],
    ],
  },
};
const FOUNDATION_TRACK = ["Foundation & Behavioural", [["Workplace Safety Induction", "Foundation"], ["Communication & Teamwork", "Behavioural"],
  ["Time Management & Shift Discipline", "Behavioural"], ["Leadership for Shift Supervisors", "Behavioural"]]];
const FOUNDATION_VENUE = "Training Room 301";

const TODAY = TODAY_DATE;
const MONTHS = [{ id: "2026-10", name: "October 2026" }, { id: "2026-11", name: "November 2026" }, { id: "2026-12", name: "December 2026" }];
// Opens on the month after today's — today's month has only a day or two left to bid on.
const DEFAULT_MONTH = 1;
const SLOTS = [["09:00", "11:00"], ["11:15", "13:15"], ["14:00", "16:00"], ["16:15", "18:15"]];
const BIDDING_CLOSES_DAYS = 2;

const pad = (n) => String(n).padStart(2, "0");
const toMins = (t = "00:00") => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const to12h = (t) => { const [h, m] = t.split(":").map(Number); return `${pad(((h + 11) % 12) + 1)}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };
const dateLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
const addDaysIso = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

// Every open session for one BU across a whole month: Mon–Fri two sessions,
// Saturday one; every third slot is Foundation & Behavioural.
function buildMonth(buId, monthId) {
  const bu = BU_CATALOG[buId] ?? BU_CATALOG["BU-PORTS"];
  const [y, m] = monthId.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const out = [];
  let k = 0, buSlot = 0;
  const used = {}; // per-track counter so each track cycles through all its titles
  for (let d = 1; d <= days; d++) {
    const date = `${monthId}-${pad(d)}`;
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 0) continue;
    const perDay = dow === 6 ? 1 : 2;
    for (let i = 0; i < perDay; i++, k++) {
      const track = k % 3 === 2 ? FOUNDATION_TRACK : bu.tracks[buSlot++ % bu.tracks.length];
      used[track[0]] = (used[track[0]] ?? -1) + 1;
      const [title, credential] = track[1][used[track[0]] % track[1].length];
      const [start, end] = SLOTS[(d + i * 2) % SLOTS.length];
      out.push({
        id: `OPEN-${buId}-${date}-${i}`, date, start, end, time: `${to12h(start)} - ${to12h(end)}`,
        title, credential, category: track[0],
        venue: track === FOUNDATION_TRACK ? FOUNDATION_VENUE : bu.venues[k % bu.venues.length],
        applicantsCount: (d * 3 + i * 5) % 5,
        closesOn: addDaysIso(date, -BIDDING_CLOSES_DAYS),
      });
    }
  }
  return out;
}

export default function TrainerAuctionScreen({
  trainer = { name: "Ramesh Patel", rating: "4.92 ★", id: "TR-881", role: "Senior Technical Trainer" },
  buId = "BU-PORTS",
  mySessions = [],
  showToast = (msg) => console.log(msg),
  onOpenNotifications,
  onGoToSchedule,
}) {
  // Navigation tabs: "available" | "my_applications"
  const [activeTab, setActiveTab] = useState("available");
  const [monthIdx, setMonthIdx] = useState(DEFAULT_MONTH);
  const bu = BU_CATALOG[buId] ?? BU_CATALOG["BU-PORTS"];
  const trackNames = [...bu.tracks.map((t) => t[0]), FOUNDATION_TRACK[0]];

  // Applicant counts the trainer has changed by applying / revoking, keyed by session id.
  const [applicantDelta, setApplicantDelta] = useState({});
  const month = MONTHS[monthIdx];
  const lectures = useMemo(() => buildMonth(buId, month.id).map((l) => ({ ...l, applicantsCount: l.applicantsCount + (applicantDelta[l.id] ?? 0) })),
    [buId, month.id, applicantDelta]);

  // Visibility rules: bidding closes two days before the session, and a slot
  // that overlaps one of the trainer's own sessions can't be applied for.
  const statusOf = (lec) => {
    if (lec.closesOn < TODAY) return { open: false, note: "Bidding closed" };
    const clash = mySessions.find((s) => s.date === lec.date && s.status !== "denied" && toMins(s.start) < toMins(lec.end) && toMins(lec.start) < toMins(s.end));
    if (clash) return { open: false, note: `Clashes with your ${clash.label || "session"} (${clash.start}–${clash.end})` };
    return { open: true, note: lec.closesOn === TODAY ? "Closes today" : `Closes ${dateLabel(lec.closesOn)}` };
  };

  const shown = lectures;
  const openCount = lectures.filter((l) => statusOf(l).open).length;

  // The whole month, in three sections: sessions you can apply for first,
  // then ones that clash with your schedule, then ones whose bidding closed.
  const kindOf = (l) => { const st = statusOf(l); return st.open ? "open" : st.note.startsWith("Clashes") ? "clash" : "closed"; };
  const sections = [["open", "Open for bidding"], ["clash", "Clashes with your schedule"], ["closed", "Bidding closed"]]
    .map(([kind, label]) => {
      const rows = shown.filter((l) => kindOf(l) === kind);
      const byDate = rows.reduce((acc, l) => { (acc[l.date] = acc[l.date] || []).push(l); return acc; }, {});
      return { kind, label, count: rows.length, byDate };
    })
    .filter((sec) => sec.count > 0);

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
      id: `APP-${Date.now().toString().slice(-4)}`,
      lectureId: lecture.id,
      title: lecture.title,
      time: `${dateLabel(lecture.date)} · ${lecture.time}`,
      venue: lecture.venue,
      category: lecture.category,
      credential: lecture.credential,
      appliedAt: "Just now",
      status: "pending",
    };

    setMyApplications((prev) => [newApp, ...prev]);
    setApplicantDelta((prev) => ({ ...prev, [lecture.id]: (prev[lecture.id] ?? 0) + 1 }));
    showToast(`Applied for ${lecture.title}`);

    // Direct switch to My Applications section
    setActiveTab("my_applications");
  };

  // Revoke Flow: Withdraws the application
  const handleRevoke = (appId, lectureId) => {
    setMyApplications((prev) => prev.filter((a) => a.id !== appId));
    setApplicantDelta((prev) => ({ ...prev, [lectureId]: (prev[lectureId] ?? 0) - 1 }));
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

  // Category chip tint, fixed per track so a track keeps its colour across filters
  const CATEGORY_TINTS = [
    { bg: COLOR.infoLight, fg: COLOR.info },
    { bg: COLOR.successLight, fg: COLOR.success },
    { bg: COLOR.warningLight, fg: COLOR.warning },
    { bg: COLOR.primarySoft, fg: COLOR.primary },
  ];
  const tintOf = (cat) => CATEGORY_TINTS[Math.max(0, trackNames.indexOf(cat)) % CATEGORY_TINTS.length];

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
          {openCount} Open
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
          Available ({openCount})
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
          TAB 1: AVAILABLE LECTURES — the whole month, matched to this trainer
          ====================================================================== */}
      {activeTab === "available" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Competency scope */}
          <div style={{ fontSize: 12, color: COLOR.textSecondary, lineHeight: 1.45 }}>
            Sessions matched to your competencies · <strong style={{ color: COLOR.textPrimary }}>{bu.label}</strong>
          </div>

          {/* Month switcher */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLOR.white,
            border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.md, padding: "6px 8px" }}>
            <button type="button" disabled={monthIdx === 0} onClick={() => setMonthIdx(monthIdx - 1)}
              style={{ border: 0, background: "transparent", cursor: monthIdx === 0 ? "default" : "pointer", opacity: monthIdx === 0 ? 0.3 : 1, display: "flex" }}>
              <ChevronLeft size={18} color={COLOR.primary} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: COLOR.textPrimary }}>{month.name}</span>
            <button type="button" disabled={monthIdx === MONTHS.length - 1} onClick={() => setMonthIdx(monthIdx + 1)}
              style={{ border: 0, background: "transparent", cursor: monthIdx === MONTHS.length - 1 ? "default" : "pointer", opacity: monthIdx === MONTHS.length - 1 ? 0.3 : 1, display: "flex" }}>
              <ChevronRight size={18} color={COLOR.primary} />
            </button>
          </div>

          {shown.length === 0 && (
            <div style={{ textAlign: "center", padding: "36px 12px", fontSize: 13.5, color: COLOR.textMuted }}>
              No open sessions in {month.name}.
            </div>
          )}

          {sections.map((sec) => (
            <React.Fragment key={sec.kind}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: sec.kind === "open" ? COLOR.textPrimary : sec.kind === "clash" ? COLOR.danger : COLOR.textMuted }}>{sec.label}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: RADIUS.pill,
                background: sec.kind === "open" ? COLOR.primary : sec.kind === "clash" ? COLOR.dangerLight : COLOR.surfaceMuted,
                color: sec.kind === "open" ? COLOR.white : sec.kind === "clash" ? COLOR.danger : COLOR.textMuted }}>{sec.count}</span>
              <span style={{ flex: 1, height: 1, background: COLOR.border }} />
            </div>
            {Object.keys(sec.byDate).map((date) => (
            <div key={`${sec.kind}-${date}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLOR.textSecondary, padding: "0 2px" }}>{dateLabel(date)}</div>
              {sec.byDate[date].map((lec) => {
                const isApplied = myApplications.some((a) => a.lectureId === lec.id);
                const st = statusOf(lec);
                const tint = tintOf(lec.category);
                return (
                  <div
                    key={lec.id}
                    style={{
                      ...cardStyle,
                      opacity: st.open || isApplied ? 1 : 0.62,
                      border: `1px solid ${isApplied ? COLOR.primary200 : COLOR.border}`,
                      borderLeft: `4px solid ${isApplied ? COLOR.primary : st.open ? COLOR.infoBorder : COLOR.border}`,
                    }}
                  >
                    {/* Category & closing */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ background: tint.bg, color: tint.fg, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: RADIUS.pill }}>
                        {lec.category}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: RADIUS.pill,
                        color: st.open ? COLOR.warning : COLOR.textMuted, background: st.open ? COLOR.warningLight : COLOR.surfaceMuted }}>
                        {st.open ? <Clock size={12} /> : <AlertCircle size={12} />}
                        {st.open ? st.note : st.note.startsWith("Clashes") ? "Clash" : "Closed"}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: COLOR.textPrimary, lineHeight: 1.3 }}>{lec.title}</div>

                    {/* Time, Venue & Credential */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px", fontSize: 12, color: COLOR.textSecondary }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} color={COLOR.primary} />{lec.time}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} color={COLOR.brandCrimson} />{lec.venue}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Award size={13} color={COLOR.success} />{lec.credential}</span>
                    </div>
                    {!st.open && st.note.startsWith("Clashes") && (
                      <div style={{ fontSize: 11.5, color: COLOR.danger }}>{st.note}</div>
                    )}

                    {/* Action Row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${COLOR.border}` }}>
                      <span style={{ fontSize: 12, color: COLOR.info, fontWeight: 600 }}>{lec.applicantsCount} applied</span>
                      {isApplied ? (
                        <button type="button" onClick={() => setActiveTab("my_applications")}
                          style={{ background: COLOR.primarySoft, color: COLOR.primary, border: `1px solid ${COLOR.primary200}`, borderRadius: RADIUS.md,
                            padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <CheckCircle2 size={14} color={COLOR.primary} />
                          Applied
                        </button>
                      ) : (
                        <button type="button" disabled={!st.open} onClick={() => handleDirectApply(lec)}
                          style={{ background: st.open ? COLOR.primary : COLOR.surfaceMuted, color: st.open ? COLOR.white : COLOR.textMuted, border: "none",
                            borderRadius: RADIUS.md, padding: "8px 22px", fontSize: 13, fontWeight: 600, cursor: st.open ? "pointer" : "not-allowed",
                            transition: "background 0.15s ease" }}>
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            ))}
            </React.Fragment>
          ))}
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
