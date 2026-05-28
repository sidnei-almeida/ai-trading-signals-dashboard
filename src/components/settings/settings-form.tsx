import { cn } from "@/lib/utils";

export function SettingRow({
  label,
  value,
  hint,
  children,
  className,
}: {
  label: string;
  value?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-[11px] text-zinc-400">{label}</Label>
        {value ? (
          <span className="font-mono text-[11px] text-zinc-300">{value}</span>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-[10px] leading-snug text-zinc-600">{hint}</p> : null}
    </div>
  );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={className}>{children}</p>;
}

export function SpecLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[11px]">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-zinc-200">{value}</span>
    </div>
  );
}
