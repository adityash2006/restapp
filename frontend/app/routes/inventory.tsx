import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  getInventory,
  createIngredient,
  updateIngredient,
  restockIngredient,
  deleteIngredient,
  type Ingredient,
} from "~/lib/api";

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast ${type === "success" ? "toast-success" : "toast-error"}`}>{message}</div>;
}

const LOW_STOCK_THRESHOLD: Record<string, number> = { kg: 1, litres: 0.5 };
function isLowStock(i: Ingredient) {
  return i.stockQuantity <= (LOW_STOCK_THRESHOLD[i.unit] ?? 1);
}

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [adding, setAdding] = useState(false);

  // Restock modal
  const [restockTarget, setRestockTarget] = useState<Ingredient | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restocking, setRestocking] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      const data = await getInventory();
      setIngredients(data);
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleAdd = async () => {
    const qty = parseFloat(newQty);
    if (!newName.trim()) { setToast({ message: "Enter ingredient name", type: "error" }); return; }
    if (isNaN(qty) || qty < 0) { setToast({ message: "Enter valid quantity", type: "error" }); return; }

    setAdding(true);
    try {
      await createIngredient(newName.trim(), qty, newUnit.trim());
      setToast({ message: `"${newName.trim()}" added!`, type: "success" });
      setNewName(""); setNewQty(""); setNewUnit("kg"); setShowAdd(false);
      fetchInventory();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setAdding(false); }
  };

  const handleRestock = async () => {
    if (!restockTarget) return;
    const qty = parseFloat(restockQty);
    if (isNaN(qty) || qty <= 0) { setToast({ message: "Enter a positive quantity", type: "error" }); return; }

    setRestocking(true);
    try {
      await restockIngredient(restockTarget.id, qty);
      setToast({ message: `Added ${qty} ${restockTarget.unit} to ${restockTarget.name}`, type: "success" });
      setRestockTarget(null); setRestockQty("");
      fetchInventory();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setRestocking(false); }
  };

  const startEdit = (item: Ingredient) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditQty(String(item.stockQuantity));
    setEditUnit(item.unit);
  };

  const handleSave = async () => {
    if (editId === null) return;
    const qty = parseFloat(editQty);
    if (!editName.trim()) { setToast({ message: "Name cannot be empty", type: "error" }); return; }
    if (isNaN(qty) || qty < 0) { setToast({ message: "Enter valid quantity", type: "error" }); return; }

    setSaving(true);
    try {
      await updateIngredient(editId, { name: editName.trim(), stockQuantity: qty, unit: editUnit.trim() });
      setToast({ message: "Ingredient updated!", type: "success" });
      setEditId(null);
      fetchInventory();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}" from inventory?`)) return;
    try {
      await deleteIngredient(id);
      setToast({ message: `"${name}" deleted`, type: "success" });
      fetchInventory();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const lowStockCount = ingredients.filter(isLowStock).length;

  return (
    <div className="min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="nav-bar">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/live-tables" className="btn-ghost btn-icon flex items-center justify-center text-lg no-underline">←</Link>
            <h1 className="text-lg font-bold">📦 Inventory</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/live-tables" className="nav-link no-underline">🖥️ Live</Link>
            <Link to="/summary" className="nav-link no-underline">📊 Summary</Link>
            <Link to="/menu-manage" className="nav-link no-underline">🍽️ Menu</Link>
            <Link to="/recipes" className="nav-link no-underline">🧪 Recipes</Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-32" />)}
          </div>
        ) : (
          <div className="animate-fade-in">
            {lowStockCount > 0 && (
              <div className="card mb-4 flex items-center gap-3" style={{ background: "var(--color-danger-bg)", borderColor: "var(--color-danger)" }}>
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-bold text-[var(--color-danger)]">Low Stock Alert</div>
                  <div className="text-sm text-[var(--color-text-muted)]">{lowStockCount} ingredient{lowStockCount !== 1 ? "s" : ""} running low</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ingredients.map((item, index) => {
                const low = isLowStock(item);
                return (
                  <div key={item.id} className={`card animate-fade-in ${low ? "low-stock" : ""}`} style={{ animationDelay: `${index * 0.03}s` }} id={`ingredient-${item.id}`}>
                    {editId === item.id ? (
                      <div className="flex flex-col gap-2">
                        <input className="input text-sm" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
                        <div className="flex gap-2">
                          <input className="input text-sm" type="number" value={editQty} onChange={e => setEditQty(e.target.value)} placeholder="Qty" />
                          <input className="input text-sm" value={editUnit} onChange={e => setEditUnit(e.target.value)} placeholder="Unit" style={{ width: 80 }} />
                        </div>
                        <div className="flex gap-2">
                          <button className="btn btn-primary flex-1 text-sm" onClick={handleSave} disabled={saving}>{saving ? "..." : "Save"}</button>
                          <button className="btn btn-secondary text-sm" onClick={() => setEditId(null)}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-lg">{item.name}</div>
                          <div className="flex gap-1">
                            {low && <span className="badge badge-danger">LOW</span>}
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className={`text-3xl font-bold ${low ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"}`}>
                              {item.stockQuantity.toFixed(2)}
                            </div>
                            <div className="text-sm text-[var(--color-text-muted)] uppercase">{item.unit}</div>
                          </div>
                          <div className="w-16 h-2 rounded-full bg-[var(--color-surface)] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{
                              width: `${Math.min(100, (item.stockQuantity / ((LOW_STOCK_THRESHOLD[item.unit] ?? 1) * 10)) * 100)}%`,
                              background: low ? "var(--color-danger)" : item.stockQuantity > (LOW_STOCK_THRESHOLD[item.unit] ?? 1) * 5 ? "var(--color-success)" : "var(--color-warning)",
                            }} />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 border-t border-[var(--color-border)] pt-3">
                          <button className="btn btn-primary flex-1 text-sm" onClick={() => setRestockTarget(item)} id={`restock-${item.id}`}>
                            + Restock
                          </button>
                          <button className="btn btn-ghost text-sm" onClick={() => startEdit(item)}>✏️</button>
                          <button className="btn btn-ghost text-sm" onClick={() => handleDelete(item.id, item.name)} style={{ color: "var(--color-danger)" }}>🗑️</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {ingredients.length === 0 && (
                <div className="empty-state col-span-full mt-8">
                  <div className="empty-state-icon">📦</div>
                  <p className="text-lg font-semibold">No ingredients</p>
                  <p className="text-sm mt-1">Add your first ingredient</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Ingredient FAB */}
      <button className="fab animate-pulse-glow" onClick={() => setShowAdd(true)} id="add-ingredient-fab" aria-label="Add Ingredient">+</button>

      {/* Add Ingredient Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add Ingredient</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Ingredient Name</label>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Onions" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)] mb-1">Initial Stock</label>
                  <input className="input" type="number" value={newQty} onChange={e => setNewQty(e.target.value)} placeholder="e.g. 10" min={0} />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)] mb-1">Unit</label>
                  <select className="input" value={newUnit} onChange={e => setNewUnit(e.target.value)}>
                    <option value="kg">kg</option>
                    <option value="litres">litres</option>
                    <option value="pieces">pieces</option>
                    <option value="grams">grams</option>
                    <option value="ml">ml</option>
                    <option value="packets">packets</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button className="btn btn-secondary flex-1" onClick={() => { setShowAdd(false); setNewName(""); setNewQty(""); }}>Cancel</button>
                <button className="btn btn-primary flex-1" onClick={handleAdd} disabled={adding}>
                  {adding ? <span className="spinner" /> : "Add Ingredient"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockTarget && (
        <div className="modal-overlay" onClick={() => { setRestockTarget(null); setRestockQty(""); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">Restock {restockTarget.name}</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Current stock: <strong>{restockTarget.stockQuantity.toFixed(2)} {restockTarget.unit}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">Add Quantity ({restockTarget.unit})</label>
              <input className="input text-center text-2xl font-bold" type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="0" min={0} autoFocus />
            </div>
            {restockQty && parseFloat(restockQty) > 0 && (
              <div className="card mb-4 text-center">
                <div className="text-sm text-[var(--color-text-muted)]">New stock will be</div>
                <div className="text-2xl font-bold text-[var(--color-success)]">
                  {(restockTarget.stockQuantity + parseFloat(restockQty)).toFixed(2)} {restockTarget.unit}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => { setRestockTarget(null); setRestockQty(""); }}>Cancel</button>
              <button className="btn btn-success flex-1" onClick={handleRestock} disabled={restocking}>
                {restocking ? <span className="spinner" /> : "Confirm Restock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
