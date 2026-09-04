import { dayOfLife, hoursOfLife } from "@/lib/clinical";

/** A single provisional interpretation flag shown across the app. */
export type Flag = {
  key: string;
  label: string;
  sev: "info" | "warn" | "crit";
  note?: string;
};

export type BabyLite = {
  unit: string;
  dob: string;
  gestWeeks: number;
  gestDays: number;
  birthWeight: number;
  currentWeight: number;
};

export type AgeBand = "neonate" | "infant" | "toddler" | "child" | "adol";

export function ageBand(b: BabyLite): { band: AgeBand; pmaWeeks: number; years: number } {
  const dol = dayOfLife(b.dob);
  const isNeo = b.unit === "nicu" || b.unit === "postnatal";
  if (isNeo) {
    const pma = b.gestWeeks + b.gestDays / 7 + dol / 7;
    return { band: pma < 44 ? "neonate" : "infant", pmaWeeks: pma, years: dol / 365 };
  }
  const years = b.gestWeeks; // non-neonatal units store age in years in gestWeeks
  const band: AgeBand = years < 1 ? "infant" : years < 3 ? "toddler" : years < 10 ? "child" : "adol";
  return { band, pmaWeeks: 0, years };
}

/* ------------------------------ vital signs ------------------------------ */

const HR_RANGE: Record<AgeBand, [number, number]> = {
  neonate: [100, 160],
  infant: [100, 180],
  toddler: [90, 150],
  child: [70, 120],
  adol: [60, 100],
};
const RR_RANGE: Record<AgeBand, [number, number]> = {
  neonate: [30, 60],
  infant: [25, 50],
  toddler: [20, 40],
  child: [18, 30],
  adol: [12, 20],
};

export function hypotensionSbp(b: BabyLite): number {
  const { band, years } = ageBand(b);
  if (band === "neonate" || band === "infant") return 60;
  if (band === "adol") return 90;
  return 70 + 2 * Math.max(1, Math.floor(years));
}

export function mapFromBP(sbp: number | null, dbp: number | null): number | null {
  if (sbp == null || dbp == null) return null;
  return Math.round((sbp + 2 * dbp) / 3);
}

export type VitalsInput = {
  hr?: number | null;
  rr?: number | null;
  spo2?: number | null;
  temp?: number | null;
  sbp?: number | null;
  dbp?: number | null;
  map?: number | null;
  crt?: number | null;
  rbs?: number | null;
  urineMlKgHr?: number | null;
};

