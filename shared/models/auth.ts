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
  companyId: varchar("company_id"),
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
  role: varchar("role").default("sales_agent"), // platform_admin, super_admin, company_owner, sales_admin, team_leader, sales_agent
  companyId: varchar("company_id"), // null for platform_admin
  teamId: varchar("team_id").references(() => teams.id),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false),
  hasSeenTour: boolean("has_seen_tour").default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  emailVerificationToken: varchar("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  resetPasswordToken: varchar("reset_password_token"),
  resetPasswordExpiry: timestamp("reset_password_expiry"),
  googleId: varchar("google_id").unique(),
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
export type UserRole = "platform_admin" | "super_admin" | "company_owner" | "sales_admin" | "team_leader" | "sales_agent" | "admin" | "sales_manager";

// Arabic display names for roles
export const ROLE_ARABIC_NAMES: Record<UserRole, string> = {
  platform_admin: "أدمن المنصة",
  super_admin: "مدير النظام",
  company_owner: "صاحب الشركة",
  sales_admin: "سيلز أدمن",
  team_leader: "تيم ليدر",
  sales_agent: "سيلز",
  admin: "مدير",
  sales_manager: "سيلز مانجر",
};

// Role badge colors
export const ROLE_COLORS: Record<UserRole, string> = {
  platform_admin: "bg-black/10 text-black",
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
  // Module access permissions
  canAccessKanban: boolean;
  canAccessInventory: boolean;
  canAccessWhatsapp: boolean;
  canAccessCampaigns: boolean;
  canAccessCommissions: boolean;
  canAccessReports: boolean;
  canAccessLeaderboard: boolean;
  canAccessMyDay: boolean;
  canAccessSettings: boolean;
};

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  platform_admin: {
    canViewAllLeads: true,
    canManageUsers: true,
    canManageTeams: true,
    canViewAllReports: true,
    canDeleteData: true,
    canTransferLeads: true,
    canAccessKanban: true,
    canAccessInventory: true,
    canAccessWhatsapp: true,
    canAccessCampaigns: true,
    canAccessCommissions: true,
    canAccessReports: true,
    canAccessLeaderboard: true,
    canAccessMyDay: true,
    canAccessSettings: true,
  },
  super_admin: {
    canViewAllLeads: true,
    canManageUsers: true,
    canManageTeams: true,
    canViewAllReports: true,
    canDeleteData: true,
    canTransferLeads: true,
    canAccessKanban: true,
    canAccessInventory: true,
    canAccessWhatsapp: true,
    canAccessCampaigns: true,
    canAccessCommissions: true,
    canAccessReports: true,
    canAccessLeaderboard: true,
    canAccessMyDay: true,
    canAccessSettings: true,
  },
  company_owner: {
    canViewAllLeads: true,
    canManageUsers: false,
    canManageTeams: false,
    canViewAllReports: true,
    canDeleteData: false,
    canTransferLeads: false,
    canAccessKanban: true,
    canAccessInventory: true,
    canAccessWhatsapp: true,
    canAccessCampaigns: true,
    canAccessCommissions: true,
    canAccessReports: true,
    canAccessLeaderboard: true,
    canAccessMyDay: true,
    canAccessSettings: true,
  },
  sales_admin: {
    canViewAllLeads: true,
    canManageUsers: true,
    canManageTeams: true,
    canViewAllReports: true,
    canDeleteData: false,
    canTransferLeads: true,
    canAccessKanban: true,
    canAccessInventory: true,
    canAccessWhatsapp: true,
    canAccessCampaigns: true,
    canAccessCommissions: true,
    canAccessReports: true,
    canAccessLeaderboard: true,
    canAccessMyDay: true,
    canAccessSettings: true,
  },
  team_leader: {
    canViewAllLeads: false,
    canManageUsers: false,
    canManageTeams: false,
    canViewAllReports: false,
    canDeleteData: false,
    canTransferLeads: false,
    canAccessKanban: true,
    canAccessInventory: false,
    canAccessWhatsapp: true,
    canAccessCampaigns: false,
    canAccessCommissions: true,
    canAccessReports: false,
    canAccessLeaderboard: true,
    canAccessMyDay: true,
    canAccessSettings: false,
  },
  sales_agent: {
    canViewAllLeads: false,
    canManageUsers: false,
    canManageTeams: false,
    canViewAllReports: false,
    canDeleteData: false,
    canTransferLeads: false,
    canAccessKanban: true,
    canAccessInventory: false,
    canAccessWhatsapp: true,
    canAccessCampaigns: false,
    canAccessCommissions: true,
    canAccessReports: false,
    canAccessLeaderboard: true,
    canAccessMyDay: true,
    canAccessSettings: false,
  },
  admin: {
    canViewAllLeads: true,
    canManageUsers: true,
    canManageTeams: true,
    canViewAllReports: true,
    canDeleteData: true,
    canTransferLeads: true,
    canAccessKanban: true,
    canAccessInventory: true,
    canAccessWhatsapp: true,
    canAccessCampaigns: true,
    canAccessCommissions: true,
    canAccessReports: true,
    canAccessLeaderboard: true,
    canAccessMyDay: true,
    canAccessSettings: true,
  },
  sales_manager: {
    canViewAllLeads: true,
    canManageUsers: false,
    canManageTeams: true,
    canViewAllReports: true,
    canDeleteData: false,
    canTransferLeads: true,
    canAccessKanban: true,
    canAccessInventory: false,
    canAccessWhatsapp: true,
    canAccessCampaigns: true,
    canAccessCommissions: true,
    canAccessReports: true,
    canAccessLeaderboard: true,
    canAccessMyDay: true,
    canAccessSettings: false,
  },
};

export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return "sales_agent";
  if (role === "sales") return "sales_agent";
  return role as UserRole;
}

export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === "platform_admin";
}

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

// Custom roles table - user-defined roles with custom permissions
export const customRoles = pgTable("custom_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  permissions: jsonbCol("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomRoleSchema = createInsertSchema(customRoles).omit({ id: true, createdAt: true });
export type InsertCustomRole = z.infer<typeof insertCustomRoleSchema>;
export type CustomRole = typeof customRoles.$inferSelect;
