import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import {
  users,
  teams,
  leads,
  leadStates,
  clients,
  tasks,
  leadHistory,
  developers,
  projects,
  units,
  leadUnitInterests,
  communications,
  reminders,
  type User,
  type InsertUser,
  type UpdateUser,
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
  type Team,
  type InsertTeam,
  type Developer,
  type InsertDeveloper,
  type Project,
  type InsertProject,
  type Unit,
  type InsertUnit,
  type LeadUnitInterest,
  type InsertLeadUnitInterest,
  type Communication,
  type InsertCommunication,
  type Reminder,
  type InsertReminder,
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store for authentication
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

  // Developers
  getAllDevelopers(): Promise<Developer[]>;
  getDeveloper(id: string): Promise<Developer | undefined>;
  createDeveloper(developer: InsertDeveloper): Promise<Developer>;
  updateDeveloper(id: string, data: Partial<Developer>): Promise<Developer | undefined>;
  deleteDeveloper(id: string): Promise<boolean>;

  // Projects
  getAllProjects(): Promise<Project[]>;
  getProjectsByDeveloper(developerId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Units
  getAllUnits(): Promise<Unit[]>;
  getUnitsByProject(projectId: string): Promise<Unit[]>;
  getUnit(id: string): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: string, data: Partial<Unit>): Promise<Unit | undefined>;
  deleteUnit(id: string): Promise<boolean>;

  // Lead Unit Interests
  getLeadUnitInterests(leadId: string): Promise<LeadUnitInterest[]>;
  getUnitInterests(unitId: string): Promise<LeadUnitInterest[]>;
  createLeadUnitInterest(interest: InsertLeadUnitInterest): Promise<LeadUnitInterest>;
  deleteLeadUnitInterest(id: string): Promise<boolean>;

  // Communications
  getCommunicationsByLead(leadId: string): Promise<Communication[]>;
  createCommunication(comm: InsertCommunication): Promise<Communication>;

  // Reminders
  getAllReminders(): Promise<Reminder[]>;
  getRemindersByUser(userId: string): Promise<Reminder[]>;
  getRemindersByLead(leadId: string): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'sessions'
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
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.createdAt);
  }

  async updateUser(id: string, data: UpdateUser): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }

  // Teams
  async getAllTeams(): Promise<Team[]> {
    return db.select().from(teams).orderBy(teams.createdAt);
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<Team | undefined> {
    const [updated] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return updated;
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
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

  // Developers
  async getAllDevelopers(): Promise<Developer[]> {
    return db.select().from(developers).orderBy(developers.name);
  }

  async getDeveloper(id: string): Promise<Developer | undefined> {
    const [developer] = await db.select().from(developers).where(eq(developers.id, id));
    return developer;
  }

  async createDeveloper(developer: InsertDeveloper): Promise<Developer> {
    const [newDeveloper] = await db.insert(developers).values(developer).returning();
    return newDeveloper;
  }

  async updateDeveloper(id: string, data: Partial<Developer>): Promise<Developer | undefined> {
    const [updated] = await db.update(developers).set({ ...data, updatedAt: new Date() }).where(eq(developers.id, id)).returning();
    return updated;
  }

  async deleteDeveloper(id: string): Promise<boolean> {
    const result = await db.delete(developers).where(eq(developers.id, id)).returning();
    return result.length > 0;
  }

  // Projects
  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(projects.name);
  }

  async getProjectsByDeveloper(developerId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.developerId, developerId)).orderBy(projects.name);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  // Units
  async getAllUnits(): Promise<Unit[]> {
    return db.select().from(units).orderBy(units.unitNumber);
  }

  async getUnitsByProject(projectId: string): Promise<Unit[]> {
    return db.select().from(units).where(eq(units.projectId, projectId)).orderBy(units.floor, units.unitNumber);
  }

  async getUnit(id: string): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit;
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const [newUnit] = await db.insert(units).values(unit).returning();
    return newUnit;
  }

  async updateUnit(id: string, data: Partial<Unit>): Promise<Unit | undefined> {
    const [updated] = await db.update(units).set({ ...data, updatedAt: new Date() }).where(eq(units.id, id)).returning();
    return updated;
  }

  async deleteUnit(id: string): Promise<boolean> {
    const result = await db.delete(units).where(eq(units.id, id)).returning();
    return result.length > 0;
  }

  // Lead Unit Interests
  async getLeadUnitInterests(leadId: string): Promise<LeadUnitInterest[]> {
    return db.select().from(leadUnitInterests).where(eq(leadUnitInterests.leadId, leadId));
  }

  async getUnitInterests(unitId: string): Promise<LeadUnitInterest[]> {
    return db.select().from(leadUnitInterests).where(eq(leadUnitInterests.unitId, unitId));
  }

  async createLeadUnitInterest(interest: InsertLeadUnitInterest): Promise<LeadUnitInterest> {
    const [newInterest] = await db.insert(leadUnitInterests).values(interest).returning();
    return newInterest;
  }

  async deleteLeadUnitInterest(id: string): Promise<boolean> {
    const result = await db.delete(leadUnitInterests).where(eq(leadUnitInterests.id, id)).returning();
    return result.length > 0;
  }

  // Communications
  async getCommunicationsByLead(leadId: string): Promise<Communication[]> {
    return db.select().from(communications).where(eq(communications.leadId, leadId)).orderBy(communications.createdAt);
  }

  async createCommunication(comm: InsertCommunication): Promise<Communication> {
    const [newComm] = await db.insert(communications).values(comm).returning();
    return newComm;
  }

  // Reminders
  async getAllReminders(): Promise<Reminder[]> {
    return db.select().from(reminders).orderBy(reminders.dueDate);
  }

  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    return db.select().from(reminders).where(eq(reminders.userId, userId)).orderBy(reminders.dueDate);
  }

  async getRemindersByLead(leadId: string): Promise<Reminder[]> {
    return db.select().from(reminders).where(eq(reminders.leadId, leadId)).orderBy(reminders.dueDate);
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db.insert(reminders).values(reminder).returning();
    return newReminder;
  }

  async updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder | undefined> {
    const [updated] = await db.update(reminders).set(data).where(eq(reminders.id, id)).returning();
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    const result = await db.delete(reminders).where(eq(reminders.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