export function interpretVitals(b: BabyLite, v: VitalsInput): Flag[] {
  const { band } = ageBand(b);
  const dol = dayOfLife(b.dob);
  const f: Flag[] = [];

  if (v.hr != null) {
    const [lo, hi] = HR_RANGE[band];
    if (v.hr < (band === "neonate" ? 80 : lo - 30)) f.push({ key: "brady", label: "Bradycardia", sev: "crit", note: `HR ${v.hr} (< ${band === "neonate" ? 80 : lo - 30})` });
    else if (v.hr < lo) f.push({ key: "brady", label: "Low HR for age", sev: "warn", note: `HR ${v.hr} < ${lo}` });
    else if (v.hr > hi + 20) f.push({ key: "tachy", label: "Tachycardia", sev: "warn", note: `HR ${v.hr} > ${hi + 20}` });
  }
  if (v.rr != null) {
    const [lo, hi] = RR_RANGE[band];
    if (v.rr < (band === "neonate" ? 20 : lo - 8)) f.push({ key: "bradyp", label: "Low RR / hypoventilation", sev: "crit", note: `RR ${v.rr}` });
    else if (v.rr > hi) f.push({ key: "tachyp", label: "Tachypnoea", sev: "warn", note: `RR ${v.rr} > ${hi}` });
  }
  if (v.spo2 != null) {
    const crit = band === "neonate" ? 90 : 92;
    if (v.spo2 < crit) f.push({ key: "hypox", label: "Hypoxaemia", sev: "crit", note: `SpO₂ ${v.spo2}% < ${crit}%` });
    else if (band === "neonate" && v.spo2 < 95) f.push({ key: "spo2", label: "SpO₂ below term target", sev: "warn", note: `${v.spo2}%` });
  }
  if (v.temp != null) {
    if (v.temp < 32) f.push({ key: "hypotherm", label: "Severe hypothermia", sev: "crit", note: `${v.temp} °C < 32` });
    else if (v.temp < 36) f.push({ key: "hypotherm", label: "Moderate hypothermia", sev: "crit", note: `${v.temp} °C` });
    else if (v.temp < 36.5) f.push({ key: "hypotherm", label: "Mild hypothermia / cold stress", sev: "warn", note: `${v.temp} °C` });
    else if (v.temp >= 39) f.push({ key: "fever", label: "High fever", sev: "crit", note: `${v.temp} °C` });
    else if (v.temp >= 37.5) f.push({ key: "fever", label: "Fever", sev: "warn", note: `${v.temp} °C` });
  }
  const thr = hypotensionSbp(b);
  if (v.sbp != null && v.sbp < thr) f.push({ key: "hypot", label: "Hypotension", sev: "crit", note: `SBP ${v.sbp} < ${thr} (PALS)` });
  const mapThr = band === "neonate" ? 30 : 55;
  if (v.map != null && v.map < mapThr) f.push({ key: "lowmap", label: "Low MAP", sev: "warn", note: `MAP ${v.map} < ${mapThr}` });
  if (v.crt != null && v.crt > 4) f.push({ key: "crt", label: "Prolonged CRT", sev: "crit", note: `${v.crt} s` });
  else if (v.crt != null && v.crt > 3) f.push({ key: "crt", label: "Borderline CRT", sev: "warn", note: `${v.crt} s` });
  if (v.rbs != null) {
    if (v.rbs < 45) f.push({ key: "hypo", label: "Hypoglycaemia", sev: "crit", note: `${v.rbs} mg/dL < 45` });
    else if (v.rbs < 60) f.push({ key: "hypo", label: "Borderline glucose", sev: "warn", note: `${v.rbs} mg/dL` });
    else if (v.rbs > 250) f.push({ key: "hyper", label: "Marked hyperglycaemia", sev: "crit", note: `${v.rbs} mg/dL` });
    else if (v.rbs > 180) f.push({ key: "hyper", label: "Hyperglycaemia", sev: "warn", note: `${v.rbs} mg/dL` });
  }
  if (v.urineMlKgHr != null && dol >= 1) {
    if (v.urineMlKgHr < 0.5) f.push({ key: "oliguria", label: "Severe oliguria", sev: "crit", note: `${v.urineMlKgHr} ml/kg/h` });
    else if (v.urineMlKgHr < 1) f.push({ key: "oliguria", label: "Oliguria", sev: "warn", note: `${v.urineMlKgHr} ml/kg/h` });
    else if (v.urineMlKgHr > 5) f.push({ key: "polyuria", label: "Polyuria", sev: "warn", note: `${v.urineMlKgHr} ml/kg/h` });
  }
  return f;
}

export function interpretPain(scale: string, raw: number | null): Flag[] {
  if (raw == null) return [];
  if (scale === "NIPS") {
    if (raw >= 3) return [{ key: "pain", label: "Pain (NIPS ≥ 3)", sev: "warn", note: "analgesia / comfort measures" }];
    return [{ key: "pain", label: "Comfortable (NIPS < 3)", sev: "info" }];
  }
  if (scale === "PIPP" || scale === "PIPP-R") {
    if (raw > 12) return [{ key: "pain", label: "Severe pain (PIPP > 12)", sev: "crit" }];
    if (raw >= 7) return [{ key: "pain", label: "Moderate pain (PIPP 7–12)", sev: "warn" }];
    return [{ key: "pain", label: "Minimal pain (PIPP ≤ 6)", sev: "info" }];
  }
  if (scale === "N-PASS") {
    if (raw <= -1) return [{ key: "sed", label: "Over-sedated (N-PASS ≤ −1)", sev: "warn" }];
    if (raw > 3) return [{ key: "pain", label: "Pain (N-PASS > 3)", sev: "warn" }];
    return [{ key: "pain", label: "Comfortable (N-PASS 0–3)", sev: "info" }];
  }
  if (scale === "CRIES") {
    if (raw >= 4) return [{ key: "pain", label: "Post-op pain (CRIES ≥ 4)", sev: "warn" }];
    return [{ key: "pain", label: "Comfortable (CRIES < 4)", sev: "info" }];
  }
  return [];
}

