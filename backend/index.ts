import express from "express";
import cors from "cors";
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

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Kesari backend running on http://0.0.0.0:${PORT}`);
});