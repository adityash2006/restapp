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

// Types for the snapshot data stored in PrintJob.data
interface SlipItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
}

interface PrintData {
  tableNumber: number;
  items: SlipItem[];
  totalAmount?: number; // Only present in final BILL
}

function processKOT(data: PrintData) {
  const lines: string[] = [];

  lines.push("==================");
  lines.push("  🔥 KITCHEN ORDER");
  lines.push(`  Table ${data.tableNumber}`);
  lines.push(`  ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  lines.push("==================");

  for (const item of data.items) {
    lines.push(`  ${item.quantity} x ${item.name}`);
  }

  lines.push("==================");
  lines.push("");

  console.log(lines.join("\n"));
}

function processBILL(data: PrintData) {
  const lines: string[] = [];
  const isFinalBill = data.totalAmount !== undefined;

  lines.push("==================");
  if (isFinalBill) {
    lines.push("     📋 FINAL BILL");
  } else {
    lines.push("     🖥️ COUNTER SLIP");
  }
  lines.push(`  Table ${data.tableNumber}`);
  lines.push(`  ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  lines.push("==================");

  for (const item of data.items) {
    if (isFinalBill && item.subtotal !== undefined) {
      lines.push(`  ${item.name} x ${item.quantity} = ₹${item.subtotal}`);
    } else {
      lines.push(`  ${item.quantity} x ${item.name}`);
    }
  }

  // Only final bill has total
  if (isFinalBill) {
    lines.push("------------------");
    lines.push(`  TOTAL = ₹${data.totalAmount}`);
  }

  lines.push("==================");
  lines.push("");

  console.log(lines.join("\n"));
}

async function pollPrintJobs() {
  try {
    const pendingJobs = await prisma.printJob.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    if (pendingJobs.length === 0) return;

    console.log(`\n🖨️  Processing ${pendingJobs.length} print job(s)...\n`);

    for (const job of pendingJobs) {
      try {
        const data = job.data as any;

        if (!data) {
          console.warn(`⚠️  Print job #${job.id} has no data, skipping`);
          await prisma.printJob.update({
            where: { id: job.id },
            data: { status: "FAILED", processedAt: new Date() },
          });
          continue;
        }

        if (job.type === "KOT") {
          processKOT(data as PrintData);
        } else if (job.type === "BILL") {
          processBILL(data as PrintData);
        }

        // Mark as completed
        await prisma.printJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            processedAt: new Date(),
          },
        });

        const label = job.type === "BILL" && (data as PrintData).totalAmount !== undefined
          ? "FINAL BILL"
          : job.type === "BILL"
          ? "COUNTER SLIP"
          : "KOT";
        console.log(`✅ Print job #${job.id} (${label}) completed`);
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