/* ------------------------------ fluids / GIR ------------------------------ */

export function maintenanceFluidsMlPerDay(weightKg: number): number {
  if (weightKg <= 0) return 0;
  let ml = 0;
  if (weightKg <= 10) ml = weightKg * 100;
  else if (weightKg <= 20) ml = 1000 + (weightKg - 10) * 50;
  else ml = 1500 + (weightKg - 20) * 20;
  return Math.round(ml);
}

export function neonatalDayFluidRange(b: BabyLite): [number, number] {
  const dol = dayOfLife(b.dob);
  const pre = b.gestWeeks < 34;
  const base: [number, number] = pre ? [80, 100] : [60, 80];
  if (dol <= 1) return base;
  const add = Math.min(80, 20 * (dol - 1));
  return [Math.min(180, base[0] + add), Math.min(180, base[1] + add)];
}

export function girFromDextrose(concPct: number, mlPerKgDay: number): number {
  return Math.round(((concPct * mlPerKgDay) / 144) * 10) / 10;
}
export function dextroseConcForGir(gir: number, mlPerKgDay: number): number {
  if (!mlPerKgDay) return 0;
  return Math.round(((gir * 144) / mlPerKgDay) * 10) / 10;
}

/* ------------------------------ growth / Fenton ------------------------------ */

const FENTON: Record<number, [number, number]> = {
  24: [560, 760], 25: [660, 900], 26: [760, 1050], 27: [860, 1200], 28: [950, 1350],
  29: [1050, 1500], 30: [1150, 1700], 31: [1300, 1900], 32: [1450, 2100], 33: [1650, 2350],
  34: [1850, 2600], 35: [2100, 2850], 36: [2350, 3100], 37: [2550, 3350], 38: [2750, 3600],
  39: [2950, 3850], 40: [3100, 4050], 41: [3250, 4250], 42: [3350, 4400],
};

export function fentonBand(gaWeeks: number, birthWeight: number): "SGA" | "AGA" | "LGA" | null {
  const ga = Math.round(gaWeeks);
  const row = FENTON[ga];
  if (!row || birthWeight <= 0) return null;
  if (birthWeight < row[0]) return "SGA";
  if (birthWeight > row[1]) return "LGA";
  return "AGA";
}

export function growthFlags(velocity: number | null, lossPct: number, regained: boolean): Flag[] {
  const f: Flag[] = [];
  if (lossPct > 15) f.push({ key: "loss", label: "Excessive weight loss > 15%", sev: "crit" });
  else if (lossPct > 10) f.push({ key: "loss", label: "Weight loss > 10%", sev: "warn" });
  if (!regained && lossPct > 0) f.push({ key: "regain", label: "Birth weight not yet regained", sev: "info" });
  if (velocity != null) {
    if (velocity < 0) f.push({ key: "vel", label: "Weight falling", sev: "warn", note: `${velocity} g/kg/d` });
    else if (velocity < 10) f.push({ key: "vel", label: "Suboptimal growth < 10 g/kg/d", sev: "warn", note: `${velocity} g/kg/d` });
    else if (velocity >= 15) f.push({ key: "vel", label: "Target growth 15–20 g/kg/d", sev: "info", note: `${velocity} g/kg/d` });
  }
  return f;
}

/* ------------------------------ labs / ABG / bilirubin ------------------------------ */

