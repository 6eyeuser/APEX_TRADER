import { Lock, ShieldCheck, Gauge, LucideIcon } from "lucide-react";
import { TRUST } from "@/lib/landing-data";

const ICONS: Record<string, LucideIcon> = { Lock, ShieldCheck, Gauge };

export default function SecurityStrip() {
  return (
    <section id="security" className="border-t border-panel bg-surface">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight mb-10">
          Security the platform doesn&apos;t compromise on, even in demo mode.
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {TRUST.map((t) => {
            const Icon = ICONS[t.icon];
            return (
              <div key={t.title}>
                <Icon size={18} className="mb-3 text-ink" />
                <h3 className="text-sm font-medium mb-1.5 text-ink">{t.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{t.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
