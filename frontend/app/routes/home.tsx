import { Link } from "react-router";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12 animate-fade-in">
        <div className="text-6xl mb-4">🍛</div>
        <h1 className="text-4xl font-bold text-[var(--color-text-primary)] tracking-tight">
          Kesari
        </h1>
        <p className="text-[var(--color-text-muted)] mt-2 text-lg">
          Restaurant Management System
        </p>
      </div>

      <div className="grid gap-4 w-full max-w-md animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <Link
          to="/waiter"
          className="card card-active flex items-center gap-4 p-6 no-underline group"
          id="waiter-link"
        >
          <div className="text-4xl">📋</div>
          <div>
            <div className="text-xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
              Waiter Panel
            </div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">
              Take orders, manage tables
            </div>
          </div>
          <div className="ml-auto text-[var(--color-text-muted)] text-2xl">→</div>
        </Link>

        <Link
          to="/live-tables"
          className="card flex items-center gap-4 p-6 no-underline group"
          id="counter-link"
        >
          <div className="text-4xl">🖥️</div>
          <div>
            <div className="text-xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
              Counter / Admin
            </div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">
              Live tables, summary, inventory
            </div>
          </div>
          <div className="ml-auto text-[var(--color-text-muted)] text-2xl">→</div>
        </Link>
      </div>

      <div className="mt-12 text-center text-sm text-[var(--color-text-muted)] animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <p>Running on local network</p>
        <p className="mt-1 font-mono text-xs">v1.0.0</p>
      </div>
    </div>
  );
}
