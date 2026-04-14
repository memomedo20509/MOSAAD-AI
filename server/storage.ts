import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import {
  companyProfile,
  knowledgeBaseItems,
  chatbotConfig,
  conversations,
  messages,
  leads,
  type CompanyProfile,
  type InsertCompanyProfile,
  type UpdateCompanyProfile,
  type KnowledgeBaseItem,
  type InsertKnowledgeBaseItem,
  type UpdateKnowledgeBaseItem,
  type ChatbotConfig,
  type InsertChatbotConfig,
  type UpdateChatbotConfig,
  type Conversation,
  type InsertConversation,
  type UpdateConversation,
  type Message,
  type InsertMessage,
  type Lead,
  type InsertLead,
  type UpdateLead,
} from "@shared/schema";
import {
  users,
  teams,
  type User,
  type InsertUser,
  type UpdateUser,
  type Team,
  type InsertTeam,
  DEFAULT_ROLE_PERMISSIONS,
  type RolePermissions,
  type UserRole,
} from "@shared/models/auth";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: UpdateUser): Promise<User | undefined>;

  // Teams
  getAllTeams(): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, data: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;

  // Role Permissions
  getPermissionsForRole(role: string): Promise<RolePermissions | null>;

  // Company Profile
  getCompanyProfile(): Promise<CompanyProfile | undefined>;
  upsertCompanyProfile(data: UpdateCompanyProfile): Promise<CompanyProfile>;
  resetCompanyProfile(): Promise<void>;

  // Knowledge Base
  getAllKnowledgeBaseItems(): Promise<KnowledgeBaseItem[]>;
  getKnowledgeBaseItem(id: string): Promise<KnowledgeBaseItem | undefined>;
  createKnowledgeBaseItem(data: InsertKnowledgeBaseItem): Promise<KnowledgeBaseItem>;
  updateKnowledgeBaseItem(id: string, data: UpdateKnowledgeBaseItem): Promise<KnowledgeBaseItem | undefined>;
  deleteKnowledgeBaseItem(id: string): Promise<boolean>;

  // Chatbot Config
  getChatbotConfig(): Promise<ChatbotConfig | undefined>;
  upsertChatbotConfig(data: UpdateChatbotConfig): Promise<ChatbotConfig>;
  resetChatbotConfig(): Promise<void>;

  // Conversations
  getAllConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: UpdateConversation): Promise<Conversation | undefined>;

  // Messages
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;

  // Leads
  getAllLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(data: InsertLead): Promise<Lead>;
  updateLead(id: string, data: UpdateLead): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Analytics
  getAnalytics(): Promise<{
    totalLeads: number;
    totalConversations: number;
    leadsByChannel: { channel: string; count: number }[];
    leadsByStatus: { status: string; count: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DOKPLOY_DB_URL || process.env.DATABASE_URL,
      createTableIfMissing: true,
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUser(id: string, data: UpdateUser): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }

  // Teams
  async getAllTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [created] = await db.insert(teams).values(team).returning();
    return created;
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<Team | undefined> {
    const [updated] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return updated;
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Role Permissions
  async getPermissionsForRole(role: string): Promise<RolePermissions | null> {
    return DEFAULT_ROLE_PERMISSIONS[role as UserRole] ?? null;
  }

  // Company Profile
  async getCompanyProfile(): Promise<CompanyProfile | undefined> {
    const [profile] = await db.select().from(companyProfile).where(eq(companyProfile.id, 1));
    return profile;
  }

  async upsertCompanyProfile(data: UpdateCompanyProfile): Promise<CompanyProfile> {
    const existing = await this.getCompanyProfile();
    if (existing) {
      const [updated] = await db.update(companyProfile).set({ ...data, updatedAt: new Date() }).where(eq(companyProfile.id, 1)).returning();
      return updated;
    } else {
      const [created] = await db.insert(companyProfile).values({ id: 1, ...data }).returning();
      return created;
    }
  }

  async resetCompanyProfile(): Promise<void> {
    await db.delete(companyProfile).where(eq(companyProfile.id, 1));
  }

  // Knowledge Base
  async getAllKnowledgeBaseItems(): Promise<KnowledgeBaseItem[]> {
    return db.select().from(knowledgeBaseItems).orderBy(desc(knowledgeBaseItems.createdAt));
  }

  async getKnowledgeBaseItem(id: string): Promise<KnowledgeBaseItem | undefined> {
    const [item] = await db.select().from(knowledgeBaseItems).where(eq(knowledgeBaseItems.id, id));
    return item;
  }

  async createKnowledgeBaseItem(data: InsertKnowledgeBaseItem): Promise<KnowledgeBaseItem> {
    const [created] = await db.insert(knowledgeBaseItems).values(data).returning();
    return created;
  }

  async updateKnowledgeBaseItem(id: string, data: UpdateKnowledgeBaseItem): Promise<KnowledgeBaseItem | undefined> {
    const [updated] = await db.update(knowledgeBaseItems).set({ ...data, updatedAt: new Date() }).where(eq(knowledgeBaseItems.id, id)).returning();
    return updated;
  }

  async deleteKnowledgeBaseItem(id: string): Promise<boolean> {
    const result = await db.delete(knowledgeBaseItems).where(eq(knowledgeBaseItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Chatbot Config
  async getChatbotConfig(): Promise<ChatbotConfig | undefined> {
    const [config] = await db.select().from(chatbotConfig).where(eq(chatbotConfig.id, 1));
    return config;
  }

  async upsertChatbotConfig(data: UpdateChatbotConfig): Promise<ChatbotConfig> {
    const existing = await this.getChatbotConfig();
    if (existing) {
      const [updated] = await db.update(chatbotConfig).set({ ...data, updatedAt: new Date() }).where(eq(chatbotConfig.id, 1)).returning();
      return updated;
    } else {
      const [created] = await db.insert(chatbotConfig).values({ id: 1, ...data }).returning();
      return created;
    }
  }

  async resetChatbotConfig(): Promise<void> {
    await db.delete(chatbotConfig).where(eq(chatbotConfig.id, 1));
  }

  // Conversations
  async getAllConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(data).returning();
    return created;
  }

  async updateConversation(id: string, data: UpdateConversation): Promise<Conversation | undefined> {
    const [updated] = await db.update(conversations).set({ ...data, updatedAt: new Date() }).where(eq(conversations.id, id)).returning();
    return updated;
  }

  // Messages
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.timestamp);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(data).returning();
    return created;
  }

  // Leads
  async getAllLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(data: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(data).returning();
    return created;
  }

  async updateLead(id: string, data: UpdateLead): Promise<Lead | undefined> {
    const [updated] = await db.update(leads).set({ ...data, updatedAt: new Date() }).where(eq(leads.id, id)).returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Analytics
  async getAnalytics(): Promise<{
    totalLeads: number;
    totalConversations: number;
    leadsByChannel: { channel: string; count: number }[];
    leadsByStatus: { status: string; count: number }[];
  }> {
    const [{ count: totalLeads }] = await db.select({ count: sql<number>`count(*)::int` }).from(leads);
    const [{ count: totalConversations }] = await db.select({ count: sql<number>`count(*)::int` }).from(conversations);

    const leadsByChannel = await db
      .select({ channel: leads.sourceChannel, count: sql<number>`count(*)::int` })
      .from(leads)
      .groupBy(leads.sourceChannel);

    const leadsByStatus = await db
      .select({ status: leads.status, count: sql<number>`count(*)::int` })
      .from(leads)
      .groupBy(leads.status);

    return {
      totalLeads,
      totalConversations,
      leadsByChannel: leadsByChannel.map(r => ({ channel: r.channel ?? "unknown", count: r.count })),
      leadsByStatus: leadsByStatus.map(r => ({ status: r.status, count: r.count })),
    };
  }
}

export const storage = new DatabaseStorage();
