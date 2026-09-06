/**
 * Master scoring engine — every scale with item definitions, auto-total,
 * band and provisional interpretation. Each scale declares its applicable units.
 */

export type UnitKey = "nicu" | "picu" | "stepdown" | "postnatal" | "paeds";

export type ScaleOption = { v: number; text: string };
export type ScaleItem = {
  key: string;
  label: string;
  options?: ScaleOption[];
  kind?: "select" | "number";
  unit?: string;
};
export type ScaleDef = {
  key: string;
  name: string;
  units: UnitKey[];
  category: string;
  items: ScaleItem[];
  interpret: (total: number, answers: Record<string, number | string>) => { band: "info" | "warn" | "crit"; label: string; advice: string };
  note?: string;
};

const opt = (...pairs: [number, string][]): ScaleOption[] => pairs.map(([v, text]) => ({ v, text }));

/* ============================ NEONATAL ============================ */

const APGAR: ScaleDef = {
  key: "apgar",
  name: "Apgar Score",
  units: ["nicu", "postnatal", "paeds"],
  category: "Neonatal-specific",
  items: [
    { key: "colour", label: "Colour", options: opt([0, "Blue / pale all over"], [1, "Body pink, extremities blue"], [2, "Completely pink"]) },
    { key: "hr", label: "Heart rate", options: opt([0, "Absent"], [1, "< 100/min"], [2, "≥ 100/min"]) },
    { key: "reflex", label: "Reflex irritability", options: opt([0, "No response"], [1, "Grimace"], [2, "Cry / sneeze / cough"]) },
    { key: "tone", label: "Muscle tone", options: opt([0, "Limp"], [1, "Some flexion"], [2, "Active motion"]) },
    { key: "resp", label: "Respiration", options: opt([0, "Absent"], [1, "Irregular / gasping"], [2, "Good, crying"]) },
  ],
  interpret: (t) =>
    t <= 3
      ? { band: "crit", label: `Apgar ${t} — severely depressed`, advice: "Immediate full resuscitation; reassess every 5 min to 20 min." }
      : t <= 6
        ? { band: "warn", label: `Apgar ${t} — moderately depressed`, advice: "Stimulate, clear airway, oxygen; anticipate escalation." }
        : { band: "info", label: `Apgar ${t} — good condition`, advice: "Routine newborn care." },
};

const BALLARD: ScaleDef = {
  key: "ballard",
  name: "New Ballard Score (gestational age)",
  units: ["nicu", "postnatal"],
  category: "Neonatal-specific",
  items: [
    { key: "posture", label: "Posture", options: opt([-1, "Arms & legs extended"], [0, "Slight flexion"], [1, "Well-flexed legs"], [2, "Well-flexed arms & legs"], [3, "Fully flexed"]) },
    { key: "window", label: "Square window (wrist)", options: opt([-1, "> 90°"], [0, "90°"], [1, "60°"], [2, "45°"], [3, "< 30°"]) },
    { key: "arm", label: "Arm recoil", options: opt([-1, "180°"], [0, "140–180°"], [1, "110–140°"], [2, "90–110°"], [3, "< 90°"]) },
    { key: "knee", label: "Popliteal angle", options: opt([-1, "180°"], [0, "160°"], [1, "140°"], [2, "120°"], [3, "100°"], [4, "90°"], [5, "< 90°"]) },
    { key: "scarf", label: "Scarf sign", options: opt([-1, "Full scarf"], [0, "Contralateral axillary line"], [1, "Contralateral nipple"], [2, "Xiphoid"], [3, "Ipsilateral nipple"]) },
    { key: "heel", label: "Heel to ear", options: opt([-1, "Ear"], [0, "Near ear"], [1, "Nipple line"], [2, "Above umbilicus"], [3, "At/below umbilicus"]) },
    { key: "skin", label: "Skin", options: opt([-1, "Sticky/friable"], [0, "Gelatinous"], [1, "Smooth"], [2, "Superficial peeling"], [3, "Cracking / parchment"], [4, "Leathery"]) },
    { key: "lanugo", label: "Lanugo", options: opt([-1, "None"], [0, "Sparse"], [1, "Abundant"], [2, "Thinning"], [3, "Mostly bald"]) },
    { key: "plantar", label: "Plantar surface", options: opt([-1, "Heel-toe 40–50 mm"], [0, "Heel-toe < 40 mm"], [1, "No crease"], [2, "Faint red marks"], [3, "Anterior creases"], [4, "Creases over whole sole"]) },
    { key: "breast", label: "Breast", options: opt([-1, "Imperceptible"], [0, "Barely perceptible"], [1, "Flat areola, no bud"], [2, "Stippled areola, 1–2 mm bud"], [3, "Raised areola, 3–4 mm bud"]) },
    { key: "eye", label: "Eye / ear", options: opt([-1, "Lids fused"], [0, "Lids open, pinna flat"], [1, "Pinna slightly curved"], [2, "Pinna well-curved"], [3, "Thick cartilage, instant recoil"]) },
    { key: "genitalM", label: "Genitals (male)", options: opt([-1, "Scrotum flat, smooth"], [0, "Scrotum smooth"], [1, "Rudimentary rugae"], [2, "Few rugae"], [3, "Prominent rugae, testes low"]) },
    { key: "genitalF", label: "Genitals (female)", options: opt([-1, "Clitoris prominent"], [0, "Prominent clitoris, small labia"], [1, "Clitoris & minora prominent"], [2, "Majora prominent, minora small"], [3, "Majora cover clitoris & minora"]) },
  ],
  interpret: (t) => {
    const weeks = Math.round(((t + 64) / 4.66) * 10) / 10;
    return {
      band: weeks < 37 ? "warn" : "info",
      label: `Estimated gestational age ${weeks} weeks (Ballard ${t})`,
      advice: weeks < 32 ? "Very preterm — anticipate RDS, no nipple feeding, thermoregulation support." : weeks < 37 ? "Late preterm — assess feeding competence and temperature stability." : "Term — routine newborn care.",
    };
  },
  note: "Score −10 to +22; GA ≈ (score + 64) / 4.66. Use for babies < 24 h old.",
};

const SILVERMAN: ScaleDef = {
  key: "silverman",
  name: "Silverman–Andersen Score (respiratory distress)",
  units: ["nicu", "picu", "stepdown", "postnatal"],
  category: "Neonatal-specific",
  items: [
    { key: "chest", label: "Upper chest movement", options: opt([0, "Synchronised"], [1, "Lag on inspiration"], [2, "See-saw rocking"]) },
    { key: "intercostal", label: "Intercostal retraction", options: opt([0, "None"], [1, "Just visible"], [2, "Marked"]) },
    { key: "xiphoid", label: "Xiphoid retraction", options: opt([0, "None"], [1, "Just visible"], [2, "Marked"]) },
    { key: "nares", label: "Nares dilation / nasal flaring", options: opt([0, "None"], [1, "Minimal"], [2, "Marked"]) },
    { key: "grunt", label: "Expiratory grunt", options: opt([0, "None"], [1, "Audible with stethoscope"], [2, "Audible without stethoscope"]) },
  ],
  interpret: (t) =>
    t >= 7 ? { band: "crit", label: `Silverman ${t} — severe distress`, advice: "Escalate support now; intubate and ventilate; consider surfactant." }
    : t >= 4 ? { band: "warn", label: `Silverman ${t} — moderate distress`, advice: "Increase support, consider CPAP; reassess frequently." }
    : t >= 1 ? { band: "warn", label: `Silverman ${t} — mild distress`, advice: "Monitor closely; may require low-flow O₂." }
    : { band: "info", label: "Silverman 0 — no distress", advice: "No respiratory support indicated for distress." },
};

const KRAMER: ScaleDef = {
  key: "kramer",
  name: "Kramer's Rule (jaundice zone)",
  units: ["nicu", "postnatal", "paeds"],
  category: "Neonatal-specific",
  items: [
    { key: "zone", label: "Highest jaundice zone", options: opt([1, "Zone 1 — face"], [2, "Zone 2 — upper trunk"], [3, "Zone 3 — lower trunk & thighs"], [4, "Zone 4 — arms & lower legs"], [5, "Zone 5 — palms & soles"]) },
    { key: "hours", label: "Age at assessment", kind: "number", unit: "hours" },
  ],
  interpret: (t, a) => {
    const hrs = Number(a.hours ?? 0);
    const approx = hrs < 24 ? t * 4 : hrs < 48 ? t * 3 : hrs < 72 ? t * 2.5 : t * 2;
    return {
      band: t >= 4 ? "crit" : t >= 2 ? "warn" : "info",
      label: `Zone ${t} at ${hrs}h — estimated TSB ≈ ${Math.round(approx)} mg/dL`,
      advice: t >= 4 ? "Palms and soles involved — check TSB urgently against Bhutani nomogram." : t >= 3 ? "Send TSB and compare with phototherapy line for age." : "Clinical jaundice present; continue serial monitoring.",
    };
  },
  note: "Rough bedside guide — confirm with TSB on the Bhutani nomogram.",
};

const BHUTANI: ScaleDef = {
  key: "bhutani",
  name: "Bhutani Nomogram (phototherapy threshold)",
  units: ["nicu", "postnatal", "paeds"],
  category: "Neonatal-specific",
  items: [
    { key: "tsb", label: "TSB", kind: "number", unit: "mg/dL" },
    { key: "age", label: "Age", kind: "number", unit: "hours" },
    { key: "ga", label: "Gestational age", kind: "number", unit: "weeks" },
    { key: "risk", label: "Neurotoxicity risk factors", options: opt([0, "None"], [1, "One factor"], [2, "Two or more"]) },
  ],
  interpret: (t, a) => {
    const tsb = Number(a.tsb ?? 0);
    const hrs = Number(a.age ?? 0);
    const ga = Number(a.ga ?? 38);
    const rf = Number(a.risk ?? 0);
    let photo = ga >= 38 ? (hrs < 24 ? 10 : hrs < 48 ? 15 : hrs < 72 ? 18 : 20) : ga >= 35 ? (hrs < 24 ? 8 : hrs < 48 ? 13 : hrs < 72 ? 16 : 18) : (hrs < 24 ? 6 : hrs < 48 ? 10 : hrs < 72 ? 12 : 13);
    photo -= rf * 1.5;
    const exchange = photo + 5;
    if (tsb >= exchange) return { band: "crit", label: `Above exchange threshold — TSB ${tsb} ≥ ${Math.round(exchange)}`, advice: "Urgent exchange transfusion criteria met. Call consultant." };
    if (tsb >= photo) return { band: "warn", label: `Above phototherapy line — TSB ${tsb} ≥ ${Math.round(photo)}`, advice: "Start intensive phototherapy, screen for haemolysis, repeat TSB in 4–6 h." };
    return { band: "info", label: `Below phototherapy line — TSB ${tsb} < ${Math.round(photo)}`, advice: "Continue routine monitoring." };
  },
  note: "Approximate AAP 2022-style thresholds; confirm against your unit nomogram.",
};

