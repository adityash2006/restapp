import { Router } from "express";
import {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../services/menu.service";

const router = Router();

// GET /api/menu
router.get("/", async (_req, res) => {
  try {
    const items = await getAllMenuItems();
    res.json(items);
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// GET /api/menu/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const item = await getMenuItemById(id);
    if (!item) { res.status(404).json({ error: "Menu item not found" }); return; }

    res.json(item);
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({ error: "Failed to fetch menu item" });
  }
});

// POST /api/menu
router.post("/", async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Name is required" }); return;
    }
    if (price === undefined || typeof price !== "number" || price < 0) {
      res.status(400).json({ error: "Price must be a non-negative number" }); return;
    }

    const item = await createMenuItem(name.trim(), price);
    res.status(201).json(item);
  } catch (error: any) {
    console.error("Error creating menu item:", error);
    const status = error.message?.includes("already exists") ? 409 : 500;
    res.status(status).json({ error: error.message || "Failed to create menu item" });
  }
});

// PATCH /api/menu/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { name, price } = req.body;
    const data: { name?: string; price?: number } = {};
    if (name !== undefined) data.name = name.trim();
    if (price !== undefined) data.price = price;

    const item = await updateMenuItem(id, data);
    res.json(item);
  } catch (error: any) {
    console.error("Error updating menu item:", error);
    const status = error.message?.includes("already exists") ? 409 : 500;
    res.status(status).json({ error: error.message || "Failed to update menu item" });
  }
});

// DELETE /api/menu/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    await deleteMenuItem(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting menu item:", error);
    const status = error.message?.includes("Cannot delete") ? 400 : 500;
    res.status(status).json({ error: error.message || "Failed to delete menu item" });
  }
});

export default router;
