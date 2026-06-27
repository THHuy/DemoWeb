import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pool from "./db";
import menuRoutes from "./routes/menu";
import postsRoutes from "./routes/posts";
import reviewsRoutes from "./routes/reviews";
import dbInitRoute from "./routes/db-init";
import authRoutes from "./routes/auth";
import reservationsRoutes from "./routes/reservations";
import usersRoutes from "./routes/users";
import hrRoutes from "./routes/hr";
import staffRoutes from "./routes/staff";
import settingsRoutes from "./routes/settings";
import posRoutes from "./routes/pos";

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Disable caching for API routes
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});


// Health check
app.get("/api/health", async (_req, res) => {
  try {
    const tableCheck = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    res.json({
      status: "ok",
      db_initialized: tableCheck.rows[0].exists,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      status: "error",
      db_initialized: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/db-init", dbInitRoute);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/pos", posRoutes);

// Stats endpoint for dashboard
app.get("/api/stats", async (_req, res) => {
  try {
    const [menuResult, postsResult, reviewsResult, reservationsResult] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM menu_items"),
      pool.query("SELECT COUNT(*) FROM posts"),
      pool.query("SELECT COUNT(*) FROM reviews"),
      pool.query("SELECT COUNT(*) FROM reservations"),
    ]);

    res.json({
      menuItems: parseInt(menuResult.rows[0].count),
      posts: parseInt(postsResult.rows[0].count),
      reviews: parseInt(reviewsResult.rows[0].count),
      reservations: parseInt(reservationsResult.rows[0].count),
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Express API server running at http://localhost:${PORT}`);
});
