import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
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
  role: varchar("role").default("sales_agent"), // super_admin, admin, sales_manager, sales_agent
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

// Role-based permission types
export type UserRole = "super_admin" | "admin" | "sales_manager" | "sales_agent";

export const ROLE_PERMISSIONS = {
  super_admin: {
    canManageUsers: true,
    canManageTeams: true,
    canViewAllLeads: true,
    canManageInventory: true,
    canViewAllReports: true,
    canDeleteData: true,
  },
  admin: {
    canManageUsers: true,
    canManageTeams: true,
    canViewAllLeads: true,
    canManageInventory: true,
    canViewAllReports: true,
    canDeleteData: false,
  },
  sales_manager: {
    canManageUsers: false,
    canManageTeams: false,
    canViewAllLeads: false, // Only team leads
    canManageInventory: true,
    canViewAllReports: false, // Only team reports
    canDeleteData: false,
  },
  sales_agent: {
    canManageUsers: false,
    canManageTeams: false,
    canViewAllLeads: false, // Only own leads
    canManageInventory: false, // View only
    canViewAllReports: false, // Only own stats
    canDeleteData: false,
  },
} as const;