const CRIB2: ScaleDef = {
  key: "crib2",
  name: "CRIB-II (Clinical Risk Index for Babies)",
  units: ["nicu"],
  category: "Neonatal-specific",
  items: [
    { key: "ga", label: "Gestational age", options: opt([0, "≥ 31 wks"], [4, "30–31 wks"], [7, "28–29 wks"], [8, "< 28 wks"]) },
    { key: "bw", label: "Birth weight", options: opt([0, "≥ 1351 g"], [1, "851–1350 g"], [6, "701–850 g"], [10, "≤ 700 g"]) },
    { key: "temp", label: "Lowest temperature", options: opt([0, "36.0–37.2 °C"], [1, "35.0–35.9 °C"], [5, "34.0–34.9 °C"], [8, "33.0–33.9 °C"], [10, "< 33 °C"]) },
    { key: "be", label: "Base excess (first hour)", options: opt([0, "> −7.2"], [1, "−7.2 to −9.9"], [3, "−10 to −14.9"], [5, "< −15"]) },
    { key: "fio2", label: "FiO₂ first 12 h", options: opt([0, "< 40%"], [1, "40–60%"], [3, "> 60%"]) },
  ],
  interpret: (t) =>
    t <= 5 ? { band: "info", label: `CRIB-II ${t} — very low mortality risk`, advice: "Standard neonatal care." }
    : t <= 10 ? { band: "warn", label: `CRIB-II ${t} — moderate risk`, advice: "Discuss early with consultant; consider Level III referral." }
    : t <= 15 ? { band: "crit", label: `CRIB-II ${t} — high mortality risk`, advice: "Intensive management; consider sub-specialty transfer." }
    : { band: "crit", label: `CRIB-II ${t} — very high mortality risk`, advice: "Full intensive support; family discussion." },
};

const SNAPPE2: ScaleDef = {
  key: "snappe2",
  name: "SNAPPE-II / SNAP-II",
  units: ["nicu"],
  category: "Neonatal-specific",
  items: [
    { key: "map", label: "Mean BP (mmHg)", options: opt([0, "≥ 30"], [9, "20–29"], [19, "< 20"]) },
    { key: "temp", label: "Lowest temperature", options: opt([0, "> 96.1 °F"], [8, "95.0–96.1 °F"], [15, "< 95.0 °F"]) },
    { key: "po2fio2", label: "pO₂/FiO₂", options: opt([0, "> 2.49"], [5, "1.00–2.49"], [16, "0.30–0.99"], [28, "< 0.30"]) },
    { key: "ph", label: "Serum pH", options: opt([0, "≥ 7.20"], [7, "7.10–7.19"], [16, "< 7.10"]) },
    { key: "seizures", label: "Multiple seizures", options: opt([0, "No"], [19, "Yes"]) },
    { key: "urine", label: "Urine output ml/kg/hr", options: opt([0, "≥ 1.0"], [5, "0.1–0.9"], [18, "< 0.1"]) },
    { key: "bw", label: "Birth weight", options: opt([0, "≥ 1000 g"], [10, "750–999 g"], [17, "< 750 g"]) },
    { key: "sga", label: "Small for gestational age", options: opt([0, "No"], [12, "Yes"]) },
    { key: "apgar5", label: "Apgar at 5 min", options: opt([0, "≥ 7"], [18, "< 7"]) },
  ],
  interpret: (t) =>
    t <= 10 ? { band: "info", label: `Score ${t} — low risk`, advice: "Routine neonatal care." }
    : t <= 20 ? { band: "warn", label: `Score ${t} — mild–moderate risk`, advice: "Close observation; escalate early." }
    : t <= 39 ? { band: "warn", label: `Score ${t} — moderate–severe risk`, advice: "Level III NICU care; intensive monitoring." }
    : { band: "crit", label: `Score ${t} — very high mortality risk`, advice: "Full intensive support; discuss prognosis with family." },
  note: "SNAP-II uses the first 6 items only. SNAPPE-II adds birth weight, SGA and Apgar-5.",
};

const NTISS: ScaleDef = {
  key: "ntiss",
  name: "NTISS (Neonatal Therapeutic Intervention Scoring System)",
  units: ["nicu"],
  category: "Neonatal-specific",
  note: "Tick every therapeutic intervention in the last 24 hours. Bands: 1–5 minimal, 6–10 moderate, 11–19 intensive, ≥ 20 extremely intensive.",
  items: [
    { key: "monitoring", label: "Continuous monitoring / vital signs", options: opt([1, "Yes"], [0, "No"]) },
    { key: "oxygen", label: "Supplemental oxygen (any)", options: opt([2, "Yes"], [0, "No"]) },
    { key: "cpap", label: "CPAP / NIPPV", options: opt([3, "Yes"], [0, "No"]) },
    { key: "vent", label: "Mechanical ventilation", options: opt([5, "Yes"], [0, "No"]) },
    { key: "hfov", label: "High-frequency ventilation", options: opt([5, "Yes"], [0, "No"]) },
    { key: "surfactant", label: "Surfactant", options: opt([3, "Yes"], [0, "No"]) },
    { key: "iv", label: "Peripheral IV fluids / medication", options: opt([2, "Yes"], [0, "No"]) },
    { key: "central", label: "Central venous catheter / PICC", options: opt([4, "Yes"], [0, "No"]) },
    { key: "ua", label: "Umbilical / arterial catheter", options: opt([4, "Yes"], [0, "No"]) },
    { key: "inotropes", label: "Vasoactive / inotrope infusion", options: opt([4, "Yes"], [0, "No"]) },
    { key: "exchange", label: "Exchange transfusion", options: opt([5, "Yes"], [0, "No"]) },
    { key: "transfusion", label: "Blood / platelet transfusion", options: opt([2, "Yes"], [0, "No"]) },
    { key: "ivig", label: "IVIG / albumin", options: opt([3, "Yes"], [0, "No"]) },
    { key: "antibiotics", label: "IV antibiotics", options: opt([2, "Yes"], [0, "No"]) },
    { key: "phototherapy", label: "Phototherapy", options: opt([1, "Yes"], [0, "No"]) },
    { key: "cpr", label: "Chest compressions / resuscitation", options: opt([5, "Yes"], [0, "No"]) },
    { key: "dialysis", label: "Peritoneal dialysis / CRRT", options: opt([5, "Yes"], [0, "No"]) },
    { key: "indomethacin", label: "Indomethacin / PDA treatment", options: opt([4, "Yes"], [0, "No"]) },
    { key: "insulin", label: "Insulin infusion", options: opt([4, "Yes"], [0, "No"]) },
    { key: "steroids", label: "Postnatal corticosteroids", options: opt([5, "Yes"], [0, "No"]) },
  ],
  interpret: (t) =>
    t <= 5 ? { band: "info", label: `NTISS ${t} — minimal intervention`, advice: "Appropriate for level I/II care." }
    : t <= 10 ? { band: "warn", label: `NTISS ${t} — moderate intervention`, advice: "Level II/special care with medical supervision." }
    : t <= 19 ? { band: "warn", label: `NTISS ${t} — intensive intervention`, advice: "Level III NICU with intensive nursing." }
    : { band: "crit", label: `NTISS ${t} — extremely intensive`, advice: "Consider sub-specialty referral / ECMO discussion." },
};

const FINNEGAN: ScaleDef = {
  key: "finnegan",
  name: "Finnegan Neonatal Abstinence Score",
  units: ["nicu", "postnatal"],
  category: "Neonatal-specific",
  note: "Score every 4 h. Three consecutive ≥ 8, or two consecutive > 12, indicates pharmacological treatment.",
  items: [
    { key: "cry", label: "Crying", options: opt([0, "None"], [2, "Excessive high-pitched"], [3, "Continuous high-pitched"]) },
    { key: "sleep", label: "Sleep after feeding (h)", options: opt([0, "> 3"], [1, "2–3"], [2, "1–2"], [3, "< 1"]) },
    { key: "moro", label: "Moro reflex", options: opt([0, "Suppressed"], [1, "Hyperactive"], [3, "Markedly hyperactive"]) },
    { key: "tremor", label: "Tremors (disturbed)", options: opt([0, "None"], [1, "Mild"], [2, "Moderate-severe"]) },
    { key: "tone", label: "Increased muscle tone", options: opt([0, "Normal"], [1, "Increased"]) },
    { key: "seizures", label: "Convulsions", options: opt([0, "None"], [5, "Present"]) },
    { key: "feeds", label: "Feeding", options: opt([0, "Normal"], [2, "Poor, vomiting"], [3, "Regurgitation + aspiration"]) },
    { key: "stools", label: "Stools", options: opt([0, "Normal"], [1, "Loose"], [3, "Watery"]) },
    { key: "temp", label: "Temperature", options: opt([0, "Normal"], [1, "Unstable (fever)"], [2, "Fever + sweating"]) },
    { key: "yawn", label: "Frequent yawning (> 3–4/tick)", options: opt([0, "No"], [1, "Yes"]) },
    { key: "sneeze", label: "Sneezing (> 3–4/tick)", options: opt([0, "No"], [1, "Yes"]) },
    { key: "nose", label: "Nasal stuffiness", options: opt([0, "No"], [1, "Yes"]) },
    { key: "retractions", label: "Respiratory distress / retractions", options: opt([0, "No"], [1, "Rate > 60"], [2, "Rate > 60 + retractions"]) },
  ],
  interpret: (t) =>
    t >= 24 ? { band: "crit", label: `Finnegan ${t} — pharmacological treatment required`, advice: "Start morphine/methadone per protocol; review 4-hourly." }
    : t > 16 ? { band: "crit", label: `Finnegan ${t} — escalate therapy if sustained`, advice: "Two consecutive > 12 indicates treatment need." }
    : t >= 8 ? { band: "warn", label: `Finnegan ${t} — non-pharmacological care`, advice: "Swaddling, quiet room, frequent feeding, skin-to-skin; rescore 4-hourly." }
    : { band: "info", label: `Finnegan ${t} — below threshold`, advice: "Continue routine observation and scoring." },
};

const NEC_BELL: ScaleDef = {
  key: "necbell",
  name: "Bell Staging (Necrotising Enterocolitis)",
  units: ["nicu"],
  category: "Neonatal-specific",
  items: [
    { key: "stage", label: "Bell stage", options: opt([1, "Stage I — suspected"], [2, "Stage II — definite"], [3, "Stage III — advanced"]) },
    { key: "systemic", label: "Systemic signs present", options: opt([0, "No"], [1, "Yes"]) },
    { key: "pneumatosis", label: "Pneumatosis intestinalis on X-ray", options: opt([0, "No"], [1, "Yes"]) },
    { key: "perforation", label: "Pneumoperitoneum / perforation", options: opt([0, "No"], [1, "Yes"]) },
  ],
  interpret: (t, a) => {
    const stage = Number(a.stage ?? 1);
    const perforated = Number(a.perforation ?? 0) === 1;
    if (stage === 3 || perforated) return { band: "crit", label: "Bell Stage III — advanced NEC with perforation risk", advice: "Urgent surgical referral, NPO, IV antibiotics, inotropes as needed." };
    if (stage === 2) return { band: "crit", label: "Bell Stage II — definite NEC", advice: "NPO, NG decompression, broad-spectrum IV antibiotics, serial abdominal films, surgical review." };
    return { band: "warn", label: "Bell Stage I — suspected NEC", advice: "NPO, NG decompression, IV antibiotics, serial examinations and films." };
  },
  note: "Surgical opinion is mandatory for any stage II or III diagnosis.",
};

