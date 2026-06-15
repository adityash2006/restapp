import { Router } from "express";
import {
  getAllIngredients,
  createIngredient,
  updateIngredient,
  restockIngredient,
  deleteIngredient,
} from "../services/inventory.service";

const router = Router();

// GET /api/inventory
router.get("/", async (_req, res) => {
  try {
    const ingredients = await getAllIngredients();
    res.json(ingredients);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// POST /api/inventory
router.post("/", async (req, res) => {
  try {
    const { name, stockQuantity, unit } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Name is required" }); return;
    }
    if (stockQuantity === undefined || typeof stockQuantity !== "number" || stockQuantity < 0) {
      res.status(400).json({ error: "Stock quantity must be a non-negative number" }); return;
    }
    if (!unit || typeof unit !== "string" || unit.trim() === "") {
      res.status(400).json({ error: "Unit is required (e.g. kg, litres, pieces)" }); return;
    }

    const ingredient = await createIngredient(name.trim(), stockQuantity, unit.trim());
    res.status(201).json(ingredient);
  } catch (error: any) {
    console.error("Error creating ingredient:", error);
    const status = error.message?.includes("already exists") ? 409 : 500;
    res.status(status).json({ error: error.message || "Failed to create ingredient" });
  }
});

// PATCH /api/inventory/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { name, stockQuantity, unit } = req.body;
    const data: { name?: string; stockQuantity?: number; unit?: string } = {};
    if (name !== undefined) data.name = name.trim();
    if (stockQuantity !== undefined) data.stockQuantity = stockQuantity;
    if (unit !== undefined) data.unit = unit.trim();

    const ingredient = await updateIngredient(id, data);
    res.json(ingredient);
  } catch (error: any) {
    console.error("Error updating ingredient:", error);
    const status = error.message?.includes("already exists") ? 409 : 500;
    res.status(status).json({ error: error.message || "Failed to update ingredient" });
  }
});

// POST /api/inventory/:id/restock
router.post("/:id/restock", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { quantity } = req.body;
    if (quantity === undefined || typeof quantity !== "number" || quantity <= 0) {
      res.status(400).json({ error: "Quantity must be a positive number" }); return;
    }

    const ingredient = await restockIngredient(id, quantity);
    res.json(ingredient);
  } catch (error: any) {
    console.error("Error restocking ingredient:", error);
    res.status(500).json({ error: error.message || "Failed to restock ingredient" });
  }
});

// DELETE /api/inventory/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    await deleteIngredient(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting ingredient:", error);
    const status = error.message?.includes("Cannot delete") ? 400 : 500;
    res.status(status).json({ error: error.message || "Failed to delete ingredient" });
  }
});

export default router;
