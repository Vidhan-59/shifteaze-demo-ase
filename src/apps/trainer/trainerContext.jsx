import React, { createContext, useContext } from "react";

/** The signed-in trainer, for small bits of chrome (header avatars) deep in the screens. */
export const TrainerContext = createContext({ name: "" });

/** Two-letter initials of the signed-in trainer, e.g. "K. Mehta" → "KM". */
export function TrainerInitials() {
  const { name } = useContext(TrainerContext);
  return <>{(name || "").split(/[\s.]+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</>;
}
