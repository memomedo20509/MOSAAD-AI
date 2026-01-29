import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  users,
  leads,
  leadStates,
  clients,
  tasks,
  leadHistory,
  type User,
  type InsertUser,
  type Lead,
  type InsertLead,
  type LeadState,
  type InsertLeadState,
  type Client,
  type InsertClient,
  type Task,
  type InsertTask,
  type LeadHistory,
  type InsertLeadHistory,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Lead States
  getAllStates(): Promise<LeadState[]>;
  getState(id: string): Promise<LeadState | undefined>;
  createState(state: InsertLeadState): Promise<LeadState>;
  updateState(id: string, data: Partial<LeadState>): Promise<LeadState | undefined>;
  deleteState(id: string): Promise<boolean>;

  // Leads
  getAllLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Tasks
  getAllTasks(): Promise<Task[]>;
  getTasksByLeadId(leadId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Lead History
  getAllHistory(): Promise<LeadHistory[]>;
  getHistoryByLeadId(leadId: string): Promise<LeadHistory[]>;
  createHistory(history: InsertLeadHistory): Promise<LeadHistory>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Lead States
  async getAllStates(): Promise<LeadState[]> {
    return db.select().from(leadStates).orderBy(leadStates.order);
  }

  async getState(id: string): Promise<LeadState | undefined> {
    const [state] = await db.select().from(leadStates).where(eq(leadStates.id, id));
    return state;
  }

  async createState(state: InsertLeadState): Promise<LeadState> {
    const allStates = await this.getAllStates();
    const maxOrder = allStates.length > 0 ? Math.max(...allStates.map(s => s.order)) : -1;
    const [newState] = await db.insert(leadStates).values({ ...state, order: maxOrder + 1 }).returning();
    return newState;
  }

  async updateState(id: string, data: Partial<LeadState>): Promise<LeadState | undefined> {
    const [updated] = await db.update(leadStates).set(data).where(eq(leadStates.id, id)).returning();
    return updated;
  }

  async deleteState(id: string): Promise<boolean> {
    const result = await db.delete(leadStates).where(eq(leadStates.id, id)).returning();
    return result.length > 0;
  }

  // Leads
  async getAllLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(leads.createdAt);
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    await this.createHistory({
      leadId: newLead.id,
      action: "Lead Created",
      description: `Lead was created`,
      performedBy: "System",
    });
    return newLead;
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads).set({ ...data, updatedAt: new Date() }).where(eq(leads.id, id)).returning();
    if (updated) {
      await this.createHistory({
        leadId: id,
        action: "Lead Updated",
        description: `Lead information was updated`,
        performedBy: "System",
      });
    }
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    // Delete related tasks first
    await db.delete(tasks).where(eq(tasks.leadId, id));
    // Delete related history
    await db.delete(leadHistory).where(eq(leadHistory.leadId, id));
    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result.length > 0;
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(clients.createdAt);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | undefined> {
    const [updated] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  // Tasks
  async getAllTasks(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(tasks.createdAt);
  }

  async getTasksByLeadId(leadId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.leadId, leadId)).orderBy(tasks.createdAt);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    if (task.leadId) {
      await this.createHistory({
        leadId: task.leadId,
        action: "Task Created",
        description: `Task "${task.title}" was created`,
        performedBy: "System",
      });
    }
    return newTask;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  // Lead History
  async getAllHistory(): Promise<LeadHistory[]> {
    return db.select().from(leadHistory).orderBy(leadHistory.createdAt);
  }

  async getHistoryByLeadId(leadId: string): Promise<LeadHistory[]> {
    return db.select().from(leadHistory).where(eq(leadHistory.leadId, leadId)).orderBy(leadHistory.createdAt);
  }

  async createHistory(history: InsertLeadHistory): Promise<LeadHistory> {
    const [newHistory] = await db.insert(leadHistory).values(history).returning();
    return newHistory;
  }
}

export const storage = new DatabaseStorage();