const PAPILE: ScaleDef = {
  key: "papile",
  name: "Papile Grading (Intraventricular Haemorrhage)",
  units: ["nicu"],
  category: "Neonatal-specific",
  items: [
    { key: "grade", label: "IVH grade on cranial ultrasound", options: opt([1, "Grade I — germinal matrix only"], [2, "Grade II — IVH without dilatation"], [3, "Grade III — IVH with ventricular dilatation"], [4, "Grade IV — parenchymal haemorrhagic infarction"]) },
  ],
  interpret: (t, a) => {
    const g = Number(a.grade ?? 1);
    if (g === 4) return { band: "crit", label: "Papile Grade IV — parenchymal haemorrhage", advice: "High risk of cerebral palsy; cranial imaging follow-up, early neurodevelopmental referral, family counselling." };
    if (g === 3) return { band: "crit", label: "Papile Grade III — IVH with dilatation", advice: "Serial head circumference and cranial USG; neurosurgical review for progressive ventriculomegaly." };
    if (g === 2) return { band: "warn", label: "Papile Grade II — IVH without dilatation", advice: "Serial cranial USG; monitor for post-haemorrhagic ventricular dilatation." };
    return { band: "warn", label: "Papile Grade I — germinal matrix haemorrhage", advice: "Generally good prognosis; serial cranial USG per unit protocol." };
  },
};

const ROP: ScaleDef = {
  key: "rop",
  name: "ROP Zone / Stage Classification",
  units: ["nicu"],
  category: "Neonatal-specific",
  items: [
    { key: "zone", label: "Zone", options: opt([1, "Zone I"], [2, "Zone II"], [3, "Zone III"]) },
    { key: "stage", label: "Stage", options: opt([0, "Immature retina"], [1, "Stage 1 — demarcation line"], [2, "Stage 2 — ridge"], [3, "Stage 3 — extraretinal neovascularisation"], [4, "Stage 4 — partial retinal detachment"], [5, "Stage 5 — total retinal detachment"]) },
    { key: "plus", label: "Plus disease", options: opt([0, "No"], [1, "Yes"]) },
    { key: "aggressive", label: "Aggressive posterior ROP (AP-ROP)", options: opt([0, "No"], [1, "Yes"]) },
  ],
  interpret: (t, a) => {
    const zone = Number(a.zone ?? 2);
    const stage = Number(a.stage ?? 0);
    const plus = Number(a.plus ?? 0) === 1;
    const aprop = Number(a.aggressive ?? 0) === 1;
    if (aprop || (plus && (zone === 1 || stage >= 3))) return { band: "crit", label: `Treatment-warranted ROP — Zone ${zone}, Stage ${stage}${plus ? " with plus" : ""}${aprop ? ", AP-ROP" : ""}`, advice: "Anti-VEGF or laser within 24–48 hours. Inform ophthalmologist immediately." };
    if (stage >= 4) return { band: "crit", label: `Stage ${stage} — retinal detachment`, advice: "Urgent vitreoretinal referral." };
    if (stage === 3 && zone === 2) return { band: "warn", label: "Zone II Stage 3 without plus disease", advice: "Continue surveillance; treatment if plus develops or threshold met." };
    if (zone === 1 && stage >= 1) return { band: "warn", label: `Zone I Stage ${stage} without plus`, advice: "Frequent review (weekly) — highest risk zone." };
    return { band: "info", label: `Zone ${zone} Stage ${stage || "immature"} — no treatment indicated`, advice: "Continue scheduled screening per NNF/AAP protocol." };
  },
  note: "Screening starts at 3–4 weeks or 31–32 weeks PMA for < 34 wks or < 1750 g (NNF).",
};

/* ============================ PAEDIATRIC ============================ */

const PEWS: ScaleDef = {
  key: "pews",
  name: "PEWS (Pediatric Early Warning Score)",
  units: ["picu", "stepdown", "paeds"],
  category: "Early warning",
  items: [
    { key: "behaviour", label: "Behaviour", options: opt([0, "Playing / appropriate"], [1, "Sleeping"], [2, "Irritable"], [3, "Lethargic / confused"]) },
    { key: "cardio", label: "Cardiovascular", options: opt([0, "Pink, CRT 1–2 s"], [1, "Pale or CRT 3 s"], [2, "Grey or CRT 4 s"], [3, "Mottled or CRT ≥ 5 s"]) },
    { key: "resp", label: "Respiratory", options: opt([0, "Within normal"], [1, "Above normal / accessory muscles"], [2, "20 above normal / recession"], [3, "Below normal + grunting"]) },
    { key: "neb", label: "Bronchodilator frequency", options: opt([0, "None"], [1, "Every 1 hour"], [2, "Persistent vomiting post-op"]) },
  ],
  interpret: (t) =>
    t >= 7 ? { band: "crit", label: `PEWS ${t} — critical`, advice: "PICU review now; continuous monitoring; call consultant." }
    : t >= 5 ? { band: "warn", label: `PEWS ${t} — deteriorating`, advice: "Step-down / HDU; notify senior registrar; reassess every 30 min." }
    : t >= 3 ? { band: "warn", label: `PEWS ${t} — at risk`, advice: "Frequent observations; reassess hourly." }
    : { band: "info", label: `PEWS ${t} — stable`, advice: "Standard ward care." },
};

const FLACC: ScaleDef = {
  key: "flacc",
  name: "FLACC Scale (Face · Legs · Activity · Cry · Consolability)",
  units: ["picu", "stepdown", "paeds", "postnatal"],
  category: "Pain & sedation",
  items: [
    { key: "face", label: "Face", options: opt([0, "No particular expression"], [1, "Occasional grimace"], [2, "Frequent frown, clenched jaw"]) },
    { key: "legs", label: "Legs", options: opt([0, "Normal / relaxed"], [1, "Uneasy, restless"], [2, "Kicking, legs drawn up"]) },
    { key: "activity", label: "Activity", options: opt([0, "Lying quietly"], [1, "Squirming, tense"], [2, "Arched, rigid, jerking"]) },
    { key: "cry", label: "Cry", options: opt([0, "No cry"], [1, "Moans, whimpers"], [2, "Crying steadily, screams"]) },
    { key: "console", label: "Consolability", options: opt([0, "Content, relaxed"], [1, "Reassured by touch/hug"], [2, "Difficult to console"]) },
  ],
  interpret: (t) =>
    t >= 7 ? { band: "crit", label: `FLACC ${t} — severe pain`, advice: "Escalate analgesia; reassess 30 minutes after intervention." }
    : t >= 4 ? { band: "warn", label: `FLACC ${t} — moderate pain`, advice: "Give analgesia and reassess within 1 hour." }
    : { band: "info", label: `FLACC ${t} — mild/no pain`, advice: "Continue current plan." },
};

const WONGBAKER: ScaleDef = {
  key: "wongbaker",
  name: "Wong-Baker FACES® Pain Rating Scale",
  units: ["picu", "stepdown", "paeds", "postnatal"],
  category: "Pain & sedation",
  items: [
    { key: "face", label: "Which face best describes the pain?", options: opt([0, "0 — No hurt"], [2, "2 — Hurts a little"], [4, "4 — Hurts a little more"], [6, "6 — Hurts even more"], [8, "8 — Hurts a whole lot"], [10, "10 — Hurts worst"]) },
  ],
  interpret: (t) =>
    t >= 8 ? { band: "crit", label: `FACES ${t} — severe pain`, advice: "Escalate analgesia promptly." }
    : t >= 4 ? { band: "warn", label: `FACES ${t} — moderate pain`, advice: "Give analgesia; reassess in 1 hour." }
    : { band: "info", label: `FACES ${t} — mild/no pain`, advice: "Continue current plan." },
};

const NRS: ScaleDef = {
  key: "nrs",
  name: "Numeric Rating Scale (≥ 8 years)",
  units: ["picu", "stepdown", "paeds"],
  category: "Pain & sedation",
  items: [{ key: "score", label: "Self-reported pain (0–10)", kind: "number", unit: "/10" }],
  interpret: (t) =>
    t >= 8 ? { band: "crit", label: `NRS ${t}/10 — severe`, advice: "Escalate analgesia; reassess in 30 minutes." }
    : t >= 4 ? { band: "warn", label: `NRS ${t}/10 — moderate`, advice: "Analgesia and reassessment in 1 hour." }
    : { band: "info", label: `NRS ${t}/10 — mild`, advice: "Continue current plan." },
};

const COMFORTB: ScaleDef = {
  key: "comfortb",
  name: "COMFORT-B Scale (sedation assessment)",
  units: ["picu", "stepdown"],
  category: "Pain & sedation",
  items: [
    { key: "alert", label: "Alertness", options: opt([1, "Deeply sedated"], [2, "Lightly sedated"], [3, "Normal"], [4, "Vigilant"], [5, "Very agitated"]) },
    { key: "calm", label: "Calm / agitation", options: opt([1, "Very calm"], [2, "Calm"], [3, "Slight anxiety"], [4, "Anxious"], [5, "Very anxious"]) },
    { key: "resp", label: "Respiratory response", options: opt([1, "No cough"], [2, "Spontaneous breath only"], [3, "Slight cough"], [4, "Active cough"], [5, "Fights ventilator"]) },
    { key: "physical", label: "Physical movement", options: opt([1, "No movement"], [2, "Occasional slight"], [3, "Slight movement"], [4, "Vigorous"], [5, "Very vigorous"]) },
    { key: "bp", label: "Blood pressure", options: opt([1, "Well below baseline"], [2, "Slightly below"], [3, "At baseline"], [4, "Slightly above"], [5, "Markedly above"]) },
    { key: "hr", label: "Heart rate", options: opt([1, "Well below baseline"], [2, "Slightly below"], [3, "At baseline"], [4, "Slightly above"], [5, "Markedly above"]) },
  ],
  interpret: (t) =>
    t > 28 ? { band: "warn", label: `COMFORT-B ${t} — under-sedated / pain`, advice: "Increase sedation, assess pain; target 11–22." }
    : t >= 17 ? { band: "info", label: `COMFORT-B ${t} — target range`, advice: "Adequate sedation (11–22)." }
    : { band: "warn", label: `COMFORT-B ${t} — over-sedated`, advice: "Reduce sedation; target 11–22." },
};

