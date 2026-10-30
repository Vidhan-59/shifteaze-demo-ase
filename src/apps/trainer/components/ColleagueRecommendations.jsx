import React, { useMemo, useState } from "react";
import { COLOR, RADIUS } from "../theme/tokens";
import { Check, ChevronDown, ChevronUp, UserCheck } from "lucide-react";

// Colleagues the declining trainer can recommend in their place (Architecture
// v2.1 §8.2: a decline is a reason plus an optional recommendation). `skills`
// maps a session category to the colleague's level; `busy` blocks clash with
// a session at the same time; `leave` dates make them unavailable.
const COLLEAGUES = [
  { id: "C01", name: "Arjun Menon", title: "Senior Technical Trainer", tci: 88, skills: { Technical: 5, Safety: 3, Marine: 4 }, busy: [{ date: "2026-11-07", start: "09:00", end: "11:30" }] },
  { id: "C02", name: "Kavya Nair", title: "Technical Trainer", tci: 82, skills: { Technical: 4, Logistics: 3, Quality: 3 }, busy: [] },
  { id: "C03", name: "Rahul Shetty", title: "Crane Instructor", tci: 79, skills: { Technical: 4, Operations: 4, Marine: 3 }, leave: ["2026-11-21", "2026-11-23"], busy: [] },
  { id: "C04", name: "Deepa Varghese", title: "HSE Trainer", tci: 85, skills: { Safety: 5, Quality: 4, "Soft Skills": 3 }, busy: [{ date: "2026-10-31", start: "14:00", end: "16:00" }] },
  { id: "C05", name: "Imran Sheikh", title: "Safety Instructor", tci: 77, skills: { Safety: 4, Marine: 3, Technical: 3 }, busy: [] },
  { id: "C06", name: "Sneha Pillai", title: "Logistics Trainer", tci: 81, skills: { Logistics: 5, "Soft Skills": 4, Quality: 3 }, busy: [] },
  { id: "C07", name: "Vikram Rao", title: "Marine Operations Trainer", tci: 84, skills: { Marine: 5, Safety: 4, Technical: 3 }, busy: [] },
  { id: "C08", name: "Anita Joseph", title: "Behavioural Trainer", tci: 86, skills: { "Soft Skills": 5, Quality: 4, Safety: 3 }, busy: [] },
  { id: "C09", name: "Suresh Babu", title: "Quality Assessor", tci: 80, skills: { Quality: 5, Technical: 3, Operations: 3 }, busy: [] },
  { id: "C10", name: "Manoj Kumar", title: "Technical Trainer", tci: 74, skills: { Technical: 3, Operations: 4, Logistics: 4 }, busy: [] },
  { id: "C11", name: "Priyanka Das", title: "Operations Trainer", tci: 78, skills: { Operations: 5, Logistics: 4, Safety: 3, Marine: 3, "Soft Skills": 3 }, busy: [] },
  { id: "C12", name: "Farhan Ali", title: "Junior Technical Trainer", tci: 62, skills: { Technical: 2, Safety: 2 }, busy: [] },
];
const MIN_LEVEL = 3;

const toMins = (t = "00:00") => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const initials = (n) => n.split(" ").map((x) => x[0]).join("").slice(0, 2);

// Same competency, level ≥ L3, not on leave, no clash at this time — then
// ranked by level and TCI. Blocked colleagues keep the reason they failed.
export function recommendColleagues(session) {
  const cat = session.category || "Technical";
  const s0 = toMins(session.start), s1 = toMins(session.end);
  const eligible = [], blocked = [];
  COLLEAGUES.forEach((c) => {
    const level = c.skills[cat];
    let reason = null;
    if (!level) reason = `No ${cat} competency`;
    else if (level < MIN_LEVEL) reason = `${cat} L${level}, needs L${MIN_LEVEL}`;
    else if ((c.leave || []).includes(session.date)) reason = "On leave that day";
    else if (c.busy.some((b) => b.date === session.date && toMins(b.start) < s1 && s0 < toMins(b.end))) reason = `Busy ${session.start}–${session.end}`;
    if (reason) { if (level) blocked.push({ c, reason }); return; }
    eligible.push({ c, level, match: Math.min(98, Math.round(level * 12 + c.tci * 0.35)) });
  });
  eligible.sort((a, b) => b.match - a.match);
  return { eligible: eligible.slice(0, 4), more: Math.max(0, eligible.length - 4), blocked, category: cat };
}

export const colleagueName = (id) => COLLEAGUES.find((c) => c.id === id)?.name;

export default function ColleagueRecommendations({ session, value, onChange }) {
  const rec = useMemo(() => recommendColleagues(session), [session]);
  const [showBlocked, setShowBlocked] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <UserCheck size={15} color={COLOR.primary} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.textPrimary }}>Recommend a colleague</span>
        <span style={{ fontSize: 11, color: COLOR.textMuted }}>(optional)</span>
      </div>
      <div style={{ fontSize: 11.5, color: COLOR.textSecondary, marginTop: -4 }}>
        Same {rec.category} competency, free {session.start}–{session.end} on {session.dateLabel || session.date}
      </div>

      {rec.eligible.length === 0 ? (
        <div style={{ fontSize: 12, color: COLOR.textMuted, padding: "10px 12px", background: COLOR.surface, borderRadius: RADIUS.md }}>
          No colleague with this competency is free at this time.
        </div>
      ) : rec.eligible.map(({ c, level, match }, i) => {
        const on = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(on ? null : c.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: RADIUS.md, cursor: "pointer",
              textAlign: "left", fontFamily: "inherit", width: "100%",
              background: on ? COLOR.primarySoft : COLOR.white, border: `1.5px solid ${on ? COLOR.primary : COLOR.border}`,
            }}
          >
            <span style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: on ? COLOR.primary : COLOR.primarySoft,
              color: on ? COLOR.white : COLOR.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700 }}>
              {on ? <Check size={15} strokeWidth={3} /> : initials(c.name)}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: COLOR.textPrimary }}>
                {c.name}
                {i === 0 && <span style={{ fontSize: 9.5, fontWeight: 700, color: COLOR.success, background: COLOR.successLight, padding: "1px 6px", borderRadius: RADIUS.pill }}>BEST MATCH</span>}
              </span>
              <span style={{ display: "block", fontSize: 11, color: COLOR.textSecondary, marginTop: 1 }}>{c.title} · same site</span>
              <span style={{ display: "block", fontSize: 10.5, color: COLOR.success, marginTop: 2 }}>
                ✓ {rec.category} L{level} · ✓ Free at this time · TCI {c.tci}
              </span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLOR.primary, flexShrink: 0 }}>{match}%</span>
          </button>
        );
      })}

      {rec.blocked.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowBlocked(!showBlocked)}
            style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", fontSize: 11.5, color: COLOR.textSecondary,
              display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
            {showBlocked ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {rec.blocked.length} with this competency not available
          </button>
          {showBlocked && rec.blocked.map(({ c, reason }) => (
            <div key={c.id} style={{ fontSize: 11.5, color: COLOR.textMuted, padding: "4px 0 0 17px" }}>
              <strong style={{ color: COLOR.textSecondary }}>{c.name}</strong> — {reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
