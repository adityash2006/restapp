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

/**
 * Add multiple items to an order in a single batch.
 * Creates ONE KOT (kitchen) + ONE counter slip with all items.
 * No total printed — total is only on the final BILL when order is DONE.
 */
export async function addItemsToOrder(
  orderId: number,
  items: { menuItemId: number; quantity: number }[]
) {
  // --- Validation ---
  const order = await prisma.tableOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.status !== "PENDING") throw new Error("Order is not active");

  if (!items || items.length === 0) throw new Error("No items provided");

  // Fetch all needed menu items at once
  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
  const menuItemsDb = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
  });

  // Validate all items exist
  for (const item of items) {
    const menuItem = menuItemsDb.find((m) => m.id === item.menuItemId);
    if (!menuItem) throw new Error(`Menu item #${item.menuItemId} not found`);
    if (item.quantity < 1) throw new Error(`Invalid quantity for ${menuItem.name}`);
  }

  // Fetch all recipes for these menu items at once
  const recipes = await prisma.recipe.findMany({
    where: { menuItemId: { in: menuItemIds } },
    include: { ingredient: true },
  });

  // --- Build all write operations ---
  const operations: any[] = [];
  let totalSubtotal = 0;

  // Data for print slips
  const printItems: { name: string; quantity: number }[] = [];

  for (const item of items) {
    const menuItem = menuItemsDb.find((m) => m.id === item.menuItemId)!;
    const subtotal = menuItem.price * item.quantity;
    totalSubtotal += subtotal;

    // Create order item
    operations.push(
      prisma.orderItem.create({
        data: {
          orderId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
          subtotal,
        },
      })
    );

    // Reduce inventory for this item's recipes
    const itemRecipes = recipes.filter((r) => r.menuItemId === item.menuItemId);
    for (const recipe of itemRecipes) {
      const deduction = recipe.quantityRequired * item.quantity;
      operations.push(
        prisma.ingredient.update({
          where: { id: recipe.ingredientId },
          data: {
            stockQuantity: { decrement: deduction },
          },
        })
      );
    }

    // Add to print data
    printItems.push({
      name: menuItem.name,
      quantity: item.quantity,
    });
  }

  // Update order total
  operations.push(
    prisma.tableOrder.update({
      where: { id: orderId },
      data: {
        totalAmount: { increment: totalSubtotal },
      },
    })
  );

  // Snapshot for print slips — only the new items, NO total
  const slipData = {
    tableNumber: order.tableNumber,
    items: printItems,
  };

  // KOT for kitchen
  operations.push(
    prisma.printJob.create({
      data: {
        orderId,
        type: "KOT",
        status: "PENDING",
        data: slipData,
      },
    })
  );

  // Counter slip (BILL type but no total — just awareness of what was ordered)
  operations.push(
    prisma.printJob.create({
      data: {
        orderId,
        type: "BILL",
        status: "PENDING",
        data: slipData,
      },
    })
  );

  // Execute all writes atomically
  await prisma.$transaction(operations);

  // Return updated order
  const updatedOrder = await prisma.tableOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
  });

  return { order: updatedOrder };
}

export async function updateOrderStatus(id: number, status: OrderStatus) {
  // Fetch full order before updating (for BILL snapshot)
  const order = await prisma.tableOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
  });

  if (!order) throw new Error("Order not found");

  // Update the status
  const updatedOrder = await prisma.tableOrder.update({
    where: { id },
    data: { status },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
  });

  // If marking as DONE, create a final BILL with all items + total
  if (status === "DONE") {
    const billData = {
      tableNumber: order.tableNumber,
      items: order.items.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      totalAmount: order.totalAmount,
    };

    await prisma.printJob.create({
      data: {
        orderId: id,
        type: "BILL",
        status: "PENDING",
        data: billData,
      },
    });
  }

  return updatedOrder;
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

export async function getDetailedSummary() {
  const completedOrders = await prisma.tableOrder.findMany({
    where: {
      status: "DONE",
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

/**
 * Remove a specific item from an order.
 * Restores inventory, adjusts total, and prints a CANCEL KOT to kitchen.
 */
export async function removeOrderItem(orderId: number, orderItemId: number) {
  // --- Validation ---
  const order = await prisma.tableOrder.findUnique({
    where: { id: orderId },
  });
  if (!order) throw new Error("Order not found");
  if (order.status !== "PENDING") throw new Error("Order is not active");

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { menuItem: true },
  });

  if (!orderItem || orderItem.orderId !== orderId) {
    throw new Error("Order item not found in this order");
  }

  // Fetch recipes for the menu item
  const recipes = await prisma.recipe.findMany({
    where: { menuItemId: orderItem.menuItemId },
    include: { ingredient: true },
  });

  // --- Build all write operations ---
  const operations: any[] = [];

  // Delete the order item
  operations.push(
    prisma.orderItem.delete({
      where: { id: orderItemId },
    })
  );

  // Restore inventory for this item's recipes
  for (const recipe of recipes) {
    const restoration = recipe.quantityRequired * orderItem.quantity;
    operations.push(
      prisma.ingredient.update({
        where: { id: recipe.ingredientId },
        data: {
          stockQuantity: { increment: restoration },
        },
      })
    );
  }

  // Update order total
  operations.push(
    prisma.tableOrder.update({
      where: { id: orderId },
      data: {
        totalAmount: { decrement: orderItem.subtotal },
      },
    })
  );

  // Snapshot for print slips — CANCEL slip
  const slipData = {
    tableNumber: order.tableNumber,
    items: [
      {
        name: orderItem.menuItem.name,
        quantity: orderItem.quantity,
      },
    ],
    isCancelled: true,
  };

  // KOT for kitchen (Cancel)
  operations.push(
    prisma.printJob.create({
      data: {
        orderId,
        type: "KOT",
        status: "PENDING",
        data: slipData,
      },
    })
  );

  // Counter slip (Cancel)
  operations.push(
    prisma.printJob.create({
      data: {
        orderId,
        type: "BILL",
        status: "PENDING",
        data: slipData,
      },
    })
  );

  // Execute all writes atomically
  await prisma.$transaction(operations);

  // Return updated order
  const updatedOrder = await prisma.tableOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
  });

  return { order: updatedOrder };
}