const WAT1: ScaleDef = {
  key: "wat1",
  name: "WAT-1 (Withdrawal Assessment Tool v1)",
  units: ["picu", "stepdown"],
  category: "Pain & sedation",
  note: "Score daily for children weaning from opioids/benzodiazepines. A score ≥ 3 suggests withdrawal.",
  items: [
    { key: "sweat", label: "Paroxysmal sweats / diarrhoea", options: opt([1, "Yes"], [0, "No"]) },
    { key: "fever", label: "Fever without focus", options: opt([1, "Yes"], [0, "No"]) },
    { key: "htn", label: "Hypertension", options: opt([1, "Yes"], [0, "No"]) },
    { key: "phenytoin", label: "Increased anticonvulsant requirement", options: opt([1, "Yes"], [0, "No"]) },
    { key: "movement", label: "Purposeful movement requiring restraints", options: opt([1, "Yes"], [0, "No"]) },
    { key: "fever2", label: "Temperature > 38 °C on two days", options: opt([1, "Yes"], [0, "No"]) },
    { key: "tremor", label: "Tremor", options: opt([2, "Yes"], [0, "No"]) },
    { key: "yawn", label: "Frequent yawning", options: opt([1, "Yes"], [0, "No"]) },
    { key: "stools", label: "Loose/watery stools", options: opt([1, "Yes"], [0, "No"]) },
    { key: "emesis", label: "Emesis / gagging", options: opt([1, "Yes"], [0, "No"]) },
    { key: "tucking", label: "Mottling / tucking / grabbing", options: opt([1, "Yes"], [0, "No"]) },
    { key: "startle", label: "Startle to speech/stimulation", options: opt([1, "Yes"], [0, "No"]) },
  ],
  interpret: (t) =>
    t >= 3 ? { band: "warn", label: `WAT-1 ${t} — withdrawal likely`, advice: "Slower wean, review sedation/opioid doses; rescore daily." }
    : { band: "info", label: `WAT-1 ${t} — no withdrawal`, advice: "Continue current weaning plan." },
};

const PGCS: ScaleDef = {
  key: "pgcs",
  name: "Pediatric Glasgow Coma Scale",
  units: ["picu", "stepdown", "paeds"],
  category: "Neuro / consciousness",
  items: [
    { key: "eye", label: "Eye opening", options: opt([1, "None"], [2, "To pain"], [3, "To speech"], [4, "Spontaneous"]) },
    { key: "verbal", label: "Verbal", options: opt([1, "None"], [2, "Incomprehensible sounds"], [3, "Inappropriate words"], [4, "Confused"], [5, "Oriented / appropriate"]) },
    { key: "motor", label: "Motor", options: opt([1, "None"], [2, "Extension"], [3, "Abnormal flexion"], [4, "Withdrawal"], [5, "Localises pain"], [6, "Obeys commands"]) },
  ],
  interpret: (t) =>
    t <= 8 ? { band: "crit", label: `GCS ${t}/15 — severe brain injury`, advice: "Secure airway, treat as severe TBI; neurosurgical referral." }
    : t <= 12 ? { band: "warn", label: `GCS ${t}/15 — moderate brain injury`, advice: "CT head, neuro observations half-hourly." }
    : { band: "info", label: `GCS ${t}/15 — mild/minimal`, advice: "Observation and discharge criteria review." },
};

const AVPU: ScaleDef = {
  key: "avpu",
  name: "AVPU Scale",
  units: ["picu", "stepdown", "paeds"],
  category: "Neuro / consciousness",
  items: [{ key: "avpu", label: "Response level", options: opt([4, "Alert"], [3, "Responds to Voice"], [2, "Responds to Pain"], [1, "Unresponsive"]) }],
  interpret: (t) =>
    t <= 2 ? { band: "crit", label: `AVPU ${t === 1 ? "Unresponsive" : "Responds to pain"} — airway risk`, advice: "Immediate airway protection and resuscitation." }
    : t === 3 ? { band: "warn", label: "Responds to voice — reduced consciousness", advice: "Escalate; assess glucose and pupils." }
    : { band: "info", label: "Alert", advice: "Normal." },
};

const CAPD: ScaleDef = {
  key: "capd",
  name: "Cornell Assessment of Pediatric Delirium (CAPD)",
  units: ["picu", "stepdown"],
  category: "Neuro / consciousness",
  note: "Score of 9 or more suggests delirium. Valid 0–21 years.",
  items: [
    { key: "gaze", label: "Unable to focus / stares into space", options: opt([0, "No"], [2, "Yes"]) },
    { key: "communicate", label: "Fails to communicate needs/wants", options: opt([0, "No"], [2, "Yes"]) },
    { key: "respond", label: "Unaware/does not respond to parent", options: opt([0, "No"], [2, "Yes"]) },
    { key: "console", label: "Cannot be consoled", options: opt([0, "No"], [2, "Yes"]) },
    { key: "interaction", label: "Decreased interaction with carers", options: opt([0, "No"], [2, "Yes"]) },
    { key: "movement", label: "Does not/cannot make eye contact", options: opt([0, "No"], [2, "Yes"]) },
    { key: "activity", label: "Hypoactive or hyperactive", options: opt([0, "No"], [2, "Yes"]) },
    { key: "sleep", label: "Sleep-wake cycle disturbance", options: opt([0, "No"], [2, "Yes"]) },
    { key: "mood", label: "Labile mood", options: opt([0, "No"], [2, "Yes"]) },
  ],
  interpret: (t) =>
    t >= 9 ? { band: "crit", label: `CAPD ${t} — delirium present`, advice: "Non-pharmacological measures; review sedation and environment; consider pharmacotherapy." }
    : { band: "info", label: `CAPD ${t} — no delirium`, advice: "Continue routine monitoring." },
};

const CROUP: ScaleDef = {
  key: "westley",
  name: "Westley Croup Score",
  units: ["picu", "stepdown", "paeds"],
  category: "Respiratory",
  items: [
    { key: "stridor", label: "Stridor", options: opt([0, "None"], [1, "At rest (inspiratory)"], [2, "At rest (inspiratory + expiratory)"]) },
    { key: "retraction", label: "Retractions", options: opt([0, "None"], [1, "Mild"], [2, "Moderate"], [3, "Severe"]) },
    { key: "air", label: "Air entry", options: opt([0, "Normal"], [1, "Decreased"], [2, "Markedly decreased"]) },
    { key: "cyanosis", label: "Cyanosis", options: opt([0, "None"], [4, "Agitated"], [5, "At rest"]) },
    { key: "consciousness", label: "Level of consciousness", options: opt([0, "Normal"], [3, "Disoriented"], [5, "Depressed"]) },
  ],
  interpret: (t) =>
    t >= 7 ? { band: "crit", label: `Westley ${t} — severe croup`, advice: "Nebulised adrenaline + steroids, ENT/anaesthetic review, consider intubation." }
    : t >= 3 ? { band: "warn", label: `Westley ${t} — moderate croup`, advice: "Oral/nebulised dexamethasone; observe 3–4 h after nebulised adrenaline." }
    : { band: "info", label: `Westley ${t} — mild croup`, advice: "Dexamethasone, supportive care, discharge criteria review." },
};

const PRAM: ScaleDef = {
  key: "pram",
  name: "PRAM (Pediatric Respiratory Assessment Measure)",
  units: ["picu", "stepdown", "paeds"],
  category: "Respiratory",
  items: [
    { key: "supra", label: "Suprasternal air entry", options: opt([0, "Normal"], [1, "Abnormal"]) },
    { key: "scalenus", label: "Scalenus / sternocleidomastoid use", options: opt([0, "None"], [1, "Intermittent"], [2, "Continuous"]) },
    { key: "wheeze", label: "Wheeze", options: opt([0, "None / end expiratory"], [1, "Expiratory only"], [2, "Inspiratory & expiratory"], [3, "Audible without stethoscope"], [4, "No wheeze (minimal air entry)"]) },
    { key: "airentry", label: "Air entry", options: opt([0, "Normal"], [1, "Decreased at bases"], [2, "Widespread decrease"], [3, "Absent/minimal"]) },
  ],
  interpret: (t) =>
    t >= 9 ? { band: "crit", label: `PRAM ${t} — severe`, advice: "Continuous nebulisation, IV magnesium/aminophylline, PICU review." }
    : t >= 5 ? { band: "warn", label: `PRAM ${t} — moderate`, advice: "Frequent nebulisation, systemic steroids, reassess hourly." }
    : { band: "info", label: `PRAM ${t} — mild`, advice: "MDI + spacer, reassess in 1–2 hours." },
};

const PASS: ScaleDef = {
  key: "pass",
  name: "PASS (Pediatric Asthma Severity Score)",
  units: ["picu", "stepdown", "paeds"],
  category: "Respiratory",
  items: [
    { key: "wheeze", label: "Wheeze", options: opt([0, "None / end expiratory"], [1, "Expiratory"], [2, "Inspiratory & expiratory"], [3, "Minimal or no air entry"]) },
    { key: "airEntry", label: "Air entry", options: opt([0, "Normal"], [1, "Decreased at bases"], [2, "Widespread decrease"], [3, "Absent/minimal"]) },
    { key: "retraction", label: "Retraction", options: opt([0, "None"], [1, "Intercostal only"], [2, "Intercostal + subcostal"], [3, "Subcostal, suprasternal, subclavicular"]) },
    { key: "distress", label: "Respiratory distress", options: opt([0, "None"], [1, "Mild"], [2, "Moderate"], [3, "Severe"]) },
  ],
  interpret: (t) =>
    t >= 9 ? { band: "crit", label: `PASS ${t} — severe`, advice: "Continuous nebulisation, IV therapy, PICU review." }
    : t >= 5 ? { band: "warn", label: `PASS ${t} — moderate`, advice: "Repeat nebulisation 20-minute intervals, systemic steroids." }
    : { band: "info", label: `PASS ${t} — mild`, advice: "MDI + spacer and reassess." },
};

const RDAI: ScaleDef = {
  key: "rdai",
  name: "RDAI (Respiratory Distress Assessment Instrument — bronchiolitis)",
  units: ["picu", "stepdown", "paeds"],
  category: "Respiratory",
  items: [
    { key: "upper", label: "Upper chest wall retraction", options: opt([0, "None"], [1, "Mild"], [2, "Moderate"], [3, "Marked"]) },
    { key: "lower", label: "Lower chest wall retraction", options: opt([0, "None"], [1, "Mild"], [2, "Moderate"], [3, "Marked"]) },
    { key: "nasal", label: "Nasal flaring", options: opt([0, "None"], [1, "Mild"], [2, "Marked"]) },
    { key: "expiratory", label: "Expiratory wheeze", options: opt([0, "None"], [1, "Mild"], [2, "Moderate"], [3, "Marked"]) },
    { key: "breathSound", label: "Breath sounds", options: opt([0, "Normal"], [1, "Asymmetric"], [2, "Decreased"], [3, "Markedly decreased"]) },
    { key: "respRate", label: "Respiratory rate", options: opt([0, "< 40/min"], [1, "40–49/min"], [2, "50–59/min"], [3, "≥ 60/min"]) },
  ],
  interpret: (t) =>
    t >= 12 ? { band: "crit", label: `RDAI ${t} — severe bronchiolitis`, advice: "High-flow nasal oxygen, PICU review, consider ventilation." }
    : t >= 8 ? { band: "warn", label: `RDAI ${t} — moderate bronchiolitis`, advice: "Nasal oxygen, consider high-flow, frequent reassessment." }
    : { band: "info", label: `RDAI ${t} — mild bronchiolitis`, advice: "Supportive care, feeding assessment, discharge criteria review." },
};

