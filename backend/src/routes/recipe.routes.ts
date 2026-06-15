import { Router } from "express";
import {
  getAllRecipes,
  getRecipesForMenuItem,
  addRecipe,
  updateRecipe,
  deleteRecipe,
} from "../services/recipe.service";

const router = Router();

// GET /api/recipes
router.get("/", async (_req, res) => {
  try {
    const recipes = await getAllRecipes();
    res.json(recipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

// GET /api/recipes/menu-item/:menuItemId
router.get("/menu-item/:menuItemId", async (req, res) => {
  try {
    const menuItemId = parseInt(req.params.menuItemId);
    if (isNaN(menuItemId)) { res.status(400).json({ error: "Invalid menu item ID" }); return; }

    const recipes = await getRecipesForMenuItem(menuItemId);
    res.json(recipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

// POST /api/recipes
router.post("/", async (req, res) => {
  try {
    const { menuItemId, ingredientId, quantityRequired } = req.body;
    if (!menuItemId || !ingredientId || quantityRequired === undefined) {
      res.status(400).json({ error: "menuItemId, ingredientId, and quantityRequired are required" }); return;
    }
    if (quantityRequired <= 0) {
      res.status(400).json({ error: "quantityRequired must be positive" }); return;
    }

    const recipe = await addRecipe(menuItemId, ingredientId, quantityRequired);
    res.status(201).json(recipe);
  } catch (error: any) {
    console.error("Error creating recipe:", error);
    const status = error.message?.includes("already linked") ? 409 : 500;
    res.status(status).json({ error: error.message || "Failed to create recipe" });
  }
});

// PATCH /api/recipes/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { quantityRequired } = req.body;
    if (quantityRequired === undefined || quantityRequired <= 0) {
      res.status(400).json({ error: "quantityRequired must be positive" }); return;
    }

    const recipe = await updateRecipe(id, quantityRequired);
    res.json(recipe);
  } catch (error: any) {
    console.error("Error updating recipe:", error);
    res.status(500).json({ error: error.message || "Failed to update recipe" });
  }
});

// DELETE /api/recipes/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    await deleteRecipe(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: error.message || "Failed to delete recipe" });
  }
});

export default router;
