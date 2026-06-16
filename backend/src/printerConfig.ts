import { PrinterTypes } from "node-thermal-printer";

/**
 * Printer Configuration for Kesari Restaurant
 * 
 * Fill in the actual values when at the restaurant.
 * 
 * INTERFACE OPTIONS:
 * 
 *   Network printer (TCP/IP):
 *     interface: "tcp://192.168.1.120"
 * 
 *   Windows shared/USB printer (UNC path):
 *     interface: "\\\\localhost\\TVS_RP3230"
 *     (Make sure the printer is shared in Windows Printer Settings)
 * 
 *   Linux USB printer:
 *     interface: "/dev/usb/lp0"
 *
 * PRINTER TYPE OPTIONS:
 *   PrinterTypes.EPSON   - Most common (TVS, Epson, most Chinese printers)
 *   PrinterTypes.STAR    - Star Micronics printers
 */

export const printerConfig = {
  counter: {
    type: PrinterTypes.EPSON,
    interface: "printer:TVS RP3230",    // TODO: Set actual Windows printer name
    width: 48,                          // Characters per line (48 for 80mm, 32 for 58mm)
    options: {
      timeout: 5000,
    },
  },

  kitchen: {
    type: PrinterTypes.EPSON,
    interface: "tcp://192.168.1.120",   // TODO: Set actual kitchen printer IP
    width: 48,
    options: {
      timeout: 5000,
    },
  },
};

/**
 * Restaurant info printed on bills
 */
export const restaurantInfo = {
  name: "KESARI RESTAURANT",
  tagline: "Pure Veg",
  // Add address, phone, GSTIN etc. as needed:
  // address: "123 Main Street, City",
  // phone: "+91 98765 43210",
  // gstin: "29AAAAA0000A1Z5",
};
