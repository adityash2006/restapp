import { Router } from "express";
import {
  getActiveOrders,
  getOrderById,
  createOrder,
  addItemToOrder,
  updateOrderStatus,
  getTodaySummary,
} from "../services/order.service";

const router = Router();

// GET /api/orders/active
router.get("/active", async (_req, res) => {
  try {
    const orders = await getActiveOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching active orders:", error);
    res.status(500).json({ error: "Failed to fetch active orders" });
  }
});

// GET /api/orders/summary/today
router.get("/summary/today", async (_req, res) => {
  try {
    const summary = await getTodaySummary();
    res.json(summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch today's summary" });
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const order = await getOrderById(id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST /api/orders
router.post("/", async (req, res) => {
  try {
    const { tableNumber } = req.body;
    if (!tableNumber || typeof tableNumber !== "number") {
      res.status(400).json({ error: "Table number is required and must be a number" });
      return;
    }

    const order = await createOrder(tableNumber);
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// POST /api/orders/:id/items
router.post("/:id/items", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const { menuItemId, quantity } = req.body;
    if (!menuItemId || !quantity) {
      res.status(400).json({ error: "menuItemId and quantity are required" });
      return;
    }

    const result = await addItemToOrder(orderId, menuItemId, quantity);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error adding item:", error);
    const message = error.message || "Failed to add item to order";
    const status = message.includes("not found") || message.includes("not active") ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const { status } = req.body;
    if (!status || !["PENDING", "DONE"].includes(status)) {
      res.status(400).json({ error: "Status must be PENDING or DONE" });
      return;
    }

    const order = await updateOrderStatus(id, status);
    res.json(order);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
