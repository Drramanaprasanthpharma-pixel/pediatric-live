"use client";

import { useMemo, useState } from "react";
import { Calculator, Search, Sparkles } from "lucide-react";
import { TopBar } from "@/components/ui";
import { UnitSwitcher } from "@/components/unit-ui";
import { scalesForUnit } from "@/lib/scales";
import type { UnitKey } from "@/lib/units";
import { unitOf } from "@/lib/units";

type AnswerMap = Record<string, number | string>;

function totalFor(scale: { key: string; items: { key: string }[] }, answers: AnswerMap): number {
  return scale.items.reduce((sum, item) => {
    const v = answers[`${scale.key}:${item.key}`];
    return typeof v === "number" ? sum + v : sum;
  }, 0);
}

function ScaleCard({ scale }: { scale: import("@/lib/scales").ScaleDef }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const total = totalFor(scale, answers);
  const result = scale.interpret(total, answers);
  const bandColor =
    result.band === "crit" ? "border-rose-400/50 bg-rose-500/15 text-rose-200"
    : result.band === "warn" ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
    : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  const answered = scale.items.filter((it) => answers[`${scale.key}:${it.key}`] !== undefined && answers[`${scale.key}:${it.key}`] !== "").length;

  return (
    <div className="card p-4">
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 text-left">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"><Calculator size={15} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-black text-white">{scale.name}</span>
          <span className="block text-[10px] uppercase tracking-wide text-slate-400">{scale.category} · {scale.items.length} items{answered > 0 && ` · ${answered} answered`}</span>
        </span>
        <span className="shrink-0 text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {scale.note && <p className="text-[10px] text-slate-400">{scale.note}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {scale.items.map(item => {
              const key = `${scale.key}:${item.key}`;
              if (item.kind === "number") return (
                <label key={item.key} className="rounded-lg border border-white/10 bg-slate-900/40 p-2">
                  <span className="lbl mb-1 block">{item.label} {item.unit && `(${item.unit})`}</span>
                  <input type="number" className="inp !py-1 text-center text-sm font-bold" value={answers[key] ?? ""} onChange={e => setAnswers(p => ({ ...p, [key]: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder="—" />
                </label>
              );
              return (
                <label key={item.key} className="rounded-lg border border-white/10 bg-slate-900/40 p-2">
                  <span className="lbl mb-1 block">{item.label}</span>
                  <select className="inp !py-1 text-xs" value={answers[key] ?? ""} onChange={e => setAnswers(p => ({ ...p, [key]: Number(e.target.value) }))}>
                    <option value="">— select —</option>
                    {(item.options ?? []).map(o => <option key={o.text} value={o.v}>({o.v}) {o.text}</option>)}
                  </select>
                </label>
              );
            })}
          </div>
          {answered > 0 && (
            <div className={`rounded-xl border px-3 py-2 text-[12px] font-bold ${bandColor}`}>
              <Sparkles size={13} className="mr-1.5 inline-block align-middle" />
              {result.label}
              <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-black">score {total}</span>
              <p className="mt-1 text-[10px] font-normal text-slate-400">{result.advice}</p>
            </div>
          )}
          <button type="button" className="btn-ghost !py-1 text-[10px]" onClick={() => setAnswers({})}>Reset</button>
        </div>
      )}
    </div>
  );
}

export default function CalculatorsPage() {
  const [unit, setUnit] = useState<UnitKey>("nicu");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const u = unitOf(unit);
  const scales = useMemo(() => scalesForUnit(unit), [unit]);
  const cats = useMemo(() => ["all", ...Array.from(new Set(scales.map(s => s.category))).sort()], [scales]);
  const shown = scales.filter(s => {
    if (cat !== "all" && s.category !== cat) return false;
    if (!q.trim()) return true;
    return s.name.toLowerCase().includes(q.trim().toLowerCase());
  });

  return (
    <main className="min-h-screen pb-20">
      <TopBar />
      <div className="mx-auto max-w-[1400px] px-4 py-5">
        <div className="card mb-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300"><Calculator size={20} /></span>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black tracking-tight text-white">Calculators &amp; Clinical Scales</h1>
              <p className="text-[11px] text-slate-400">{u.short} · {scales.length} scales with auto-calculation and provisional interpretation</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="lbl">Unit</span>
              <UnitSwitcher active={unit} onChange={x => x !== "all" && setUnit(x)} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <div className="relative">
              <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="inp !py-1.5 !pl-7 !pr-2 text-xs" placeholder="Search scales…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <button className={`chip ${cat === "all" ? "chip-on" : "chip-off"}`} onClick={() => setCat("all")}>All</button>
            {cats.filter(c => c !== "all").map(c => <button key={c} className={`chip ${cat === c ? "chip-on" : "chip-off"}`} onClick={() => setCat(c)}>{c}</button>)}
          </div>
        </div>
        <div className="space-y-3">
          {shown.length === 0 && <p className="card p-8 text-center text-sm text-slate-400">No scales match.</p>}
          {shown.map(s => <ScaleCard key={s.key} scale={s} />)}
        </div>
      </div>
    </main>
  );
}
