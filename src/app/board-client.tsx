"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackupVault, DeleteConfirmModal, type DeletableBaby } from "@/components/backup-ui";
import { OnCallCard } from "@/components/oncall";
import { TopBar, usePoll, api, useTempUnit } from "@/components/ui";
import { UnitBadge, UnitSwitcher } from "@/components/unit-ui";
import { ACUITY_META } from "@/lib/catalog";
import type { Clinical } from "@/lib/clinical";
import { correctedGA, dayOfLife, relTime, tempOut, vitalFlag, weightChangePct } from "@/lib/clinical";
import { UNITS, UNIT_LIST, type UnitKey, unitOf } from "@/lib/units";

type BoardBaby = {
  id: number;
  uhid: string;
  babyName: string;
  motherName: string;
  bed: string;
  unit: string;
  subspecialty: string;
  insurance: string;
  insuranceName: string;
  sex: string;
  dob: string;
  gestWeeks: number;
  gestDays: number;
  birthWeight: number;
  currentWeight: number;
  acuity: string;
  status: string;
  isolation: string;
  consultant: string;
  clinical: Clinical;
  updatedAt: string;
  problems: { id: number; label: string; system: string; status: string }[];
  openTasks: { id: number; text: string; priority: string }[];
  lastVital: Record<string, number | string | null> | null;
  lastHandover: { shift: string; fromStaff: string; createdAt: string; acknowledgedBy: string } | null;
};

