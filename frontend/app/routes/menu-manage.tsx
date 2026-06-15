import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  getMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  type MenuItemWithRecipes,
} from "~/lib/api";

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast ${type === "success" ? "toast-success" : "toast-error"}`}>{message}</div>;
}

export default function MenuManagePage() {
  const [items, setItems] = useState<MenuItemWithRecipes[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      const data = await getMenu();
      setItems(data);
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const handleAdd = async () => {
    const price = parseFloat(newPrice);
    if (!newName.trim()) { setToast({ message: "Enter item name", type: "error" }); return; }
    if (isNaN(price) || price < 0) { setToast({ message: "Enter valid price", type: "error" }); return; }

    setAdding(true);
    try {
      await createMenuItem(newName.trim(), price);
      setToast({ message: `"${newName.trim()}" added!`, type: "success" });
      setNewName(""); setNewPrice(""); setShowAdd(false);
      fetchMenu();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setAdding(false); }
  };

  const startEdit = (item: MenuItemWithRecipes) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
  };

  const handleSave = async () => {
    if (editId === null) return;
    const price = parseFloat(editPrice);
    if (!editName.trim()) { setToast({ message: "Name cannot be empty", type: "error" }); return; }
    if (isNaN(price) || price < 0) { setToast({ message: "Enter valid price", type: "error" }); return; }

    setSaving(true);
    try {
      await updateMenuItem(editId, { name: editName.trim(), price });
      setToast({ message: "Item updated!", type: "success" });
      setEditId(null);
      fetchMenu();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}" from the menu?`)) return;
    try {
      await deleteMenuItem(id);
      setToast({ message: `"${name}" deleted`, type: "success" });
      fetchMenu();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  return (
    <div className="min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="nav-bar">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/live-tables" className="btn-ghost btn-icon flex items-center justify-center text-lg no-underline">←</Link>
            <h1 className="text-lg font-bold">🍽️ Menu Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/inventory" className="nav-link no-underline">📦 Inventory</Link>
            <Link to="/recipes" className="nav-link no-underline">🧪 Recipes</Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-24">
        {loading ? (
          <div className="grid gap-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-20" />)}</div>
        ) : (
          <div className="grid gap-3">
            {items.map((item, index) => (
              <div key={item.id} className="card animate-fade-in" style={{ animationDelay: `${index * 0.03}s` }} id={`menu-manage-${item.id}`}>
                {editId === item.id ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <input className="input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Item name" />
                      <input className="input" type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="Price" style={{ width: 100 }} />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
                        {saving ? <span className="spinner" /> : "Save"}
                      </button>
                      <button className="btn btn-secondary" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg">{item.name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xl font-bold text-[var(--color-accent)]">₹{item.price}</span>
                        {item.recipes.length > 0 && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {item.recipes.length} ingredient{item.recipes.length !== 1 ? "s" : ""} linked
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost text-sm" onClick={() => startEdit(item)}>✏️</button>
                      <button className="btn btn-ghost text-sm" onClick={() => handleDelete(item.id, item.name)} style={{ color: "var(--color-danger)" }}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {items.length === 0 && (
              <div className="empty-state mt-8">
                <div className="empty-state-icon">🍽️</div>
                <p className="text-lg font-semibold">No menu items yet</p>
                <p className="text-sm mt-1">Add your first dish below</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Item FAB + Modal */}
      <button className="fab animate-pulse-glow" onClick={() => setShowAdd(true)} id="add-menu-item-fab" aria-label="Add Menu Item">+</button>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add Menu Item</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Item Name</label>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Paneer Tikka" autoFocus id="new-menu-name" />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Price (₹)</label>
                <input className="input" type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="e.g. 250" min={0} id="new-menu-price" />
              </div>
              <div className="flex gap-3 mt-2">
                <button className="btn btn-secondary flex-1" onClick={() => { setShowAdd(false); setNewName(""); setNewPrice(""); }}>Cancel</button>
                <button className="btn btn-primary flex-1" onClick={handleAdd} disabled={adding} id="confirm-add-menu">
                  {adding ? <span className="spinner" /> : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
