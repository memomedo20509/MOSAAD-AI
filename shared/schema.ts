import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

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
  firstContactAt: timestamp("first_contact_at"),
  responseTimeMinutes: integer("response_time_minutes"),
  score: varchar("score", { length: 10 }).default("warm"),
  firstContactAt: timestamp("first_contact_at"),
  responseTimeMinutes: integer("response_time_minutes"),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true, firstContactAt: true, responseTimeMinutes: true }).extend({
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

// Developers (Real estate development companies)
export const developers = pgTable("developers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logo: text("logo"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDeveloperSchema = createInsertSchema(developers).omit({ id: true, createdAt: true, updatedAt: true });
export const updateDeveloperSchema = insertDeveloperSchema.partial();
export type InsertDeveloper = z.infer<typeof insertDeveloperSchema>;
export type UpdateDeveloper = z.infer<typeof updateDeveloperSchema>;
export type Developer = typeof developers.$inferSelect;

// Projects (Real estate projects/compounds)
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developerId: varchar("developer_id").references(() => developers.id),
  name: text("name").notNull(),
  type: text("type"),
  location: text("location"),
  address: text("address"),
  description: text("description"),
  status: text("status").default("under_construction"),
  totalUnits: integer("total_units").default(0),
  deliveryDate: text("delivery_date"),
  images: text("images").array(),
  amenities: text("amenities").array(),
  minPrice: integer("min_price"),
  maxPrice: integer("max_price"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const updateProjectSchema = insertProjectSchema.partial();
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Units (Individual units within projects)
export const units = pgTable("units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  unitNumber: text("unit_number").notNull(),
  floor: integer("floor"),
  building: text("building"),
  type: text("type"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: integer("area"),
  price: integer("price"),
  status: text("status").default("available"),
  view: text("view"),
  finishing: text("finishing"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUnitSchema = createInsertSchema(units).omit({ id: true, createdAt: true, updatedAt: true });
export const updateUnitSchema = insertUnitSchema.partial();
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type UpdateUnit = z.infer<typeof updateUnitSchema>;
export type Unit = typeof units.$inferSelect;

// Lead Unit Interests (leads interested in specific units)
export const leadUnitInterests = pgTable("lead_unit_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  unitId: varchar("unit_id").references(() => units.id).notNull(),
  interestLevel: text("interest_level").default("medium"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadUnitInterestSchema = createInsertSchema(leadUnitInterests).omit({ id: true, createdAt: true });
export type InsertLeadUnitInterest = z.infer<typeof insertLeadUnitInterestSchema>;
export type LeadUnitInterest = typeof leadUnitInterests.$inferSelect;

// Communications log (calls, WhatsApp, meetings, notes)
export const communications = pgTable("communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  userId: varchar("user_id"),
  userName: text("user_name"),
  type: text("type").notNull(), // call, whatsapp, email, meeting, note, no_answer
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const COMMUNICATION_TYPES = ["call", "whatsapp", "email", "meeting", "note", "no_answer"] as const;
export type CommunicationType = typeof COMMUNICATION_TYPES[number];

export const insertCommunicationSchema = createInsertSchema(communications)
  .omit({ id: true, createdAt: true })
  .extend({ type: z.enum(COMMUNICATION_TYPES) });
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;

// Reminders
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  userId: varchar("user_id"),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  isCompleted: boolean("is_completed").default(false),
  priority: text("priority").default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true, createdAt: true });
export const updateReminderSchema = insertReminderSchema.partial();
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type UpdateReminder = z.infer<typeof updateReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Scoring Configuration (single-row settings table)
export const scoringConfig = pgTable("scoring_config", {
  id: integer("id").primaryKey().default(1),
  hotMaxDays: integer("hot_max_days").notNull().default(3),
  coldMinDays: integer("cold_min_days").notNull().default(14),
  weightRecency: integer("weight_recency").notNull().default(40),
  weightEngagement: integer("weight_engagement").notNull().default(30),
  weightTaskCompletion: integer("weight_task_completion").notNull().default(20),
  weightCreation: integer("weight_creation").notNull().default(10),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ScoringConfigRecord = typeof scoringConfig.$inferSelect;

// Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  clientId: varchar("client_id").references(() => clients.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedByName: text("uploaded_by_name"),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Commissions (linked to clients/deals)
export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  leadId: varchar("lead_id").references(() => leads.id),
  agentId: varchar("agent_id"),
  agentName: text("agent_name"),
  unitPrice: integer("unit_price").notNull().default(0),
  commissionPercent: integer("commission_percent").notNull().default(2),
  commissionAmount: integer("commission_amount").notNull().default(0),
  month: text("month").notNull(),
  project: text("project"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true });
export const updateCommissionSchema = insertCommissionSchema.partial();
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type UpdateCommission = z.infer<typeof updateCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;

// Export auth models (users, teams, sessions)
export * from "./models/auth";
