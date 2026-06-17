import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  getOrder,
  getMenu,
  addItemsToOrder,
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

// Cart item type — what the waiter is building before submitting
interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export default function WaiterTablePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = parseInt(id || "0");

  const [order, setOrder] = useState<TableOrder | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  // Cart operations
  const addToCart = (menuItem: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === menuItem.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
    setSearch("");
    setShowDropdown(false);
  };

  const updateCartQty = (menuItemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItem.id === menuItemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (menuItemId: number) => {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== menuItemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);

  // Submit entire cart as one batch
  const handleSubmitCart = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const items = cart.map((c) => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
      }));

      const result = await addItemsToOrder(orderId, items);
      setOrder(result.order);

      const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
      setToast({
        message: `✅ Sent ${itemCount} item${itemCount !== 1 ? "s" : ""} to kitchen!`,
        type: "success",
      });

      // Clear cart and close modal
      setCart([]);
      setShowAddItem(false);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to add items", type: "error" });
    } finally {
      setSubmitting(false);
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
                + Add Items
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

      {/* Add Items Modal — Cart Style */}
      {showAddItem && (
        <div className="modal-overlay modal-overlay-center" onClick={() => { if (cart.length === 0) { setShowAddItem(false); setSearch(""); } }}>
          <div className="modal-content modal-content-expanded" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add Items</h2>
              {cart.length > 0 && (
                <span className="badge badge-pending">{cart.length} in cart</span>
              )}
            </div>

            {/* Search Menu Items */}
            <div className={`relative mb-4 ${showDropdown ? "search-container-active" : ""}`} ref={searchRef}>
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
                <div className="search-dropdown-relative">
                  {filteredMenu.length === 0 ?(
                    <div className="p-4 text-center text-[var(--color-text-muted)]">
                      No items found
                    </div>
                  ) : (
                    filteredMenu.map((item) => {
                      const inCart = cart.find((c) => c.menuItem.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className="search-dropdown-item search-dropdown-item-expanded"
                          onClick={() => addToCart(item)}
                          id={`menu-item-${item.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {inCart && (
                              <span className="text-xs text-[var(--color-success)] font-bold">
                                ({inCart.quantity} in cart)
                              </span>
                            )}
                          </div>
                          <span className="text-[var(--color-accent)] font-bold">₹{item.price}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Cart Items */}
            {cart.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                  Cart
                </div>
                <div className="flex flex-col gap-2">
                  {cart.map((cartItem) => (
                    <div
                      key={cartItem.menuItem.id}
                      className="card flex items-center justify-between py-3"
                      style={{ padding: "12px 16px" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{cartItem.menuItem.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          ₹{cartItem.menuItem.price} × {cartItem.quantity} = <span className="text-[var(--color-accent)] font-bold">₹{cartItem.menuItem.price * cartItem.quantity}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          className="btn btn-secondary btn-icon"
                          onClick={() => updateCartQty(cartItem.menuItem.id, -1)}
                          style={{ width: 32, height: 32, minHeight: 32, fontSize: 16 }}
                        >
                          −
                        </button>
                        <span className="text-lg font-bold w-6 text-center">{cartItem.quantity}</span>
                        <button
                          className="btn btn-secondary btn-icon"
                          onClick={() => updateCartQty(cartItem.menuItem.id, 1)}
                          style={{ width: 32, height: 32, minHeight: 32, fontSize: 16 }}
                        >
                          +
                        </button>
                        <button
                          className="btn btn-ghost text-sm"
                          onClick={() => removeFromCart(cartItem.menuItem.id)}
                          style={{ color: "var(--color-danger)", padding: "4px 8px", minHeight: "auto" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Total */}
                <div className="card mt-3 flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text-muted)]">Cart Total</span>
                  <span className="text-xl font-bold text-[var(--color-accent)]">₹{cartTotal}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => {
                  setShowAddItem(false);
                  setCart([]);
                  setSearch("");
                }}
                id="cancel-add-items"
              >
                Cancel
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={handleSubmitCart}
                disabled={submitting || cart.length === 0}
                id="send-to-kitchen"
              >
                {submitting ? (
                  <span className="spinner" />
                ) : (
                  `Send ${cart.reduce((s, c) => s + c.quantity, 0)} item${cart.reduce((s, c) => s + c.quantity, 0) !== 1 ? "s" : ""} to Kitchen`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
