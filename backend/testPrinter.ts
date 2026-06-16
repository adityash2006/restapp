/**
 * Kesari Printer Test Script
 * 
 * Run this to verify your printers are working before starting the app.
 * 
 * Usage:
 *   bun run testPrinter.ts              -- tests both printers
 *   bun run testPrinter.ts counter      -- tests counter printer only
 *   bun run testPrinter.ts kitchen      -- tests kitchen printer only
 */

import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import { printerConfig, restaurantInfo } from "./src/printerConfig";

async function testPrinter(name: string, config: typeof printerConfig.counter) {
  console.log(`\n🔌 Testing ${name.toUpperCase()} printer...`);
  console.log(`   Interface: ${config.interface}`);
  console.log(`   Type: ${config.type === PrinterTypes.EPSON ? "EPSON" : "STAR"}`);

  const printer = new ThermalPrinter({
    type: config.type,
    interface: config.interface,
    width: config.width,
    options: config.options,
  });

  try {
    // Check connection
    const isConnected = await printer.isPrinterConnected();
    console.log(`   Connected: ${isConnected ? "✅ YES" : "❌ NO"}`);

    if (!isConnected) {
      console.log(`   ⚠️  Could not connect to ${name} printer.`);
      console.log(`   Check that:`);
      console.log(`     - The printer is turned on`);
      console.log(`     - The cable/network is connected`);
      console.log(`     - The interface value in src/printerConfig.ts is correct`);
      if (config.interface.startsWith("printer:")) {
        console.log(`     - The printer is shared in Windows Printer Settings`);
        console.log(`     - Try using "\\\\\\\\localhost\\\\PrinterShareName" instead`);
      }
      return false;
    }

    // Print test receipt
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
    printer.println("TEST SUCCESSFUL ✓");
    printer.bold(false);
    printer.newLine();
    printer.newLine();

    printer.cut();

    await printer.execute();
    console.log(`   ✅ Test print sent successfully!`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Print failed: ${error.message}`);
    return false;
  }
}

async function main() {
  const target = process.argv[2]?.toLowerCase(); // "counter", "kitchen", or undefined (both)

  console.log("╔══════════════════════════════════════╗");
  console.log("║   🖨️  Kesari Printer Test             ║");
  console.log("╚══════════════════════════════════════╝");

  const results: { name: string; success: boolean }[] = [];

  if (!target || target === "counter") {
    const success = await testPrinter("counter", printerConfig.counter);
    results.push({ name: "Counter", success });
  }

  if (!target || target === "kitchen") {
    const success = await testPrinter("kitchen", printerConfig.kitchen);
    results.push({ name: "Kitchen", success });
  }

  // Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  RESULTS:");
  for (const r of results) {
    console.log(`    ${r.success ? "✅" : "❌"} ${r.name} printer: ${r.success ? "WORKING" : "FAILED"}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allPassed = results.every((r) => r.success);
  if (allPassed) {
    console.log("🎉 All printers are working! You can start the app.\n");
  } else {
    console.log("⚠️  Fix the failed printer(s) above, then run this test again.\n");
  }
}

main().catch(console.error);
