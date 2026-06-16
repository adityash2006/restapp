import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { ThermalPrinter } from "node-thermal-printer";
import { printerConfig, restaurantInfo } from "./src/printerConfig";

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

// ── Printer Instances ──────────────────────────────────────────

function createPrinter(config: typeof printerConfig.counter): ThermalPrinter {
  return new ThermalPrinter({
    type: config.type,
    interface: config.interface,
    width: config.width,
    options: config.options,
  });
}

// ── KOT: Kitchen Order Ticket ──────────────────────────────────

async function printKOT(data: PrintData): Promise<void> {
  const printer = createPrinter(printerConfig.kitchen);

  // Header
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println("KITCHEN ORDER");
  printer.bold(false);
  printer.setTextNormal();
  printer.drawLine();

  // Table number — big and bold
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(`TABLE ${data.tableNumber}`);
  printer.setTextNormal();
  printer.bold(false);
  printer.println(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
  printer.drawLine();

  // Items
  printer.alignLeft();
  printer.bold(true);
  for (const item of data.items) {
    printer.setTextSize(0, 1); // taller text for kitchen readability
    printer.println(`${item.quantity} x ${item.name}`);
  }
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  printer.newLine();
  printer.newLine();
  printer.cut();

  await printer.execute();

  // Also log to console for backup
  console.log(`  [KOT] Table ${data.tableNumber}: ${data.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}`);
}

// ── Counter Slip (items added, no total) ───────────────────────

async function printCounterSlip(data: PrintData): Promise<void> {
  const printer = createPrinter(printerConfig.counter);

  // Header
  printer.alignCenter();
  printer.bold(true);
  printer.println("ORDER SLIP");
  printer.bold(false);
  printer.drawLine();

  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(0, 1);
  printer.println(`TABLE ${data.tableNumber}`);
  printer.setTextNormal();
  printer.bold(false);
  printer.println(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
  printer.drawLine();

  // Items
  printer.alignLeft();
  for (const item of data.items) {
    printer.println(`${item.quantity} x ${item.name}`);
  }
  printer.drawLine();

  printer.newLine();
  printer.cut();

  await printer.execute();

  console.log(`  [COUNTER SLIP] Table ${data.tableNumber}: ${data.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}`);
}

// ── Final Bill (all items + total) ─────────────────────────────

async function printFinalBill(data: PrintData): Promise<void> {
  const printer = createPrinter(printerConfig.counter);

  // Restaurant header
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(restaurantInfo.name);
  printer.bold(false);
  printer.setTextNormal();
  if (restaurantInfo.tagline) printer.println(restaurantInfo.tagline);
  printer.drawLine();

  // Bill header
  printer.alignCenter();
  printer.bold(true);
  printer.println("BILL");
  printer.bold(false);
  printer.setTextSize(0, 1);
  printer.println(`TABLE ${data.tableNumber}`);
  printer.setTextNormal();
  printer.println(new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }));
  printer.drawLine();

  // Column headers
  printer.alignLeft();
  printer.bold(true);
  printer.tableCustom([
    { text: "ITEM", align: "LEFT", width: 0.5 },
    { text: "QTY", align: "CENTER", width: 0.15 },
    { text: "RATE", align: "RIGHT", width: 0.15 },
    { text: "AMT", align: "RIGHT", width: 0.2 },
  ]);
  printer.bold(false);
  printer.drawLine();

  // Items
  for (const item of data.items) {
    printer.tableCustom([
      { text: item.name, align: "LEFT", width: 0.5 },
      { text: String(item.quantity), align: "CENTER", width: 0.15 },
      { text: `${item.unitPrice ?? ""}`, align: "RIGHT", width: 0.15 },
      { text: `${item.subtotal ?? ""}`, align: "RIGHT", width: 0.2 },
    ]);
  }

  printer.drawLine();

  // Total
  printer.alignRight();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(`TOTAL: Rs.${data.totalAmount}`);
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  // Footer
  printer.alignCenter();
  printer.println("Thank you! Visit again.");
  printer.newLine();
  printer.newLine();
  printer.cut();

  await printer.execute();

  console.log(`  [FINAL BILL] Table ${data.tableNumber}: Rs.${data.totalAmount}`);
}

// ── Poll & Process ─────────────────────────────────────────────

async function pollPrintJobs() {
  try {
    const pendingJobs = await prisma.printJob.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    if (pendingJobs.length === 0) return;

    console.log(`\n🖨️  Processing ${pendingJobs.length} print job(s)...`);

    for (const job of pendingJobs) {
      try {
        const data = job.data as any as PrintData | null;

        if (!data) {
          console.warn(`  ⚠️  Job #${job.id} has no data, skipping`);
          await prisma.printJob.update({
            where: { id: job.id },
            data: { status: "FAILED", processedAt: new Date() },
          });
          continue;
        }

        if (job.type === "KOT") {
          await printKOT(data);
        } else if (job.type === "BILL") {
          if (data.totalAmount !== undefined) {
            await printFinalBill(data);
          } else {
            await printCounterSlip(data);
          }
        }

        // Mark as completed
        await prisma.printJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            processedAt: new Date(),
          },
        });

        const label = job.type === "KOT" ? "KOT"
          : data.totalAmount !== undefined ? "FINAL BILL"
          : "COUNTER SLIP";
        console.log(`  ✅ Job #${job.id} (${label}) completed`);
      } catch (error: any) {
        console.error(`  ❌ Job #${job.id} failed: ${error.message}`);

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

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   🖨️  Kesari Printer Worker           ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`  Kitchen: ${printerConfig.kitchen.interface}`);
  console.log(`  Counter: ${printerConfig.counter.interface}`);
  console.log(`  Polling every ${POLL_INTERVAL / 1000}s...\n`);

  // Poll indefinitely
  setInterval(pollPrintJobs, POLL_INTERVAL);

  // Run once immediately
  await pollPrintJobs();
}

main().catch((e) => {
  console.error("Printer worker error:", e);
  process.exit(1);
});
