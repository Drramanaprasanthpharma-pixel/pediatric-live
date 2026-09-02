"use client";

import { Section, TopBar } from "@/components/ui";
import { UnitSwitcher } from "@/components/unit-ui";
import { useState } from "react";
import { UNIT_LIST, unitOf, type UnitKey } from "@/lib/units";
import { UNIT_CATALOGS, systemsForUnit } from "@/lib/units-catalog";
import {
  CARE_BUNDLE,
  DISCHARGE_CRITERIA,
  DRUGS,
  LAB_PANELS,
  LINES,
  NURSING_PARAMS,
  PROBLEM_CATALOG,
  SYSTEMS,
} from "@/lib/catalog";

export default function ReferencePage() {
  const [unit, setUnit] = useState<UnitKey>("nicu");
  const u = unitOf(unit);
  const unitCatalog = UNIT_CATALOGS[unit];
  const totalDx = SYSTEMS.reduce((n, s) => n + PROBLEM_CATALOG[s].length, 0);
  return (
    <main className="min-h-screen pb-20">
      <TopBar />
      <div className="mx-auto max-w-[1400px] px-4 py-5">
        <h1 className="text-xl font-black text-white">Monitored parameters, conditions & unit standards</h1>
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-3"><span className="lbl">Unit</span><UnitSwitcher active={unit} onChange={setUnit} /></div>
        <p className="mb-4 text-xs text-slate-400">
          NICU dataset — {totalDx} diagnoses across {SYSTEMS.length} systems, aligned with AAP (Levels of
          Neonatal Care, NRP 8th ed., 2022 hyperbilirubinaemia & ROP guidance), NNF India Clinical Practice Guidelines
          and IAP recommendations. Educational decision support only — always follow your unit protocol.
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          <Section title="Continuously / routinely monitored parameters" sub="Nursing observation chart">
            <ul className="grid grid-cols-1 gap-1 text-xs text-slate-300 md:grid-cols-2">
              {NURSING_PARAMS.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </Section>

          <Section title="Physiological targets used on the board">
            <ul className="space-y-1 text-xs text-slate-300">
              <li>• Heart rate 100–160/min (sleeping term may dip to 90).</li>
              <li>• Respiratory rate 30–60/min; sustained &gt; 60 = tachypnoea.</li>
              <li>• SpO₂ 90–95% preterm on O₂, 92–97% term; pre/post-ductal gap &lt; 3%.</li>
              <li>• Axillary temperature 36.5–37.5 °C (WHO/NNF normothermia).</li>
              <li>• Mean BP ≥ gestational age in weeks (first 72 h) with good perfusion.</li>
              <li>• CRT &lt; 3 s; lactate &lt; 2 mmol/L.</li>
              <li>• Blood glucose 45–150 mg/dL.</li>
              <li>• Urine output 1–3 ml/kg/hr after day 1.</li>
              <li>• Weight gain 15–20 g/kg/day once on full feeds.</li>
              <li>• Pain: NIPS &lt; 3 / N-PASS ≤ 3; treat above threshold.</li>
            </ul>
          </Section>

          <Section title="Investigations tracked" sub="Panels available on the Labs tab">
            <div className="space-y-2 text-xs">
              {LAB_PANELS.map((p) => (
                <div key={p.key}>
                  <span className="font-semibold text-cyan-300">{p.label}: </span>
                  <span className="text-slate-300">{p.fields.join(", ")}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Formulary" sub="Tap-select medication groups">
            <div className="space-y-2 text-xs">
              {Object.entries(DRUGS).map(([g, list]) => (
                <div key={g}>
                  <span className="font-semibold text-amber-300">{g}: </span>
                  <span className="text-slate-300">{list.join(", ")}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Lines, tubes & devices">
            <p className="text-xs text-slate-300">{LINES.join(" · ")}</p>
          </Section>

          <Section title="Care bundles & discharge criteria">
            <div className="lbl mb-1">Daily care bundle</div>
            <p className="text-xs text-slate-300">{CARE_BUNDLE.join(" · ")}</p>
            <div className="lbl mt-3 mb-1">Discharge readiness</div>
            <p className="text-xs text-slate-300">{DISCHARGE_CRITERIA.join(" · ")}</p>
          </Section>

          {SYSTEMS.map((s) => (
            <Section key={s} title={s} sub={`${PROBLEM_CATALOG[s].length} conditions`}>
              <div className="flex flex-wrap gap-1">
                {PROBLEM_CATALOG[s].map((l) => (
                  <span key={l} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">
                    {l}
                  </span>
                ))}
              </div>
            </Section>
          ))}
        </div>

        {unitCatalog && (
          <Section title={`${u.short} diagnosis catalogue`} sub={`${Object.values(unitCatalog).flat().length} conditions · ${Object.keys(unitCatalog).length} categories`}>
            <div className="max-h-96 space-y-3 overflow-auto">
              {Object.entries(unitCatalog).map(([sysName, list]) => (
                <div key={sysName}>
                  <span className="font-semibold text-cyan-300">{sysName}</span>
                  <p className="text-[11px] text-slate-300">{list.join(" · ")}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </main>
  );
}
