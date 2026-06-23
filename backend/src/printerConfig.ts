import { PrinterTypes } from "node-thermal-printer";

export const printerConfig = {
  counter: {
    type: PrinterTypes.EPSON,
    interface: "TVS-Counter",   // Windows shared printer share name
    mode: "windows-shared" as const,
    enabled: true,
    width: 42,
    options: { timeout: 5000 },
  },
  kitchen: {
    type: PrinterTypes.EPSON,
    interface: "tcp://192.168.1.120",
    mode: "network" as const,
    enabled: false,   // ← Set to true once kitchen printer is connected
    width: 42,
    options: { timeout: 5000 },
  },
};

export const restaurantInfo = {
  name: "KESARI DHABA",
  tagline: "Pure Veg",
};