import { Repeat, Layers, Wallet, Activity, LucideIcon } from "lucide-react";
import { FEATURES } from "@/lib/landing-data";

const ICONS: Record<string, LucideIcon> = { Repeat, Layers, Wallet, Activity };

export default function FeatureGrid() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
      <div className="max-w-lg mb-12">
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight mb-3">
          Built like a real desk, priced like a practice account.
        </h2>
        <p className="text-sm sm:text-base text-muted">
          Every mechanic mirrors production trading infrastructure — the only thing simulated is the money.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => {
          const Icon = ICONS[f.icon];
          return (
            <div
              key={f.title}
              className="rounded-2xl border border-panel bg-surface p-6 transition-transform hover:-translate-y-0.5"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 bg-bull/10">
                <Icon size={17} className="text-bull" />
              </div>
              <h3 className="text-sm font-medium mb-2 text-ink">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{f.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
