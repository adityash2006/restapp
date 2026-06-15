import prisma from "../db";

export async function getAllIngredients() {
  return prisma.ingredient.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getIngredientById(id: number) {
  return prisma.ingredient.findUnique({ where: { id } });
}

export async function createIngredient(name: string, stockQuantity: number, unit: string) {
  const existing = await prisma.ingredient.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`Ingredient "${name}" already exists`);
  }

  return prisma.ingredient.create({
    data: { name, stockQuantity, unit },
  });
}

export async function updateIngredient(id: number, data: { name?: string; stockQuantity?: number; unit?: string }) {
  if (data.name) {
    const existing = await prisma.ingredient.findFirst({
      where: { name: data.name, NOT: { id } },
    });
    if (existing) {
      throw new Error(`Ingredient "${data.name}" already exists`);
    }
  }

  return prisma.ingredient.update({
    where: { id },
    data,
  });
}

export async function restockIngredient(id: number, addQuantity: number) {
  return prisma.ingredient.update({
    where: { id },
    data: {
      stockQuantity: { increment: addQuantity },
    },
  });
}

export async function deleteIngredient(id: number) {
  // Check if used in any recipe
  const usedInRecipe = await prisma.recipe.findFirst({ where: { ingredientId: id } });
  if (usedInRecipe) {
    throw new Error("Cannot delete ingredient that is used in recipes. Remove it from recipes first.");
  }

  return prisma.ingredient.delete({ where: { id } });
}
