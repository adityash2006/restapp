import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { getDetailedSummary, type TodaySummary } from "~/lib/api";

export default function DetailedSummaryPage() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const data = await getDetailedSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to load detailed summary");
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
            <h1 className="text-lg font-bold">📋 Detailed Summary (All Time)</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/live-tables" className="nav-link no-underline" id="nav-live">
              🖥️ Live
            </Link>
            <Link to="/summary" className="nav-link no-underline" id="nav-summary">
              📊 Today
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

      <div className="max-w-5xl mx-auto p-4 pb-20">
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
                <div className="stat-label">Lifetime Revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-[var(--color-accent)]">
                  {summary.orderCount}
                </div>
                <div className="stat-label">Total Orders</div>
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
                <h2 className="font-bold text-lg">All Past Orders</h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Detailed view of every completed order
                </p>
              </div>
              {summary.orders.length === 0 ? (
                <div className="empty-state py-8">
                  <div className="empty-state-icon">📋</div>
                  <p>No completed orders found</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Table</th>
                      <th>Date / Time</th>
                      <th>Items Ordered</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.orders.map((order) => (
                      <tr key={order.id} className="align-top">
                        <td className="font-mono font-semibold pt-4">#{order.id}</td>
                        <td className="pt-4">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-[var(--color-accent-glow)] flex items-center justify-center text-sm font-bold text-[var(--color-accent)]">
                              {order.tableNumber}
                            </span>
                            Table {order.tableNumber}
                          </div>
                        </td>
                        <td className="pt-4 text-[var(--color-text-muted)]">
                          <div className="text-sm">
                            {new Date(order.updatedAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-xs">
                            {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="pt-4">
                          <ul className="space-y-1">
                            {order.items.map((item) => (
                              <li key={item.id} className="text-sm flex justify-between gap-4">
                                <span>{item.quantity} x {item.menuItem?.name || 'Unknown Item'}</span>
                                <span className="text-[var(--color-text-muted)]">₹{item.subtotal}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="text-right font-bold text-[var(--color-success)] pt-4">
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
