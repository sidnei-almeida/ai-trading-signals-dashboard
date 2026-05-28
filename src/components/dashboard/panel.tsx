import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  action,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("dash-panel flex flex-col", className)}>
      <header className="dash-panel-header flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="dash-panel-title">{title}</h2>
          {subtitle ? <p className="dash-panel-subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className={cn("dash-panel-body min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
