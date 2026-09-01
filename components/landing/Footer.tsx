export default function Footer() {
  return (
    <footer className="border-t border-panel">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-muted">
          © {new Date().getFullYear()} ApexTrader. Simulated trading environment — no real funds are at risk.
        </span>
        <div className="flex items-center gap-5 text-xs text-muted">
          <a href="#" className="hover:text-ink transition">Terms</a>
          <a href="#" className="hover:text-ink transition">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
