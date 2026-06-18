import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import { printerConfig, restaurantInfo } from "./src/printerConfig";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function sendRawToWindowsPrinter(shareName: string, buffer: Buffer): Promise<void> {
  const tempFile = path.join(os.tmpdir(), `kesari_print_${Date.now()}.prn`);
  fs.writeFileSync(tempFile, buffer);
  try {
    // /b = binary mode, sends raw bytes through the Windows print spooler
    await execFileAsync("cmd.exe", ["/c", "copy", "/b", tempFile, `\\\\localhost\\${shareName}`]);
  } finally {
    fs.unlink(tempFile, () => {});
  }
}

async function testPrinter(name: string, config: typeof printerConfig.counter) {
  console.log(`\n🔌 Testing ${name.toUpperCase()} printer...`);
  console.log(`   Interface: ${config.interface}`);
  console.log(`   Mode: ${config.mode}`);

  const printer = new ThermalPrinter({
    type: config.type,
    interface: config.mode === "network" ? config.interface : "buffer:dummy", // not used for windows-shared
    width: config.width,
    options: config.options,
  });

  // Build receipt content
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(restaurantInfo.name);
  printer.bold(false);
  printer.setTextNormal();
  printer.println(restaurantInfo.tagline || "");
  printer.drawLine();

  printer.alignCenter();
  printer.println("*** PRINTER TEST ***");
  printer.println(`Printer: ${name.toUpperCase()}`);
  printer.println(`Time: ${new Date().toLocaleString("en-IN")}`);
  printer.drawLine();

  printer.alignLeft();
  printer.println("If you can read this,");
  printer.println("the printer is working!");
  printer.drawLine();

  printer.alignCenter();
  printer.bold(true);
  printer.println("TEST SUCCESSFUL - PASS");
  printer.bold(false);
  printer.newLine();
  printer.newLine();
  printer.cut();

  try {
    if (config.mode === "windows-shared") {
      const buffer = printer.getBuffer();
      await sendRawToWindowsPrinter(config.interface, buffer);
      console.log(`   ✅ Sent to Windows spooler successfully!`);
      return true;
    } else {
      const isConnected = await printer.isPrinterConnected();
      console.log(`   Connected: ${isConnected ? "✅ YES" : "❌ NO"}`);
      if (!isConnected) {
        console.log(`   ⚠️  Could not connect to ${name} printer (check IP/network).`);
        return false;
      }
      await printer.execute();
      console.log(`   ✅ Test print sent successfully!`);
      return true;
    }
  } catch (error: any) {
    console.error(`   ❌ Print failed: ${error.message}`);
    return false;
  }
}

async function main() {
  const target = process.argv[2]?.toLowerCase();

  console.log("╔══════════════════════════════════════╗");
  console.log("║   🖨️  Kesari Printer Test             ║");
  console.log("╚══════════════════════════════════════╝");

  const results: { name: string; success: boolean }[] = [];

  if (!target || target === "counter") {
    const success = await testPrinter("counter", printerConfig.counter);
    results.push({ name: "Counter", success });
  }

  if (!target || target === "kitchen") {
    // @ts-ignore
    const success = await testPrinter("kitchen", printerConfig.kitchen);
    results.push({ name: "Kitchen", success });
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  RESULTS:");
  for (const r of results) {
    console.log(`    ${r.success ? "✅" : "❌"} ${r.name} printer: ${r.success ? "WORKING" : "FAILED"}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(console.error);