const WOODDOWNES: ScaleDef = {
  key: "wooddownes",
  name: "Wood–Downes Score (asthma severity)",
  units: ["picu", "stepdown", "paeds"],
  category: "Respiratory",
  items: [
    { key: "rr", label: "Respiratory rate", options: opt([0, "Normal"], [1, "Above normal"], [2, "Markedly raised"]) },
    { key: "recession", label: "Chest recession", options: opt([0, "None"], [1, "Moderate"], [2, "Marked"]) },
    { key: "wheeze", label: "Wheeze", options: opt([0, "Moderate"], [1, "Severe"], [2, "Silent chest"]) },
    { key: "accessory", label: "Accessory muscle use", options: opt([0, "None"], [1, "Moderate"], [2, "Marked"]) },
    { key: "cyan", label: "Cyanosis", options: opt([0, "None"], [3, "Present"]) },
    { key: "conscious", label: "Level of consciousness", options: opt([0, "Normal"], [3, "Depressed"]) },
    { key: "speech", label: "Speech", options: opt([0, "Normal"], [1, "Words"], [2, "Unable"]) },
  ],
  interpret: (t) =>
    t >= 10 ? { band: "crit", label: `Wood–Downes ${t} — severe/life-threatening asthma`, advice: "IV magnesium, IV aminophylline, PICU review, senior anaesthetic input." }
    : t >= 6 ? { band: "warn", label: `Wood–Downes ${t} — moderate–severe`, advice: "Continuous nebulisation, IV steroids, close monitoring." }
    : { band: "info", label: `Wood–Downes ${t} — mild`, advice: "Inhaled bronchodilator + steroids, reassess." },
};

const VIS: ScaleDef = {
  key: "vis",
  name: "Vasoactive-Inotropic Score (VIS)",
  units: ["picu", "stepdown"],
  category: "Cardiovascular",
  note: "VIS = dopamine + dobutamine + 100×adrenaline + 100×noradrenaline + 10×milrinone + vasopressin (µg/kg/min).",
  items: [
    { key: "dopamine", label: "Dopamine", kind: "number", unit: "µg/kg/min" },
    { key: "dobutamine", label: "Dobutamine", kind: "number", unit: "µg/kg/min" },
    { key: "adrenaline", label: "Adrenaline × 100", kind: "number", unit: "µg/kg/min" },
    { key: "noradrenaline", label: "Noradrenaline × 100", kind: "number", unit: "µg/kg/min" },
    { key: "milrinone", label: "Milrinone × 10", kind: "number", unit: "µg/kg/min" },
    { key: "vasopressin", label: "Vasopressin", kind: "number", unit: "mU/kg/min" },
  ],
  interpret: (t) =>
    t >= 20 ? { band: "crit", label: `VIS ${t} — very high vasoactive support`, advice: "High mortality signal. Consider ECMO, adjunctive steroids or hormonal therapy." }
    : t >= 10 ? { band: "warn", label: `VIS ${t} — high vasoactive support`, advice: "Escalate: reassess preload, add second agent, consider mechanical support." }
    : t >= 1 ? { band: "warn", label: `VIS ${t} — low vasoactive support`, advice: "Continue and wean as tolerated." }
    : { band: "info", label: "No vasoactive support", advice: "—" },
};

const ROSS: ScaleDef = {
  key: "ross",
  name: "Ross / Modified Ross Heart Failure Classification",
  units: ["picu", "stepdown", "paeds"],
  category: "Cardiovascular",
  items: [
    { key: "sweating", label: "Sweating with feeds", options: opt([0, "None"], [1, "On head only"], [2, "On head and body"]) },
    { key: "tt", label: "Tachypnoea", options: opt([0, "< 50/min"], [1, "50–70/min"], [2, "70–90/min"], [3, "> 90/min"]) },
    { key: "work", label: "Work of breathing", options: opt([0, "Normal"], [1, "Mild"], [2, "Moderate"], [3, "Severe"]) },
    { key: "hepatomegaly", label: "Hepatomegaly (from RCM)", options: opt([0, "< 2 cm"], [1, "2–3 cm"], [2, "> 3 cm"]) },
    { key: "wheeze", label: "Wheeze", options: opt([0, "None"], [1, "Expiratory only"], [2, "Inspiratory + expiratory"]) },
    { key: "feeding", label: "Feeding difficulty", options: opt([0, "None"], [1, "Sometimes"], [2, "Consistently"]) },
    { key: "growth", label: "Growth restriction", options: opt([0, "Normal"], [1, "Mild"], [2, "Marked"]) },
  ],
  interpret: (t) =>
    t >= 10 ? { band: "crit", label: `Ross ${t} — severe heart failure`, advice: "PICU care, diuretics ± inotropes, urgent cardiology review." }
    : t >= 7 ? { band: "warn", label: `Ross ${t} — moderate heart failure`, advice: "Diuretics, feeding support, cardiology review within 24 h." }
    : t >= 4 ? { band: "warn", label: `Ross ${t} — mild heart failure`, advice: "Monitor weight, optimise feeding, cardiology follow-up." }
    : { band: "info", label: `Ross ${t} — no heart failure`, advice: "—" },
};

const KAWASAKI: ScaleDef = {
  key: "kawasaki",
  name: "Kawasaki Disease Diagnostic Criteria",
  units: ["picu", "stepdown", "paeds"],
  category: "Cardiovascular",
  note: "Fever ≥ 5 days plus 4 of 5 clinical criteria (or fever with coronary aneurysm).",
  items: [
    { key: "fever5", label: "Fever ≥ 5 days", options: opt([1, "Yes"], [0, "No"]) },
    { key: "conjunctivitis", label: "Bilateral non-exudative conjunctivitis", options: opt([1, "Yes"], [0, "No"]) },
    { key: "mucosa", label: "Oral mucosal changes (strawberry tongue, fissured lips)", options: opt([1, "Yes"], [0, "No"]) },
    { key: "extremity", label: "Peripheral extremity changes", options: opt([1, "Yes"], [0, "No"]) },
    { key: "rash", label: "Polymorphous rash", options: opt([1, "Yes"], [0, "No"]) },
    { key: "cervical", label: "Cervical lymphadenopathy (> 1.5 cm)", options: opt([1, "Yes"], [0, "No"]) },
  ],
  interpret: (t) =>
    t >= 5 ? { band: "crit", label: `Kawasaki criteria met (${t}/5 + fever)`, advice: "Start IVIG 2 g/kg + aspirin within 10 days; echocardiogram for coronary assessment." }
    : t === 4 ? { band: "warn", label: `Kawasaki criteria met (${t}/5 + fever)`, advice: "Diagnosis met. Start IVIG + aspirin; baseline echocardiogram." }
    : t >= 3 ? { band: "warn", label: `Incomplete Kawasaki — ${t}/5 criteria + fever`, advice: "Investigate (CRP/ESR, echo, labs); consider IVIG if supportive." }
    : { band: "info", label: `Kawasaki criteria not met (${t}/5)`, advice: "Consider alternative diagnoses." },
};

const BRISTOL: ScaleDef = {
  key: "bristol",
  name: "Bristol Stool Chart (pediatric)",
  units: ["picu", "stepdown", "paeds", "postnatal"],
  category: "GI / feeding",
  items: [
    { key: "type", label: "Stool type", options: opt([1, "Type 1 — separate hard lumps"], [2, "Type 2 — lumpy sausage"], [3, "Type 3 — cracked sausage"], [4, "Type 4 — smooth soft sausage"], [5, "Type 5 — soft blobs"], [6, "Type 6 — mushy"], [7, "Type 7 — liquid"]) },
  ],
  interpret: (t) =>
    t >= 6 ? { band: "warn", label: `Type ${t} — diarrhoea pattern`, advice: "Assess hydration, stool culture, consider osmotic/infective cause." }
    : t <= 2 ? { band: "warn", label: `Type ${t} — constipation pattern`, advice: "Review fibre, fluids; consider laxative." }
    : { band: "info", label: `Type ${t} — normal`, advice: "—" },
};

const IGERQ: ScaleDef = {
  key: "igerq",
  name: "I-GERQ (Infant Gastroesophageal Reflux Questionnaire)",
  units: ["nicu", "postnatal", "paeds"],
  category: "GI / feeding",
  items: [
    { key: "spitFreq", label: "Spit-up frequency per day", options: opt([0, "0"], [1, "1–2"], [2, "3–4"], [3, "5+"], [4, "Every feed"]) },
    { key: "spitVol", label: "Volume of spit-up", options: opt([0, "Very small"], [1, "Small"], [2, "Moderate"], [3, "Large"]) },
    { key: "cryFreq", label: "Crying/fussiness frequency", options: opt([0, "Never"], [1, "Occasionally"], [2, "Often"], [3, "Constantly"]) },
    { key: "backArch", label: "Arching back during feeds", options: opt([0, "No"], [1, "Sometimes"], [2, "Often"]) },
    { key: "apnea", label: "Apnoea / choking episodes", options: opt([0, "No"], [3, "Yes"]) },
  ],
  interpret: (t) =>
    t >= 12 ? { band: "warn", label: `I-GERQ ${t} — significant reflux symptoms`, advice: "Trial of feed thickening, positioning; consider PPI/H2RA and further workup." }
    : t >= 6 ? { band: "info", label: `I-GERQ ${t} — mild reflux`, advice: "Reassurance and conservative measures." }
    : { band: "info", label: `I-GERQ ${t} — minimal symptoms`, advice: "—" },
};

const HOLLIDAY: ScaleDef = {
  key: "holliday",
  name: "Holliday–Segar Method (maintenance fluids)",
  units: ["nicu", "picu", "stepdown", "paeds"],
  category: "Fluid / renal / metabolic",
  note: "100 ml/kg for first 10 kg, 50 ml/kg for 11–20 kg, 20 ml/kg above 20 kg.",
  items: [{ key: "weight", label: "Weight", kind: "number", unit: "kg" }],
  interpret: (t, a) => {
    const w = Number(a.weight ?? 0);
    const perDay = w <= 0 ? 0 : w <= 10 ? Math.round(w * 100) : w <= 20 ? 1000 + (w - 10) * 50 : 1500 + (w - 20) * 20;
    return {
      band: "info",
      label: `Maintenance fluids ${perDay} ml/day (${Math.round(perDay / 24)} ml/h) for ${w} kg`,
      advice: "Halve in first 24 h of SIADH or postoperatively; assess electrolytes before prescribing.",
    };
  },
};

