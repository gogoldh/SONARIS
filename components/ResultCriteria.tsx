import type { CriterionEvaluation } from "@/types/analysis";

type ResultCriteriaProps = {
  items: CriterionEvaluation[];
};

export function ResultCriteria({ items }: ResultCriteriaProps) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="rounded-2xl border border-[var(--border)] bg-white p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                item.met ? "bg-[#fce6eb] text-[var(--brand)]" : "bg-[#ebeff5] text-[var(--muted)]"
              }`}
            >
              {item.met ? "Met" : "Not met"}
            </span>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}