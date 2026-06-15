import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("waiter", "routes/waiter.tsx"),
  route("waiter/table/:id", "routes/waiter-table.tsx"),
  route("live-tables", "routes/live-tables.tsx"),
  route("summary", "routes/summary.tsx"),
  route("inventory", "routes/inventory.tsx"),
  route("menu-manage", "routes/menu-manage.tsx"),
  route("recipes", "routes/recipes.tsx"),
] satisfies RouteConfig;