const PARKLAND: ScaleDef = {
  key: "parkland",
  name: "Parkland Formula (burns, pediatric-adjusted)",
  units: ["picu", "paeds", "stepdown"],
  category: "Fluid / renal / metabolic",
  items: [
    { key: "weight", label: "Weight", kind: "number", unit: "kg" },
    { key: "tbsa", label: "% TBSA burned", kind: "number", unit: "%" },
    { key: "hours", label: "Hours since burn", kind: "number", unit: "h" },
  ],
  interpret: (t, a) => {
    const w = Number(a.weight ?? 0);
    const tbsa = Number(a.tbsa ?? 0);
    const hrs = Number(a.hours ?? 0);
    const total24 = Math.round(4 * w * tbsa);
    const firstHalf = Math.round(total24 / 2);
    const remaining = Math.max(0, firstHalf - Math.round((firstHalf / 8) * Math.min(hrs, 8)));
    return {
      band: tbsa >= 20 ? "crit" : "warn",
      label: `Parkland: ${total24} ml RL in first 24 h — first half ${firstHalf} ml over 8 h, remaining ${remaining} ml over next 16 h`,
      advice: "Monitor urine output 1 ml/kg/h. Add maintenance fluids separately for children. Refer burns unit.",
    };
  },
};

const SCHWARTZ: ScaleDef = {
  key: "schwartz",
  name: "Schwartz Formula (estimated GFR, paediatric)",
  units: ["picu", "stepdown", "paeds"],
  category: "Fluid / renal / metabolic",
  items: [
    { key: "height", label: "Height", kind: "number", unit: "cm" },
    { key: "creat", label: "Serum creatinine", kind: "number", unit: "mg/dL" },
    { key: "k", label: "Constant k", options: opt([0.33, "Preterm infant"], [0.45, "Term infant"], [0.55, "Child"], [0.7, "Adolescent male"]) },
  ],
  interpret: (t) => ({
    band: t < 15 ? "crit" : t < 30 ? "crit" : t < 60 ? "warn" : t < 90 ? "warn" : "info",
    label: `eGFR (Schwartz) ≈ ${t} ml/min/1.73m²`,
    advice: t < 15 ? "Stage 5 CKD — nephrology referral, dialysis planning." : t < 30 ? "Stage 4 CKD — nephrology referral." : t < 60 ? "Stage 3 CKD — nephrology review." : t < 90 ? "Stage 2 CKD — monitor." : "Normal renal function.",
  }),
  note: "eGFR = k × height(cm) / serum creatinine(mg/dL). k: preterm 0.33, term 0.45, child 0.55, adolescent male 0.7.",
};

const DEHYDRATION: ScaleDef = {
  key: "dehydration",
  name: "Clinical Dehydration Scale (WHO/NICE)",
  units: ["paeds", "stepdown", "picu", "postnatal"],
  category: "Fluid / renal / metabolic",
  items: [
    { key: "general", label: "General appearance", options: opt([0, "Normal"], [1, "Thirsty, restless, lethargic"], [2, "Drowsy, limp, cold, sweaty"]) },
    { key: "eyes", label: "Eyes", options: opt([0, "Normal"], [1, "Slightly sunken"], [2, "Very sunken"]) },
    { key: "tongue", label: "Tongue", options: opt([0, "Moist"], [1, "Sticky"], [2, "Dry"]) },
    { key: "tears", label: "Tears", options: opt([0, "Present"], [1, "Decreased"], [2, "Absent"]) },
  ],
  interpret: (t) =>
    t >= 5 ? { band: "crit", label: `CDS ${t} — severe dehydration (≥ 7%)`, advice: "IV fluid resuscitation 20 ml/kg boluses; reassess after each." }
    : t >= 2 ? { band: "warn", label: `CDS ${t} — moderate dehydration (3–9%)`, advice: "ORT or IV rehydration over 4–6 hours; monitor electrolytes." }
    : { band: "info", label: `CDS ${t} — no clinical dehydration`, advice: "Continue oral fluids and review." },
};

const PECARN: ScaleDef = {
  key: "pecarn",
  name: "PECARN Pediatric Head Injury Algorithm",
  units: ["paeds", "stepdown", "picu"],
  category: "Trauma / injury",
  note: "Identifies children at very low risk of clinically important TBI in whom CT can be omitted.",
  items: [
    { key: "ageGroup", label: "Age group", options: opt([0, "< 2 years"], [1, "≥ 2 years"]) },
    { key: "gcs", label: "GCS", kind: "number", unit: "/15" },
    { key: "altered", label: "Altered mental status", options: opt([1, "Yes"], [0, "No"]) },
    { key: "palpable", label: "Palpable skull fracture", options: opt([1, "Yes"], [0, "No"]) },
    { key: "basilar", label: "Basilar skull fracture signs", options: opt([1, "Yes"], [0, "No"]) },
    { key: "haematoma", label: "Scalp haematoma (non-frontal)", options: opt([1, "Yes"], [0, "No"]) },
    { key: "loc", label: "Loss of consciousness", options: opt([1, "Yes"], [0, "No"]) },
    { key: "vomiting", label: "Vomiting", options: opt([1, "Yes"], [0, "No"]) },
    { key: "severeMech", label: "Severe mechanism of injury", options: opt([1, "Yes"], [0, "No"]) },
    { key: "headache", label: "Severe headache", options: opt([1, "Yes"], [0, "No"]) },
  ],
  interpret: (t, a) => {
    const under2 = Number(a.ageGroup ?? 0) === 0;
    const gcs = Number(a.gcs ?? 15);
    const altered = Number(a.altered ?? 0) === 1;
    if (gcs < 14 || altered) return { band: "crit", label: `High risk — GCS ${gcs}, altered mental status`, advice: "CT head indicated urgently." };
    if (under2) {
      const sf = Number(a.palpable ?? 0) + Number(a.basilar ?? 0);
      if (sf > 0) return { band: "warn", label: "Intermediate risk — skull fracture sign present", advice: "Observe; CT if findings persist or worsen." };
      const score = Number(a.loc ?? 0) + Math.min(Number(a.vomiting ?? 0), 3) + Number(a.severeMech ?? 0) + Number(a.haematoma ?? 0);
      if (score >= 3) return { band: "warn", label: `Intermediate risk (score ${score}) for < 2 y`, advice: "Observe in ED; CT if deterioration or parental preference." };
      return { band: "info", label: "Very low risk — CT head may be omitted", advice: "Discharge with head-injury advice sheet." };
    }
    if (Number(a.palpable ?? 0) === 1 || Number(a.basilar ?? 0) === 1) return { band: "warn", label: "Intermediate risk — skull fracture sign present", advice: "Observe; CT if persists or worsens." };
    if (Number(a.vomiting ?? 0) === 1 && Number(a.headache ?? 0) === 1 && Number(a.severeMech ?? 0) === 1) return { band: "warn", label: "≥ 3 risk factors for ≥ 2 y", advice: "Observe in ED; CT if deterioration or parental preference." };
    return { band: "info", label: "Very low risk — CT head may be omitted", advice: "Discharge with head-injury advice sheet." };
  },
};

const PTS: ScaleDef = {
  key: "pts",
  name: "Pediatric Trauma Score",
  units: ["picu", "stepdown", "paeds"],
  category: "Trauma / injury",
  items: [
    { key: "size", label: "Size (weight)", options: opt([-1, "< 10 kg"], [1, "10–20 kg"], [2, "> 20 kg"]) },
    { key: "airway", label: "Airway", options: opt([-1, "Obstructed/unmaintained"], [1, "Maintained"], [2, "Normal"]) },
    { key: "sbp", label: "Systolic BP", options: opt([-1, "< 50 mmHg"], [1, "50–90 mmHg"], [2, "> 90 mmHg"]) },
    { key: "conscious", label: "Consciousness", options: opt([-1, "Unresponsive"], [1, "Obtunded / loss of consciousness"], [2, "Awake"]) },
    { key: "wound", label: "Open wounds", options: opt([-1, "Major open wound"], [1, "Minor open wound"], [2, "None"]) },
    { key: "fracture", label: "Fractures", options: opt([-1, "Open / multiple"], [1, "Closed single"], [2, "None"]) },
  ],
  interpret: (t) =>
    t <= -1 ? { band: "crit", label: `PTS ${t} — high risk`, advice: "Transfer to paediatric trauma centre immediately." }
    : t <= 4 ? { band: "warn", label: `PTS ${t} — moderate risk`, advice: "Refer to paediatric trauma centre; aggressive resuscitation." }
    : t <= 8 ? { band: "warn", label: `PTS ${t} — low risk`, advice: "Treat locally if resources adequate; low threshold for referral." }
    : { band: "info", label: `PTS ${t} — minimal risk`, advice: "Treat locally." },
};

const SEPSISCORE: ScaleDef = {
  key: "kaiser",
  name: "Kaiser Permanente Neonatal Sepsis Calculator",
  units: ["nicu", "postnatal"],
  category: "Infection / sepsis",
  note: "Uses maternal risk factors and clinical status to estimate the risk of early-onset sepsis (EOS) in the first 7 days.",
  items: [
    { key: "gbs", label: "Maternal GBS status", options: opt([0, "Negative"], [1, "Positive"], [2, "Unknown"]) },
    { key: "prolongedRupture", label: "Prolonged rupture of membranes (> 18 h)", options: opt([1, "Yes"], [0, "No"]) },
    { key: "maternalTemp", label: "Highest maternal antepartum temperature", options: opt([0, "< 37.8 °C"], [1, "37.8–38.0 °C"], [2, "38.1–39.0 °C"], [3, "> 39.0 °C"]) },
    { key: "chorio", label: "Chorioamnionitis / intrapartum antibiotics", options: opt([0, "No"], [1, "Yes"]) },
    { key: "gaAtBirth", label: "Gestational age at birth", kind: "number", unit: "wks" },
    { key: "wellAppearing", label: "Clinically well-appearing newborn", options: opt([1, "Yes"], [0, "No"]) },
  ],
  interpret: (t, a) => {
    const ga = Number(a.gaAtBirth ?? 38);
    const well = Number(a.wellAppearing ?? 0) === 1;
    if (t >= 4 && !well) return { band: "crit", label: `High EOS risk — score ${t}`, advice: "Empirical IV antibiotics, full sepsis workup including blood/CSF culture, PICU-level monitoring." };
    if (t >= 3 || ga < 37) return { band: "warn", label: `Moderate EOS risk — score ${t}`, advice: "Observe for 36–48 h with serial examination; blood culture and CRP; antibiotics if deterioration." };
    if (t >= 2 && well) return { band: "warn", label: `Low–moderate EOS risk — score ${t}, well-appearing`, advice: "Enhanced observation 36–48 h with serial examination; no antibiotics if remains well." };
    return { band: "info", label: `Very low EOS risk — score ${t}, well-appearing`, advice: "Routine postnatal care with caregiver education and 48–72 h follow-up." };
  },
};

