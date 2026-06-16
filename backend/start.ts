/**
 * Kesari Restaurant — Production Launcher
 * 
 * Starts both the backend server and printer worker in one terminal.
 * 
 * Usage:
 *   bun run start.ts
 */

import { spawn } from "child_process";
import path from "path";

const backendDir = import.meta.dir;

console.log("╔══════════════════════════════════════════╗");
console.log("║   🍽️  KESARI RESTAURANT SYSTEM            ║");
console.log("╚══════════════════════════════════════════╝");
console.log("");

// Start the backend (Express + static frontend)
const backend = spawn("bun", ["run", "index.ts"], {
  cwd: backendDir,
  stdio: "pipe",
  env: { ...process.env },
});

// Start the printer worker
const worker = spawn("bun", ["run", "printerWorker.ts"], {
  cwd: backendDir,
  stdio: "pipe",
  env: { ...process.env },
});

// Pipe output with labels
backend.stdout?.on("data", (data) => {
  process.stdout.write(`[SERVER] ${data}`);
});
backend.stderr?.on("data", (data) => {
  process.stderr.write(`[SERVER] ${data}`);
});

worker.stdout?.on("data", (data) => {
  process.stdout.write(`[PRINTER] ${data}`);
});
worker.stderr?.on("data", (data) => {
  process.stderr.write(`[PRINTER] ${data}`);
});

// Handle exits
backend.on("exit", (code) => {
  console.error(`\n❌ Backend exited with code ${code}`);
  worker.kill();
  process.exit(code || 1);
});

worker.on("exit", (code) => {
  console.error(`\n❌ Printer worker exited with code ${code}`);
  // Don't kill backend — it can run without printer
  console.log("⚠️  Printer worker stopped. Backend still running.");
});

// Handle Ctrl+C
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down Kesari...");
  backend.kill();
  worker.kill();
  process.exit(0);
});

// Windows: handle terminal close
process.on("SIGTERM", () => {
  backend.kill();
  worker.kill();
  process.exit(0);
});

console.log("  Starting backend + printer worker...\n");
