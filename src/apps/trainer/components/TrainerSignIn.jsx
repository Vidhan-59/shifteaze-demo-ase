import React, { useState } from "react";
import { Anchor, ArrowLeft, CalendarCheck, ChevronRight, Eye, EyeOff, LogIn, Truck, Zap } from "lucide-react";
import { COLOR, RADIUS, SHADOW } from "../theme/tokens";
import { MOBILE_ACCOUNTS, verifyMobileLogin } from "../../../shared/credentials.js";

/* ======================================================================
   TRAINER SIGN-IN — two steps:
   1. Pick your business unit (Ports, Logistics, Energy).
   2. Sign in with that BU's trainer phone number + password.
   Credentials live in src/shared/credentials.js (demo only; checked in the
   browser). The BU you sign in to decides which schedules and notifications
   the app shows.
   ====================================================================== */
const BU_ICONS = { "BU-PORTS": Anchor, "BU-LOGISTICS": Truck, "BU-ENERGY": Zap };

const initialsOf = (name) => name.split(/[\s.]+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();

function Brand({ subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: COLOR.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CalendarCheck size={30} color="#FFFFFF" />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: COLOR.ink950, letterSpacing: "-0.01em" }}>ShiftEaze Trainer</div>
      <div style={{ fontSize: 13.5, color: COLOR.textSecondary, textAlign: "center" }}>{subtitle}</div>
    </div>
  );
}

export default function TrainerSignIn({ onSignIn }) {
  const [bu, setBu] = useState(null); // the MOBILE_ACCOUNTS entry for the chosen BU
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const chooseBu = (account) => {
    setBu(account);
    setPhone(account.phone);
    setPassword("");
    setError("");
  };

  const submit = (e) => {
    e?.preventDefault();
    const account = verifyMobileLogin(phone, password);
    if (!account) {
      setError("Wrong phone number or password.");
      return;
    }
    if (account.buId !== bu.buId) {
      setError(`That account belongs to the ${account.profile.bu} business unit, not ${bu.profile.bu}.`);
      return;
    }
    setError("");
    onSignIn(account);
  };

  /* ── Step 1: which business unit ── */
  if (!bu) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "28px 4px 8px" }}>
        <Brand subtitle="Choose your business unit to sign in" />
        <div style={{ fontSize: 11.5, fontWeight: 700, color: COLOR.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 8 }}>
          Business unit
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {MOBILE_ACCOUNTS.map((a) => {
            const Icon = BU_ICONS[a.buId] ?? CalendarCheck;
            return (
              <button key={a.buId} type="button" onClick={() => chooseBu(a)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 14px", borderRadius: RADIUS.card, textAlign: "left",
                  border: `1px solid ${COLOR.border}`, background: COLOR.white, boxShadow: SHADOW.card, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: COLOR.primarySoft, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={22} color={COLOR.primary} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: COLOR.ink950 }}>{a.profile.bu}</span>
                  <span style={{ display: "block", fontSize: 12.5, color: COLOR.textSecondary, marginTop: 2 }}>{a.profile.site}</span>
                </span>
                <ChevronRight size={18} color={COLOR.textMuted} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Step 2: sign in to the chosen BU ── */
  const field = {
    width: "100%", height: 48, borderRadius: RADIUS.comp, border: `1px solid ${COLOR.borderStrong}`,
    padding: "0 14px", fontSize: 16, fontFamily: "inherit", color: COLOR.textPrimary, background: COLOR.white,
    outline: "none", boxSizing: "border-box",
  };
  const label = { fontSize: 12.5, fontWeight: 600, color: COLOR.textSecondary, marginBottom: 6, display: "block" };
  const Icon = BU_ICONS[bu.buId] ?? CalendarCheck;

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 4px 8px" }}>
      <button type="button" onClick={() => { setBu(null); setError(""); }}
        style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: "transparent",
          color: COLOR.primary, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "6px 0" }}>
        <ArrowLeft size={16} /> Change business unit
      </button>

      <Brand subtitle="Sign in to see your schedule and roster notifications" />

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: RADIUS.md,
        background: COLOR.primary050, border: `1px solid ${COLOR.primary200}` }}>
        <Icon size={20} color={COLOR.primary} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: COLOR.ink950 }}>{bu.profile.bu} business unit</div>
          <div style={{ fontSize: 12, color: COLOR.textSecondary }}>{bu.profile.site}</div>
        </div>
      </div>

      <div>
        <label htmlFor="trainer-phone" style={label}>Phone number</label>
        <input id="trainer-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone}
          onChange={(e) => { setPhone(e.target.value.replace(/[^\d+\s]/g, "")); setError(""); }} placeholder="+91 98250 11041" style={field} />
      </div>

      <div>
        <label htmlFor="trainer-password" style={label}>Password</label>
        <div style={{ position: "relative" }}>
          <input id="trainer-password" type={showPw ? "text" : "password"} autoComplete="current-password" value={password} autoFocus
            onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="••••••••" style={{ ...field, paddingRight: 48 }} />
          <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}
            style={{ position: "absolute", right: 4, top: 4, width: 40, height: 40, border: 0, background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.textMuted }}>
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ fontSize: 13, color: COLOR.danger, background: COLOR.dangerLight, border: `1px solid ${COLOR.dangerBorder}`,
          borderRadius: RADIUS.sm, padding: "10px 12px" }}>{error}</div>
      )}

      <button type="submit" disabled={!phone || !password}
        style={{ height: 50, borderRadius: RADIUS.comp, border: 0, background: COLOR.primary, color: "#FFFFFF", fontSize: 15.5, fontWeight: 700,
          fontFamily: "inherit", cursor: phone && password ? "pointer" : "not-allowed", opacity: phone && password ? 1 : 0.55,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: SHADOW.card }}>
        <LogIn size={18} /> Sign in to {bu.profile.bu}
      </button>

      {/* Demo convenience: fill in this BU's trainer credentials. */}
      <button type="button" onClick={() => { setPhone(bu.phone); setPassword(bu.password); setError(""); }}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: RADIUS.md, textAlign: "left",
          border: `1px dashed ${COLOR.borderStrong}`, background: COLOR.white, cursor: "pointer", fontFamily: "inherit", marginTop: 6 }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: COLOR.primary, color: "#FFFFFF", fontSize: 12.5, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initialsOf(bu.profile.name)}</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: COLOR.ink950 }}>Use demo trainer · {bu.profile.name}</span>
          <span style={{ display: "block", fontSize: 12, color: COLOR.textSecondary }}>Fills in the {bu.profile.bu} demo credentials</span>
        </span>
      </button>
    </form>
  );
}