const ROCHESTER: ScaleDef = {
  key: "rochester",
  name: "Rochester Criteria (febrile infant 0–3 months)",
  units: ["nicu", "paeds", "postnatal"],
  category: "Infection / sepsis",
  items: [
    { key: "well", label: "Generally well-appearing", options: opt([1, "Yes"], [0, "No"]) },
    { key: "term", label: "Born at term (≥ 37 wks)", options: opt([1, "Yes"], [0, "No"]) },
    { key: "prior", label: "No prior antibiotics / hospitalisation", options: opt([1, "Yes"], [0, "No"]) },
    { key: "temp", label: "Rectal temp 38–38.9 °C", options: opt([1, "Yes"], [0, "No"]) },
    { key: "wbc", label: "WBC 5,000–15,000/mm³", options: opt([1, "Yes"], [0, "No"]) },
    { key: "bands", label: "Absolute band count ≤ 1,500/mm³", options: opt([1, "Yes"], [0, "No"]) },
    { key: "urine", label: "Urine WBC ≤ 10/hpf", options: opt([1, "Yes"], [0, "No"]) },
  ],
  interpret: (t) =>
    t === 7 ? { band: "info", label: "Rochester criteria met (7/7) — low risk (< 1% SBI)", advice: "Low risk; outpatient management with close follow-up, no empirical antibiotics." }
    : t >= 5 ? { band: "warn", label: `Rochester partially met (${t}/7)`, advice: "Full sepsis workup and observe; consider antibiotics if unwell." }
    : { band: "crit", label: `Rochester criteria not met (${t}/7) — high risk for SBI`, advice: "Full sepsis workup, admit, start empirical IV antibiotics." },
};

const PHOENIX: ScaleDef = {
  key: "phoenix",
  name: "Phoenix Sepsis Score (2024)",
  units: ["picu", "stepdown"],
  category: "Infection / sepsis",
  note: "4 organ systems, each 0–3 points. Score ≥ 2 with suspected infection = sepsis; ≥ 2 with CV ≥ 1 = septic shock.",
  items: [
    { key: "resp", label: "Respiratory system", options: opt([0, "0 points"], [1, "1 point"], [2, "2 points"], [3, "3 points"]) },
    { key: "cardio", label: "Cardiovascular system", options: opt([0, "0 points"], [1, "1 point"], [2, "2 points"], [3, "3 points"]) },
    { key: "coag", label: "Coagulation", options: opt([0, "0 points"], [1, "1 point"], [2, "2 points"], [3, "3 points"]) },
    { key: "neuro", label: "Neurologic", options: opt([0, "0 points"], [1, "1 point"], [2, "2 points"], [3, "3 points"]) },
  ],
  interpret: (t) =>
    t >= 8 ? { band: "crit", label: `Phoenix ${t} — severe sepsis / septic shock`, advice: "Mortality risk > 10%. PICU care, full organ support, urgent antibiotics." }
    : t >= 4 ? { band: "crit", label: `Phoenix ${t} — sepsis with significant organ dysfunction`, advice: "PICU care, source control, fluid/vasoactive per PALS." }
    : t >= 2 ? { band: "warn", label: `Phoenix ${t} — sepsis criteria met`, advice: "Hospital admission, antibiotics within 1 hour, reassess every hour." }
    : { band: "info", label: `Phoenix ${t} — sepsis criteria not met`, advice: "Consider alternative diagnoses; continue monitoring." },
};

const PELOD2: ScaleDef = {
  key: "pelod2",
  name: "PELOD-2 (Pediatric Logistic Organ Dysfunction)",
  units: ["picu"],
  category: "Critical care severity",
  items: [
    { key: "gcs", label: "GCS", kind: "number", unit: "/15" },
    { key: "pupils", label: "Bilateral pupillary reaction", options: opt([1, "Both fixed/dilated"], [0, "Normal"]) },
    { key: "lactate", label: "Lactate", kind: "number", unit: "mmol/L" },
    { key: "map", label: "MAP", kind: "number", unit: "mmHg" },
    { key: "creat", label: "Creatinine", kind: "number", unit: "µmol/L" },
    { key: "pao2", label: "PaO₂", kind: "number", unit: "mmHg" },
    { key: "pco2", label: "PaCO₂", kind: "number", unit: "mmHg" },
    { key: "invVent", label: "Invasive mechanical ventilation", options: opt([1, "Yes"], [0, "No"]) },
    { key: "wbc", label: "WBC", kind: "number", unit: "/mm³" },
    { key: "platelets", label: "Platelets", kind: "number", unit: "/mm³" },
  ],
  interpret: (t) =>
    t >= 22 ? { band: "crit", label: `PELOD-2 ${t} — very high organ dysfunction`, advice: "Predicted mortality > 40%. Consider limitation of care discussion with family." }
    : t >= 12 ? { band: "crit", label: `PELOD-2 ${t} — high organ dysfunction`, advice: "Predicted mortality 10–40%. PICU-level care." }
    : t >= 3 ? { band: "warn", label: `PELOD-2 ${t} — moderate organ dysfunction`, advice: "Predicted mortality 0.6–10%. Standard PICU care." }
    : { band: "info", label: `PELOD-2 ${t} — minimal dysfunction`, advice: "Predicted mortality < 0.6%." },
};

const PSOFA: ScaleDef = {
  key: "psofa",
  name: "pSOFA (Pediatric Sequential Organ Failure Assessment)",
  units: ["picu", "stepdown"],
  category: "Critical care severity",
  items: [
    { key: "pao2fio2", label: "PaO₂:FiO₂", kind: "number", unit: "mmHg" },
    { key: "platelets", label: "Platelets", kind: "number", unit: "×10³/µL" },
    { key: "bilirubin", label: "Total bilirubin", kind: "number", unit: "mg/dL" },
    { key: "map", label: "MAP", kind: "number", unit: "mmHg" },
    { key: "creatinine", label: "Creatinine", kind: "number", unit: "mg/dL" },
  ],
  interpret: (t) =>
    t >= 10 ? { band: "crit", label: `pSOFA ${t} — severe organ dysfunction`, advice: "Mortality > 30%. PICU-level care, urgent review." }
    : t >= 5 ? { band: "warn", label: `pSOFA ${t} — moderate organ dysfunction`, advice: "PICU care, reassess 12-hourly." }
    : { band: "info", label: `pSOFA ${t} — minimal dysfunction`, advice: "—" },
};

const PARDS: ScaleDef = {
  key: "pards",
  name: "PARDS Criteria (Pediatric ARDS, 2023)",
  units: ["picu", "stepdown"],
  category: "Critical care severity",
  items: [
    { key: "timing", label: "Onset within 7 days of known insult", options: opt([1, "Yes"], [0, "No"]) },
    { key: "lung", label: "Lung injury not fully explained by CHF/fluid overload", options: opt([1, "Yes"], [0, "No"]) },
    { key: "oi", label: "OI (if ventilated)", kind: "number", unit: "—" },
    { key: "osi", label: "OSI (if HFOV)", kind: "number", unit: "—" },
    { key: "chestImaging", label: "Chest imaging: new bilateral infiltrates", options: opt([1, "Yes"], [0, "No"]) },
  ],
  interpret: (t, a) => {
    const oi = Number(a.oi ?? 0);
    const osi = Number(a.osi ?? 0);
    const img = Number(a.chestImaging ?? 0) === 1;
    const timing = Number(a.timing ?? 0) === 1;
    if (!timing || !img) return { band: "info", label: "PARDS criteria not met (timing or imaging incomplete)", advice: "Reassess once full data available." };
    if (oi >= 16 || osi >= 12.3) return { band: "crit", label: "PARDS — severe", advice: "HFOV/HFJV, neuromuscular blockade, consider ECMO referral. Mortality 25–40%." };
    if (oi >= 8 || osi >= 9.3) return { band: "crit", label: "PARDS — moderate", advice: "Low tidal volume ventilation, permissive hypercapnia, prone positioning." };
    return { band: "warn", label: "PARDS — mild", advice: "Conventional ventilation, consider proning, close monitoring for progression." };
  },
  note: "PARDS definition excludes chronic lung disease and left heart failure causes.",
};

const DENVER: ScaleDef = {
  key: "denver",
  name: "Denver Developmental Screening Test (Denver II)",
  units: ["paeds", "postnatal"],
  category: "Developmental",
  note: "Items scored as Pass, Fail, Refused or No Opportunity. Interpretation based on age-adjusted percentiles.",
  items: [
    { key: "grossMotor", label: "Gross motor domain", options: opt([0, "Normal"], [1, "Caution"], [2, "Delayed"]) },
    { key: "fineMotor", label: "Fine motor — adaptive", options: opt([0, "Normal"], [1, "Caution"], [2, "Delayed"]) },
    { key: "language", label: "Language", options: opt([0, "Normal"], [1, "Caution"], [2, "Delayed"]) },
    { key: "personal", label: "Personal — social", options: opt([0, "Normal"], [1, "Caution"], [2, "Delayed"]) },
  ],
  interpret: (t) =>
    t >= 4 ? { band: "crit", label: `Denver II — Suspect (score ${t})`, advice: "Formal developmental assessment and early intervention referral." }
    : t >= 1 ? { band: "warn", label: `Denver II — Caution (score ${t})`, advice: "Repeat in 1–3 months; monitor closely; consider referral if persistent." }
    : { band: "info", label: "Denver II — Normal", advice: "Continue routine developmental surveillance." },
};

const MCHAT: ScaleDef = {
  key: "mchat",
  name: "M-CHAT-R (Modified Checklist for Autism in Toddlers, Revised)",
  units: ["paeds", "postnatal"],
  category: "Developmental / behavioral",
  note: "Applies to toddlers 16–30 months. Score range 0–20. Follow-up interview required for scores 3–7.",
  items: [
    { key: "interest", label: "Enjoys being swung/bounced?", options: opt([0, "Yes"], [2, "No"]) },
    { key: "point", label: "Looks at things you point at?", options: opt([0, "Yes"], [2, "No"]) },
    { key: "pretend", label: "Pretends to make tea/phone calls?", options: opt([0, "Yes"], [2, "No"]) },
    { key: "pointInterest", label: "Points to indicate interest?", options: opt([0, "Yes"], [2, "No"]) },
    { key: "objects", label: "Uses objects to build/stack?", options: opt([0, "Yes"], [2, "No"]) },
    { key: "eyeContact", label: "Looks you in the eye when you talk?", options: opt([0, "Yes"], [2, "No"]) },
    { key: "sounds", label: "Responds when you call name?", options: opt([0, "Yes"], [2, "No"]) },
    { key: "smile", label: "Smiles back when you smile?", options: opt([0, "Yes"], [2, "No"]) },
    { key: "comfort", label: "Brings objects to show you?", options: opt([0, "Yes"], [2, "No"]) },
  ],
  interpret: (t) =>
    t >= 8 ? { band: "crit", label: `M-CHAT-R ${t} — HIGH risk (score ≥ 8)`, advice: "Immediate referral for diagnostic evaluation and early intervention." }
    : t >= 3 ? { band: "warn", label: `M-CHAT-R ${t} — MEDIUM risk (3–7)`, advice: "Complete follow-up interview; refer for further evaluation if persistent." }
    : { band: "info", label: `M-CHAT-R ${t} — LOW risk (0–2)`, advice: "No further action; rescreen at 24 months if risk factors." },
};

