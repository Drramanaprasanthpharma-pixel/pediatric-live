"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, ChipGroup, DialWithOther, NumField, Section, Stepper, api, useTempUnit } from "@/components/ui";
import {
  ACTION_PRESETS,
  CARE_BUNDLE,
  CONTINGENCY_PRESETS,
  DISCHARGE_CRITERIA,
  DRUGS,
  FEED_ROUTE,
  FEED_TYPE,
  ILLNESS,
  LAB_PANELS,
  LINES,
  PROBLEM_CATALOG,
  RESP_FIELDS,
  RESP_MODES,
  SHIFTS,
  SURFACTANT,
  SYSTEMS,
  type SystemKey,
} from "@/lib/catalog";
import type { Detail } from "@/lib/types";
import {
  calcNutrition,
  fmtTime,
  gainGPerKgDay,
  pctOfBirth,
  tempIn,
  tempOut,
} from "@/lib/clinical";

function shiftTag(at: string): "Day" | "Night" {
  const h = new Date(at).getHours();
  return h >= 8 && h < 20 ? "Day" : "Night";
}

export function VitalsTab({
  d,
  id,
  reload,
  user,
  patch,
}: {
  d: Detail;
  id: string;
  reload: () => void;
  user: string;
  patch: (b: Record<string, unknown>) => Promise<void>;
}) {
  const last = d.vitals[0] ?? {};
  const { unit } = useTempUnit();
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [hc, setHc] = useState<number | undefined>(undefined);
  const [v, setV] = useState<Record<string, number>>({
    hr: Number(last.hr ?? 140),
    rr: Number(last.rr ?? 45),
    spo2: Number(last.spo2 ?? 96),
    spo2Post: Number(last.spo2Post ?? 96),
    temp: Number(last.temp ?? 36.8),
    sbp: Number(last.sbp ?? 60),
    dbp: Number(last.dbp ?? 35),
    map: Number(last.map ?? 43),
    crt: Number(last.crt ?? 2),
    rbs: Number(last.rbs ?? 80),
    fio2: Number(last.fio2 ?? 21),
    painScore: Number(last.painScore ?? 0),
    urineMlKgHr: Number(last.urineMlKgHr ?? 2),
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (n: number) => setV((p) => ({ ...p, [k]: n }));
  const useKg = d.baby.unit !== "nicu";

  const submit = async () => {
    setSaving(true);
    await api(`/api/babies/${id}/vitals`, "POST", { ...v, recordedBy: user || "Nurse" });
    if (weight) {
      const grams = useKg ? Math.round(weight * 1000) : Math.round(weight);
      const growth = [...(d.baby.clinical?.growth ?? []), { at: new Date().toISOString(), weight: grams, hc }];
      await patch({
        currentWeight: grams,
        clinical: { growth },
        logEvent: {
          kind: "growth",
          text: `Daily weight ${useKg ? `${weight} kg` : `${grams} g`} recorded${hc ? `, HC ${hc} cm` : ""} during observation round`,
          author: user,
        },
      });
    }
    setSaving(false);
    reload();
  };

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Section
          title="Quick observation round"
          sub="Pre-filled with the last set — tap ± only for what changed, then save."
          right={
            <button onClick={submit} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save observations"}
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stepper label="Heart rate /min" value={v.hr} onChange={set("hr")} min={40} max={240} step={2} />
            <Stepper label="Resp rate /min" value={v.rr} onChange={set("rr")} min={10} max={110} step={2} />
            <Stepper label="SpO₂ pre-ductal %" value={v.spo2} onChange={set("spo2")} min={40} max={100} />
            <Stepper label="SpO₂ post-ductal %" value={v.spo2Post} onChange={set("spo2Post")} min={40} max={100} />
            <Stepper
              label="Temp °F"
              value={tempOut(v.temp, unit) ?? 0}
              onChange={(n) => set("temp")(tempIn(n, unit))}
              min={89.6}
              max={104}
              step={0.2}
              decimals={1}
            />
            <Stepper label="Systolic BP" value={v.sbp} onChange={set("sbp")} min={20} max={120} />
            <Stepper label="Diastolic BP" value={v.dbp} onChange={set("dbp")} min={10} max={90} />
            <Stepper label="MAP mmHg" value={v.map} onChange={set("map")} min={15} max={90} />
            <Stepper label="CRT sec" value={v.crt} onChange={set("crt")} min={1} max={8} />
            <Stepper label="RBS mg/dL" value={v.rbs} onChange={set("rbs")} min={10} max={400} step={5} />
            <Stepper label="FiO₂ %" value={v.fio2} onChange={set("fio2")} min={21} max={100} step={5} />
            <Stepper label="Pain score (NIPS)" value={v.painScore} onChange={set("painScore")} min={0} max={7} />
            <Stepper label="Urine ml/kg/hr" value={v.urineMlKgHr} onChange={set("urineMlKgHr")} min={0} max={8} step={0.1} decimals={1} />
          </div>
          <div className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-2">
            <div className="lbl mb-1.5">Serial monitoring — today&apos;s weight (optional)</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {useKg ? (
                <NumField label="Weight (kg)" value={weight} onChange={setWeight} min={1} max={150} step={0.5} decimals={1} />
              ) : (
                <NumField label="Weight (g)" value={weight} onChange={setWeight} min={300} max={6000} step={5} />
              )}
              {!useKg && <NumField label="Head circumference (cm)" value={hc} onChange={setHc} min={20} max={45} step={0.5} decimals={1} />}
            </div>
          </div>
        </Section>
      </div>
      <Section title="Observation log" sub="Most recent entries">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-slate-900/90 text-slate-400">
              <tr>
                <th className="p-1">Time</th>
                <th>HR</th>
                <th>RR</th>
                <th>SpO₂</th>
                <th>T °F</th>
                <th>MAP</th>
                <th>RBS</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {d.vitals.map((r) => (
                <tr key={String(r.id)} className="border-t border-white/5">
                  <td className="p-1 text-slate-400">{fmtTime(r.recordedAt as string)}</td>
                  <td>{r.hr ?? "—"}</td>
                  <td>{r.rr ?? "—"}</td>
                  <td>{r.spo2 ?? "—"}</td>
                  <td>{tempOut(r.temp as number | null, unit) ?? "—"}</td>
                  <td>{r.map ?? "—"}</td>
                  <td>{r.rbs ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

export function RespTab({
  d,
  patch,
  user,
}: {
  d: Detail;
  patch: (b: Record<string, unknown>) => Promise<void>;
  user: string;
}) {
  const resp = d.baby.clinical?.resp ?? {};
  const [s, setS] = useState({ ...resp, settings: { ...(resp.settings ?? {}) } });
  const setSetting = (k: string) => (n: number) => setS((p) => ({ ...p, settings: { ...p.settings, [k]: n } }));
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section
        title="Respiratory support"
        right={
          <button
            className="btn-primary"
            onClick={() =>
              patch({
                clinical: { resp: s },
                logEvent: { kind: "resp", text: `Respiratory support: ${s.mode} FiO₂ ${s.settings?.fio2 ?? 21}%`, author: user },
              })
            }
          >
            Save support
          </button>
        }
      >
        <div className="lbl mb-1">Mode</div>
        <DialWithOther options={RESP_MODES} value={s.mode} onChange={(v: string) => setS((p) => ({ ...p, mode: v }))} otherPlaceholder="Other mode…" />
        <div className="lbl mt-4 mb-1">Settings</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {RESP_FIELDS.map((f) => (
            <Stepper
              key={f.key}
              label={f.label}
              value={s.settings?.[f.key] ?? f.def}
              onChange={setSetting(f.key)}
              min={f.min}
              max={f.max}
              step={f.step}
              decimals={f.step < 1 ? 2 : 0}
            />
          ))}
        </div>
        <div className="lbl mt-4 mb-1">Surfactant</div>
        <DialWithOther options={SURFACTANT} value={s.surfactant} onChange={(v: string) => setS((p) => ({ ...p, surfactant: v }))} otherPlaceholder="Other surfactant route…" />
        <div className="lbl mt-4 mb-1">SpO₂ target</div>
        <ChipGroup
          options={["88–92%", "90–95%", "91–95%", "92–97%", "95–100%"]}
          value={s.spo2Target}
          onChange={(v: string) => setS((p) => ({ ...p, spo2Target: v }))}
        />
      </Section>
      <Section title="Respiratory reference (NNF / AAP)">
        <ul className="space-y-2 text-xs text-slate-300">
          <li>• CPAP failure: FiO₂ &gt; 0.40 with PEEP 6–7, pH &lt; 7.20 with pCO₂ &gt; 60 → intubate + surfactant.</li>
          <li>• Target SpO₂ 90–95% for preterm on oxygen (AAP/NNF).</li>
          <li>• Caffeine citrate for all &lt; 32 wk / &lt; 1250 g.</li>
        </ul>
      </Section>
    </div>
  );
}

export function FluidsTab({ d, patch }: { d: Detail; patch: (b: Record<string, unknown>) => Promise<void> }) {
  const f = d.baby.clinical?.fluids ?? {};
  const [s, setS] = useState({ ...f });
  const wt = d.baby.currentWeight / 1000;
  const set = (k: string) => (n: number) => setS((p) => ({ ...p, [k]: n }));
  return (
    <Section
      title="Fluids, TPN & nutrition"
      right={<button className="btn-primary" onClick={() => patch({ clinical: { fluids: s } })}>Save</button>}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stepper label="Total fluids ml/kg/d" value={s.totalMlKgDay ?? 80} onChange={set("totalMlKgDay")} min={40} max={220} step={10} />
        <Stepper label="Enteral ml/kg/d" value={s.enteralMlKgDay ?? 0} onChange={set("enteralMlKgDay")} min={0} max={220} step={10} />
        <Stepper label="IV ml/kg/d" value={s.ivMlKgDay ?? 0} onChange={set("ivMlKgDay")} min={0} max={220} step={10} />
        <Stepper label="GIR mg/kg/min" value={s.gir ?? 6} onChange={set("gir")} min={0} max={14} step={0.5} decimals={1} />
        <Stepper label="Amino acid g/kg/d" value={s.aminoAcid ?? 0} onChange={set("aminoAcid")} min={0} max={4} step={0.5} decimals={1} />
        <Stepper label="Lipid g/kg/d" value={s.lipid ?? 0} onChange={set("lipid")} min={0} max={4} step={0.5} decimals={1} />
        <Stepper label="Energy kcal/kg/d" value={s.kcal ?? 0} onChange={set("kcal")} min={0} max={160} step={5} />
        <Stepper label="Feed volume / feed (ml)" value={s.feedVol ?? 0} onChange={set("feedVol")} min={0} max={80} />
      </div>
      <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-2 text-xs text-cyan-200">
        Total ≈ {Math.round((s.totalMlKgDay ?? 0) * wt)} ml/day · Auto energy {calcNutrition({ fluids: s }).totalKcal} kcal/kg/day
      </div>
      <div className="lbl mt-4 mb-1">Feed type</div>
      <DialWithOther options={FEED_TYPE} value={s.feedType} onChange={(v: string) => setS((p) => ({ ...p, feedType: v }))} otherPlaceholder="Other feed type…" />
      <div className="lbl mt-4 mb-1">Route</div>
      <DialWithOther options={FEED_ROUTE} value={s.feedRoute} onChange={(v: string) => setS((p) => ({ ...p, feedRoute: v }))} otherPlaceholder="Other route…" />
      <div className="lbl mt-4 mb-1">Frequency</div>
      <DialWithOther
        options={["1 hourly", "2 hourly", "3 hourly", "4 hourly", "continuous", "2–3 hourly on demand"]}
        value={s.feedFreq}
        onChange={(v: string) => setS((p) => ({ ...p, feedFreq: v }))}
        otherPlaceholder="Other frequency…"
      />
    </Section>
  );
}

export function GrowthTab({
  d,
  patch,
  user,
}: {
  d: Detail;
  patch: (b: Record<string, unknown>) => Promise<void>;
  user: string;
  reload: () => void;
}) {
  const b = d.baby;
  const entries = useMemo(
    () => [...(b.clinical?.growth ?? [])].sort((x, y) => +new Date(x.at) - +new Date(y.at)),
    [b.clinical?.growth],
  );
  const [bw, setBw] = useState(b.birthWeight);
  const [cw, setCw] = useState(b.currentWeight);
  const [w, setW] = useState<number | undefined>(undefined);
  return (
    <Section
      title="Birth weight & current weight"
      right={
        <button
          className="btn-primary"
          onClick={() =>
            patch({
              birthWeight: bw,
              currentWeight: cw,
              logEvent: { kind: "growth", text: `Weights updated — birth ${bw} g, current ${cw} g`, author: user },
            })
          }
        >
          Save weights
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <NumField label="Birth weight (g)" value={bw} onChange={setBw} min={300} max={6000} step={10} />
        <NumField label="Current weight (g)" value={cw} onChange={setCw} min={300} max={6000} step={10} />
        <NumField label="Add serial weight (g)" value={w} onChange={setW} min={300} max={6000} step={5} />
        <button
          className="btn-ghost self-end"
          disabled={!w}
          onClick={() => {
            if (!w) return;
            patch({
              currentWeight: w,
              clinical: { growth: [...entries, { at: new Date().toISOString(), weight: w }] },
              logEvent: { kind: "growth", text: `Serial weight ${w} g`, author: user },
            });
            setW(undefined);
          }}
        >
          Add weigh
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Change from birth: {pctOfBirth(bw, cw) ?? 0}% · {entries.length} serial entries. Use Daily progress for the full calculator.
      </p>
    </Section>
  );
}

export function ProblemsTab({ d, id, reload, user }: { d: Detail; id: string; reload: () => void; user: string }) {
  const [sys, setSys] = useState<SystemKey>("Respiratory");
  const [q, setQ] = useState("");
  const [customName, setCustomName] = useState("");
  const active = d.problems.filter((p) => p.status !== "resolved");
  const existingFor = (label: string) => d.problems.find((p) => p.label.toLowerCase() === label.toLowerCase());
  const include = async (system: string, label: string) => {
    const existing = existingFor(label);
    if (existing?.status === "resolved") {
      await api(`/api/babies/${id}/problems`, "PATCH", { id: existing.id, status: "active", author: user });
    } else if (!existing) {
      await api(`/api/babies/${id}/problems`, "POST", { system, label, author: user });
    }
    reload();
  };
  const setStatus = async (p: Detail["problems"][number], status: "active" | "watch" | "resolved") => {
    await api(`/api/babies/${id}/problems`, "PATCH", { id: p.id, status, author: user });
    reload();
  };
  const remove = async (p: Detail["problems"][number]) => {
    if (!window.confirm(`Remove “${p.label}” from this baby’s problem record?`)) return;
    await api(`/api/babies/${id}/problems?rowId=${p.id}`, "DELETE");
    reload();
  };
  const results = useMemo(() => {
    if (!q.trim()) return null;
    const out: { system: string; label: string }[] = [];
    for (const s of SYSTEMS)
      for (const l of PROBLEM_CATALOG[s]) if (l.toLowerCase().includes(q.toLowerCase())) out.push({ system: s, label: l });
    return out.slice(0, 40);
  }, [q]);
  const options = results ?? PROBLEM_CATALOG[sys].map((label) => ({ system: sys, label }));
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <Section title="Include a diagnosis / problem" right={<input className="inp w-56 text-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}>
          {!results && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {SYSTEMS.map((s) => (
                <Chip key={s} label={s} on={sys === s} onClick={() => setSys(s)} />
              ))}
            </div>
          )}
          <div className="grid max-h-[360px] gap-1.5 overflow-auto sm:grid-cols-2">
            {options.map((option) => {
              const existing = existingFor(option.label);
              const isIncluded = existing?.status === "active" || existing?.status === "watch";
              return (
                <div key={option.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-2">
                  <span className="min-w-0 flex-1 text-xs text-slate-200">{option.label}</span>
                  {isIncluded ? (
                    <span className="text-[10px] font-bold text-emerald-300">✓ Included</span>
                  ) : (
                    <button className="btn-primary !px-2 !py-1 text-[10px]" onClick={() => include(option.system, option.label)}>
                      {existing?.status === "resolved" ? "Re-open" : "+ Include"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
        <Section title="Add a custom diagnosis">
          <div className="flex gap-2">
            <input className="inp" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Type new diagnosis" />
            <button
              className="btn-primary"
              disabled={!customName.trim()}
              onClick={async () => {
                await include(sys, customName.trim());
                setCustomName("");
              }}
            >
              + Include
            </button>
          </div>
        </Section>
      </div>
      <Section title="Baby’s problem record" sub={`${active.length} active`}>
        <div className="space-y-2">
          {d.problems.map((p) => (
            <div key={p.id} className={`rounded-xl border p-2 ${p.status === "resolved" ? "border-emerald-400/30 bg-emerald-400/10" : p.status === "watch" ? "border-amber-400/30 bg-amber-400/10" : "border-rose-400/30 bg-rose-400/10"}`}>
              <div className="text-xs font-bold text-white">{p.label}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.status !== "resolved" && (
                  <button className="btn-ghost !px-2 !py-1 text-[10px]" onClick={() => setStatus(p, "resolved")}>
                    ✓ Mark resolved
                  </button>
                )}
                {p.status === "resolved" && (
                  <button className="btn-ghost !px-2 !py-1 text-[10px]" onClick={() => setStatus(p, "active")}>
                    Re-open
                  </button>
                )}
                <button className="btn-ghost !px-2 !py-1 text-[10px] text-rose-300" onClick={() => remove(p)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function DrugsTab({ d, patch }: { d: Detail; patch: (b: Record<string, unknown>) => Promise<void> }) {
  const c = d.baby.clinical ?? {};
  const [drugs, setDrugs] = useState(c.drugs ?? []);
  const [lines, setLines] = useState(c.lines ?? []);
  const [group, setGroup] = useState(Object.keys(DRUGS)[0]);
  const [otherDrug, setOtherDrug] = useState("");
  const [otherDose, setOtherDose] = useState("");
  const toggleDrug = (name: string) =>
    setDrugs((p) => (p.some((x) => x.name === name) ? p.filter((x) => x.name !== name) : [...p, { name, day: 1, ofDays: /cillin|cef|myc|penem|zolid|istin|azole|comycin|Amikacin|Gentamicin/i.test(name) ? 7 : undefined }]));
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section title="Medications" right={<button className="btn-primary" onClick={() => patch({ clinical: { drugs, lines } })}>Save</button>}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Object.keys(DRUGS).map((g) => (
            <Chip key={g} label={g} on={group === g} onClick={() => setGroup(g)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(DRUGS[group] ?? []).map((n) => (
            <Chip key={n} label={n} tone="amber" on={drugs.some((x) => x.name === n)} onClick={() => toggleDrug(n)} />
          ))}
        </div>
        <div className="mt-2">
          <DialWithOther
            options={[]}
            value={drugs.map((x) => x.name)}
            onChange={(v: string[]) => {
              const names = v as string[];
              setDrugs((p) => {
                const existing = new Set(p.map((x) => x.name));
                const added = names.filter((n) => !existing.has(n)).map((name) => ({ name, day: 1, ofDays: /cillin|cef|myc|penem|zolid|istin|azole|comycin|Amikacin|Gentamicin/i.test(name) ? 7 : undefined }));
                const kept = p.filter((x) => names.includes(x.name));
                return [...kept, ...added];
              });
            }}
            multi
            tone="amber"
            otherPlaceholder="Add custom medication…"
          />
        </div>
        <div className="mt-4 rounded-xl border border-violet-400/35 bg-violet-400/10 p-3">
          <div className="text-xs font-black text-violet-200">Other / custom drug</div>
          <div className="mt-2 flex gap-2">
            <input className="inp" value={otherDrug} onChange={(e) => setOtherDrug(e.target.value)} placeholder="Drug name" />
            <input className="inp" value={otherDose} onChange={(e) => setOtherDose(e.target.value)} placeholder="Dose / route" />
            <button
              className="btn-primary"
              disabled={!otherDrug.trim()}
              onClick={() => {
                setDrugs((p) => [...p, { name: otherDrug.trim(), dose: otherDose.trim() || undefined }]);
                setOtherDrug("");
                setOtherDose("");
              }}
            >
              + Add
            </button>
          </div>
        </div>
        <div className="lbl mt-4 mb-1">Running medications</div>
        <div className="space-y-1.5">
          {drugs.map((x, i) => (
            <div key={x.name} className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-2 text-xs">
              <span className="flex-1 text-slate-100">{x.name}{x.dose ? ` · ${x.dose}` : ""}</span>
              {x.ofDays !== undefined && <span className="text-amber-200">D{x.day ?? 1}/{x.ofDays}</span>}
              <button className="text-rose-300" onClick={() => setDrugs((p) => p.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Lines, tubes & devices" right={<button className="btn-primary" onClick={() => patch({ clinical: { drugs, lines } })}>Save</button>}>
        <div className="flex flex-wrap gap-1.5">
          {LINES.map((n) => (
            <Chip key={n} label={n} tone="emerald" on={lines.some((x) => x.name === n)} onClick={() => setLines((p) => (p.some((x) => x.name === n) ? p.filter((x) => x.name !== n) : [...p, { name: n, day: 1 }]))} />
          ))}
        </div>
        <div className="mt-2">
          <DialWithOther
            options={[]}
            value={lines.map((x) => x.name)}
            onChange={(v: string[]) => {
              const names = v as string[];
              setLines((p) => {
                const existing = new Set(p.map((x) => x.name));
                const added = names.filter((n) => !existing.has(n)).map((name) => ({ name, day: 1 }));
                const kept = p.filter((x) => names.includes(x.name));
                return [...kept, ...added];
              });
            }}
            multi
            tone="emerald"
            otherPlaceholder="Add custom line / device…"
          />
        </div>
      </Section>
    </div>
  );
}

export function LabsTab({ d, patch }: { d: Detail; patch: (b: Record<string, unknown>) => Promise<void> }) {
  const [labs, setLabs] = useState<Record<string, string>>(d.baby.clinical?.labs ?? {});
  return (
    <Section title="Investigations" right={<button className="btn-primary" onClick={() => patch({ clinical: { labs } })}>Save labs</button>}>
      <div className="space-y-4">
        {LAB_PANELS.map((p) => (
          <div key={p.key}>
            <div className="lbl mb-1">{p.label}</div>
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
              {p.fields.map((f) => (
                <label key={f} className="rounded-lg border border-white/10 bg-slate-900/50 px-2 py-1">
                  <span className="block text-[9px] uppercase tracking-wide text-slate-400">{f}</span>
                  <input className="w-full bg-transparent text-sm text-white outline-none" value={labs[f] ?? ""} onChange={(e) => setLabs((s) => ({ ...s, [f]: e.target.value }))} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function CareTab({ d, patch }: { d: Detail; patch: (b: Record<string, unknown>) => Promise<void> }) {
  const c = d.baby.clinical ?? {};
  const [care, setCare] = useState<string[]>(c.care ?? []);
  const [disch, setDisch] = useState<string[]>(c.discharge ?? []);
  const [plan, setPlan] = useState(c.plan ?? "");
  const [family, setFamily] = useState(c.familyNote ?? "");
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section title="Nursing & developmental care bundle" right={<button className="btn-primary" onClick={() => patch({ clinical: { care, discharge: disch, plan, familyNote: family } })}>Save</button>}>
        <DialWithOther options={CARE_BUNDLE} value={care} onChange={(v: string[]) => setCare(v)} multi tone="emerald" otherPlaceholder="Add other care item…" />
        <div className="lbl mt-4 mb-1">Plan for next 12 hours</div>
        <textarea className="inp h-24" value={plan} onChange={(e) => setPlan(e.target.value)} />
        <div className="lbl mt-3 mb-1">Family / counselling note</div>
        <textarea className="inp h-20" value={family} onChange={(e) => setFamily(e.target.value)} />
      </Section>
      <Section title="Discharge readiness" sub={`${disch.length}/${DISCHARGE_CRITERIA.length} criteria met`}>
        <DialWithOther options={DISCHARGE_CRITERIA} value={disch} onChange={(v: string[]) => setDisch(v)} multi tone="cyan" otherPlaceholder="Add custom discharge criterion…" />
      </Section>
    </div>
  );
}

export function CourseTab({
  d,
  user,
  patch,
}: {
  d: Detail;
  id: string;
  reload: () => void;
  user: string;
  patch: (b: Record<string, unknown>) => Promise<void>;
}) {
  const b = d.baby;
  const c = b.clinical ?? {};
  const [discharging, setDischarging] = useState(false);
  const dischargeEvent = d.events.find((e) => e.kind === "discharge");
  const isDischarged = b.status === "discharged";
  const dischargeDate = dischargeEvent ? dischargeEvent.at : new Date().toISOString();
  const losDays = Math.max(1, Math.round((+new Date(dischargeDate) - +new Date(b.dob)) / 86400000));
  const growth = [...(c.growth ?? [])].sort((a, z) => +new Date(a.at) - +new Date(z.at));
  const lastWeight = growth.at(-1)?.weight ?? b.currentWeight;
  const lastVital = d.vitals[0] ?? {};
  const n = calcNutrition(c);
  const course = [
    ...d.problems.map((p) => ({ at: p.onsetAt, text: `${p.label} — ${p.status}`, author: "Clinical record" })),
    ...d.events.map((e) => ({ at: e.at, text: e.text, author: e.author })),
  ].sort((a, z) => +new Date(a.at) - +new Date(z.at));

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap gap-2">
        {!isDischarged ? (
          <button
            className="btn-primary"
            disabled={discharging}
            onClick={async () => {
              setDischarging(true);
              await patch({
                status: "discharged",
                acuity: "ready",
                logEvent: { kind: "discharge", text: `Discharged from NICU — summary by ${user}`, author: user },
              });
              setDischarging(false);
            }}
          >
            🏥 Discharge baby — finalise summary
          </button>
        ) : (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
            ✓ Discharged
          </span>
        )}
        <button className="btn-ghost" onClick={() => window.print()}>🖨️ Print / save as PDF</button>
      </div>
      <div className="print-black rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="border-b-2 border-slate-300 pb-3 text-center">
          <h2 className="text-lg font-black text-slate-900">Sri Ramakrishna Hospital</h2>
          <p className="text-[11px] font-semibold text-slate-600">Department of Pediatrics</p>
          <p className="text-[10px] font-semibold text-slate-600">Realtime Monitoring and Clinical Handover Suite</p>
          <p className="text-[11px] font-semibold text-slate-600">Neonatal Discharge Summary · {losDays} days in unit</p>
        </div>
        <p className="mt-3 text-xs text-slate-700">
          {b.babyName} ({b.uhid}), {b.sex}, {b.gestWeeks}+{b.gestDays} wk, BW {b.birthWeight} g → {lastWeight} g.
          Consultant {b.consultant || "—"}. Energy {n.totalKcal} kcal/kg/day · protein {n.totalProtein} g/kg/day.
          Last temp {tempOut(lastVital.temp as number | null, "F") ?? "—"} °F.
        </p>
        <h3 className="lbl mt-4 mb-1">Diagnoses</h3>
        <ul className="text-xs text-slate-700">
          {d.problems.map((p) => (
            <li key={p.id}>• {p.label} — {p.status}</li>
          ))}
        </ul>
        <h3 className="lbl mt-4 mb-1">Hospital course (day/night)</h3>
        <ol className="max-h-64 space-y-1 overflow-auto text-xs text-slate-700">
          {course.map((e, i) => (
            <li key={i}>
              Day {Math.max(0, Math.floor((+new Date(e.at) - +new Date(b.dob)) / 86400000))} · {fmtTime(e.at)} · {shiftTag(e.at)} · {e.text} — {e.author}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-[9px] text-slate-400">Electronically generated · Dr. Suseender Durairaj</p>
      </div>
    </div>
  );
}

export function HandoverTab({ d, id, reload, user }: { d: Detail; id: string; reload: () => void; user: string }) {
  const b = d.baby;
  const c = b.clinical ?? {};
  const v = d.vitals[0] ?? {};
  const autoSummary = useMemo(
    () =>
      [
        `Primary consultant: ${b.consultant || "not assigned"}.`,
        `${b.gestWeeks}+${b.gestDays} wk ${b.sex}, BW ${b.birthWeight} g, DOL, wt ${b.currentWeight} g.`,
        `Support: ${c.resp?.mode ?? "room air"} FiO₂ ${c.resp?.settings?.fio2 ?? 21}%.`,
        `Last vitals: HR ${v.hr ?? "—"}, T ${tempOut(v.temp as number | null, "F") ?? "—"} °F.`,
      ].join(" "),
    [b, c, v],
  );
  const [shift, setShift] = useState(SHIFTS[0]);
  const [toStaff, setToStaff] = useState("");
  const [illness, setIllness] = useState(b.acuity);
  const [summary, setSummary] = useState(autoSummary);
  const [actions, setActions] = useState<string[]>(d.tasks.filter((t) => !t.done).map((t) => t.text));
  const [cont, setCont] = useState<string[]>([]);
  const [synthesis, setSynthesis] = useState("Read-back completed at bedside with nurse in charge.");
  const [saving, setSaving] = useState(false);
  useEffect(() => setSummary(autoSummary), [autoSummary]);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <Section
          title="I-PASS handover composer"
          right={
            <button
              className="btn-primary"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await api(`/api/babies/${id}/handovers`, "POST", {
                  shift,
                  fromStaff: user || "Staff",
                  toStaff,
                  illness,
                  summary,
                  actions,
                  contingency: cont,
                  synthesis,
                  snapshot: { clinical: c, vitals: v, problems: d.problems },
                });
                setSaving(false);
                reload();
              }}
            >
              Sign & send handover
            </button>
          }
        >
          <div className="lbl mb-1">Shift</div>
          <ChipGroup options={SHIFTS} value={shift} onChange={(v2: string) => setShift(v2 || SHIFTS[0])} />
          <div className="lbl mt-3 mb-1">Illness severity</div>
          <ChipGroup options={ILLNESS} value={illness} onChange={(v2: string) => setIllness(v2 || "stable")} tone="rose" />
          <div className="lbl mt-3 mb-1">To</div>
          <input className="inp" value={toStaff} onChange={(e) => setToStaff(e.target.value)} placeholder="Receiving doctor / nurse" />
          <div className="lbl mt-3 mb-1">Patient summary</div>
          <textarea className="inp h-28" value={summary} onChange={(e) => setSummary(e.target.value)} />
          <div className="lbl mt-3 mb-1">Synthesis</div>
          <input className="inp" value={synthesis} onChange={(e) => setSynthesis(e.target.value)} />
        </Section>
        <Section title="Action list">
          <DialWithOther options={ACTION_PRESETS} value={actions} onChange={(v2: string[]) => setActions(v2)} multi tone="emerald" otherPlaceholder="Add custom action…" />
        </Section>
        <Section title="Contingency">
          <DialWithOther options={CONTINGENCY_PRESETS} value={cont} onChange={(v2: string[]) => setCont(v2)} multi tone="amber" otherPlaceholder="Add custom if–then…" />
        </Section>
      </div>
      <Section title="Handover history">
        {d.handovers.map((h) => (
          <div key={h.id} className="mb-2 rounded-xl border border-white/10 bg-slate-900/40 p-2 text-xs">
            <div className="text-[10px] text-slate-400">{h.shift} · {h.fromStaff} → {h.toStaff || "—"} · {fmtTime(h.createdAt)}</div>
            <p className="mt-1 text-slate-200">{h.summary}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}

const QUICK_EVENTS = [
  "Desaturation episode – recovered with stimulation",
  "Apnoea – bag & mask given",
  "Bradycardia < 100 – self-resolved",
  "Seizure episode witnessed",
  "Consultant informed",
  "Parents updated",
  "KMC done 1 hour",
  "Weight recorded",
];

export function TimelineTab({ d, id, reload, user }: { d: Detail; id: string; reload: () => void; user: string }) {
  const [note, setNote] = useState("");
  const push = async (text: string, kind = "note") => {
    if (!text.trim()) return;
    await api(`/api/babies/${id}/events`, "POST", { text, kind, author: user || "Team" });
    setNote("");
    reload();
  };
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section title="Log an event">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EVENTS.map((e) => (
            <Chip key={e} label={e} onClick={() => push(e, "event")} />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="inp" placeholder="Free-text note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary" onClick={() => push(note)}>Add</button>
        </div>
      </Section>
      <Section title="Chronological record">
        <ol className="relative space-y-3 border-l border-white/10 pl-4">
          {d.events.map((e) => {
            const dol = Math.max(0, Math.floor((+new Date(e.at) - +new Date(d.baby.dob)) / 86400000));
            return (
              <li key={e.id} className="text-xs">
                <span className="absolute -left-[5px] mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                <div className="text-[10px] text-slate-500">
                  Day {dol} · {fmtTime(e.at)} · {shiftTag(e.at)} shift · {e.author}
                </div>
                <div className="text-slate-200">{e.text}</div>
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}
