/* ─────────────────────────────────────────────────────────────────────────
   MOBILE INBOX — hands notifications from the enterprise web app to the
   trainer mobile app.

   There is no server in this build, so entries are kept in localStorage and
   announced on a BroadcastChannel. That means delivery works whenever both
   apps run in the same browser (same tab after switching route, or two tabs
   side by side — the mobile app updates live). It cannot reach a separate
   physical phone; that needs a backend + push service.

   Entry shape:
     { id, batchId?, toBu?, toEmp?, kind: "schedule" | "assignment",
       title, message, createdAt (ISO), date (YYYY-MM-DD), lectures? }
   `toBu` entries go to every trainer account in that business unit and carry
   the roster's sessions as `lectures` (already in the mobile app's shape);
   `toEmp` entries go to that one trainer, with any sessions assigned to them.
   ───────────────────────────────────────────────────────────────────────── */

const KEY = "shifteaze.mobileInbox.v1";
const CHANNEL = "shifteaze-mobile-inbox";
const MAX_ENTRIES = 200;

let channel = null;
const getChannel = () => {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  channel = new BroadcastChannel(CHANNEL);
  return channel;
};

export function readInbox() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Adds entries (ignoring ids already delivered) and wakes any open mobile app. */
export function deliverToMobile(entries) {
  if (!entries?.length) return;
  const current = readInbox();
  const seen = new Set(current.map((e) => e.id));
  const fresh = entries.filter((e) => e?.id && !seen.has(e.id));
  if (!fresh.length) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...fresh, ...current].slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full or blocked (private mode) — the live broadcast below still
    // reaches an open mobile tab, it just won't survive a reload.
  }
  try {
    getChannel()?.postMessage({ type: "inbox", ids: fresh.map((e) => e.id) });
  } catch {
    /* BroadcastChannel unavailable — other tabs still get the storage event. */
  }
}

/** Calls `onChange(entries)` whenever the inbox changes. Returns an unsubscribe function. */
export function subscribeInbox(onChange) {
  const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
  const onMessage = () => onChange(readInbox());
  const onStorage = (e) => { if (e.key === KEY) onChange(readInbox()); };
  ch?.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);
  return () => {
    ch?.close();
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The entries one trainer account should see. When a roster reaches them
 * through their BU, its personal "assigned" entry is dropped — the BU entry
 * already carries every session — so they get one notification per roster.
 */
export function inboxFor(account, entries) {
  if (!account) return [];
  const mine = entries.filter((e) => e.toEmp === account.empId || (!e.toEmp && e.toBu === account.buId));
  const viaBu = new Set(mine.filter((e) => !e.toEmp && e.batchId).map((e) => e.batchId));
  return mine.filter((e) => !e.toEmp || !viaBu.has(e.batchId));
}

/* Per-account read receipts, so "unread" survives reloads. */
const readKey = (email) => `shifteaze.mobileInboxRead.v1.${email}`;

export function readReceipts(email) {
  try {
    return new Set(JSON.parse(localStorage.getItem(readKey(email)) || "[]"));
  } catch {
    return new Set();
  }
}

export function saveReceipts(email, ids) {
  try {
    localStorage.setItem(readKey(email), JSON.stringify([...ids]));
  } catch {
    /* non-critical */
  }
}
