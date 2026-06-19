import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { getActiveOrders, type TableOrder } from "~/lib/api";

export default function LiveTablesPage() {
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [auth,setAuth]=useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const data = await getActiveOrders();
      setOrders(data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(()=>{
    const a= localStorage.getItem('token');
    if(a=="passo"){
      setAuth(true)
    }
  })

  if(auth){
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <div className="nav-bar">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-ghost btn-icon flex items-center justify-center text-lg no-underline">
              ←
            </Link>
            <h1 className="text-lg font-bold">🖥️ Live Tables</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/summary" className="nav-link no-underline" id="nav-summary">
              📊 Today
            </Link>
            <Link to="/detailed-summary" className="nav-link no-underline" id="nav-detailed-summary">
              📋 All Orders
            </Link>
            <Link to="/inventory" className="nav-link no-underline" id="nav-inventory">
              📦 Inventory
            </Link>
            <Link to="/menu-manage" className="nav-link no-underline" id="nav-menu">
              🍽️ Menu
            </Link>
            <Link to="/recipes" className="nav-link no-underline" id="nav-recipes">
              🧪 Recipes
            </Link>
            <button onClick={fetchOrders} className="btn btn-ghost text-sm" id="refresh-live">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-dot status-dot-pending" />
            <span className="text-sm text-[var(--color-text-muted)]">
              {orders.length} active table{orders.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-36" />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state mt-12">
            <div className="empty-state-icon">⚠️</div>
            <p className="text-lg font-semibold text-[var(--color-danger)]">{error}</p>
            <button onClick={fetchOrders} className="btn btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state mt-12">
            <div className="empty-state-icon">🪑</div>
            <p className="text-lg font-semibold">No active tables</p>
            <p className="mt-1 text-sm">All tables are clear</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order, index) => (
              <div
                key={order.id}
                className="card card-active animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
                id={`live-table-${order.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-glow)] flex items-center justify-center text-xl font-bold text-[var(--color-accent)]">
                      {order.tableNumber}
                    </div>
                    <div>
                      <div className="font-bold">Table {order.tableNumber}</div>
                      <span className={`badge ${order.status === "PENDING" ? "badge-pending" : "badge-done"}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--color-accent)]">
                      ₹{order.totalAmount}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-muted)]">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {order.items.length > 0 && (
                    <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                      {order.items.slice(0, 3).map((item) => (
                        <span key={item.id} className="inline-block mr-2">
                          {item.quantity}x {item.menuItem.name}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span>+{order.items.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}else{
  return (
    <>
      <div> you are not authenticated</div>
    </>
  )
}
}