export default function BoardClient() {
  const [unit, setUnit] = useState<UnitKey>("nicu");
  const { data, reload } = usePoll<{ babies: BoardBaby[] }>(`/api/board?unit=${unit}`, 4000);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<DeletableBaby | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("neo_unit") as UnitKey | null;
    if (saved && saved in UNITS) setUnit(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("neo_unit", unit);
    setFilter("all");
    setQ("");
  }, [unit]);

  const babies = useMemo(() => (data?.babies ?? []).filter((b) => b.status === "active"), [data]);
  const deleted = useMemo(() => (data?.babies ?? []).filter((b) => b.status === "deleted"), [data]);

  const shown = babies.filter((b) => {
    const text = `${b.babyName} ${b.uhid} ${b.bed} ${b.motherName}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (filter === "all") return true;
    if (filter === "ventilated")
      return /SIMV|AC \/|HFOV|HFJV|Volume|NIPPV|CPAP|BiPAP|ventilat/i.test(b.clinical?.resp?.mode ?? "");
    if (filter === "on antibiotics") return (b.clinical?.drugs ?? []).some((d) => d.ofDays);
    return b.acuity === filter;
  });

  const counts = {
    total: babies.length,
    critical: babies.filter((b) => b.acuity === "critical").length,
    vent: babies.filter((b) => /SIMV|AC \/|HFOV|HFJV|Volume|NIPPV|ventilat/i.test(b.clinical?.resp?.mode ?? "")).length,
    cpap: babies.filter((b) => /CPAP|HFNC|BiPAP|oxygen|nasal/i.test(b.clinical?.resp?.mode ?? "")).length,
    tasks: babies.reduce((n, b) => n + b.openTasks.length, 0),
  };
  const u = unitOf(unit);
  const admitLabel =
    unit === "postnatal" ? "+ Admit mother & baby" : unit === "paeds" ? "+ Admit child" : "+ Admit patient";

  return (
    <main className="min-h-screen pb-20">
      <TopBar live onRefresh={reload} unit={unit} onUnitChange={(x) => setUnit(x as UnitKey)} />
      <div className="mx-auto max-w-[1600px] px-4 py-5">
        {/* Hero */}
        <section className="card mb-4 overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 px-5 py-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 p-1.5 shadow-lg">
              {u.key === "picu" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/images/picu-icon.png" alt="PICU" className="h-full w-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/images/hospital-logo.svg" alt="" className="h-full w-full object-contain" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300/90">
                Department of Pediatrics
              </p>
              <p className="text-[9px] font-semibold text-slate-400">
                Realtime Monitoring and Clinical Handover Suite
              </p>
              <h1 className="truncate text-lg font-black tracking-tight text-white">{u.name}</h1>
              <p className="text-[11px] text-slate-400">
                {u.short} · {counts.total} patient{counts.total === 1 ? "" : "s"} · {counts.tasks} open action
                {counts.tasks === 1 ? "" : "s"} · realtime cloud sync
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Link href="/consultants" className="btn-ghost">
                👨‍⚕️ By consultant
              </Link>
              <Link href={`/handover?unit=${unit}`} className="btn-ghost">
                🖨️ Print {u.short} sheet
              </Link>
              <Link href={`/admit?unit=${unit}`} className="btn-primary">
                {admitLabel}
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-5 py-3">
            <span className="lbl">Switch unit</span>
            <UnitSwitcher active={unit} onChange={setUnit} />
          </div>
        </section>

        <div className="mb-4">
          <OnCallCard />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Patients" value={counts.total} icon="🛏️" />
          <Stat label="Critical" value={counts.critical} icon="🚨" tone="text-rose-300" />
          <Stat label="Ventilated" value={counts.vent} icon="🫁" tone="text-amber-300" />
          <Stat label="NIV / O₂" value={counts.cpap} icon="💨" tone="text-cyan-300" />
          <Stat label="Open actions" value={counts.tasks} icon="✅" tone="text-emerald-300" />
        </div>

        <div className="no-print mb-4 flex flex-wrap items-center gap-2">
          {["all", "critical", "guarded", "stable", "ready", "ventilated", "on antibiotics"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip ${filter === f ? "chip-on" : "chip-off"} capitalize`}
            >
              {f}
            </button>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bed / UHID / name"
            className="inp ml-auto max-w-xs"
          />
        </div>

        {babies.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-slate-300">
              No patients in {u.short} yet.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href={`/admit?unit=${unit}`} className="btn-primary">
                {admitLabel}
              </Link>
              {unit === "nicu" && (
                <button
                  onClick={async () => {
                    await api("/api/seed", "POST");
                    reload();
                  }}
                  className="btn-ghost"
                >
                  Load demo unit (5 babies)
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map((b) => (
            <BabyCard
              key={b.id}
              b={b}
              onDelete={() =>
                setPending({ id: b.id, babyName: b.babyName, uhid: b.uhid, bed: b.bed, motherName: b.motherName })
              }
            />
          ))}
        </div>

        {deleted.length > 0 && (
          <section className="card mt-5 p-4">
            <h3 className="text-sm font-black text-amber-200">Recently deleted</h3>
            <p className="mb-3 text-[11px] text-slate-400">
              Hidden from the live board. Restore brings them back. A local backup is always kept.
            </p>
            <div className="space-y-1.5">
              {deleted.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs"
                >
                  <span className="font-bold text-white">{b.babyName}</span>
                  <span className="text-slate-400">
                    {b.uhid} · {b.bed}
                  </span>
                  <button
                    className="btn-primary ml-auto !py-1 text-[11px]"
                    onClick={async () => {
                      await api("/api/babies/restore", "POST", {
                        mode: "reactivate",
                        snapshot: { baby: { id: b.id } },
                        author: localStorage.getItem("neo_user") || "Team",
                      });
                      reload();
                    }}
                  >
                    Restore
                  </button>
                  <button
                    className="btn-ghost !py-1 text-[11px] text-rose-300"
                    onClick={async () => {
                      if (!window.confirm(`Permanently erase ${b.babyName}? A local backup is still kept.`)) return;
                      await api(`/api/babies/${b.id}?permanent=1`, "DELETE");
                      reload();
                    }}
                  >
                    Erase forever
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <BackupVault onRestored={reload} />
      </div>

      {pending && (
        <DeleteConfirmModal
          baby={pending}
          onCancel={() => setPending(null)}
          onConfirm={async () => {
            const target = pending;
            setPending(null);
            await api(`/api/babies/${target.id}`, "DELETE");
            window.dispatchEvent(new CustomEvent("neo:deleted", { detail: { id: target.id, name: target.babyName } }));
            reload();
          }}
        />
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone = "text-white",
  icon,
}: {
  label: string;
  value: number;
  tone?: string;
  icon?: string;
}) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3.5">
      {icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-base">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="lbl truncate">{label}</div>
        <div className={`text-2xl font-black tabular-nums leading-none ${tone}`}>{value}</div>
      </div>
    </div>
  );
}

function BabyCard({ b, onDelete }: { b: BoardBaby; onDelete: () => void }) {
  const meta = ACUITY_META[b.acuity] ?? ACUITY_META.stable;
  const { unit } = useTempUnit();
  const v = b.lastVital;
  const wt = weightChangePct(b.birthWeight, b.currentWeight);
  const abx = (b.clinical?.drugs ?? []).filter((d) => d.ofDays);
  const isNeo = b.unit === "nicu" || b.unit === "postnatal";
  return (
    <div className="card relative transition hover:border-cyan-400/40 hover:bg-white/[0.07]">
      <button
        type="button"
        title="Delete card"
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-lg border border-rose-400/30 bg-slate-950/70 text-sm text-rose-300 hover:bg-rose-500 hover:text-white"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
      >
        🗑
      </button>
      <Link href={`/baby/${b.id}`} className="block p-4 pr-12">
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot} animate-pulse`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-white">{b.babyName}</h3>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">{b.bed}</span>
              <UnitBadge unit={b.unit} subspecialty={b.subspecialty} />
              {b.insurance && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    b.insurance === "Self-pay / cash"
                      ? "border border-white/10 bg-white/5 text-slate-300"
                      : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  }`}
                >
                  {b.insurance === "Self-pay / cash" ? "💰 Cash" : "🛡️ " + (b.insuranceName || "Insurance")}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {b.uhid} · {b.sex} ·{" "}
              {isNeo
                ? `${b.gestWeeks}+${b.gestDays} wk · BW ${b.birthWeight} g · DOL ${dayOfLife(b.dob)} · CGA ${correctedGA(b.dob, b.gestWeeks, b.gestDays)}`
                : `Age ${b.gestWeeks} yr · Wt ${b.currentWeight / 1000} kg`}
            </p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          <Mini label="HR" v={v?.hr} k="hr" />
          <Mini label="RR" v={v?.rr} k="rr" />
          <Mini label="SpO₂" v={v?.spo2} k="spo2" unit="%" />
          <Mini
            label={`Temp °${unit}`}
            v={tempOut(v?.temp as number | null, unit)}
            k="temp"
            rawC={v?.temp as number | null}
          />
          <Mini label="MAP" v={v?.map} k="map" />
          <Mini label="RBS" v={v?.rbs} k="rbs" />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
          <Tag tone="cyan">
            {b.clinical?.resp?.mode ?? "Room air"} · FiO₂ {b.clinical?.resp?.settings?.fio2 ?? 21}%
          </Tag>
          <Tag tone="violet">
            {b.clinical?.fluids?.feedType ?? "Feeds not set"} · {b.clinical?.fluids?.totalMlKgDay ?? "—"} ml/kg/d
          </Tag>
          {isNeo && (
            <Tag tone="slate">
              Wt {b.currentWeight} g ({wt > 0 ? "+" : ""}
              {wt}%) · BW {b.birthWeight} g
            </Tag>
          )}
          {abx.length > 0 && (
            <Tag tone="amber">{abx.map((d) => `${d.name} D${d.day ?? 1}/${d.ofDays}`).join(" · ")}</Tag>
          )}
          {(b.clinical?.lines ?? []).length > 0 && (
            <Tag tone="slate">{(b.clinical?.lines ?? []).map((l) => `${l.name} (D${l.day})`).join(" · ")}</Tag>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {b.problems.slice(0, 6).map((p) => (
            <span
              key={p.id}
              className="rounded border border-rose-400/25 bg-rose-400/10 px-1.5 py-0.5 text-[10px] text-rose-200"
            >
              {p.label}
            </span>
          ))}
          {b.problems.length > 6 && (
            <span className="text-[10px] text-slate-400">+{b.problems.length - 6} more</span>
          )}
        </div>

        {b.openTasks.length > 0 && (
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/40 p-2">
            <div className="lbl mb-1">Open actions ({b.openTasks.length})</div>
            <ul className="space-y-0.5 text-[11px] text-slate-300">
              {b.openTasks.slice(0, 3).map((t) => (
                <li key={t.id}>• {t.text}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
          <span>Primary Consultant: {b.consultant || "—"}</span>
          <span>
            {b.lastHandover
              ? `Last handover ${b.lastHandover.shift} · ${relTime(b.lastHandover.createdAt)}`
              : "No handover recorded"}
          </span>
        </div>
      </Link>
    </div>
  );
}

function Mini({
  label,
  v,
  k,
  unit = "",
  rawC,
}: {
  label: string;
  v: number | string | null | undefined;
  k: string;
  unit?: string;
  rawC?: number | null;
}) {
  const num = typeof v === "string" ? Number(v) : v;
  const flag = vitalFlag(k, (rawC ?? num) ?? undefined);
  const cls =
    flag === "bad"
      ? "text-rose-300 border-rose-400/40"
      : flag === "warn"
        ? "text-amber-300 border-amber-400/40"
        : "text-slate-100 border-white/10";
  return (
    <div className={`rounded-lg border bg-slate-900/50 px-1.5 py-1 text-center ${cls}`}>
      <div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-bold tabular-nums">
        {num ?? "—"}
        <span className="text-[9px]">{unit}</span>
      </div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: string }) {
  const map: Record<string, string> = {
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    violet: "border-violet-400/30 bg-violet-400/10 text-violet-200",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    slate: "border-white/10 bg-white/5 text-slate-300",
  };
  return <span className={`rounded border px-1.5 py-0.5 ${map[tone]}`}>{children}</span>;
}
