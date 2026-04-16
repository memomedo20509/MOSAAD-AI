import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

// Companies (multi-tenant support)
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  industry: text("industry"),
  planId: text("plan_id"),
  status: text("status").notNull().default("active"), // active | trial | suspended | cancelled
  onboardingStep: integer("onboarding_step").default(0),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const updateCompanySchema = insertCompanySchema.partial();
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type UpdateCompany = z.infer<typeof updateCompanySchema>;
export type Company = typeof companies.$inferSelect;

// Lead State Categories
export const LEAD_STATE_CATEGORIES = ["untouched", "active", "won", "lost"] as const;
export type LeadStateCategory = typeof LEAD_STATE_CATEGORIES[number];

// Lead States
export const leadStates = pgTable("lead_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  order: integer("order").notNull().default(0),
  category: text("category").notNull().default("active"),
  canGoBack: boolean("can_go_back").notNull().default(true),
  isSystemState: boolean("is_system_state").notNull().default(false),
  zone: integer("zone").notNull().default(0),
  companyId: varchar("company_id"),
});

export const insertLeadStateSchema = createInsertSchema(leadStates).omit({ id: true }).extend({
  category: z.enum(["untouched", "active", "won", "lost"]).default("active"),
});
export const updateLeadStateSchema = insertLeadStateSchema.partial();
export type InsertLeadState = z.infer<typeof insertLeadStateSchema>;
export type UpdateLeadState = z.infer<typeof updateLeadStateSchema>;
export type LeadState = typeof leadStates.$inferSelect;

