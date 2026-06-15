import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  getMenu,
  getInventory,
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  type MenuItemWithRecipes,
  type Ingredient,
  type Recipe,
} from "~/lib/api";

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast ${type === "success" ? "toast-success" : "toast-error"}`}>{message}</div>;
}

export default function RecipesPage() {
  const [menuItems, setMenuItems] = useState<MenuItemWithRecipes[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Add recipe form
  const [showAdd, setShowAdd] = useState(false);
  const [selMenuItem, setSelMenuItem] = useState<number | "">("");
  const [selIngredient, setSelIngredient] = useState<number | "">("");
  const [selQty, setSelQty] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [menuData, invData, recipeData] = await Promise.all([
        getMenu(), getInventory(), getRecipes(),
      ]);
      setMenuItems(menuData);
      setIngredients(invData);
      setRecipes(recipeData);
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group recipes by menu item
  const groupedRecipes = menuItems
    .map((mi) => ({
      menuItem: mi,
      recipes: recipes.filter((r) => r.menuItemId === mi.id),
    }))
    .filter((g) => g.recipes.length > 0);

  // Items with no recipes
  const noRecipeItems = menuItems.filter(
    (mi) => !recipes.some((r) => r.menuItemId === mi.id)
  );

  const handleAdd = async () => {
    if (!selMenuItem || !selIngredient) { setToast({ message: "Select a menu item and ingredient", type: "error" }); return; }
    const qty = parseFloat(selQty);
    if (isNaN(qty) || qty <= 0) { setToast({ message: "Enter a valid quantity", type: "error" }); return; }

    setAdding(true);
    try {
      await createRecipe(Number(selMenuItem), Number(selIngredient), qty);
      const ing = ingredients.find(i => i.id === Number(selIngredient));
      setToast({ message: `Recipe link added!`, type: "success" });
      setSelMenuItem(""); setSelIngredient(""); setSelQty(""); setShowAdd(false);
      fetchAll();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setAdding(false); }
  };

  const handleUpdate = async () => {
    if (editId === null) return;
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) { setToast({ message: "Enter valid quantity", type: "error" }); return; }

    setSaving(true);
    try {
      await updateRecipe(editId, qty);
      setToast({ message: "Recipe updated!", type: "success" });
      setEditId(null);
      fetchAll();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, menuName: string, ingName: string) => {
    if (!confirm(`Remove ${ingName} from ${menuName}'s recipe?`)) return;
    try {
      await deleteRecipe(id);
      setToast({ message: "Recipe link removed", type: "success" });
      fetchAll();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  return (
    <div className="min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="nav-bar">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/live-tables" className="btn-ghost btn-icon flex items-center justify-center text-lg no-underline">←</Link>
            <div>
              <h1 className="text-lg font-bold">🧪 Recipe Management</h1>
              <p className="text-xs text-[var(--color-text-muted)]">Link ingredients to menu items</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/menu-manage" className="nav-link no-underline">🍽️ Menu</Link>
            <Link to="/inventory" className="nav-link no-underline">📦 Inventory</Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-24">
        {loading ? (
          <div className="grid gap-4">{[1,2,3].map(i => <div key={i} className="skeleton h-36" />)}</div>
        ) : (
          <div className="animate-fade-in">
            {/* Grouped by Menu Item */}
            {groupedRecipes.map(({ menuItem, recipes: itemRecipes }, index) => (
              <div key={menuItem.id} className="card mb-4 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-lg">{menuItem.name}</div>
                    <div className="text-sm text-[var(--color-accent)]">₹{menuItem.price}</div>
                  </div>
                  <span className="counter-badge">{itemRecipes.length}</span>
                </div>

                <div className="border-t border-[var(--color-border)] pt-3">
                  {itemRecipes.map((recipe) => (
                    <div key={recipe.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-b-0">
                      {editId === recipe.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm font-medium">{recipe.ingredient.name}:</span>
                          <input className="input text-sm" type="number" value={editQty} onChange={e => setEditQty(e.target.value)} style={{ width: 80 }} step="0.01" />
                          <span className="text-xs text-[var(--color-text-muted)]">{recipe.ingredient.unit}</span>
                          <button className="btn btn-primary text-xs" style={{ padding: "4px 12px", minHeight: "auto" }} onClick={handleUpdate} disabled={saving}>{saving ? "..." : "Save"}</button>
                          <button className="btn btn-ghost text-xs" style={{ padding: "4px 8px", minHeight: "auto" }} onClick={() => setEditId(null)}>✕</button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{recipe.ingredient.name}</span>
                            <span className="text-sm text-[var(--color-accent)] font-bold">{recipe.quantityRequired} {recipe.ingredient.unit}</span>
                            <span className="text-xs text-[var(--color-text-muted)]">per serving</span>
                          </div>
                          <div className="flex gap-1">
                            <button className="btn btn-ghost text-xs" style={{ padding: "4px 8px", minHeight: "auto" }} onClick={() => { setEditId(recipe.id); setEditQty(String(recipe.quantityRequired)); }}>✏️</button>
                            <button className="btn btn-ghost text-xs" style={{ padding: "4px 8px", minHeight: "auto", color: "var(--color-danger)" }} onClick={() => handleDelete(recipe.id, menuItem.name, recipe.ingredient.name)}>🗑️</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Items without recipes */}
            {noRecipeItems.length > 0 && (
              <div className="card" style={{ borderColor: "var(--color-warning)", background: "var(--color-warning-bg)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⚠️</span>
                  <div className="font-bold text-[var(--color-warning)]">Items without recipes</div>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mb-3">
                  These menu items won't deduct inventory when ordered. Add recipe links using the + button.
                </p>
                <div className="flex flex-wrap gap-2">
                  {noRecipeItems.map((item) => (
                    <span key={item.id} className="badge badge-pending">{item.name}</span>
                  ))}
                </div>
              </div>
            )}

            {groupedRecipes.length === 0 && noRecipeItems.length === 0 && (
              <div className="empty-state mt-12">
                <div className="empty-state-icon">🧪</div>
                <p className="text-lg font-semibold">No recipes yet</p>
                <p className="text-sm mt-1">Add menu items and ingredients first, then link them here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Recipe FAB */}
      <button className="fab animate-pulse-glow" onClick={() => setShowAdd(true)} id="add-recipe-fab" aria-label="Add Recipe">+</button>

      {/* Add Recipe Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add Recipe Link</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Specify how much of an ingredient is used when 1 serving of a menu item is ordered.
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Menu Item</label>
                <select className="input" value={selMenuItem} onChange={e => setSelMenuItem(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">Select a dish...</option>
                  {menuItems.map(mi => <option key={mi.id} value={mi.id}>{mi.name} (₹{mi.price})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Ingredient</label>
                <select className="input" value={selIngredient} onChange={e => setSelIngredient(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">Select an ingredient...</option>
                  {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">
                  Quantity Required (per 1 serving)
                  {selIngredient && (
                    <span className="ml-1 text-[var(--color-accent)]">
                      in {ingredients.find(i => i.id === Number(selIngredient))?.unit}
                    </span>
                  )}
                </label>
                <input className="input" type="number" value={selQty} onChange={e => setSelQty(e.target.value)} placeholder="e.g. 0.2" min={0} step="0.01" />
              </div>

              {selMenuItem && selIngredient && selQty && parseFloat(selQty) > 0 && (
                <div className="card text-sm text-center">
                  <span className="text-[var(--color-text-muted)]">When 1 </span>
                  <strong>{menuItems.find(m => m.id === Number(selMenuItem))?.name}</strong>
                  <span className="text-[var(--color-text-muted)]"> is ordered, </span>
                  <strong className="text-[var(--color-accent)]">{selQty} {ingredients.find(i => i.id === Number(selIngredient))?.unit}</strong>
                  <span className="text-[var(--color-text-muted)]"> of </span>
                  <strong>{ingredients.find(i => i.id === Number(selIngredient))?.name}</strong>
                  <span className="text-[var(--color-text-muted)]"> will be deducted</span>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button className="btn btn-secondary flex-1" onClick={() => { setShowAdd(false); setSelMenuItem(""); setSelIngredient(""); setSelQty(""); }}>Cancel</button>
                <button className="btn btn-primary flex-1" onClick={handleAdd} disabled={adding}>
                  {adding ? <span className="spinner" /> : "Add Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