const num = (s: unknown): number | null => {
  if (s == null || s === "") return null;
  const m = String(s).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

export function interpretLabs(labs: Record<string, string>, b: BabyLite): Flag[] {
  const { band } = ageBand(b);
  const f: Flag[] = [];
  const hb = num(labs["Hb"]);
  if (hb != null) {
    const thr = band === "neonate" ? 13 : 11;
    if (hb < thr - 3) f.push({ key: "hb", label: "Severe anaemia", sev: "crit", note: `Hb ${hb}` });
    else if (hb < thr) f.push({ key: "hb", label: "Anaemia", sev: "warn", note: `Hb ${hb} < ${thr}` });
  }
  const plt = num(labs["Platelets"]);
  if (plt != null) {
    if (plt < 20) f.push({ key: "plt", label: "Critical thrombocytopenia", sev: "crit", note: `${plt}k` });
    else if (plt < 50) f.push({ key: "plt", label: "Severe thrombocytopenia", sev: "crit", note: `${plt}k` });
    else if (plt < 150) f.push({ key: "plt", label: "Thrombocytopenia", sev: "warn", note: `${plt}k` });
  }
  const tlc = num(labs["TLC"]);
  if (tlc != null && band === "neonate" && (tlc < 5000 || tlc > 30000))
    f.push({ key: "tlc", label: "Abnormal TLC", sev: "warn", note: `${tlc}` });
  const crp = num(labs["CRP"]);
  if (crp != null && crp > 10) f.push({ key: "crp", label: "Raised CRP (inflammation)", sev: "warn", note: `${crp}` });
  const na = num(labs["Na"]);
  if (na != null) {
    if (na < 125 || na > 155) f.push({ key: "na", label: "Marked Na derangement", sev: "crit", note: `Na ${na}` });
    else if (na < 135) f.push({ key: "na", label: "Hyponatraemia", sev: "warn", note: `Na ${na}` });
    else if (na > 145) f.push({ key: "na", label: "Hypernatraemia", sev: "warn", note: `Na ${na}` });
  }
  const k = num(labs["K"]);
  if (k != null) {
    if (k < 3 || k > 6.5) f.push({ key: "k", label: "Critical K", sev: "crit", note: `K ${k}` });
    else if (k < 3.5) f.push({ key: "k", label: "Hypokalaemia", sev: "warn", note: `K ${k}` });
    else if (k > 6) f.push({ key: "k", label: "Hyperkalaemia", sev: "warn", note: `K ${k}` });
  }
  const ca = num(labs["Ca (ionised)"]);
  if (ca != null && ca < 1.0) f.push({ key: "ca", label: "Hypocalcaemia (ionised)", sev: "warn", note: `${ca}` });
  const cr = num(labs["Creatinine"]);
  if (cr != null && cr > 1.5) f.push({ key: "cr", label: "Raised creatinine", sev: "warn", note: `${cr}` });
  return f;
}

export function interpretABG(labs: Record<string, string>): Flag[] {
  const ph = num(labs["pH"]);
  const pco2 = num(labs["pCO2"]);
  const hco3 = num(labs["HCO3"]);
  const be = num(labs["BE"]);
  const f: Flag[] = [];
  if (ph == null) return f;
  const acid = ph < 7.35;
  const alk = ph > 7.45;
  const respAcid = pco2 != null && pco2 > 50;
  const respAlk = pco2 != null && pco2 < 35;
  const metAcid = (hco3 != null && hco3 < 18) || (be != null && be < -5);
  const metAlk = (hco3 != null && hco3 > 26) || (be != null && be > 3);
  if (acid && respAcid && metAcid) f.push({ key: "abg", label: "Mixed respiratory + metabolic acidosis", sev: "crit", note: `pH ${ph}` });
  else if (acid && respAcid) f.push({ key: "abg", label: "Respiratory acidosis", sev: "warn", note: `pH ${ph}, pCO₂ ${pco2}` });
  else if (acid && metAcid) f.push({ key: "abg", label: "Metabolic acidosis", sev: "warn", note: `pH ${ph}, HCO₃ ${hco3 ?? be}` });
  else if (alk && respAlk) f.push({ key: "abg", label: "Respiratory alkalosis", sev: "warn", note: `pH ${ph}, pCO₂ ${pco2}` });
  else if (alk && metAlk) f.push({ key: "abg", label: "Metabolic alkalosis", sev: "warn", note: `pH ${ph}` });
  else if (!acid && !alk && (respAcid || metAcid)) f.push({ key: "abg", label: "Compensated acidosis", sev: "info", note: `pH ${ph}` });
  else if (!acid && !alk) f.push({ key: "abg", label: "Normal pH", sev: "info", note: `pH ${ph}` });
  const lac = num(labs["Lactate"]);
  if (lac != null && lac > 4) f.push({ key: "lac", label: "Raised lactate (hypoperfusion)", sev: "crit", note: `${lac}` });
  else if (lac != null && lac > 2) f.push({ key: "lac", label: "Borderline lactate", sev: "warn", note: `${lac}` });
  return f;
}

/** Approximate AAP-style phototherapy thresholds; verify against unit nomogram. */
export function interpretBilirubin(tsb: number, hours: number, gaWeeks: number): Flag[] {
  let photo: number;
  if (gaWeeks >= 38) photo = hours < 24 ? 10 : hours < 48 ? 15 : hours < 72 ? 18 : 20;
  else if (gaWeeks >= 35) photo = hours < 24 ? 8 : hours < 48 ? 13 : hours < 72 ? 16 : 18;
  else photo = hours < 24 ? 6 : hours < 48 ? 10 : hours < 72 ? 12 : 13;
  const exchange = photo + 5;
  if (tsb >= exchange) return [{ key: "bili", label: "Above exchange threshold", sev: "crit", note: `TSB ${tsb} ≥ ${exchange} (approx)` }];
  if (tsb >= photo) return [{ key: "bili", label: "Above phototherapy line", sev: "warn", note: `TSB ${tsb} ≥ ${photo} (approx, ${gaWeeks}w @ ${Math.round(hours)}h)` }];
  return [{ key: "bili", label: "Below phototherapy line", sev: "info", note: `TSB ${tsb} < ${photo}` }];
}

export function allLabFlags(labs: Record<string, string>, b: BabyLite): Flag[] {
  const f = [...interpretLabs(labs, b), ...interpretABG(labs)];
  const tsb = num(labs["TSB"]);
  if (tsb != null) f.push(...interpretBilirubin(tsb, hoursOfLife(b.dob), b.gestWeeks));
  return f;
}

/* ---------- Admission categorical interpretation ---------- */

export function apgarBand(score: number): { sev: Flag["sev"]; note: string } {
  if (score <= 3) return { sev: "crit", note: "severely depressed" };
  if (score <= 6) return { sev: "warn", note: "moderately depressed" };
  return { sev: "info", note: "good condition" };
}

export function gestCategory(weeks: number): string {
  if (weeks < 28) return "extreme preterm";
  if (weeks < 32) return "very preterm";
  if (weeks < 34) return "moderate preterm";
  if (weeks < 37) return "late preterm";
  if (weeks < 39) return "early term";
  if (weeks < 41) return "term";
  return "post-term";
}

export function weightCategory(grams: number): string {
  if (grams < 1000) return "ELBW";
  if (grams < 1500) return "VLBW";
  if (grams < 2500) return "LBW";
  if (grams <= 4000) return "appropriate";
  return "macrosomia";
}

export function admissionFlags(b: {
  unit: string;
  gestWeeks: number;
  gestDays: number;
  birthWeight: number;
  apgar1?: number | null;
  apgar5?: number | null;
}): Flag[] {
  const out: Flag[] = [];
  const neo = b.unit === "nicu" || b.unit === "postnatal";
  if (neo && b.gestWeeks) {
    const sev: Flag["sev"] = b.gestWeeks < 32 ? "crit" : b.gestWeeks < 37 ? "warn" : "info";
    out.push({ key: "gest", label: `Gestation ${b.gestWeeks}+${b.gestDays}w`, sev, note: gestCategory(b.gestWeeks) });
  }
  if (neo && b.birthWeight) {
    const sev: Flag["sev"] = b.birthWeight < 1500 ? "crit" : b.birthWeight < 2500 ? "warn" : "info";
    out.push({ key: "bw", label: `BW ${b.birthWeight} g`, sev, note: weightCategory(b.birthWeight) });
  }
  if (neo && b.apgar1 != null) {
    const a = apgarBand(b.apgar1);
    out.push({ key: "a1", label: `Apgar 1′ ${b.apgar1}`, sev: a.sev, note: a.note });
  }
  if (neo && b.apgar5 != null) {
    const a = apgarBand(b.apgar5);
    out.push({ key: "a5", label: `Apgar 5′ ${b.apgar5}`, sev: a.sev, note: a.note });
  }
  return out;
}

/* ---------- Respiratory oxygenation ---------- */

/** Oxygenation Index = (MAP × FiO₂% × 100) / PaO₂. */
export function oiFrom(map: number | null, fio2Pct: number | null, pao2: number | null): number | null {
  if (map == null || fio2Pct == null || pao2 == null || pao2 <= 0) return null;
  return Math.round(((map * fio2Pct) / pao2) * 10) / 10;
}

export function respFlags(opts: {
  map?: number | null;
  fio2?: number | null;
  pao2?: number | null;
  silverman?: number | null;
  mode?: string;
}): Flag[] {
  const out: Flag[] = [];
  const oi = oiFrom(opts.map ?? null, opts.fio2 ?? null, opts.pao2 ?? null);
  if (oi != null) {
    out.push(
      oi >= 16
        ? { key: "oi", label: `OI ${oi}`, sev: "crit", note: "severe — consider HFOV/iNO/ECMO" }
        : oi >= 10
          ? { key: "oi", label: `OI ${oi}`, sev: "warn", note: "moderate impairment" }
          : oi >= 5
            ? { key: "oi", label: `OI ${oi}`, sev: "warn", note: "mild impairment" }
            : { key: "oi", label: `OI ${oi}`, sev: "info", note: "acceptable oxygenation" },
    );
  }
  if (opts.silverman != null) {
    const s = opts.silverman;
    out.push(
      s >= 7
        ? { key: "silv", label: `Silverman ${s}`, sev: "crit", note: "severe distress" }
        : s >= 4
          ? { key: "silv", label: `Silverman ${s}`, sev: "warn", note: "moderate distress" }
          : s >= 1
            ? { key: "silv", label: `Silverman ${s}`, sev: "warn", note: "mild distress" }
            : { key: "silv", label: "Silverman 0", sev: "info", note: "no distress" },
    );
  }
  if (opts.fio2 != null) {
    const f = opts.fio2;
    out.push(
      f <= 30 && (opts.map == null || opts.map <= 8)
        ? { key: "wean", label: `FiO₂ ${f}%`, sev: "info", note: "in wean/extubation window" }
        : f <= 40
          ? { key: "wean", label: `FiO₂ ${f}%`, sev: "info", note: "near wean range" }
          : { key: "wean", label: `FiO₂ ${f}%`, sev: "warn", note: "not yet wean range" },
    );
  }
  return out;
}

/* ---------- Consolidated impression ---------- */

export function overallImpression(flags: Flag[]): { sev: Flag["sev"]; text: string } {
  const crit = flags.filter((f) => f.sev === "crit");
  const warn = flags.filter((f) => f.sev === "warn");
  if (crit.length) return { sev: "crit", text: `${crit.length} critical finding${crit.length > 1 ? "s" : ""}: ${crit.map((c) => c.label).join(", ")}.` };
  if (warn.length) return { sev: "warn", text: `${warn.length} borderline value${warn.length > 1 ? "s" : ""}: ${warn.map((w) => w.label).join(", ")}.` };
  if (!flags.length) return { sev: "info", text: "No data entered yet." };
  return { sev: "info", text: "All entered parameters within provisional reference ranges." };
}

/** Merge every interpreter for a one-glance consolidated impression. */
export function consolidatedFlags(args: {
  baby: BabyLite;
  vitals?: (VitalsInput & Record<string, unknown>) | null;
  labs?: Record<string, string> | null;
  growth?: { velocity: number | null; lossPct: number; regained: boolean } | null;
  resp?: { map?: number | null; fio2?: number | null; pao2?: number | null; silverman?: number | null } | null;
}): Flag[] {
  const out: Flag[] = [];
  if (args.vitals) out.push(...interpretVitals(args.baby, args.vitals));
  if (args.labs && Object.values(args.labs).some((x) => x && String(x).trim())) out.push(...allLabFlags(args.labs, args.baby));
  if (args.growth) out.push(...growthFlags(args.growth.velocity, args.growth.lossPct, args.growth.regained));
  if (args.resp) out.push(...respFlags(args.resp));
  return out;
}
