import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { getActiveOrders, createOrder, type TableOrder } from "~/lib/api";

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast ${type === "success" ? "toast-success" : "toast-error"}`}>
      {message}
    </div>
  );
}

export default function WaiterPage() {
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getActiveOrders();
      setOrders(data);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to load orders", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCreateOrder = async () => {
    const num = parseInt(tableNumber);
    if (isNaN(num) || num <= 0) {
      setToast({ message: "Enter a valid table number", type: "error" });
      return;
    }

    setCreating(true);
    try {
      const order = await createOrder(num);
      setToast({ message: `Table ${num} created!`, type: "success" });
      setShowNewOrder(false);
      setTableNumber("");
      navigate(`/waiter/table/${order.id}`);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to create order", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="nav-bar">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-ghost btn-icon flex items-center justify-center text-lg no-underline">
              ←
            </Link>
            <div>
              <h1 className="text-lg font-bold">🍛 Waiter Panel</h1>
              <p className="text-xs text-[var(--color-text-muted)]">Active Tables</p>
            </div>
          </div>
          <button
            onClick={fetchOrders}
            className="btn btn-ghost text-sm"
            id="refresh-orders"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-28 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state mt-20">
            <div className="empty-state-icon">🪑</div>
            <p className="text-lg font-semibold">No active tables</p>
            <p className="mt-1 text-sm">Tap the + button to create a new order</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((order, index) => (
              <Link
                key={order.id}
                to={`/waiter/table/${order.id}`}
                className="card flex items-center justify-between no-underline animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
                id={`table-card-${order.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-glow)] flex items-center justify-center text-2xl font-bold text-[var(--color-accent)]">
                    {order.tableNumber}
                  </div>
                  <div>
                    <div className="font-bold text-lg">Table {order.tableNumber}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`status-dot ${order.status === "PENDING" ? "status-dot-pending" : "status-dot-done"}`} />
                      <span className={`badge ${order.status === "PENDING" ? "badge-pending" : "badge-done"}`}>
                        {order.status}
                      </span>
                      <span className="text-sm text-[var(--color-text-muted)]">
                        · {order.items.length} items
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-[var(--color-accent)]">
                    ₹{order.totalAmount}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">→</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        className="fab animate-pulse-glow"
        onClick={() => setShowNewOrder(true)}
        id="new-order-fab"
        aria-label="New Order"
      >
        +
      </button>

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="modal-overlay" onClick={() => setShowNewOrder(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">New Order</h2>
            <div className="mb-4">
              <label className="block text-sm text-[var(--color-text-muted)] mb-2">
                Table Number
              </label>
              <input
                type="number"
                className="input text-center text-2xl font-bold"
                placeholder="e.g. 5"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                autoFocus
                min={1}
                id="table-number-input"
              />
            </div>
            <div className="flex gap-3">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => {
                  setShowNewOrder(false);
                  setTableNumber("");
                }}
                id="cancel-new-order"
              >
                Cancel
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={handleCreateOrder}
                disabled={creating || !tableNumber}
                id="create-order-btn"
              >
                {creating ? <span className="spinner" /> : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
