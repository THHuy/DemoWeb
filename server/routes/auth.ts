import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db";
import { authenticate, JWT_SECRET, JWT_REFRESH_SECRET, UserPayload } from "../middleware/auth";

const router = Router();

const isProduction = process.env.NODE_ENV === "production";

// Cookie options helper
const getCookieOptions = (maxAgeMs: number, path = "/") => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path,
  maxAge: maxAgeMs,
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
       res.status(400).json({ error: "Username and password are required" });
       return;
    }

    // Find user in database
    const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
       res.status(401).json({ error: "Invalid username or password" });
       return;
    }

    const user = userResult.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
       res.status(401).json({ error: "Invalid username or password" });
       return;
    }

    // Generate tokens
    const userPayload: UserPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    // Access token (15 minutes)
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "15m" });
    // Refresh token (7 days)
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    // Store refresh token in DB
    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [refreshToken, user.id]);

    // Set Cookies (Access Token: 15 mins, Refresh Token: 7 days)
    res.cookie("access_token", accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie("refresh_token", refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000, "/api/auth/refresh"));

    // Fetch employee business roles
    const empRes = await pool.query(
      `SELECT r.code 
       FROM employees e
       JOIN employee_roles er ON e.id = er.employee_id
       JOIN roles r ON er.role_id = r.id
       WHERE e.user_id = $1`,
      [user.id]
    );
    const businessRoles = empRes.rows.map((row: any) => row.code);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        businessRoles
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server login error" });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    // Try to get token to identify user and clear refresh_token from DB
    const token = req.cookies?.access_token;
    if (token) {
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded && decoded.id) {
          await pool.query("UPDATE users SET refresh_token = NULL WHERE id = $1", [decoded.id]);
        }
      } catch (err) {
        // ignore decoding errors during logout
      }
    }

    // Clear cookies
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/auth/refresh" });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Server logout error" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
       res.status(401).json({ error: "Refresh token missing" });
       return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
       res.status(401).json({ error: "Invalid or expired refresh token" });
       return;
    }

    // Check database to match refresh token
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1 AND refresh_token = $2", [
      decoded.id,
      refreshToken,
    ]);

    if (userResult.rows.length === 0) {
       res.status(401).json({ error: "Session expired or invalid refresh token" });
       return;
    }

    const user = userResult.rows[0];

    const userPayload: UserPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    // Issue new Access Token
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "15m" });

    res.cookie("access_token", accessToken, getCookieOptions(15 * 60 * 1000));
    res.json({ success: true });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ error: "Server token refresh error" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    // Fetch employee business roles
    const empRes = await pool.query(
      `SELECT r.code 
       FROM employees e
       JOIN employee_roles er ON e.id = er.employee_id
       JOIN roles r ON er.role_id = r.id
       WHERE e.user_id = $1`,
      [req.user.id]
    );
    const businessRoles = empRes.rows.map((row: any) => row.code);
    
    res.json({
      success: true,
      user: {
        ...req.user,
        businessRoles
      },
    });
  } catch (error) {
    console.error("Error fetching business roles in auth/me:", error);
    res.json({
      success: true,
      user: req.user,
    });
  }
});

export default router;
