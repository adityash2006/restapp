import prisma from "../db";

export async function getRecipesForMenuItem(menuItemId: number) {
  return prisma.recipe.findMany({
    where: { menuItemId },
    include: { ingredient: true, menuItem: true },
  });
}

export async function getAllRecipes() {
  return prisma.recipe.findMany({
    include: { ingredient: true, menuItem: true },
    orderBy: { menuItemId: "asc" },
  });
}

export async function addRecipe(menuItemId: number, ingredientId: number, quantityRequired: number) {
  // Check if this mapping already exists
  const existing = await prisma.recipe.findUnique({
    where: { menuItemId_ingredientId: { menuItemId, ingredientId } },
  });
  if (existing) {
    throw new Error("This ingredient is already linked to this menu item. Update it instead.");
  }

  return prisma.recipe.create({
    data: { menuItemId, ingredientId, quantityRequired },
    include: { ingredient: true, menuItem: true },
  });
}

export async function updateRecipe(id: number, quantityRequired: number) {
  return prisma.recipe.update({
    where: { id },
    data: { quantityRequired },
    include: { ingredient: true, menuItem: true },
  });
}

export async function deleteRecipe(id: number) {
  return prisma.recipe.delete({ where: { id } });
}
