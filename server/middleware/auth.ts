import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "lambiance_cafe_secret_key_123";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "lambiance_cafe_refresh_secret_key_456";

export interface UserPayload {
  id: number;
  username: string;
  role: "admin" | "staff";
}

// Extend Express Request object
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

// Middleware to authenticate access token
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  console.log(`[Auth] Authenticating request to ${req.originalUrl || req.url}`);
  console.log(`[Auth] Cookies received:`, req.cookies);
  const token = req.cookies?.access_token;

  if (!token) {
    console.warn(`[Auth] Access token missing for request to ${req.originalUrl || req.url}`);
    res.status(401).json({ error: "Access token missing. Please log in." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    console.log(`[Auth] Access token verified successfully. User: ${decoded.username} (${decoded.role})`);
    req.user = decoded;
    next();
  } catch (error) {
    console.error(`[Auth] Access token verification failed:`, error instanceof Error ? error.message : error);
    res.status(401).json({ error: "Access token expired or invalid." });
  }
};

// Middleware to check user role
export const requireRole = (allowedRoles: ("admin" | "staff")[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized. Authentication required." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden. You do not have permission to perform this action." });
      return;
    }

    next();
  };
};
