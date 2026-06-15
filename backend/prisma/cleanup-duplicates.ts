import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all PENDING orders grouped by table number
  const pendingOrders = await prisma.tableOrder.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  const seen = new Map<number, number>(); // tableNumber -> first order id
  const duplicateIds: number[] = [];

  for (const order of pendingOrders) {
    if (seen.has(order.tableNumber)) {
      duplicateIds.push(order.id);
    } else {
      seen.set(order.tableNumber, order.id);
    }
  }

  if (duplicateIds.length === 0) {
    console.log("✅ No duplicate pending tables found.");
  } else {
    console.log(`🗑️  Found ${duplicateIds.length} duplicate order(s): ${duplicateIds.join(", ")}`);

    for (const id of duplicateIds) {
      // Delete print jobs, order items, then the order itself
      await prisma.printJob.deleteMany({ where: { orderId: id } });
      await prisma.orderItem.deleteMany({ where: { orderId: id } });
      await prisma.tableOrder.delete({ where: { id } });
      console.log(`   Deleted order #${id}`);
    }

    console.log("✅ Duplicates cleaned up.");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
