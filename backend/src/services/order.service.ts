import prisma from "../db";
import type { OrderStatus } from "../../generated/prisma/client.ts";

export async function getActiveOrders() {
  return prisma.tableOrder.findMany({
    where: { status: "PENDING" },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(id: number) {
  return prisma.tableOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
  });
}

export async function createOrder(tableNumber: number) {
  // Prevent duplicate PENDING orders for the same table
  const existingOrder = await prisma.tableOrder.findFirst({
    where: {
      tableNumber,
      status: "PENDING",
    },
  });

  if (existingOrder) {
    throw new Error(
      `Table ${tableNumber} already has an active order (Order #${existingOrder.id}). Close it before creating a new one.`
    );
  }

  return prisma.tableOrder.create({
    data: {
      tableNumber,
      status: "PENDING",
      totalAmount: 0,
    },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
  });
}

export async function addItemToOrder(
  orderId: number,
  menuItemId: number,
  quantity: number
) {
  // --- All validation first (read-only queries) ---

  // 1. Verify order exists and is PENDING
  const order = await prisma.tableOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.status !== "PENDING") throw new Error("Order is not active");

  // 2. Get menu item
  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!menuItem) throw new Error("Menu item not found");

  // 3. Get recipes for inventory deduction
  const recipes = await prisma.recipe.findMany({
    where: { menuItemId },
    include: { ingredient: true },
  });

  // --- Now perform all writes in a batch transaction ---
  const subtotal = menuItem.price * quantity;

  // Build the list of write operations
  const operations: any[] = [];

  // Create order item
  operations.push(
    prisma.orderItem.create({
      data: {
        orderId,
        menuItemId,
        quantity,
        unitPrice: menuItem.price,
        subtotal,
      },
    })
  );

  // Update order total
  operations.push(
    prisma.tableOrder.update({
      where: { id: orderId },
      data: {
        totalAmount: { increment: subtotal },
      },
    })
  );

  // Reduce inventory for each recipe ingredient
  for (const recipe of recipes) {
    const deduction = recipe.quantityRequired * quantity;
    operations.push(
      prisma.ingredient.update({
        where: { id: recipe.ingredientId },
        data: {
          stockQuantity: { decrement: deduction },
        },
      })
    );
  }

  // Create print jobs (KOT and BILL)
  operations.push(
    prisma.printJob.create({
      data: { orderId, type: "KOT", status: "PENDING" },
    })
  );
  operations.push(
    prisma.printJob.create({
      data: { orderId, type: "BILL", status: "PENDING" },
    })
  );

  // Execute all writes atomically
  await prisma.$transaction(operations);

  // Fetch and return the updated order
  const updatedOrder = await prisma.tableOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
  });

  return { orderItem: { menuItem }, order: updatedOrder };
}

export async function updateOrderStatus(id: number, status: OrderStatus) {
  return prisma.tableOrder.update({
    where: { id },
    data: { status },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
  });
}

export async function getTodaySummary() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const completedOrders = await prisma.tableOrder.findMany({
    where: {
      status: "DONE",
      updatedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const orderCount = completedOrders.length;
  const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  return {
    totalRevenue,
    orderCount,
    averageOrderValue,
    orders: completedOrders,
  };
}
