import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { pool } from "./db";
import { User as SelectUser, UserRole, ROLE_ARABIC_NAMES, DEFAULT_ROLE_PERMISSIONS, type RolePermissions, normalizeRole, isPlatformAdmin } from "@shared/models/auth";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        if (!user.isActive) {
          return done(null, false, { message: "Account is deactivated" });
        }
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }

      const hashedPassword = await hashPassword(password);
      // Assign new self-registered users to the Demo Company so they are never orphaned
      let defaultCompanyId: string | null = null;
      try {
        const { rows } = await pool.query(`SELECT id FROM companies WHERE slug = 'demo-company' LIMIT 1`);
        if (rows.length > 0) defaultCompanyId = rows[0].id;
      } catch { /* ignore if companies table not ready */ }
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        role: "sales_agent",
        isActive: true,
        companyId: defaultCompanyId,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      if (isPlatformAdmin(user.role)) {
        return res.status(403).json({ error: "Platform admin must log in via /platform/login" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/platform/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      if (!isPlatformAdmin(user.role)) {
        return res.status(403).json({ error: "Access denied: platform admin credentials required" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password: _, ...userWithoutPassword } = req.user as SelectUser;
    const role = normalizeRole((req.user as SelectUser).role);
    userWithoutPassword.role = role;
    let effectivePermissions: RolePermissions | null = null;
    try {
      const dbPerms = await storage.getPermissionsForRole(role);
      effectivePermissions = dbPerms ?? DEFAULT_ROLE_PERMISSIONS[role] ?? DEFAULT_ROLE_PERMISSIONS["sales_agent"];
    } catch {
      effectivePermissions = DEFAULT_ROLE_PERMISSIONS[role] ?? DEFAULT_ROLE_PERMISSIONS["sales_agent"];
    }
    // Enrich with company businessType for frontend adaptive UI
    let companyBusinessType: string | null = null;
    try {
      if (userWithoutPassword.companyId) {
        const result = await pool.query(
          `SELECT business_type FROM companies WHERE id = $1 LIMIT 1`,
          [userWithoutPassword.companyId]
        );
        companyBusinessType = result.rows[0]?.business_type ?? "service";
      }
    } catch (err) {
      console.warn("[api/user] Failed to fetch companyBusinessType:", (err as Error)?.message ?? err);
    }
    res.json({ ...userWithoutPassword, permissions: effectivePermissions, companyBusinessType });
  });
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = req.user as SelectUser;
    // platform_admin bypasses all role restrictions
    if (isPlatformAdmin(user.role)) return next();
    if (!roles.includes(normalizeRole(user.role))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export function requirePermission(permission: keyof RolePermissions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = req.user as SelectUser;
    // platform_admin bypasses all permission checks
    if (isPlatformAdmin(user.role)) return next();
    const role = normalizeRole(user.role);

    let perms: RolePermissions;
    const dbPerms = await storage.getPermissionsForRole(role);
    perms = dbPerms ?? DEFAULT_ROLE_PERMISSIONS[role] ?? DEFAULT_ROLE_PERMISSIONS["sales_agent"];

    if (!perms[permission]) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
