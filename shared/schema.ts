import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Lead States
export const leadStates = pgTable("lead_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  order: integer("order").notNull().default(0),
});

export const insertLeadStateSchema = createInsertSchema(leadStates).omit({ id: true });
export const updateLeadStateSchema = insertLeadStateSchema.partial();
export type InsertLeadState = z.infer<typeof insertLeadStateSchema>;
export type UpdateLeadState = z.infer<typeof updateLeadStateSchema>;
export type LeadState = typeof leadStates.$inferSelect;

// Leads
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  phone: text("phone"),
  phone2: text("phone2"),
  email: text("email"),
  stateId: varchar("state_id").references(() => leadStates.id),
  channel: text("channel"),
  campaign: text("campaign"),
  assignedTo: text("assigned_to"),
  requestType: text("request_type"),
  unitType: text("unit_type"),
  area: text("area"),
  space: text("space"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  budget: text("budget"),
  location: text("location"),
  paymentType: text("payment_type"),
  downPayment: text("down_payment"),
  notes: text("notes"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastAction: text("last_action"),
  lastActionDate: timestamp("last_action_date"),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  phone: z.string().min(1, "Phone number is required"),
});
export const updateLeadSchema = insertLeadSchema.partial();
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type UpdateLead = z.infer<typeof updateLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Clients (converted leads)
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  project: text("project"),
  unitsCount: integer("units_count").default(0),
  leadId: varchar("lead_id").references(() => leads.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  title: text("title").notNull(),
  type: text("type"),
  description: text("description"),
  assignedTo: text("assigned_to"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const updateTaskSchema = insertTaskSchema.partial();
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Lead History/Actions
export const leadHistory = pgTable("lead_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  action: text("action").notNull(),
  description: text("description"),
  performedBy: text("performed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadHistorySchema = createInsertSchema(leadHistory).omit({ id: true, createdAt: true });
export type InsertLeadHistory = z.infer<typeof insertLeadHistorySchema>;
export type LeadHistory = typeof leadHistory.$inferSelect;

// Users table for sales reps
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").default("sales"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
