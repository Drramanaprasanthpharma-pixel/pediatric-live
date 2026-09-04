"use client";

import { CheckCircle2, Circle, ListTodo } from "lucide-react";
import { fmtTime } from "@/lib/clinical";

export type ActionItem = {
  id: number;
  text: string;
  done: boolean;
  doneAt: string | null;
  doneBy: string;
  owner?: string;
};

/**
 * Open-action checklist with completion tracking.
 * Open items show a tappable circle; completed items show a check with the
 * timestamp and person who completed them.
 */
export function ActionChecklist({
  tasks,
  onToggle,
  showDone = true,
  emptyLabel = "All actions completed.",
}: {
  tasks: ActionItem[];
  onToggle: (id: number, done: boolean) => void;
  showDone?: boolean;
  emptyLabel?: string;
}) {
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="space-y-1">
      {open.length === 0 && done.length === 0 && (
        <p className="text-[11px] text-slate-500">{emptyLabel}</p>
      )}
      <ul className="space-y-1">
        {open.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onToggle(t.id, true)}
              title="Mark as completed"
              className="group flex w-full items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-left text-[11px] text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/5"
            >
              <Circle
                size={14}
                strokeWidth={2}
                className="mt-0.5 shrink-0 text-slate-500 transition group-hover:text-emerald-300"
              />
              <span className="flex-1">{t.text}</span>
              <span className="shrink-0 text-[10px] text-slate-500">tap to done</span>
            </button>
          </li>
        ))}
      </ul>
      {showDone && done.length > 0 && (
        <div className="mt-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-2">
          <div className="lbl mb-1 text-emerald-300">Completed ({done.length})</div>
          <ul className="space-y-1">
            {done.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => onToggle(t.id, false)}
                  title="Re-open action"
                  className="mt-0.5 shrink-0 text-emerald-300 hover:text-emerald-200"
                >
                  <CheckCircle2 size={14} strokeWidth={2.4} />
                </button>
                <span className="flex-1 text-slate-400 line-through">{t.text}</span>
                <span className="shrink-0 text-right text-[10px] text-emerald-300/90">
                  ✓ {t.doneAt ? fmtTime(t.doneAt) : "done"}
                  {t.doneBy ? ` · ${t.doneBy}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ActionSummaryIcon({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <ListTodo size={12} /> {count}
    </span>
  );
}
