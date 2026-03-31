import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
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
  marketingCost: numeric("marketing_cost", { mode: "number" }),
  campaignName: text("campaign_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastAction: text("last_action"),
  lastActionDate: timestamp("last_action_date"),
  firstContactAt: timestamp("first_contact_at"),
  responseTimeMinutes: integer("response_time_minutes"),
  score: varchar("score", { length: 10 }).default("warm"),
  aiAnalyzedAt: timestamp("ai_analyzed_at"),
  botActive: boolean("bot_active").default(true),
  botStage: text("bot_stage").default("greeting"),
  preferredProject: text("preferred_project"),
  timeline: text("timeline"),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true, firstContactAt: true, responseTimeMinutes: true, aiAnalyzedAt: true }).extend({
  phone: z.string().min(1, "Phone number is required"),
});
export const updateLeadSchema = insertLeadSchema.partial().extend({
  aiAnalyzedAt: z.coerce.date().optional().nullable(),
});
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
  completedAt: timestamp("completed_at"),
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

// Notifications (in-app, for reminders and alerts)
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull().default("reminder"),
  message: text("message").notNull(),
  leadId: varchar("lead_id").references(() => leads.id),
  reminderId: varchar("reminder_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const updateNotificationSchema = insertNotificationSchema.partial();
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Call Logs (outcome of calls logged from My Day)
export const callLogs = pgTable("call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  userId: varchar("user_id").notNull(),
  reminderId: varchar("reminder_id"),
  outcome: text("outcome").notNull(), // answered, no_answer, interested, not_interested, needs_time, requested_visit
  notes: text("notes"),
  durationSeconds: integer("duration_seconds"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const CALL_OUTCOMES = ["answered", "no_answer", "interested", "not_interested", "needs_time", "requested_visit"] as const;
export type CallOutcome = typeof CALL_OUTCOMES[number];

export const insertCallLogSchema = createInsertSchema(callLogs).omit({ id: true, createdAt: true }).extend({
  outcome: z.enum(CALL_OUTCOMES),
});
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type CallLog = typeof callLogs.$inferSelect;

// WhatsApp Templates
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  body: text("body").notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const updateWhatsappTemplateSchema = insertWhatsappTemplateSchema.partial();
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;
export type UpdateWhatsappTemplate = z.infer<typeof updateWhatsappTemplateSchema>;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;

// WhatsApp Messages Log
export const whatsappMessagesLog = pgTable("whatsapp_messages_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  agentId: varchar("agent_id"),
  agentName: text("agent_name"),
  templateId: varchar("template_id"),
  templateName: text("template_name"),
  phone: text("phone").notNull(),
  direction: text("direction").default("outbound"),
  messageText: text("message_text"),
  messageId: varchar("message_id"),
  isRead: boolean("is_read").default(false),
  botActionsSummary: text("bot_actions_summary"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhatsappMessagesLogSchema = createInsertSchema(whatsappMessagesLog).omit({ id: true }).extend({
  createdAt: z.coerce.date().optional(),
});
export type InsertWhatsappMessagesLog = z.infer<typeof insertWhatsappMessagesLogSchema>;
export type WhatsappMessagesLog = typeof whatsappMessagesLog.$inferSelect;

// Lead Manager Comments (coaching notes from managers/admins to agents)
export const leadManagerComments = pgTable("lead_manager_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  managerId: varchar("manager_id").references(() => users.id).notNull(),
  managerName: text("manager_name"),
  content: text("content").notNull(),
  isReadByAgent: boolean("is_read_by_agent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadManagerCommentSchema = createInsertSchema(leadManagerComments).omit({ id: true, createdAt: true, updatedAt: true });
export const updateLeadManagerCommentSchema = insertLeadManagerCommentSchema.partial();
export type InsertLeadManagerComment = z.infer<typeof insertLeadManagerCommentSchema>;
export type UpdateLeadManagerComment = z.infer<typeof updateLeadManagerCommentSchema>;
export type LeadManagerComment = typeof leadManagerComments.$inferSelect;

// Email Report Settings
export const emailReportSettings = pgTable("email_report_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  toEmail: text("to_email").notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  language: text("language").notNull().default("ar"),
  enabled: boolean("enabled").notNull().default(false),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailReportSettingsSchema = createInsertSchema(emailReportSettings).omit({ id: true, createdAt: true, updatedAt: true, lastSentAt: true });
export const updateEmailReportSettingsSchema = insertEmailReportSettingsSchema.partial().omit({ userId: true });
export type InsertEmailReportSettings = z.infer<typeof insertEmailReportSettingsSchema>;
export type UpdateEmailReportSettings = z.infer<typeof updateEmailReportSettingsSchema>;
export type EmailReportSettings = typeof emailReportSettings.$inferSelect;

// Monthly Targets
export const monthlyTargets = pgTable("monthly_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  targetMonth: text("target_month").notNull(), // YYYY-MM
  dealsTarget: integer("deals_target").notNull().default(0),
  leadsTarget: integer("leads_target").notNull().default(0),
  revenueTarget: integer("revenue_target"), // optional
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("monthly_targets_user_month_unique").on(table.userId, table.targetMonth),
]);

export const insertMonthlyTargetSchema = createInsertSchema(monthlyTargets).omit({ id: true, createdAt: true, updatedAt: true });
export const updateMonthlyTargetSchema = insertMonthlyTargetSchema.partial();
export type InsertMonthlyTarget = z.infer<typeof insertMonthlyTargetSchema>;
export type UpdateMonthlyTarget = z.infer<typeof updateMonthlyTargetSchema>;
export type MonthlyTarget = typeof monthlyTargets.$inferSelect;

// Chatbot Settings (per user/manager)
export const chatbotSettings = pgTable("chatbot_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  isActive: boolean("is_active").default(false),
  workingHoursStart: integer("working_hours_start").default(9),
  workingHoursEnd: integer("working_hours_end").default(18),
  welcomeMessage: text("welcome_message").default("أهلاً! 👋 أنا المساعد الذكي لشركتنا العقارية. يسعدني مساعدتك. ممكن تعرفني باسمك الكريم؟"),
  botName: varchar("bot_name").default("المساعد الذكي"),
  companyName: varchar("company_name").default("شركتنا العقارية"),
  botRole: varchar("bot_role").default("مستشار عقاري"),
  botPersonality: text("bot_personality").default("أنت مستشار عقاري مصري محترف وودود. بتتكلم بالمصري بشكل طبيعي. بتساعد العملاء يلاقوا الوحدة المناسبة ليهم وبتجمع بياناتهم بطريقة محترمة."),
  botMission: text("bot_mission").default("جمع بيانات العميل الكاملة (الاسم، الميزانية، نوع الوحدة، عدد الغرف، الموقع المفضل، طريقة الدفع) وترشيح وحدات مناسبة من المشاريع المتاحة قبل تحويله للمندوب."),
  companyKnowledge: text("company_knowledge").default(""),
  respondAlways: boolean("respond_always").default(false),
  enabledProjectIds: text("enabled_project_ids").array(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatbotSettingsSchema = createInsertSchema(chatbotSettings).omit({ id: true, updatedAt: true });
export const updateChatbotSettingsSchema = insertChatbotSettingsSchema.partial().omit({ userId: true });
export type InsertChatbotSettings = z.infer<typeof insertChatbotSettingsSchema>;
export type UpdateChatbotSettings = z.infer<typeof updateChatbotSettingsSchema>;
export type ChatbotSettings = typeof chatbotSettings.$inferSelect;

// WhatsApp Campaigns
export const whatsappCampaigns = pgTable("whatsapp_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  templateId: varchar("template_id"), // optional: use saved template
  message: text("message").notNull(),
  filterStateId: varchar("filter_state_id"),
  filterChannel: text("filter_channel"),
  filterDaysNoReply: integer("filter_days_no_reply"),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").default("draft"), // draft | scheduled | running | completed | cancelled
  createdBy: text("created_by").notNull(),
  totalCount: integer("total_count").default(0),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhatsappCampaignSchema = createInsertSchema(whatsappCampaigns).omit({ id: true, createdAt: true, updatedAt: true, totalCount: true, sentCount: true, failedCount: true, status: true });
export type InsertWhatsappCampaign = z.infer<typeof insertWhatsappCampaignSchema>;
export type WhatsappCampaign = typeof whatsappCampaigns.$inferSelect;

// WhatsApp Campaign Recipients
export const whatsappCampaignRecipients = pgTable("whatsapp_campaign_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => whatsappCampaigns.id),
  leadId: varchar("lead_id").references(() => leads.id),
  phone: text("phone").notNull(),
  status: text("status").default("pending"), // pending | sent | failed
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
});

export type WhatsappCampaignRecipient = typeof whatsappCampaignRecipients.$inferSelect;

// WhatsApp Follow-up Rules (per-lead when leadId is set, global template otherwise)
export const whatsappFollowupRules = pgTable("whatsapp_followup_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id), // null = global template; set = per-lead rule
  name: text("name").notNull(),
  message: text("message").notNull(),
  daysAfterNoReply: integer("days_after_no_reply").notNull().default(3),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by").notNull(),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhatsappFollowupRuleSchema = createInsertSchema(whatsappFollowupRules).omit({ id: true, createdAt: true, lastRunAt: true });
export type InsertWhatsappFollowupRule = z.infer<typeof insertWhatsappFollowupRuleSchema>;
export type WhatsappFollowupRule = typeof whatsappFollowupRules.$inferSelect;

// Export auth models (users, teams, sessions, role_permissions)
export * from "./models/auth";
