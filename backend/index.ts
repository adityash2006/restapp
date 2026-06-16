import express from "express";
import cors from "cors";
import path from "path";
import menuRoutes from "./src/routes/menu.routes";
import orderRoutes from "./src/routes/order.routes";
import inventoryRoutes from "./src/routes/inventory.routes";
import printRoutes from "./src/routes/print.routes";
import recipeRoutes from "./src/routes/recipe.routes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/print-jobs", printRoutes);
app.use("/api/recipes", recipeRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Serve Frontend (production build) ────────────────────────
// After running `bun run build` in the frontend folder,
// Express serves the built client files so waiter phones and
// the counter browser can access everything on port 3000.
const clientBuildPath = path.resolve(import.meta.dir, "../frontend/build/client");

// Serve static assets (JS, CSS, images)
app.use(express.static(clientBuildPath));

// For any non-API route, serve index.html (SPA client-side routing)
// Express v5 requires named wildcard params
app.get("/{*path}", (_req, res) => {
  const indexPath = path.join(clientBuildPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send("Frontend not built. Run: cd frontend && bun run build");
    }
  });
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Kesari backend running on http://0.0.0.0:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}`);
  console.log(`   API:      http://localhost:${PORT}/api`);
});