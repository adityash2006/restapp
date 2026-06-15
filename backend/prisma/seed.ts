import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data in correct order
  await prisma.printJob.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.tableOrder.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.menuItem.deleteMany();

  // Seed Menu Items
  const menuItems = await Promise.all([
    prisma.menuItem.create({ data: { name: "Paneer Butter Masala", price: 250 } }),
    prisma.menuItem.create({ data: { name: "Butter Naan", price: 40 } }),
    prisma.menuItem.create({ data: { name: "Dal Tadka", price: 180 } }),
    prisma.menuItem.create({ data: { name: "Veg Biryani", price: 220 } }),
    prisma.menuItem.create({ data: { name: "Coke", price: 40 } }),
    prisma.menuItem.create({ data: { name: "Mineral Water", price: 20 } }),
  ]);

  console.log(`✅ Created ${menuItems.length} menu items`);

  // Seed Ingredients
  const ingredients = await Promise.all([
    prisma.ingredient.create({ data: { name: "Paneer", stockQuantity: 10, unit: "kg" } }),
    prisma.ingredient.create({ data: { name: "Butter", stockQuantity: 5, unit: "kg" } }),
    prisma.ingredient.create({ data: { name: "Rice", stockQuantity: 20, unit: "kg" } }),
    prisma.ingredient.create({ data: { name: "Cream", stockQuantity: 3, unit: "litres" } }),
  ]);

  console.log(`✅ Created ${ingredients.length} ingredients`);

  // Find items and ingredients by name for recipe creation
  const paneerButterMasala = menuItems.find((m) => m.name === "Paneer Butter Masala")!;
  const vegBiryani = menuItems.find((m) => m.name === "Veg Biryani")!;
  const paneer = ingredients.find((i) => i.name === "Paneer")!;
  const butter = ingredients.find((i) => i.name === "Butter")!;
  const cream = ingredients.find((i) => i.name === "Cream")!;
  const rice = ingredients.find((i) => i.name === "Rice")!;

  // Seed Recipes
  const recipes = await Promise.all([
    // Paneer Butter Masala recipes
    prisma.recipe.create({
      data: {
        menuItemId: paneerButterMasala.id,
        ingredientId: paneer.id,
        quantityRequired: 0.2,
      },
    }),
    prisma.recipe.create({
      data: {
        menuItemId: paneerButterMasala.id,
        ingredientId: butter.id,
        quantityRequired: 0.05,
      },
    }),
    prisma.recipe.create({
      data: {
        menuItemId: paneerButterMasala.id,
        ingredientId: cream.id,
        quantityRequired: 0.02,
      },
    }),
    // Veg Biryani recipes
    prisma.recipe.create({
      data: {
        menuItemId: vegBiryani.id,
        ingredientId: rice.id,
        quantityRequired: 0.25,
      },
    }),
  ]);

  console.log(`✅ Created ${recipes.length} recipes`);
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
