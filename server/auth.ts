import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { pool } from "./db";
import { User as SelectUser, UserRole, ROLE_ARABIC_NAMES, DEFAULT_ROLE_PERMISSIONS, type RolePermissions, normalizeRole, isPlatformAdmin } from "@shared/models/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

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
      // Generate email verification token if email provided
      const verificationToken = email ? randomBytes(32).toString("hex") : null;
      const verificationExpiry = email ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        role: "sales_agent",
        isActive: true,
        companyId: defaultCompanyId,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      });

      // Send verification email asynchronously (don't block registration)
      if (email && verificationToken) {
        const lang = req.headers["accept-language"]?.startsWith("en") ? "en" : "ar";
        sendVerificationEmail(email, verificationToken, lang).catch((err) =>
          console.error("[register] Failed to send verification email:", err)
        );
      }

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
    res.json({ ...userWithoutPassword, permissions: effectivePermissions, companyBusinessType, lastLogin: userWithoutPassword.lastLogin });
  });

  app.patch("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as SelectUser;
      const { z } = await import("zod");
      const schema = z.object({
        firstName: z.string().optional().nullable(),
        lastName: z.string().optional().nullable(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        profileImageUrl: z.string().url().optional().nullable().or(z.literal("")),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      }
      const data = parsed.data;
      // Check email uniqueness if changed
      if (data.email && data.email !== user.email) {
        const existing = await storage.getUserByEmail(data.email);
        if (existing && existing.id !== user.id) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }
      const updated = await storage.updateUserProfile(user.id, data);
      if (!updated) return res.status(404).json({ error: "User not found" });
      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error("[PATCH /api/user/profile]", err);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/user/change-password", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as SelectUser;
      const { z } = await import("zod");
      const schema = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      }
      const { currentPassword, newPassword } = parsed.data;
      const fullUser = await storage.getUser(user.id);
      if (!fullUser) return res.status(404).json({ error: "User not found" });
      const isValid = await comparePasswords(currentPassword, fullUser.password);
      if (!isValid) {
        return res.status(400).json({ error: "Wrong current password" });
      }
      const hashed = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashed);
      res.json({ success: true });
    } catch (err) {
      console.error("[POST /api/user/change-password]", err);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Rate limit map for send-verification (userId -> lastSentAt ms)
  const verificationRateLimit = new Map<string, number>();

  app.post("/api/auth/send-verification", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as SelectUser;
      if (!user.email) {
        return res.status(400).json({ error: "No email on account" });
      }
      if (user.emailVerifiedAt) {
        return res.status(400).json({ error: "Email already verified" });
      }
      const lastSent = verificationRateLimit.get(user.id) ?? 0;
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() - lastSent < fiveMinutes) {
        return res.status(429).json({ error: "Please wait before requesting another verification email" });
      }
      verificationRateLimit.set(user.id, Date.now());
      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.updateUserEmailVerification(user.id, {
        emailVerificationToken: token,
        emailVerificationExpiry: expiry,
      });
      const lang = req.headers["accept-language"]?.startsWith("en") ? "en" : "ar";
      await sendVerificationEmail(user.email, token, lang);
      res.json({ success: true });
    } catch (err) {
      console.error("[POST /api/auth/send-verification]", err);
      res.status(500).json({ error: "Failed to send verification email" });
    }
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query as { token?: string };
      if (!token) {
        return res.redirect("/?emailVerified=error");
      }
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.redirect("/?emailVerified=error");
      }
      if (!user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
        return res.redirect("/?emailVerified=expired");
      }
      await storage.updateUserEmailVerification(user.id, {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      });
      res.redirect("/?emailVerified=1");
    } catch (err) {
      console.error("[GET /api/auth/verify-email]", err);
      res.redirect("/?emailVerified=error");
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { z } = await import("zod");
      const schema = z.object({ email: z.string().email() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.json({ success: true });
      }
      const { email } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (user && user.isActive) {
        const token = randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await storage.updateUserPasswordReset(user.id, {
          resetPasswordToken: token,
          resetPasswordExpiry: expiry,
        });
        const lang = req.headers["accept-language"]?.startsWith("en") ? "en" : "ar";
        sendPasswordResetEmail(email, token, lang).catch((err) =>
          console.error("[forgot-password] Failed to send reset email:", err)
        );
      }
      // Always return same response to prevent email enumeration
      res.json({ success: true });
    } catch (err) {
      console.error("[POST /api/auth/forgot-password]", err);
      res.json({ success: true });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { z } = await import("zod");
      const schema = z.object({
        token: z.string().min(1),
        newPassword: z.string().min(6),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data" });
      }
      const { token, newPassword } = parsed.data;
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      if (!user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }
      const hashed = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashed);
      await storage.updateUserPasswordReset(user.id, {
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      });
      res.json({ success: true });
    } catch (err) {
      console.error("[POST /api/auth/reset-password]", err);
      res.status(500).json({ error: "Failed to reset password" });
    }
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
