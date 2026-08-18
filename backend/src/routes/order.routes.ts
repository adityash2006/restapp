import { Router } from "express";
import {
  getActiveOrders,
  getOrderById,
  createOrder,
  addItemsToOrder,
  updateOrderStatus,
  getTodaySummary,
  getDetailedSummary,
  removeOrderItem,
  updateOrderPaymentMethod,
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

// GET /api/orders/summary/detailed
router.get("/summary/detailed", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let start: Date | undefined;
    let end: Date | undefined;
    
    if (startDate) start = new Date(startDate as string);
    if (endDate) {
      end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
    }
    
    const summary = await getDetailedSummary(start, end);
    res.json(summary);
  } catch (error) {
    console.error("Error fetching detailed summary:", error);
    res.status(500).json({ error: "Failed to fetch detailed summary" });
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
  } catch (error: any) {
    console.error("Error creating order:", error);
    const message = error.message || "Failed to create order";
    const status = message.includes("already has") ? 409 : 500;
    res.status(status).json({ error: message });
  }
});

// POST /api/orders/:id/items — accepts batch: { items: [{ menuItemId, quantity }, ...] }
router.post("/:id/items", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    let items: { menuItemId: number; quantity: number }[] = [];

    // Support both batch and legacy single-item format
    if (req.body.items && Array.isArray(req.body.items)) {
      items = req.body.items;
    } else if (req.body.menuItemId && req.body.quantity) {
      // Legacy single-item format
      items = [{ menuItemId: req.body.menuItemId, quantity: req.body.quantity }];
    }

    if (items.length === 0) {
      res.status(400).json({ error: "At least one item is required" });
      return;
    }

    // Validate each item
    for (const item of items) {
      if (!item.menuItemId || !item.quantity || item.quantity < 1) {
        res.status(400).json({ error: "Each item must have a valid menuItemId and quantity >= 1" });
        return;
      }
    }

    const result = await addItemsToOrder(orderId, items);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error adding items:", error);
    const message = error.message || "Failed to add items to order";
    const status = message.includes("not found") || message.includes("not active") ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

// DELETE /api/orders/:id/items/:itemId
router.delete("/:id/items/:itemId", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    
    if (isNaN(orderId) || isNaN(itemId)) {
      res.status(400).json({ error: "Invalid order ID or item ID" });
      return;
    }

    const result = await removeOrderItem(orderId, itemId);
    res.json(result);
  } catch (error: any) {
    console.error("Error removing item:", error);
    const message = error.message || "Failed to remove item from order";
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

    const { status, discount } = req.body;
    if (!status || !["PENDING", "DONE"].includes(status)) {
      res.status(400).json({ error: "Status must be PENDING or DONE" });
      return;
    }

    const order = await updateOrderStatus(id, status as any, discount);
    res.json(order);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// PATCH /api/orders/:id/payment
router.patch("/:id/payment", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const { paymentMethod } = req.body;
    if (paymentMethod !== null && !["CASH", "ONLINE"].includes(paymentMethod)) {
      res.status(400).json({ error: "paymentMethod must be null, CASH, or ONLINE" });
      return;
    }

    const order = await updateOrderPaymentMethod(id, paymentMethod);
    res.json(order);
  } catch (error: any) {
    console.error("Error updating payment method:", error);
    const message = error.message || "Failed to update payment method";
    const status = message.includes("not found") || message.includes("Invalid") ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
