import { PrinterTypes } from "node-thermal-printer";

export const printerConfig = {
  counter: {
    type: PrinterTypes.EPSON,
    interface: "TVS-Counter",   // Windows shared printer share name (no prefix needed)
    mode: "windows-shared" as const,
    width: 42,
    options: { timeout: 5000 },
  },
  kitchen: {
    type: PrinterTypes.EPSON,
    interface: "tcp://192.168.1.120",
    mode: "network" as const,
    width: 42,
    options: { timeout: 5000 },
  },
};

export const restaurantInfo = {
  name: "KESARI DHABA",
  tagline: "Pure Veg",
};