const BRADENQ: ScaleDef = {
  key: "bradenq",
  name: "Braden Q Scale (Pediatric Pressure Injury Risk)",
  units: ["picu", "stepdown", "nicu", "paeds"],
  category: "Skin / wound",
  note: "Score range 8–40. Total score ≤ 16 indicates high risk for pressure injury.",
  items: [
    { key: "mobility", label: "Mobility", options: opt([1, "Completely immobile"], [2, "Very limited"], [3, "Slightly limited"], [4, "No limitation"]) },
    { key: "activity", label: "Activity", options: opt([1, "Bedfast"], [2, "Chairfast"], [3, "Walks occasionally"], [4, "Walks frequently"]) },
    { key: "sensory", label: "Sensory perception", options: opt([1, "Completely limited"], [2, "Very limited"], [3, "Slightly limited"], [4, "No impairment"]) },
    { key: "moisture", label: "Moisture", options: opt([1, "Constantly moist"], [2, "Often moist"], [3, "Occasionally moist"], [4, "Rarely moist"]) },
    { key: "friction", label: "Friction / shear", options: opt([1, "Problem"], [2, "Potential problem"], [3, "No apparent problem"]) },
    { key: "nutrition", label: "Nutrition", options: opt([1, "Very poor"], [2, "Inadequate"], [3, "Adequate"], [4, "Excellent"]) },
    { key: "tissue", label: "Tissue perfusion & oxygenation", options: opt([1, "Extremely compromised"], [2, "Compromised"], [3, "Adequate"], [4, "Excellent"]) },
  ],
  interpret: (t) =>
    t <= 16 ? { band: "crit", label: `Braden Q ${t} — high risk for pressure injury`, advice: "Aggressive pressure-relieving measures, 2-hourly repositioning, nutritional support." }
    : t <= 21 ? { band: "warn", label: `Braden Q ${t} — moderate risk`, advice: "Turn every 3–4 hours, pressure-relieving mattress, monitor skin." }
    : t <= 24 ? { band: "warn", label: `Braden Q ${t} — mild risk`, advice: "Standard skin care and observation." }
    : { band: "info", label: `Braden Q ${t} — minimal risk`, advice: "—" },
};

const TANNER: ScaleDef = {
  key: "tanner",
  name: "Tanner Staging (Sexual Maturity Rating)",
  units: ["paeds", "stepdown"],
  category: "Endocrine / pubertal",
  items: [
    { key: "stage", label: "Tanner stage", options: opt([1, "Stage 1 — Prepubertal"], [2, "Stage 2 — Early"], [3, "Stage 3 — Mid"], [4, "Stage 4 — Late"], [5, "Stage 5 — Adult"]) },
    { key: "ageYears", label: "Age", kind: "number", unit: "yrs" },
  ],
  interpret: (t, a) => {
    const st = Number(a.stage ?? 1);
    if (st === 1 && (Number(a.ageYears ?? 0) > 12)) return { band: "warn", label: "Tanner Stage 1 beyond expected age", advice: "Consider delayed puberty — investigate (LH/FSH, bone age, karyotype)." };
    if (st === 1) return { band: "info", label: "Tanner Stage 1 — prepubertal", advice: "Normal for age; continue monitoring." };
    return { band: "info", label: `Tanner Stage ${st}`, advice: "Normal progression; assess growth velocity and final height prediction." };
  },
};

const BMI: ScaleDef = {
  key: "bmi",
  name: "BMI-for-age percentile / z-score",
  units: ["paeds", "stepdown", "picu", "postnatal"],
  category: "Growth & nutrition",
  items: [
    { key: "weight", label: "Weight", kind: "number", unit: "kg" },
    { key: "height", label: "Height", kind: "number", unit: "cm" },
    { key: "age", label: "Age", kind: "number", unit: "years" },
  ],
  interpret: (t, a) => {
    const w = Number(a.weight ?? 0);
    const h = Number(a.height ?? 0) / 100;
    const bmi = h > 0 ? Math.round((w / (h * h)) * 10) / 10 : 0;
    return {
      band: bmi < 12 ? "crit" : bmi < 14 ? "warn" : bmi < 18.5 ? "warn" : bmi < 25 ? "info" : bmi < 30 ? "warn" : "crit",
      label: `BMI ${bmi} kg/m²`,
      advice: bmi < 12 ? "Severe wasting — urgent nutritional intervention." : bmi < 14 ? "Moderate wasting — nutrition support." : bmi < 18.5 ? "Underweight — nutritional assessment." : bmi < 25 ? "Normal BMI." : bmi < 30 ? "Overweight — lifestyle advice." : "Obesity — full metabolic and lifestyle assessment.",
    };
  },
};

const MUAC: ScaleDef = {
  key: "muac",
  name: "MUAC (Mid-Upper Arm Circumference)",
  units: ["nicu", "paeds", "stepdown", "postnatal"],
  category: "Growth & nutrition",
  items: [
    { key: "muac", label: "MUAC", kind: "number", unit: "cm" },
    { key: "ageMonths", label: "Age", kind: "number", unit: "months" },
  ],
  interpret: (t, a) => {
    const m = Number(a.muac ?? 0);
    if (m < 11) return { band: "crit", label: `MUAC ${m} cm — severe acute malnutrition (< 11 cm)`, advice: "Immediate therapeutic feeding; treat infection; assess complications." };
    if (m < 12.5) return { band: "warn", label: `MUAC ${m} cm — moderate acute malnutrition (11–12.5 cm)`, advice: "Supplementary feeding programme, nutrition counselling." };
    if (m < 13.5) return { band: "warn", label: `MUAC ${m} cm — at risk`, advice: "Counsel on nutrition, monitor growth monthly." };
    return { band: "info", label: `MUAC ${m} cm — normal (> 13.5 cm)`, advice: "—" };
  },
  note: "MUAC is a strong predictor of mortality and is reliable from 6 months to 5 years.",
};

const WATERLOW: ScaleDef = {
  key: "waterlow",
  name: "Waterlow Classification (malnutrition)",
  units: ["paeds", "stepdown", "nicu", "postnatal"],
  category: "Growth & nutrition",
  items: [
    { key: "weight", label: "Current weight", kind: "number", unit: "kg" },
    { key: "idealWeightHt", label: "Ideal weight for height", kind: "number", unit: "kg" },
    { key: "idealWeightAge", label: "Ideal weight for age", kind: "number", unit: "kg" },
  ],
  interpret: (t, a) => {
    const w = Number(a.weight ?? 0);
    const idealWt = Number(a.idealWeightAge ?? 0);
    const idealWtHt = Number(a.idealWeightHt ?? 0);
    const wForAge = idealWt > 0 ? Math.round((w / idealWt) * 100) : 0;
    const wForHt = idealWtHt > 0 ? Math.round((w / idealWtHt) * 100) : 0;
    let classification = "Normal";
    if (wForHt < 70 && wForAge < 60) classification = "Marasmic-kwashiorkor";
    else if (wForHt < 70) classification = "Marasmus (wasted)";
    else if (wForHt < 80 && wForAge < 60) classification = "Kwashiorkor";
    else if (wForHt < 80) classification = "Underweight (wasted)";
    else if (wForAge < 60) classification = "Underweight (stunted)";
    const band: "info" | "warn" | "crit" = wForHt < 70 || wForAge < 60 ? "crit" : wForHt < 80 || wForAge < 80 ? "warn" : "info";
    return {
      band,
      label: `Waterlow: WFA ${wForAge}% · WFH ${wForHt}% — ${classification}`,
      advice: wForHt < 70 || wForAge < 60 ? "Urgent nutritional rehabilitation; screen for infection and complications." : wForHt < 80 ? "Nutrition support plan with catch-up growth monitoring." : "Nutrition adequate; continue monitoring.",
    };
  },
  note: "WFA = (current weight / ideal weight for age) × 100; WFH = (current weight / ideal weight for height) × 100.",
};

const PONDERAL: ScaleDef = {
  key: "ponderal",
  name: "Ponderal Index",
  units: ["nicu", "postnatal"],
  category: "Growth & nutrition",
  items: [
    { key: "weight", label: "Birth weight", kind: "number", unit: "g" },
    { key: "length", label: "Birth length", kind: "number", unit: "cm" },
  ],
  interpret: (t, a) => {
    const w = Number(a.weight ?? 0);
    const l = Number(a.length ?? 0) / 100;
    const pi = l > 0 ? Math.round(w / (l * l * l)) : 0;
    return {
      band: pi < 20 ? "warn" : pi > 30 ? "warn" : "info",
      label: `Ponderal Index ${pi} g/cm³`,
      advice: pi < 20 ? "Asymmetric growth restriction — placental insufficiency." : pi > 30 ? "Excessive weight for length — infant of diabetic mother." : "Proportional growth.",
    };
  },
  note: "PI = birth weight (g) / length (cm)³. Normal range: 20–30 g/cm³ at term.",
};

export const ALL_SCALES: ScaleDef[] = [
  APGAR, BALLARD, SILVERMAN, KRAMER, BHUTANI, CRIB2, SNAPPE2, NTISS, FINNEGAN, NEC_BELL, PAPILE, ROP,
  PEWS, FLACC, WONGBAKER, NRS, COMFORTB, WAT1, PGCS, AVPU, CAPD,
  CROUP, PRAM, PASS, RDAI, WOODDOWNES,
  VIS, ROSS, KAWASAKI,
  BRISTOL, IGERQ,
  HOLLIDAY, PARKLAND, SCHWARTZ, DEHYDRATION,
  PECARN, PTS,
  SEPSISCORE, ROCHESTER, PHOENIX,
  PELOD2, PSOFA, PARDS,
  DENVER, MCHAT, BRADENQ, TANNER,
  BMI, MUAC, WATERLOW, PONDERAL,
];

export const SCALE_CATEGORIES = Array.from(new Set(ALL_SCALES.map((s) => s.category)));
export function scalesForUnit(unit: UnitKey): ScaleDef[] { return ALL_SCALES.filter((s) => s.units.includes(unit)); }
export function getScale(key: string): ScaleDef | undefined { return ALL_SCALES.find((s) => s.key === key); }
