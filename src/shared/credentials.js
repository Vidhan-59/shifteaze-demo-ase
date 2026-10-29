/* ─────────────────────────────────────────────────────────────────────────
   DEMO CREDENTIALS — shared by the enterprise web app and the trainer app.

   This build has no backend, so sign-in is checked in the browser against
   the table below. That is fine for a demo, but it is NOT secure: anyone can
   read these passwords from the shipped JavaScript. A real deployment must
   verify credentials on a server and never ship passwords to the client.

   Every account is listed in docs/DEMO_CREDENTIALS.md as well.
   ───────────────────────────────────────────────────────────────────────── */

/** Web dashboard logins. `userId` points at a DEMO_USERS entry in the enterprise app. */
export const WEB_ACCOUNTS = [
  { email: "n.verma@rcsl.com", password: "Central@2026", userId: "U1" },
  // One BU Head per business unit — each only sees their own BU and its sites.
  { email: "r.kapoor@rcsl.com", password: "Ports@2026", userId: "U2" },
  { email: "a.khanna@rcsl.com", password: "Logistics@2026", userId: "U10" },
  { email: "m.bose@rcsl.com", password: "Energy@2026", userId: "U11" },
  { email: "s.bhatt@rcsl.com", password: "Site@2026", userId: "U3" },
  { email: "d.menon@rcsl.com", password: "Scheduler@2026", userId: "U4" },
  { email: "f.sheikh@rcsl.com", password: "Coordinator@2026", userId: "U5" },
  { email: "a.ranjan@rcsl.com", password: "Assessor@2026", userId: "U6" },
  { email: "i.qureshi@skillpartners.in", password: "Vendor@2026", userId: "U9" },
];

/**
 * Trainer mobile app logins — one trainer per business unit, signing in with
 * their phone number + password (`email` is kept as the account's internal key
 * for saved data). `empId` is the trainer's employee record in the enterprise
 * app, so sessions a scheduler
 * assigns to that employee reach this phone; `buId` is the BU whose published
 * schedules this trainer is notified about. Only the Ports trainer carries
 * `seedDemoSchedule` — the app's built-in September demo month. The other
 * trainers start empty and see only what the web dashboard publishes to them.
 */
export const MOBILE_ACCOUNTS = [
  {
    phone: "+91 98250 11041", password: "Mundra#Trainer1", email: "r.solanki@rcsl.com",
    empId: "E001", buId: "BU-PORTS", siteId: "SITE-MUNDRA", seedDemoSchedule: true,
    profile: { name: "R. Solanki", empId: "RCS-1041", title: "Senior Technical Trainer", site: "Mundra Site (MUN)", siteCode: "MUN", bu: "Ports", phone: "+91 98250 11041" },
  },
  {
    phone: "+91 98250 11077", password: "Kochi#Trainer2", email: "k.mehta@rcsl.com",
    empId: "E002", buId: "BU-LOGISTICS", siteId: "SITE-KOCHI",
    profile: { name: "K. Mehta", empId: "RCS-1077", title: "Logistics Trainer", site: "Kochi Site (KOC)", siteCode: "KOC", bu: "Logistics", phone: "+91 98250 11077" },
  },
  {
    phone: "+91 98250 11188", password: "Dahej#Trainer3", email: "v.singh@rcsl.com",
    empId: "E005", buId: "BU-ENERGY", siteId: "SITE-DAHEJ",
    profile: { name: "V. Singh", empId: "RCS-1188", title: "Process Safety Trainer", site: "Dahej Site (DHJ)", siteCode: "DHJ", bu: "Energy", phone: "+91 98250 11188" },
  },
];

const match = (accounts, email, password) => {
  const e = String(email || "").trim().toLowerCase();
  return accounts.find((a) => a.email === e && a.password === password) || null;
};

/** Returns the matching web account, or null when the email/password pair is wrong. */
export const verifyWebLogin = (email, password) => match(WEB_ACCOUNTS, email, password);

// Compare the last 10 digits, so "+91 98250 11041", "98250 11041" and "9825011041" all match.
const phoneDigits = (p) => String(p || "").replace(/\D/g, "").slice(-10);

/** Returns the matching trainer account, or null when the phone/password pair is wrong. */
export const verifyMobileLogin = (phone, password) => {
  const digits = phoneDigits(phone);
  if (digits.length !== 10) return null;
  return MOBILE_ACCOUNTS.find((a) => phoneDigits(a.phone) === digits && a.password === password) || null;
};
