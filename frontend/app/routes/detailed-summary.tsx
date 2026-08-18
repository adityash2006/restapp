import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { getDetailedSummary, type TodaySummary } from "~/lib/api";

export default function DetailedSummaryPage() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      start: `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`,
      end: `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`,
    };
  };

  // Input values shown in the date fields
  const [startDate, setStartDate] = useState<string>(() => getCurrentMonthRange().start);
  const [endDate, setEndDate] = useState<string>(() => getCurrentMonthRange().end);

  const fetchSummary = useCallback(async (startDateValue?: string, endDateValue?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDetailedSummary(startDateValue, endDateValue);
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to load detailed summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentMonth = getCurrentMonthRange();
    fetchSummary(currentMonth.start, currentMonth.end);
  }, [fetchSummary]);

  const applyFilters = () => {
    fetchSummary(startDate || undefined, endDate || undefined);
  };

  const clearFilters = () => {
    const currentMonth = getCurrentMonthRange();
    setStartDate(currentMonth.start);
    setEndDate(currentMonth.end);
    fetchSummary(currentMonth.start, currentMonth.end);
  };

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
            <button
              onClick={() => fetchSummary(startDate || undefined, endDate || undefined)}
              className="btn btn-ghost text-sm"
              id="refresh-summary"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 pb-20">
        
        {/* Filters */}
        <div className="card mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[var(--color-text-secondary)]">From:</label>
            <input 
              type="date" 
              className="input" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[var(--color-text-secondary)]">To:</label>
            <input 
              type="date" 
              className="input" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
          <button 
            className="btn btn-primary text-sm"
            onClick={applyFilters}
          >
            Apply Filters
          </button>
          <button 
            className="btn btn-secondary text-sm"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

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
            <button
              onClick={() => fetchSummary(startDate || undefined, endDate || undefined)}
              className="btn btn-primary mt-4"
            >
              Retry
            </button>
          </div>
        ) : summary ? (
          <div className="animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <div className="stat-value text-[var(--color-success)]">
                  ₹{summary.totalRevenue.toLocaleString()}
                </div>
                <div className="stat-label">Total Revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-[var(--color-success)]">
                  ₹{(summary.cashRevenue || 0).toLocaleString()}
                </div>
                <div className="stat-label">Cash Revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-[var(--color-accent)]">
                  ₹{(summary.onlineRevenue || 0).toLocaleString()}
                </div>
                <div className="stat-label">Online Revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-[var(--color-accent)]">
                  {summary.orderCount}
                </div>
                <div className="stat-label">Total Orders</div>
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
