export const UNITS: Record<UnitKey, UnitDef> = {
  nicu: {
    key: "nicu",
    code: "NICU",
    name: "Neonatal Intensive Care Unit",
    short: "NICU",
    emoji: "👶",       // unchanged — renders fine
    color: "cyan",
    // ...
  },
  picu: {
    key: "picu",
    code: "PICU",
    name: "Paediatric Intensive Care Unit",
    short: "PICU",
    emoji: "🚨",       // was ❤️ — avoids clashing with CVICU's cardiac theme
    color: "rose",
    // ...
  },
  stepdown: {
    key: "stepdown",
    code: "STEPDOWN",
    name: "Step-down PICU / High Dependency",
    short: "STEPDOWN",
    emoji: "🛌",       // was 🛏️ — same "bed" meaning, no variation selector needed
    color: "amber",
    // ...
  },
  postnatal: {
    key: "postnatal",
    code: "POSTNATAL",
    name: "Postnatal Ward (Mother & Baby)",
    short: "POSTNATAL",
    emoji: "🤱",       // unchanged — renders fine
    color: "violet",
    // ...
  },
  paeds: {
    key: "paeds",
    code: "PAEDS",
    name: "Paediatric Ward",
    short: "PAEDS",
    emoji: "🧒",       // unchanged — renders fine
    color: "emerald",
    // ...
  },
};
