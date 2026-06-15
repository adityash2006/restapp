import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  getOrder,
  getMenu,
  addItemToOrder,
  updateOrderStatus,
  type TableOrder,
  type MenuItem,
} from "~/lib/api";

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

export default function WaiterTablePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = parseInt(id || "0");

  const [order, setOrder] = useState<TableOrder | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await getOrder(orderId);
      setOrder(data);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to load order", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const fetchMenu = useCallback(async () => {
    try {
      const data = await getMenu();
      setMenuItems(data);
    } catch (err: any) {
      console.error("Failed to load menu:", err);
    }
  }, []);

  useEffect(() => {
    fetchOrder();
    fetchMenu();
  }, [fetchOrder, fetchMenu]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredMenu = menuItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddItem = async () => {
    if (!selectedItem) return;

    setAdding(true);
    try {
      const result = await addItemToOrder(orderId, selectedItem.id, quantity);
      setOrder(result.order);
      setToast({ message: `Added ${quantity}x ${selectedItem.name}`, type: "success" });
      setShowAddItem(false);
      setSelectedItem(null);
      setSearch("");
      setQuantity(1);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to add item", type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const handleMarkDone = async () => {
    setMarkingDone(true);
    try {
      await updateOrderStatus(orderId, "DONE");
      setToast({ message: "Table marked as done!", type: "success" });
      setTimeout(() => navigate("/waiter"), 500);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update status", type: "error" });
    } finally {
      setMarkingDone(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-[var(--color-text-muted)]">Order not found</p>
        <Link to="/waiter" className="btn btn-primary no-underline">
          Back to Tables
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="nav-bar">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/waiter" className="btn-ghost btn-icon flex items-center justify-center text-lg no-underline">
              ←
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">Table {order.tableNumber}</h1>
                <span className={`badge ${order.status === "PENDING" ? "badge-pending" : "badge-done"}`}>
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Order #{order.id}
              </p>
            </div>
          </div>
          <button
            onClick={fetchOrder}
            className="btn btn-ghost text-sm"
            id="refresh-order"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 pb-36">
        {/* Order Items */}
        {order.items.length === 0 ? (
          <div className="empty-state mt-12">
            <div className="empty-state-icon">📝</div>
            <p className="text-lg font-semibold">No items yet</p>
            <p className="mt-1 text-sm">Add items to this order</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="card overflow-hidden p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium">{item.menuItem.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          ₹{item.unitPrice} each
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="counter-badge">{item.quantity}</span>
                      </td>
                      <td className="text-right font-semibold text-[var(--color-accent)]">
                        ₹{item.subtotal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="card mt-4 flex items-center justify-between">
              <span className="text-lg font-semibold text-[var(--color-text-secondary)]">Total</span>
              <span className="text-3xl font-bold text-[var(--color-accent)]">
                ₹{order.totalAmount}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {order.status === "PENDING" && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
            <div className="max-w-2xl mx-auto flex gap-3">
              <button
                className="btn btn-primary flex-1 btn-lg"
                onClick={() => setShowAddItem(true)}
                id="add-item-btn"
              >
                + Add Item
              </button>
              <button
                className="btn btn-success btn-lg"
                onClick={handleMarkDone}
                disabled={markingDone || order.items.length === 0}
                id="mark-done-btn"
              >
                {markingDone ? <span className="spinner" /> : "✓ Done"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="modal-overlay" onClick={() => { setShowAddItem(false); setSelectedItem(null); setSearch(""); setQuantity(1); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add Item</h2>

            {/* Search / Select Menu Item */}
            {!selectedItem ? (
              <div className="relative" ref={searchRef}>
                <input
                  type="text"
                  className="input"
                  placeholder="Search menu items..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  autoFocus
                  id="menu-search-input"
                />
                {showDropdown && (
                  <div className="search-dropdown">
                    {filteredMenu.length === 0 ? (
                      <div className="p-4 text-center text-[var(--color-text-muted)]">
                        No items found
                      </div>
                    ) : (
                      filteredMenu.map((item) => (
                        <div
                          key={item.id}
                          className="search-dropdown-item"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDropdown(false);
                            setSearch("");
                          }}
                          id={`menu-item-${item.id}`}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-[var(--color-accent)] font-bold">₹{item.price}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Selected item display */}
                <div className="card flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold text-lg">{selectedItem.name}</div>
                    <div className="text-sm text-[var(--color-accent)]">₹{selectedItem.price}</div>
                  </div>
                  <button
                    className="btn btn-ghost text-sm"
                    onClick={() => setSelectedItem(null)}
                    id="change-item-btn"
                  >
                    Change
                  </button>
                </div>

                {/* Quantity */}
                <div className="mb-4">
                  <label className="block text-sm text-[var(--color-text-muted)] mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      className="btn btn-secondary btn-icon text-xl"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      id="qty-minus"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="input text-center text-2xl font-bold"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      style={{ width: "80px" }}
                      id="qty-input"
                    />
                    <button
                      className="btn btn-secondary btn-icon text-xl"
                      onClick={() => setQuantity(quantity + 1)}
                      id="qty-plus"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Subtotal preview */}
                <div className="card mb-4 text-center">
                  <div className="text-sm text-[var(--color-text-muted)]">Subtotal</div>
                  <div className="text-2xl font-bold text-[var(--color-accent)]">
                    ₹{selectedItem.price * quantity}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    className="btn btn-secondary flex-1"
                    onClick={() => {
                      setShowAddItem(false);
                      setSelectedItem(null);
                      setSearch("");
                      setQuantity(1);
                    }}
                    id="cancel-add-item"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={handleAddItem}
                    disabled={adding}
                    id="confirm-add-item"
                  >
                    {adding ? <span className="spinner" /> : "Add to Order"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
