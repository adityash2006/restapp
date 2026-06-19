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

// A pending ingredient link (not yet saved)
interface PendingLink {
  ingredientId: number;
  ingredientName: string;
  ingredientUnit: string;
  quantity: string;
}

export default function RecipesPage() {
  const [menuItems, setMenuItems] = useState<MenuItemWithRecipes[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Add recipe modal
  const [showAdd, setShowAdd] = useState(false);
  const [selMenuItem, setSelMenuItem] = useState<number | "">("");
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [saving, setSaving] = useState(false);

  // Inline add to existing card
  const [inlineAddFor, setInlineAddFor] = useState<number | null>(null); // menuItem id
  const [inlineIngId, setInlineIngId] = useState<number | "">("");
  const [inlineQty, setInlineQty] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

  // --- Multi-ingredient add modal ---

  // Get ingredients not already linked (for the selected menu item) and not already in pending
  const getAvailableIngredients = (menuItemId: number | "") => {
    if (!menuItemId) return ingredients;
    const linkedIds = recipes
      .filter((r) => r.menuItemId === Number(menuItemId))
      .map((r) => r.ingredientId);
    const pendingIds = pendingLinks.map((p) => p.ingredientId);
    return ingredients.filter(
      (ing) => !linkedIds.includes(ing.id) && !pendingIds.includes(ing.id)
    );
  };

  const addPendingLink = (ingredientId: number) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;
    setPendingLinks((prev) => [
      ...prev,
      { ingredientId: ing.id, ingredientName: ing.name, ingredientUnit: ing.unit, quantity: "" },
    ]);
  };

  const updatePendingQty = (ingredientId: number, qty: string) => {
    setPendingLinks((prev) =>
      prev.map((p) => (p.ingredientId === ingredientId ? { ...p, quantity: qty } : p))
    );
  };

  const removePendingLink = (ingredientId: number) => {
    setPendingLinks((prev) => prev.filter((p) => p.ingredientId !== ingredientId));
  };

  const handleSaveAll = async () => {
    if (!selMenuItem) { setToast({ message: "Select a menu item", type: "error" }); return; }
    if (pendingLinks.length === 0) { setToast({ message: "Add at least one ingredient", type: "error" }); return; }

    // Validate all quantities
    for (const link of pendingLinks) {
      const qty = parseFloat(link.quantity);
      if (isNaN(qty) || qty <= 0) {
        setToast({ message: `Enter a valid quantity for ${link.ingredientName}`, type: "error" });
        return;
      }
    }

    setSaving(true);
    try {
      // Save each recipe link one by one
      for (const link of pendingLinks) {
        await createRecipe(Number(selMenuItem), link.ingredientId, parseFloat(link.quantity));
      }
      setToast({ message: `${pendingLinks.length} ingredient${pendingLinks.length !== 1 ? "s" : ""} linked!`, type: "success" });
      setShowAdd(false);
      setSelMenuItem("");
      setPendingLinks([]);
      fetchAll();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setSaving(false); }
  };

  const closeAddModal = () => {
    setShowAdd(false);
    setSelMenuItem("");
    setPendingLinks([]);
  };

  // --- Inline add ingredient to existing card ---
  const handleInlineAdd = async (menuItemId: number) => {
    if (!inlineIngId) { setToast({ message: "Select an ingredient", type: "error" }); return; }
    const qty = parseFloat(inlineQty);
    if (isNaN(qty) || qty <= 0) { setToast({ message: "Enter valid quantity", type: "error" }); return; }

    setInlineSaving(true);
    try {
      await createRecipe(menuItemId, Number(inlineIngId), qty);
      setToast({ message: "Ingredient added!", type: "success" });
      setInlineAddFor(null);
      setInlineIngId("");
      setInlineQty("");
      fetchAll();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setInlineSaving(false); }
  };

  // --- Edit existing recipe ---
  const handleUpdate = async () => {
    if (editId === null) return;
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) { setToast({ message: "Enter valid quantity", type: "error" }); return; }

    setEditSaving(true);
    try {
      await updateRecipe(editId, qty);
      setToast({ message: "Recipe updated!", type: "success" });
      setEditId(null);
      fetchAll();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally { setEditSaving(false); }
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

  // Available ingredients for inline add (not already linked to this menu item)
  const getInlineAvailable = (menuItemId: number) => {
    const linkedIds = recipes
      .filter((r) => r.menuItemId === menuItemId)
      .map((r) => r.ingredientId);
    return ingredients.filter((ing) => !linkedIds.includes(ing.id));
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
            <Link to="/summary" className="nav-link no-underline">📊 Today</Link>
            <Link to="/detailed-summary" className="nav-link no-underline">📋 All Orders</Link>
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
                  <div className="flex items-center gap-2">
                    <span className="counter-badge">{itemRecipes.length}</span>
                    <button
                      className="btn btn-ghost text-xs"
                      style={{ padding: "4px 10px", minHeight: "auto" }}
                      onClick={() => {
                        setInlineAddFor(inlineAddFor === menuItem.id ? null : menuItem.id);
                        setInlineIngId("");
                        setInlineQty("");
                      }}
                    >
                      {inlineAddFor === menuItem.id ? "✕" : "+ Add"}
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-3">
                  {itemRecipes.map((recipe) => (
                    <div key={recipe.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-b-0">
                      {editId === recipe.id ? (
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <span className="text-sm font-medium">{recipe.ingredient.name}:</span>
                          <input className="input text-sm" type="number" value={editQty} onChange={e => setEditQty(e.target.value)} style={{ width: 80 }} step="0.01" />
                          <span className="text-xs text-[var(--color-text-muted)]">{recipe.ingredient.unit}</span>
                          <button className="btn btn-primary text-xs" style={{ padding: "4px 12px", minHeight: "auto" }} onClick={handleUpdate} disabled={editSaving}>{editSaving ? "..." : "Save"}</button>
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

                  {/* Inline add ingredient row */}
                  {inlineAddFor === menuItem.id && (
                    <div className="mt-3 pt-3 border-t border-dashed border-[var(--color-border)]">
                      <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase">Add ingredient to {menuItem.name}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          className="input text-sm flex-1"
                          value={inlineIngId}
                          onChange={e => setInlineIngId(e.target.value ? Number(e.target.value) : "")}
                          style={{ minWidth: 140 }}
                        >
                          <option value="">Select ingredient...</option>
                          {getInlineAvailable(menuItem.id).map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                          ))}
                        </select>
                        <input
                          className="input text-sm"
                          type="number"
                          value={inlineQty}
                          onChange={e => setInlineQty(e.target.value)}
                          placeholder="Qty"
                          step="0.01"
                          style={{ width: 80 }}
                        />
                        {inlineIngId && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {ingredients.find(i => i.id === Number(inlineIngId))?.unit}
                          </span>
                        )}
                        <button
                          className="btn btn-primary text-xs"
                          style={{ padding: "6px 14px", minHeight: "auto" }}
                          onClick={() => handleInlineAdd(menuItem.id)}
                          disabled={inlineSaving}
                        >
                          {inlineSaving ? "..." : "Add"}
                        </button>
                      </div>
                    </div>
                  )}
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
                  These menu items won't deduct inventory when ordered. Click on one to set up its recipe.
                </p>
                <div className="flex flex-wrap gap-2">
                  {noRecipeItems.map((item) => (
                    <button
                      key={item.id}
                      className="badge badge-pending"
                      style={{ cursor: "pointer", border: "1px solid var(--color-border)" }}
                      onClick={() => { setShowAdd(true); setSelMenuItem(item.id); setPendingLinks([]); }}
                    >
                      + {item.name}
                    </button>
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
      <button className="fab animate-pulse-glow" onClick={() => { setShowAdd(true); setSelMenuItem(""); setPendingLinks([]); }} id="add-recipe-fab" aria-label="Add Recipe">+</button>

      {/* Add Recipe Modal — Multi-ingredient */}
      {showAdd && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflow: "auto" }}>
            <h2 className="text-xl font-bold mb-2">Set Up Recipe</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Select a menu item, then add all the ingredients it uses with quantities per serving.
            </p>

            {/* Menu Item Selection */}
            <div className="mb-4">
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">Menu Item</label>
              <select
                className="input"
                value={selMenuItem}
                onChange={e => { setSelMenuItem(e.target.value ? Number(e.target.value) : ""); setPendingLinks([]); }}
              >
                <option value="">Select a dish...</option>
                {menuItems.map(mi => <option key={mi.id} value={mi.id}>{mi.name} (₹{mi.price})</option>)}
              </select>
            </div>

            {selMenuItem && (
              <>
                {/* Already linked ingredients */}
                {(() => {
                  const existing = recipes.filter(r => r.menuItemId === Number(selMenuItem));
                  if (existing.length === 0) return null;
                  return (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase">Already linked</div>
                      <div className="flex flex-wrap gap-2">
                        {existing.map(r => (
                          <span key={r.id} className="badge badge-done text-xs">
                            {r.ingredient.name}: {r.quantityRequired} {r.ingredient.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Add ingredient to list */}
                <div className="mb-3">
                  <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase">Add ingredients</div>
                  <div className="flex gap-2">
                    <select
                      className="input flex-1 text-sm"
                      value=""
                      onChange={e => {
                        if (e.target.value) addPendingLink(Number(e.target.value));
                      }}
                    >
                      <option value="">+ Pick an ingredient...</option>
                      {getAvailableIngredients(selMenuItem).map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                  </div>
                  {getAvailableIngredients(selMenuItem).length === 0 && pendingLinks.length === 0 && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      All ingredients are already linked. Add new ingredients in the <Link to="/inventory" className="text-[var(--color-accent)]">Inventory page</Link>.
                    </p>
                  )}
                </div>

                {/* Pending links list */}
                {pendingLinks.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-col gap-2">
                      {pendingLinks.map((link) => (
                        <div
                          key={link.ingredientId}
                          className="card flex items-center justify-between"
                          style={{ padding: "10px 14px" }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{link.ingredientName}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <input
                              className="input text-sm text-center"
                              type="number"
                              value={link.quantity}
                              onChange={e => updatePendingQty(link.ingredientId, e.target.value)}
                              placeholder="Qty"
                              step="0.01"
                              style={{ width: 70 }}
                            />
                            <span className="text-xs text-[var(--color-text-muted)] w-12">{link.ingredientUnit}</span>
                            <button
                              className="btn btn-ghost text-xs"
                              style={{ padding: "4px 8px", minHeight: "auto", color: "var(--color-danger)" }}
                              onClick={() => removePendingLink(link.ingredientId)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Preview */}
                    <div className="card mt-3 text-sm text-center" style={{ background: "var(--color-surface)" }}>
                      <div className="text-[var(--color-text-muted)] mb-1">When 1 serving of <strong>{menuItems.find(m => m.id === Number(selMenuItem))?.name}</strong> is ordered:</div>
                      {pendingLinks.map(link => (
                        <div key={link.ingredientId}>
                          <strong className="text-[var(--color-accent)]">{link.quantity || "?"} {link.ingredientUnit}</strong> of {link.ingredientName} will be deducted
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button className="btn btn-secondary flex-1" onClick={closeAddModal}>Cancel</button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={handleSaveAll}
                    disabled={saving || pendingLinks.length === 0}
                  >
                    {saving ? <span className="spinner" /> : `Save ${pendingLinks.length} Link${pendingLinks.length !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </>
            )}

            {!selMenuItem && (
              <div className="flex gap-3 mt-2">
                <button className="btn btn-secondary flex-1" onClick={closeAddModal}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
