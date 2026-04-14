import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

// Company Profile (single-row settings)
export const companyProfile = pgTable("company_profile", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default("My Company"),
  industry: text("industry"),
  website: text("website"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfile).omit({ id: true, updatedAt: true });
export const updateCompanyProfileSchema = insertCompanyProfileSchema.partial();
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type UpdateCompanyProfile = z.infer<typeof updateCompanyProfileSchema>;
export type CompanyProfile = typeof companyProfile.$inferSelect;

// Knowledge Base Items
export const knowledgeBaseItems = pgTable("knowledge_base_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  price: numeric("price"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeBaseItemSchema = createInsertSchema(knowledgeBaseItems).omit({ id: true, createdAt: true, updatedAt: true });
export const updateKnowledgeBaseItemSchema = insertKnowledgeBaseItemSchema.partial();
export type InsertKnowledgeBaseItem = z.infer<typeof insertKnowledgeBaseItemSchema>;
export type UpdateKnowledgeBaseItem = z.infer<typeof updateKnowledgeBaseItemSchema>;
export type KnowledgeBaseItem = typeof knowledgeBaseItems.$inferSelect;

// Chatbot Configuration (single-row per tenant)
export const chatbotConfig = pgTable("chatbot_config", {
  id: integer("id").primaryKey().default(1),
  personaName: text("persona_name").notNull().default("SalesBot"),
  greeting: text("greeting").notNull().default("Hello! How can I help you today?"),
  leadQuestions: jsonb("lead_questions").$type<string[]>().default([]),
  language: text("language").notNull().default("en"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatbotConfigSchema = createInsertSchema(chatbotConfig).omit({ id: true, updatedAt: true }).extend({
  leadQuestions: z.array(z.string()).optional(),
});
export const updateChatbotConfigSchema = insertChatbotConfigSchema.partial();
export type InsertChatbotConfig = z.infer<typeof insertChatbotConfigSchema>;
export type UpdateChatbotConfig = z.infer<typeof updateChatbotConfigSchema>;
export type ChatbotConfig = typeof chatbotConfig.$inferSelect;

// Conversations
export const CONVERSATION_STATUSES = ["open", "closed", "pending"] as const;
export const CONVERSATION_PLATFORMS = ["web", "whatsapp", "messenger", "instagram", "other"] as const;

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull().default("web"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactId: text("contact_id"),
  status: text("status").notNull().default("open"),
  channel: text("channel"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  platform: z.enum(CONVERSATION_PLATFORMS).default("web"),
  status: z.enum(CONVERSATION_STATUSES).default("open"),
});
export const updateConversationSchema = insertConversationSchema.partial();
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type UpdateConversation = z.infer<typeof updateConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages
export const MESSAGE_ROLES = ["user", "bot", "agent"] as const;

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull().default("user"),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, timestamp: true }).extend({
  role: z.enum(MESSAGE_ROLES).default("user"),
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Leads
export const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  interest: text("interest"),
  sourceChannel: text("source_channel"),
  status: text("status").notNull().default("new"),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  status: z.enum(LEAD_STATUSES).default("new"),
});
export const updateLeadSchema = insertLeadSchema.partial();
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type UpdateLead = z.infer<typeof updateLeadSchema>;
export type Lead = typeof leads.$inferSelect;
