import prisma from "../db";

export async function getAllMenuItems() {
  return prisma.menuItem.findMany({
    orderBy: { name: "asc" },
    include: {
      recipes: {
        include: { ingredient: true },
      },
    },
  });
}

export async function getMenuItemById(id: number) {
  return prisma.menuItem.findUnique({
    where: { id },
    include: {
      recipes: {
        include: { ingredient: true },
      },
    },
  });
}

export async function createMenuItem(name: string, price: number) {
  // Check for duplicate name
  const existing = await prisma.menuItem.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`Menu item "${name}" already exists`);
  }

  return prisma.menuItem.create({
    data: { name, price },
    include: {
      recipes: {
        include: { ingredient: true },
      },
    },
  });
}

export async function updateMenuItem(id: number, data: { name?: string; price?: number }) {
  // If renaming, check for duplicate
  if (data.name) {
    const existing = await prisma.menuItem.findFirst({
      where: { name: data.name, NOT: { id } },
    });
    if (existing) {
      throw new Error(`Menu item "${data.name}" already exists`);
    }
  }

  return prisma.menuItem.update({
    where: { id },
    data,
    include: {
      recipes: {
        include: { ingredient: true },
      },
    },
  });
}

export async function deleteMenuItem(id: number) {
  // Check if any active orders reference this item
  const activeOrderItems = await prisma.orderItem.findFirst({
    where: {
      menuItemId: id,
      order: { status: "PENDING" },
    },
  });
  if (activeOrderItems) {
    throw new Error("Cannot delete menu item with active orders. Close those orders first.");
  }

  // Delete recipes first, then the item
  await prisma.recipe.deleteMany({ where: { menuItemId: id } });
  return prisma.menuItem.delete({ where: { id } });
}
