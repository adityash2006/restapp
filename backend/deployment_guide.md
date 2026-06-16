# 🍽️ Kesari Restaurant — Deployment Guide

## Prerequisites on the Restaurant PC

1. **Bun** installed → [bun.sh](https://bun.sh)
2. **Git** (to clone/pull your code)
3. Printers connected (USB for counter, network for kitchen)
4. PC connected to the **restaurant WiFi** (same network as waiter phones)

---

## First-Time Setup

### Step 1: Get the Code
```powershell
git clone <your-repo-url> D:\Kesari
cd D:\Kesari
```

### Step 2: Install Dependencies
```powershell
cd backend
bun install

cd ..\frontend
bun install
```

### Step 3: Configure Environment
Create/verify `backend/.env`:
```
DATABASE_URL="postgresql://user:pass@host/database"
```

### Step 4: Generate Prisma Client
```powershell
cd backend
bun run db:generate
```

### Step 5: Configure Printers
Edit `backend/src/printerConfig.ts`:
```typescript
export const printerConfig = {
  counter: {
    type: PrinterTypes.EPSON,
    interface: "printer:TVS RP3230",     // ← Your Windows printer name
    width: 48,
    options: { timeout: 5000 },
  },
  kitchen: {
    type: PrinterTypes.EPSON,
    interface: "tcp://192.168.1.120",    // ← Your kitchen printer IP
    width: 48,
    options: { timeout: 5000 },
  },
};
```

> [!TIP]
> To find your Windows printer name, open **Settings → Printers & Scanners**. Use the exact name shown there.

### Step 6: Test Printers
```powershell
cd backend
bun run test-printer
```
This prints a test receipt on both printers. Fix any issues before proceeding.

---

## Starting the System

### Option A: One Command (recommended)
```powershell
cd backend
bun run prod
```
This does everything:
1. Builds the frontend
2. Starts the Express server (serves both API + frontend)
3. Starts the printer worker

> [!IMPORTANT]
> Everything runs in one terminal window. Press `Ctrl+C` to stop.

### Option B: Separate Terminals
If you prefer separate terminals (useful for debugging):

**Terminal 1 — Build frontend + Start backend:**
```powershell
cd frontend
bun run build
cd ..\backend
bun run start:server
```

**Terminal 2 — Printer worker:**
```powershell
cd backend
bun run start:worker
```

---

## Accessing the System

Once running, everything is on **port 3000**:

| Device | URL | Purpose |
|---|---|---|
| **Counter PC** (browser) | `http://localhost:3000` | Admin/Counter interface |
| **Waiter Phone 1** | `http://192.168.1.X:3000` | Waiter interface |
| **Waiter Phone 2** | `http://192.168.1.X:3000` | Waiter interface |

> [!NOTE]
> Replace `192.168.1.X` with the restaurant PC's actual IP address.
> Find it by running `ipconfig` in PowerShell and looking for **IPv4 Address** under your WiFi adapter.

### Waiter Phone Setup
1. Connect phone to restaurant WiFi
2. Open Chrome/Browser
3. Go to `http://192.168.1.X:3000`
4. Tap **"I'm a Waiter"**
5. Optional: Add to home screen for app-like experience

---

## Daily Workflow

### Morning (Opening)
```powershell
cd D:\Kesari\backend
bun run start
```
That's it. System is ready.

### Night (Closing)
1. Make sure all tables are marked as **Done**
2. Check the **Summary** page for the day's totals
3. Press `Ctrl+C` in the terminal to stop

### If Something Goes Wrong
```powershell
# Restart everything
Ctrl+C
bun run start
```

---

## Updating the Code

When you push changes from your dev machine:
```powershell
cd D:\Kesari
git pull
cd backend
bun install
bun run db:push        # if database schema changed
bun run db:generate    # if Prisma models changed
bun run prod           # rebuild + restart
```

---

## Commands Reference

| Command | What it does |
|---|---|
| `bun run prod` | Build frontend + start everything |
| `bun run start` | Start server + printer (without rebuilding) |
| `bun run start:server` | Start only the backend server |
| `bun run start:worker` | Start only the printer worker |
| `bun run test-printer` | Test both printers |
| `bun run test-printer:counter` | Test counter printer only |
| `bun run test-printer:kitchen` | Test kitchen printer only |
| `bun run dev` | Start in dev mode (with hot reload) |
| `bun run dev:worker` | Start printer worker in dev mode |
| `bun run build:frontend` | Build frontend only |
| `bun run db:studio` | Open Prisma Studio (database browser) |

---

## Architecture (Production)

```
Restaurant PC (port 3000)
├── Express Server
│   ├── /api/*          → Backend API
│   └── /*              → Serves built frontend (HTML/JS/CSS)
│
├── Printer Worker (separate process)
│   ├── Kitchen Printer  → tcp://192.168.1.120
│   └── Counter Printer  → printer:TVS RP3230
│
└── PostgreSQL (Neon cloud)

Waiter Phone ──WiFi──→ PC:3000/waiter
Counter Browser ──────→ PC:3000/live-tables
```
