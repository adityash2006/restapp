import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { getTodaySummary, type TodaySummary } from "~/lib/api";

export default function SummaryPage() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const data = await getTodaySummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <div className="nav-bar">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/live-tables" className="btn-ghost btn-icon flex items-center justify-center text-lg no-underline">
              ←
            </Link>
            <h1 className="text-lg font-bold">📊 Today's Summary</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/live-tables" className="nav-link no-underline" id="nav-live">
              🖥️ Live
            </Link>
            <Link to="/inventory" className="nav-link no-underline" id="nav-inventory">
              📦 Inventory
            </Link>
            <Link to="/menu-manage" className="nav-link no-underline" id="nav-menu">
              🍽️ Menu
            </Link>
            <button onClick={fetchSummary} className="btn btn-ghost text-sm" id="refresh-summary">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {loading ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-28" />
              ))}
            </div>
            <div className="skeleton h-64" />
          </div>
        ) : error ? (
          <div className="empty-state mt-12">
            <div className="empty-state-icon">⚠️</div>
            <p className="text-lg font-semibold text-[var(--color-danger)]">{error}</p>
            <button onClick={fetchSummary} className="btn btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : summary ? (
          <div className="animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="stat-card">
                <div className="stat-value text-[var(--color-success)]">
                  ₹{summary.totalRevenue.toLocaleString()}
                </div>
                <div className="stat-label">Total Revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-[var(--color-accent)]">
                  {summary.orderCount}
                </div>
                <div className="stat-label">Completed Orders</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  ₹{Math.round(summary.averageOrderValue)}
                </div>
                <div className="stat-label">Avg Order Value</div>
              </div>
            </div>

            {/* Completed Orders List */}
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)]">
                <h2 className="font-bold text-lg">Completed Orders</h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {new Date().toLocaleDateString("en-IN", { 
                    weekday: "long", 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                  })}
                </p>
              </div>
              {summary.orders.length === 0 ? (
                <div className="empty-state py-8">
                  <div className="empty-state-icon">📋</div>
                  <p>No completed orders today</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Table</th>
                      <th>Items</th>
                      <th>Time</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="font-mono font-semibold">#{order.id}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-[var(--color-accent-glow)] flex items-center justify-center text-sm font-bold text-[var(--color-accent)]">
                              {order.tableNumber}
                            </span>
                            Table {order.tableNumber}
                          </div>
                        </td>
                        <td>
                          <span className="counter-badge">
                            {order.items.length}
                          </span>
                        </td>
                        <td className="text-[var(--color-text-muted)]">
                          {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="text-right font-bold text-[var(--color-success)]">
                          ₹{order.totalAmount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