// Leads
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
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
  historyVisibleToAssigned: boolean("history_visible_to_assigned").default(true),
  previousAssignedTo: text("previous_assigned_to"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
export const LEAD_HISTORY_TYPES = ["created", "state_change", "assignment", "reassignment", "call", "whatsapp", "note", "other"] as const;
export type LeadHistoryType = typeof LEAD_HISTORY_TYPES[number];

export const leadHistory = pgTable("lead_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  leadId: varchar("lead_id").references(() => leads.id),
  action: text("action").notNull(),
  description: text("description"),
  performedBy: text("performed_by"),
  type: text("type").default("other"),
  fromStateId: varchar("from_state_id").references(() => leadStates.id),
  toStateId: varchar("to_state_id").references(() => leadStates.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadHistorySchema = createInsertSchema(leadHistory).omit({ id: true, createdAt: true });
export type InsertLeadHistory = z.infer<typeof insertLeadHistorySchema>;
export type LeadHistory = typeof leadHistory.$inferSelect;

// Developers (Real estate development companies)
export const developers = pgTable("developers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  logo: text("logo"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  description: text("description"),
  descriptionEn: text("description_en"),
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
  companyId: varchar("company_id"),
  developerId: varchar("developer_id").references(() => developers.id),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  type: text("type"),
  location: text("location"),
  locationEn: text("location_en"),
  address: text("address"),
  description: text("description"),
  descriptionEn: text("description_en"),
  status: text("status").default("under_construction"),
  totalUnits: integer("total_units").default(0),
  deliveryDate: text("delivery_date"),
  images: text("images").array(),
  amenities: text("amenities").array(),
  amenitiesEn: text("amenities_en").array(),
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
  companyId: varchar("company_id"),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  unitNumber: text("unit_number").notNull(),
  floor: integer("floor"),
  building: text("building"),
  type: text("type"),
  typeEn: text("type_en"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: integer("area"),
  price: integer("price"),
  status: text("status").default("available"),
  view: text("view"),
  finishing: text("finishing"),
  notes: text("notes"),
  notesEn: text("notes_en"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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
  companyId: varchar("company_id"),
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

// Meta Page Connections (Facebook/Instagram)
export const metaPageConnections = pgTable("meta_page_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: text("page_id").notNull().unique(),
  pageName: text("page_name").notNull(),
  pageAccessToken: text("page_access_token").notNull(),
  instagramAccountId: text("instagram_account_id"),
  connectedBy: varchar("connected_by"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMetaPageConnectionSchema = createInsertSchema(metaPageConnections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMetaPageConnection = z.infer<typeof insertMetaPageConnectionSchema>;
export type MetaPageConnection = typeof metaPageConnections.$inferSelect;

// Social Messages Log (Messenger / Instagram DM)
export const socialMessagesLog = pgTable("social_messages_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  leadId: varchar("lead_id").references(() => leads.id),
  platform: text("platform").notNull(), // "messenger" | "instagram"
  senderId: text("sender_id").notNull(), // PSID / Instagram-scoped user ID
  direction: text("direction").notNull().default("inbound"), // "inbound" | "outbound"
  messageText: text("message_text"),
  messageId: text("message_id"),
  agentName: text("agent_name"),
  isRead: boolean("is_read").default(false),
  botActionsSummary: text("bot_actions_summary"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSocialMessagesLogSchema = createInsertSchema(socialMessagesLog).omit({ id: true }).extend({
  createdAt: z.coerce.date().optional(),
});
export type InsertSocialMessagesLog = z.infer<typeof insertSocialMessagesLogSchema>;
export type SocialMessagesLog = typeof socialMessagesLog.$inferSelect;

// Integration Settings — single-row table for external API credentials
export const integrationSettings = pgTable("integration_settings", {
  id: integer("id").primaryKey().default(1),
  companyId: varchar("company_id"),
  // WhatsApp Business Cloud API
  whatsappCloudToken: text("whatsapp_cloud_token"),
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  whatsappVerifyToken: text("whatsapp_verify_token"),
  // AI Provider preference: "openrouter" (default) or "openai"
  aiProvider: text("ai_provider").default("openrouter"),
  // OpenRouter
  openrouterApiKey: text("openrouter_api_key"),
  openrouterModel: text("openrouter_model").default("google/gemini-flash-1.5"),
  // OpenAI
  openAiApiKey: text("openai_api_key"),
  openAiModel: text("openai_model").default("gpt-4o-mini"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIntegrationSettingsSchema = createInsertSchema(integrationSettings).omit({ id: true, updatedAt: true });
export const updateIntegrationSettingsSchema = insertIntegrationSettingsSchema.partial();
export type InsertIntegrationSettings = z.infer<typeof insertIntegrationSettingsSchema>;
export type UpdateIntegrationSettings = z.infer<typeof updateIntegrationSettingsSchema>;
export type IntegrationSettings = typeof integrationSettings.$inferSelect;

// Stale Lead Settings — per-state threshold (days before considered stale)
export const staleLeadSettings = pgTable("stale_lead_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  stateId: varchar("state_id").notNull().references(() => leadStates.id, { onDelete: "cascade" }),
  staleDays: integer("stale_days").notNull().default(7),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStaleLeadSettingsSchema = createInsertSchema(staleLeadSettings).omit({ id: true, updatedAt: true });
export type InsertStaleLeadSettings = z.infer<typeof insertStaleLeadSettingsSchema>;
export type StaleLeadSettings = typeof staleLeadSettings.$inferSelect;

// Knowledge Base Items — products, services, FAQs the chatbot can reference
export const knowledgeBase = pgTable("knowledge_base_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  price: numeric("price", { mode: "number" }),
  status: varchar("status", { length: 20 }).default("active"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({ id: true, createdAt: true, updatedAt: true });
export const updateKnowledgeBaseSchema = insertKnowledgeBaseSchema.partial();
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type UpdateKnowledgeBase = z.infer<typeof updateKnowledgeBaseSchema>;
export type KnowledgeBaseItem = typeof knowledgeBase.$inferSelect;

// ─── Subscription Plans ────────────────────────────────────────────────────────
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  priceMonthly: numeric("price_monthly", { mode: "number" }).notNull().default(0),
  priceAnnual: numeric("price_annual", { mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  maxUsers: integer("max_users").notNull().default(5),
  maxLeadsPerMonth: integer("max_leads_per_month").notNull().default(100),
  maxWhatsappMessagesPerMonth: integer("max_whatsapp_messages_per_month").notNull().default(500),
  maxChannels: integer("max_channels").notNull().default(1),
  hasAiChatbot: boolean("has_ai_chatbot").notNull().default(false),
  hasCampaigns: boolean("has_campaigns").notNull().default(false),
  hasAnalytics: boolean("has_analytics").notNull().default(false),
  hasApiAccess: boolean("has_api_access").notNull().default(false),
  hasKnowledgeBase: boolean("has_knowledge_base").notNull().default(false),
  hasPrioritySupport: boolean("has_priority_support").notNull().default(false),
  trialDays: integer("trial_days").notNull().default(14),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const updateSubscriptionPlanSchema = insertSubscriptionPlanSchema.partial();
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UpdateSubscriptionPlan = z.infer<typeof updateSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const SUBSCRIPTION_STATUSES = ["trial", "active", "past_due", "suspended", "cancelled"] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: text("company_id").notNull(),
  planId: varchar("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: text("status").notNull().default("trial"),
  currentPeriodStart: timestamp("current_period_start").defaultNow(),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Plans (simple plan management for platform_admin dashboard)
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  priceMonthly: numeric("price_monthly", { mode: "number" }).notNull().default(0),
  priceYearly: numeric("price_yearly", { mode: "number" }),
  features: text("features").array(),
  maxUsers: integer("max_users"),
  maxLeads: integer("max_leads"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const updateSubscriptionSchema = insertSubscriptionSchema.partial();
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// ─── Usage Records ────────────────────────────────────────────────────────────
export const usageRecords = pgTable("usage_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: text("company_id").notNull(),
  month: text("month").notNull(), // YYYY-MM
  leadsCount: integer("leads_count").notNull().default(0),
  messagesCount: integer("messages_count").notNull().default(0),
  usersCount: integer("users_count").notNull().default(0),
  aiCallsCount: integer("ai_calls_count").notNull().default(0),
}, (table) => [
  uniqueIndex("usage_records_company_month_unique").on(table.companyId, table.month),
]);

export type UsageRecord = typeof usageRecords.$inferSelect;

// ─── Invoices ────────────────────────────────────────────────────────────────
export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = typeof INVOICE_STATUSES[number];

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: text("company_id").notNull(),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  invoiceNumber: text("invoice_number").notNull(),
  amount: numeric("amount", { mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Platform Plans schema types
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, createdAt: true, updatedAt: true });
export const updatePlanSchema = insertPlanSchema.partial();
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type UpdatePlan = z.infer<typeof updatePlanSchema>;
export type Plan = typeof plans.$inferSelect;

// Support Tickets (submitted by companies, handled by platform_admin)
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketPriority = typeof TICKET_PRIORITIES[number];
export type TicketStatus = typeof TICKET_STATUSES[number];

export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id),
  companyName: text("company_name"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  createdByUserId: varchar("created_by_user_id"),
  createdByName: text("created_by_name"),
  assignedToUserId: varchar("assigned_to_user_id"),
  assignedToName: text("assigned_to_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Platform Leads (Platform Admin Sales CRM) ───────────────────────────────
export const PLATFORM_LEAD_STAGES = [
  "new_lead",
  "contacted",
  "demo_scheduled",
  "demo_done",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;
export type PlatformLeadStage = typeof PLATFORM_LEAD_STAGES[number];

export const PLATFORM_LEAD_STAGE_LABELS: Record<PlatformLeadStage, string> = {
  new_lead: "ليد جديد",
  contacted: "تم التواصل",
  demo_scheduled: "ديمو مجدول",
  demo_done: "ديمو منتهي",
  proposal_sent: "تم إرسال العرض",
  negotiation: "تفاوض",
  won: "تم الإغلاق",
  lost: "خسارة",
};

export const PLATFORM_LEAD_SOURCES = ["website", "referral", "social", "cold_outreach"] as const;
export type PlatformLeadSource = typeof PLATFORM_LEAD_SOURCES[number];

export const platformLeads = pgTable("platform_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  source: text("source").default("website"),
  assignedRep: text("assigned_rep"),
  notes: text("notes"),
  nextActionDate: timestamp("next_action_date"),
  dealValue: numeric("deal_value", { mode: "number" }),
  stage: text("stage").notNull().default("new_lead"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true, updatedAt: true });
export const updateTicketSchema = insertTicketSchema.partial();
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type UpdateTicket = z.infer<typeof updateTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

// Ticket Replies
export const ticketReplies = pgTable("ticket_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => tickets.id).notNull(),
  userId: varchar("user_id"),
  userName: text("user_name"),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTicketReplySchema = createInsertSchema(ticketReplies).omit({ id: true, createdAt: true });
export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;
export type TicketReply = typeof ticketReplies.$inferSelect;

// Platform Notifications (events for platform_admin)
export const PLATFORM_NOTIFICATION_TYPES = ["new_registration", "trial_ending", "payment_overdue", "whatsapp_disconnect", "subscription_cancelled", "plan_upgraded"] as const;
export type PlatformNotificationType = typeof PLATFORM_NOTIFICATION_TYPES[number];

export const platformNotifications = pgTable("platform_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  message: text("message").notNull(),
  companyId: varchar("company_id").references(() => companies.id),
  companyName: text("company_name"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlatformNotificationSchema = createInsertSchema(platformNotifications).omit({ id: true, createdAt: true });
export type InsertPlatformNotification = z.infer<typeof insertPlatformNotificationSchema>;
export type PlatformNotification = typeof platformNotifications.$inferSelect;

export const insertPlatformLeadSchema = createInsertSchema(platformLeads).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  stage: z.enum(PLATFORM_LEAD_STAGES).default("new_lead"),
  source: z.enum(PLATFORM_LEAD_SOURCES).optional(),
  companyName: z.string().min(1, "Company name is required"),
});
export const updatePlatformLeadSchema = insertPlatformLeadSchema.partial();
export type InsertPlatformLead = z.infer<typeof insertPlatformLeadSchema>;
export type UpdatePlatformLead = z.infer<typeof updatePlatformLeadSchema>;
export type PlatformLead = typeof platformLeads.$inferSelect;

export const platformLeadHistory = pgTable("platform_lead_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platformLeadId: varchar("platform_lead_id").references(() => platformLeads.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(),
  description: text("description"),
  performedBy: text("performed_by"),
  fromStage: text("from_stage"),
  toStage: text("to_stage"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlatformLeadHistorySchema = createInsertSchema(platformLeadHistory).omit({ id: true, createdAt: true });
export type InsertPlatformLeadHistory = z.infer<typeof insertPlatformLeadHistorySchema>;
export type PlatformLeadHistory = typeof platformLeadHistory.$inferSelect;

// ─── Blog / CMS ──────────────────────────────────────────────────────────────

export const articleCategories = pgTable("article_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertArticleCategorySchema = createInsertSchema(articleCategories).omit({ id: true, createdAt: true });
export const updateArticleCategorySchema = insertArticleCategorySchema.partial();
export type InsertArticleCategory = z.infer<typeof insertArticleCategorySchema>;
export type UpdateArticleCategory = z.infer<typeof updateArticleCategorySchema>;
export type ArticleCategory = typeof articleCategories.$inferSelect;

export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;
export type ArticleStatus = typeof ARTICLE_STATUSES[number];

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  body: text("body"),
  featuredImage: text("featured_image"),
  categoryId: varchar("category_id").references(() => articleCategories.id),
  tags: text("tags").array(),
  authorId: varchar("author_id"),
  authorName: text("author_name"),
  status: text("status").notNull().default("draft"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  publishedAt: timestamp("published_at"),
  readingTimeMinutes: integer("reading_time_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articles).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  status: z.enum(ARTICLE_STATUSES).default("draft"),
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
});
export const updateArticleSchema = insertArticleSchema.partial().extend({
  publishedAt: z.coerce.date().optional().nullable(),
});
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type UpdateArticle = z.infer<typeof updateArticleSchema>;
export type Article = typeof articles.$inferSelect;

// TypeScript interfaces for WhatsApp conversation inbox (mapped from whatsapp_messages_log)
export interface Conversation {
  leadId: string;
  leadName: string | null;
  phone: string;
  phone2: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  totalCount: number;
  botActive?: boolean;
  botStage?: string | null;
}

export interface Message {
  id: string;
  leadId: string | null;
  direction: string | null;
  messageText: string | null;
  agentName: string | null;
  botActionsSummary: string | null;
  createdAt: Date | null;
  isRead: boolean | null;
}

// Platform Leads (contact form submissions from public marketing website)
export const platformLeads = pgTable("platform_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  message: text("message"),
  source: text("source").default("contact_form"),
  status: text("status").default("new"), // new | contacted | converted | closed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlatformLeadSchema = createInsertSchema(platformLeads).omit({ id: true, createdAt: true });
export type InsertPlatformLead = z.infer<typeof insertPlatformLeadSchema>;
export type PlatformLead = typeof platformLeads.$inferSelect;

// Export auth models (users, teams, sessions, role_permissions)
export * from "./models/auth";
