import { Router } from "express";
import { getAllPrintJobs } from "../services/print.service";

const router = Router();

// GET /api/print-jobs
router.get("/", async (_req, res) => {
  try {
    const jobs = await getAllPrintJobs();
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching print jobs:", error);
    res.status(500).json({ error: "Failed to fetch print jobs" });
  }
});

export default router;
