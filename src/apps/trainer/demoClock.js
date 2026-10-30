// The trainer app's demo clock. "Today" and the Ports demo account's schedule
// cycle are fixed here so every screen (home, calendar, confirmation, auction)
// agrees on the same date.
export const TODAY_DATE = "2026-10-30";
export const DEMO_CYCLE_START = "2026-10-30";
export const DEMO_CYCLE_END = "2026-11-30";

export const inDemoCycle = (iso) => !!iso && iso >= DEMO_CYCLE_START && iso <= DEMO_CYCLE_END;

// "Friday, 30 October 2026"
export const formatLongDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .replace(/^(\w+) /, "$1, ");
