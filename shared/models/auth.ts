import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, boolean, jsonb as jsonbCol } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Teams table for organizing sales teams
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const updateTeamSchema = insertTeamSchema.partial();
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// User storage table for username/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("sales_agent"), // super_admin, company_owner, sales_admin, team_leader, sales_agent
  teamId: varchar("team_id").references(() => teams.id),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const updateUserSchema = insertUserSchema.partial();
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Role-based permission types (new Egyptian roles + legacy backward-compat roles)
export type UserRole = "super_admin" | "company_owner" | "sales_admin" | "team_leader" | "sales_agent" | "admin" | "sales_manager";

// Arabic display names for roles
export const ROLE_ARABIC_NAMES: Record<UserRole, string> = {
  super_admin: "مدير النظام",
  company_owner: "صاحب الشركة",
  sales_admin: "سيلز ادمن",
  team_leader: "تيم ليدر",
  sales_agent: "سيلز",
  admin: "مدير",
  sales_manager: "مدير مبيعات",
};

// Role badge colors
export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-red-500/10 text-red-600",
  company_owner: "bg-purple-500/10 text-purple-600",
  sales_admin: "bg-blue-500/10 text-blue-600",
  team_leader: "bg-orange-500/10 text-orange-600",
  sales_agent: "bg-gray-500/10 text-gray-600",
  admin: "bg-red-500/10 text-red-600",
  sales_manager: "bg-blue-500/10 text-blue-600",
};

export type RolePermissions = {
  canViewAllLeads: boolean;
  canManageUsers: boolean;
  canManageTeams: boolean;
  canViewAllReports: boolean;
  canDeleteData: boolean;
  canTransferLeads: boolean;
};

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    canViewAllLeads: true,
    canManageUsers: true,
    canManageTeams: true,
    canViewAllReports: true,
    canDeleteData: true,
    canTransferLeads: true,
  },
  company_owner: {
    canViewAllLeads: true,
    canManageUsers: false,
    canManageTeams: false,
    canViewAllReports: true,
    canDeleteData: false,
    canTransferLeads: false,
  },
  sales_admin: {
    canViewAllLeads: true,
    canManageUsers: true,
    canManageTeams: true,
    canViewAllReports: true,
    canDeleteData: false,
    canTransferLeads: true,
  },
  team_leader: {
    canViewAllLeads: false, // Only team leads
    canManageUsers: false,
    canManageTeams: false,
    canViewAllReports: false,
    canDeleteData: false,
    canTransferLeads: false,
  },
  sales_agent: {
    canViewAllLeads: false, // Only own leads
    canManageUsers: false,
    canManageTeams: false,
    canViewAllReports: false,
    canDeleteData: false,
    canTransferLeads: false,
  },
  admin: {
    canViewAllLeads: true,
    canManageUsers: true,
    canManageTeams: true,
    canViewAllReports: true,
    canDeleteData: true,
    canTransferLeads: true,
  },
  sales_manager: {
    canViewAllLeads: true,
    canManageUsers: false,
    canManageTeams: true,
    canViewAllReports: true,
    canDeleteData: false,
    canTransferLeads: true,
  },
};

// Keep backward compatibility - alias old ROLE_PERMISSIONS
export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

// role_permissions table for dynamic permission overrides by super_admin
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: varchar("role").notNull().unique(),
  permissions: jsonbCol("permissions").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type RolePermissionRecord = typeof rolePermissions.$inferSelect;
