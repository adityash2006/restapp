import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const POLL_INTERVAL = 2000; // 2 seconds

async function processKOT(job: any) {
  const order = job.order;
  const lines: string[] = [];

  lines.push("==================");
  lines.push("  KITCHEN ORDER");
  lines.push(`  Table ${order.tableNumber}`);
  lines.push("==================");

  for (const item of order.items) {
    lines.push(`${item.quantity} x ${item.menuItem.name}`);
  }

  lines.push("==================");
  lines.push("");

  console.log(lines.join("\n"));
}

async function processBILL(job: any) {
  const order = job.order;
  const lines: string[] = [];

  lines.push("==================");
  lines.push("       BILL");
  lines.push(`  Table ${order.tableNumber}`);
  lines.push("==================");

  for (const item of order.items) {
    lines.push(`${item.menuItem.name} x ${item.quantity} = ₹${item.subtotal}`);
  }

  lines.push("------------------");
  lines.push(`TOTAL = ₹${order.totalAmount}`);
  lines.push("==================");
  lines.push("");

  console.log(lines.join("\n"));
}

async function pollPrintJobs() {
  try {
    const pendingJobs = await prisma.printJob.findMany({
      where: { status: "PENDING" },
      include: {
        order: {
          include: {
            items: {
              include: { menuItem: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (pendingJobs.length === 0) return;

    console.log(`\n🖨️  Processing ${pendingJobs.length} print job(s)...\n`);

    for (const job of pendingJobs) {
      try {
        if (job.type === "KOT") {
          await processKOT(job);
        } else if (job.type === "BILL") {
          await processBILL(job);
        }

        // Mark as completed
        await prisma.printJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            processedAt: new Date(),
          },
        });

        console.log(`✅ Print job #${job.id} (${job.type}) completed`);
      } catch (error) {
        console.error(`❌ Print job #${job.id} failed:`, error);

        await prisma.printJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            processedAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error("Error polling print jobs:", error);
  }
}

async function main() {
  console.log("🖨️  Kesari Printer Worker started");
  console.log(`   Polling every ${POLL_INTERVAL / 1000}s for pending print jobs...\n`);

  // Poll indefinitely
  setInterval(pollPrintJobs, POLL_INTERVAL);

  // Run once immediately
  await pollPrintJobs();
}

main().catch((e) => {
  console.error("Printer worker error:", e);
  process.exit(1);
});
