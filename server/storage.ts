import { db, pool } from "./db";
import { eq, and, ne, isNotNull, isNull, lt, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { computeScore, getScoringConfig, type ScoringContext } from "./scoring";
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
  documents,
  commissions,
  rolePermissions,
  notifications,
  callLogs,
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
  type Document,
  type InsertDocument,
  type Commission,
  type InsertCommission,
  type UpdateCommission,
  type Notification,
  type InsertNotification,
  type CallLog,
  type InsertCallLog,
  type RolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
  type UserRole,
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
  createLead(lead: InsertLead, creatingUserTeamId?: string | null): Promise<Lead>;
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
  getLeadUnitInterest(id: string): Promise<LeadUnitInterest | undefined>;
  getUnitInterests(unitId: string): Promise<LeadUnitInterest[]>;
  createLeadUnitInterest(interest: InsertLeadUnitInterest): Promise<LeadUnitInterest>;
  deleteLeadUnitInterest(id: string): Promise<boolean>;

  // Communications
  getCommunicationsByLead(leadId: string): Promise<Communication[]>;
  createCommunication(comm: InsertCommunication): Promise<Communication>;

  // Scoring
  refreshLeadScore(id: string): Promise<Lead | undefined>;
  refreshAllLeadScores(): Promise<void>;
  getAllLeadsWithRefreshedScores(): Promise<Lead[]>;

  // Team Load & Auto Assign
  getTeamLoad(teamId?: string | null): Promise<{ userId: string; userName: string; leadCount: number; role: string }[]>;
  autoAssignLead(leadId: string, requestingUserTeamId?: string | null): Promise<Lead | undefined>;

  // Reminders
  getAllReminders(): Promise<Reminder[]>;
  getRemindersByUser(userId: string): Promise<Reminder[]>;
  getRemindersByLead(leadId: string): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;

  // Documents
  getDocumentsByLead(leadId: string): Promise<Document[]>;
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;

  // Response Time & Team Activity
  getResponseTimeReport(): Promise<{
    agentId: string;
    agentName: string;
    avgResponseMinutes: number | null;
    fastestResponseMinutes: number | null;
    slowestResponseMinutes: number | null;
    uncontactedCount: number;
  }[]>;
  getTeamActivityToday(): Promise<{
    agentId: string;
    agentName: string;
    leadsContactedToday: number;
    leadsAddedToday: number;
    avgResponseMinutesThisWeek: number | null;
    uncontactedOver24h: number;
  }[]>;

  // Commissions
  getAllCommissions(): Promise<Commission[]>;
  getCommissionsByAgent(agentId: string): Promise<Commission[]>;
  getCommission(id: string): Promise<Commission | undefined>;
  createCommission(commission: InsertCommission): Promise<Commission>;
  updateCommission(id: string, data: UpdateCommission): Promise<Commission | undefined>;
  deleteCommission(id: string): Promise<boolean>;
  getCommissionSummary(agentId?: string, teamMemberIds?: string[]): Promise<{ agentId: string; agentName: string; month: string; total: number; count: number }[]>;

  // Role Permissions (dynamic, per super_admin)
  getRolePermissions(): Promise<Record<string, RolePermissions>>;
  getPermissionsForRole(role: string): Promise<RolePermissions | null>;
  setRolePermissions(role: string, permissions: RolePermissions): Promise<void>;
  
  // Lead filtering by role
  getLeadsByRole(userId: string, role: string, teamId?: string | null, username?: string | null): Promise<Lead[]>;
  transferLead(leadId: string, toUserId: string, performedBy: string): Promise<Lead | undefined>;

  // Notifications
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  getNotificationById(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;
  getRemindersUpcomingIn15Min(): Promise<Reminder[]>;
  recentReminderNotificationExists(reminderId: string): Promise<boolean>;

  // Call Logs
  getCallLogsByLead(leadId: string): Promise<CallLog[]>;
  createCallLog(callLog: InsertCallLog): Promise<CallLog>;

  // My Day
  getMyDayData(userId: string, userRole: string, teamId?: string | null, username?: string | null): Promise<{
    todayFollowUps: (Reminder & { lead: Lead | null })[];
    newLeads: Lead[];
    overdueFollowUps: (Reminder & { lead: Lead | null })[];
    doneToday: (Reminder & { lead: Lead | null })[];
  }>;
  getAgentCompletionRates(teamId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    scheduled: number;
    completed: number;
  }[]>;
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

  private async buildScoringContext(leadId: string): Promise<ScoringContext> {
    const [commRows, taskRows] = await Promise.all([
      this.getCommunicationsByLead(leadId),
      db.select().from(tasks).where(eq(tasks.leadId, leadId)),
    ]);
    return {
      commCount: commRows.length,
      completedTaskCount: taskRows.filter(t => t.completed === true).length,
    };
  }

  async createLead(lead: InsertLead, creatingUserTeamId?: string | null): Promise<Lead> {
    const leadForScoring: Lead = {
      id: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      score: lead.score ?? "warm",
      name: lead.name ?? null,
      email: lead.email ?? null,
      phone: lead.phone ?? "",
      phone2: lead.phone2 ?? null,
      area: lead.area ?? null,
      space: lead.space ?? null,
      campaign: lead.campaign ?? null,
      campaignName: lead.campaignName ?? null,
      channel: lead.channel ?? null,
      notes: lead.notes ?? null,
      stateId: lead.stateId ?? null,
      assignedTo: lead.assignedTo ?? null,
      budget: lead.budget ?? null,
      requestType: lead.requestType ?? null,
      unitType: lead.unitType ?? null,
      location: lead.location ?? null,
      paymentType: lead.paymentType ?? null,
      downPayment: lead.downPayment ?? null,
      bedrooms: lead.bedrooms ?? null,
      bathrooms: lead.bathrooms ?? null,
      lastAction: lead.lastAction ?? null,
      lastActionDate: lead.lastActionDate ?? null,
      tags: lead.tags ?? null,
      marketingCost: lead.marketingCost ?? null,
      firstContactAt: null,
      responseTimeMinutes: null,
    };
    const config = await getScoringConfig();
    const score = computeScore(leadForScoring, { commCount: 0, completedTaskCount: 0 }, config);
    const { firstContactAt: _fca, responseTimeMinutes: _rtm, ...safeLeadData } = lead as any;
    const [newLead] = await db.insert(leads).values({ ...safeLeadData, score }).returning();
    await this.createHistory({
      leadId: newLead.id,
      action: "Lead Created",
      description: `Lead was created`,
      performedBy: "System",
    });
    if (!newLead.assignedTo) {
      const assigned = await this.autoAssignLead(newLead.id, creatingUserTeamId ?? null);
      return assigned ?? newLead;
    }
    return newLead;
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined> {
    const existing = await this.getLead(id);
    if (!existing) return undefined;
    const { firstContactAt: _fca, responseTimeMinutes: _rtm, ...safeUpdateData } = data as any;
    const merged: Lead = { ...existing, ...safeUpdateData };
    const ctx = await this.buildScoringContext(id);
    const config = await getScoringConfig();
    const score = computeScore(merged, ctx, config);
    const [updated] = await db.update(leads).set({ ...safeUpdateData, score, updatedAt: new Date() }).where(eq(leads.id, id)).returning();
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

  async refreshLeadScore(id: string): Promise<Lead | undefined> {
    const lead = await this.getLead(id);
    if (!lead) return undefined;
    const ctx = await this.buildScoringContext(id);
    const config = await getScoringConfig();
    const score = computeScore(lead, ctx, config);
    const [updated] = await db.update(leads).set({ score }).where(eq(leads.id, id)).returning();
    return updated;
  }

  async getAllLeadsWithRefreshedScores(): Promise<Lead[]> {
    const allLeads = await db.select().from(leads).orderBy(leads.createdAt);
    const config = await getScoringConfig();
    const updated: Lead[] = [];
    for (const lead of allLeads) {
      const ctx = await this.buildScoringContext(lead.id);
      const score = computeScore(lead, ctx, config);
      if (score !== lead.score) {
        const [refreshed] = await db.update(leads).set({ score }).where(eq(leads.id, lead.id)).returning();
        updated.push(refreshed ?? lead);
      } else {
        updated.push(lead);
      }
    }
    return updated;
  }

  async refreshAllLeadScores(): Promise<void> {
    const allLeads = await db.select().from(leads).orderBy(leads.createdAt);
    const config = await getScoringConfig();
    for (const lead of allLeads) {
      const ctx = await this.buildScoringContext(lead.id);
      const score = computeScore(lead, ctx, config);
      if (score !== lead.score) {
        await db.update(leads).set({ score }).where(eq(leads.id, lead.id));
      }
    }
  }

  async deleteLead(id: string): Promise<boolean> {
    // Delete related records first to avoid FK constraint errors
    await db.delete(tasks).where(eq(tasks.leadId, id));
    await db.delete(leadHistory).where(eq(leadHistory.leadId, id));
    await db.delete(communications).where(eq(communications.leadId, id));
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

  async getLeadUnitInterest(id: string): Promise<LeadUnitInterest | undefined> {
    const [interest] = await db.select().from(leadUnitInterests).where(eq(leadUnitInterests.id, id));
    return interest;
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
    // Set firstContactAt and responseTimeMinutes on lead if this is the first communication
    const lead = await this.getLead(comm.leadId);
    if (lead && !lead.firstContactAt) {
      const contactAt = newComm.createdAt ?? new Date();
      let responseTimeMinutes: number | null = null;
      if (lead.createdAt) {
        responseTimeMinutes = Math.max(0, Math.round((contactAt.getTime() - new Date(lead.createdAt).getTime()) / 60000));
      }
      await db.update(leads).set({ firstContactAt: contactAt, responseTimeMinutes }).where(eq(leads.id, comm.leadId));
    }
    return newComm;
  }

  // Team Load & Auto Assign
  async getTeamLoad(teamId?: string | null): Promise<{ userId: string; userName: string; leadCount: number; role: string }[]> {
    const allUsers = await db.select().from(users).where(eq(users.isActive, true));
    let agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "sales_manager");
    if (teamId) {
      agents = agents.filter(u => u.teamId === teamId);
    }
    const allLeads = await db.select().from(leads);
    const doneStates = (await db.select().from(leadStates)).filter(s => ["Done Deal", "Canceled", "Not Interested", "تم الصفقة", "ملغي", "غير مهتم"].includes(s.name)).map(s => s.id);
    return agents.map(agent => {
      const userName = `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || agent.username;
      const leadCount = allLeads.filter(l => l.assignedTo === agent.id && !doneStates.includes(l.stateId ?? "")).length;
      return { userId: agent.id, userName, leadCount, role: agent.role ?? "sales_agent" };
    }).sort((a, b) => a.leadCount - b.leadCount);
  }

  async autoAssignLead(leadId: string, requestingUserTeamId?: string | null): Promise<Lead | undefined> {
    const lead = await this.getLead(leadId);
    if (!lead) return undefined;
    if (lead.assignedTo) return lead;
    const allUsers = await db.select().from(users).where(eq(users.isActive, true));
    let candidates = allUsers.filter(u => u.role === "sales_agent");
    if (requestingUserTeamId) {
      candidates = candidates.filter(u => u.teamId === requestingUserTeamId);
    }
    if (candidates.length === 0) return undefined;
    const allLeads = await db.select().from(leads);
    const doneStates = (await db.select().from(leadStates))
      .filter(s => ["Done Deal", "Canceled", "Not Interested", "تم الصفقة", "ملغي", "غير مهتم"].includes(s.name))
      .map(s => s.id);
    const agentWithLeast = candidates.reduce((min, agent) => {
      const count = allLeads.filter(l => l.assignedTo === agent.id && !doneStates.includes(l.stateId ?? "")).length;
      const minCount = allLeads.filter(l => l.assignedTo === min.id && !doneStates.includes(l.stateId ?? "")).length;
      return count < minCount ? agent : min;
    }, candidates[0]);
    const [updated] = await db
      .update(leads)
      .set({ assignedTo: agentWithLeast.id })
      .where(eq(leads.id, leadId))
      .returning();
    return updated;
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

  // Response Time & Team Activity
  async getResponseTimeReport(): Promise<{
    agentId: string;
    agentName: string;
    avgResponseMinutes: number | null;
    fastestResponseMinutes: number | null;
    slowestResponseMinutes: number | null;
    uncontactedCount: number;
  }[]> {
    const allUsers = await db.select().from(users).where(eq(users.isActive, true));
    const agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "sales_manager");
    
    // Period for stats (this month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allLeads = await db.select().from(leads);
    
    return agents.map(agent => {
      const agentName = `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || agent.username;
      
      const agentLeads = allLeads.filter(l => l.assignedTo === agent.id);
      
      const contactedThisMonth = agentLeads.filter(l => 
        l.firstContactAt && new Date(l.firstContactAt) >= startOfMonth
      );
      
      const responseTimes = contactedThisMonth
        .map(l => l.responseTimeMinutes)
        .filter((rt): rt is number => rt !== null);
        
      const uncontactedCount = agentLeads.filter(l => !l.firstContactAt).length;
      
      return {
        agentId: agent.id,
        agentName,
        avgResponseMinutes: responseTimes.length > 0 
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) 
          : null,
        fastestResponseMinutes: responseTimes.length > 0 ? Math.min(...responseTimes) : null,
        slowestResponseMinutes: responseTimes.length > 0 ? Math.max(...responseTimes) : null,
        uncontactedCount,
      };
    });
  }

  async getTeamActivityToday(): Promise<{
    agentId: string;
    agentName: string;
    leadsContactedToday: number;
    leadsAddedToday: number;
    avgResponseMinutesThisWeek: number | null;
    uncontactedOver24h: number;
  }[]> {
    const allUsers = await db.select().from(users).where(eq(users.isActive, true));
    const agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "sales_manager");
    
    const allLeads = await db.select().from(leads);
    const allComms = await db.select().from(communications);
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const over24hCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return agents.map(agent => {
      const agentName = `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || agent.username;
      const agentLeads = allLeads.filter(l => l.assignedTo === agent.id);
      
      const agentCommsToday = allComms.filter(c => 
        c.userId === agent.id && c.createdAt && new Date(c.createdAt) >= todayStart
      );
      const leadsContactedToday = new Set(agentCommsToday.map(c => c.leadId)).size;
      
      const leadsAddedToday = agentLeads.filter(l => 
        l.createdAt && new Date(l.createdAt) >= todayStart
      ).length;
      
      const weekLeads = agentLeads.filter(l => 
        l.firstContactAt && l.createdAt && new Date(l.createdAt) >= weekStart
      );
      const responseTimes = weekLeads.map(l => {
        const created = new Date(l.createdAt!).getTime();
        const contacted = new Date(l.firstContactAt!).getTime();
        return Math.max(0, Math.round((contacted - created) / 60000));
      });
      const avgResponseMinutesThisWeek = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;
        
      const uncontactedOver24h = agentLeads.filter(l => 
        !l.firstContactAt && l.createdAt && new Date(l.createdAt) <= over24hCutoff
      ).length;
      
      return {
        agentId: agent.id,
        agentName,
        leadsContactedToday,
        leadsAddedToday,
        avgResponseMinutesThisWeek,
        uncontactedOver24h,
      };
    });
  }

  // Documents
  async getDocumentsByLead(leadId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.leadId, leadId)).orderBy(documents.createdAt);
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.clientId, clientId)).orderBy(documents.createdAt);
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }

  // Commissions
  async getAllCommissions(): Promise<Commission[]> {
    return db.select().from(commissions).orderBy(commissions.createdAt);
  }

  async getCommissionsByAgent(agentId: string): Promise<Commission[]> {
    return db.select().from(commissions).where(eq(commissions.agentId, agentId)).orderBy(commissions.createdAt);
  }

  async getCommission(id: string): Promise<Commission | undefined> {
    const [commission] = await db.select().from(commissions).where(eq(commissions.id, id));
    return commission;
  }

  async createCommission(commission: InsertCommission): Promise<Commission> {
    const [newCommission] = await db.insert(commissions).values(commission).returning();
    return newCommission;
  }

  async updateCommission(id: string, data: UpdateCommission): Promise<Commission | undefined> {
    const [updated] = await db.update(commissions).set(data).where(eq(commissions.id, id)).returning();
    return updated;
  }

  async deleteCommission(id: string): Promise<boolean> {
    const result = await db.delete(commissions).where(eq(commissions.id, id)).returning();
    return result.length > 0;
  }

  async getCommissionSummary(agentId?: string, teamMemberIds?: string[]): Promise<{ agentId: string; agentName: string; month: string; total: number; count: number }[]> {
    const all = agentId
      ? await db.select().from(commissions).where(eq(commissions.agentId, agentId))
      : await db.select().from(commissions);
    
    const filtered = teamMemberIds
      ? all.filter(c => c.agentId && teamMemberIds.includes(c.agentId))
      : all;

    const grouped: Record<string, { agentId: string; agentName: string; month: string; total: number; count: number }> = {};
    for (const c of filtered) {
      const key = `${c.agentId}__${c.month}`;
      if (!grouped[key]) {
        grouped[key] = { agentId: c.agentId ?? "", agentName: c.agentName ?? "", month: c.month, total: 0, count: 0 };
      }
      grouped[key].total += c.commissionAmount;
      grouped[key].count += 1;
    }
    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
  }

  // Role Permissions (dynamic overrides)
  async getRolePermissions(): Promise<Record<string, RolePermissions>> {
    const rows = await db.select().from(rolePermissions);
    const result: Record<string, RolePermissions> = { ...DEFAULT_ROLE_PERMISSIONS };
    for (const row of rows) {
      result[row.role] = row.permissions as RolePermissions;
    }
    return result;
  }

  async getPermissionsForRole(role: string): Promise<RolePermissions | null> {
    const [row] = await db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
    return row ? (row.permissions as RolePermissions) : null;
  }

  async setRolePermissions(role: string, permissions: RolePermissions): Promise<void> {
    const existing = await db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
    if (existing.length > 0) {
      await db.update(rolePermissions)
        .set({ permissions: permissions as unknown, updatedAt: new Date() })
        .where(eq(rolePermissions.role, role));
    } else {
      await db.insert(rolePermissions).values({ role, permissions: permissions as unknown });
    }
  }

  // Lead filtering by role
  async getLeadsByRole(userId: string, role: string, teamId?: string | null, username?: string | null): Promise<Lead[]> {
    const allLeads = await this.getAllLeadsWithRefreshedScores();
    if (role === "sales_agent") {
      // Support both id-based and legacy username-based assignment
      return allLeads.filter(l => l.assignedTo === userId || (username && l.assignedTo === username));
    }
    if (role === "team_leader" && teamId) {
      const teamUsers = await this.getAllUsers().then(users => users.filter(u => u.teamId === teamId).map(u => u.id));
      return allLeads.filter(l => l.assignedTo && teamUsers.includes(l.assignedTo));
    }
    return allLeads;
  }

  async transferLead(leadId: string, toUserId: string, performedBy: string): Promise<Lead | undefined> {
    const lead = await this.getLead(leadId);
    if (!lead) return undefined;
    const toUser = await this.getUser(toUserId);
    if (!toUser) return undefined;
    const toUserName = `${toUser.firstName ?? ""} ${toUser.lastName ?? ""}`.trim() || toUser.username;
    const [updated] = await db
      .update(leads)
      .set({ assignedTo: toUserId, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();
    await this.createHistory({
      leadId,
      action: "Lead Transferred",
      description: `تم تحويل الليد إلى ${toUserName}`,
      performedBy,
    });
    return updated;
  }

  // Notifications
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(notifications.createdAt);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const rows = await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return rows.length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotificationById(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  async getRemindersUpcomingIn15Min(): Promise<Reminder[]> {
    const now = new Date();
    const in15 = new Date(now.getTime() + 15 * 60 * 1000);
    return db.select().from(reminders)
      .where(
        and(
          eq(reminders.isCompleted, false),
          gte(reminders.dueDate, now),
          lte(reminders.dueDate, in15)
        )
      );
  }

  async recentReminderNotificationExists(reminderId: string): Promise<boolean> {
    // Check if a notification for this reminderId was created in the last 20 minutes
    const cutoff = new Date(Date.now() - 20 * 60 * 1000);
    const results = await db.select().from(notifications)
      .where(
        and(
          eq(notifications.reminderId, reminderId),
          eq(notifications.type, "reminder"),
          gte(notifications.createdAt, cutoff)
        )
      );
    return results.length > 0;
  }

  // Call Logs
  async getCallLogsByLead(leadId: string): Promise<CallLog[]> {
    return db.select().from(callLogs)
      .where(eq(callLogs.leadId, leadId))
      .orderBy(callLogs.createdAt);
  }

  async createCallLog(callLog: InsertCallLog): Promise<CallLog> {
    const [newCallLog] = await db.insert(callLogs).values(callLog).returning();
    return newCallLog;
  }

  // My Day
  async getMyDayData(userId: string, userRole: string, teamId?: string | null, username?: string | null): Promise<{
    todayFollowUps: (Reminder & { lead: Lead | null })[];
    newLeads: Lead[];
    overdueFollowUps: (Reminder & { lead: Lead | null })[];
    doneToday: (Reminder & { lead: Lead | null })[];
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Get all reminders for this user
    const allUserReminders = await db.select().from(reminders)
      .where(eq(reminders.userId, userId));

    // Get accessible leads
    const accessibleLeads = await this.getLeadsByRole(userId, userRole, teamId, username);
    const accessibleLeadIds = new Set(accessibleLeads.map(l => l.id));
    const leadMap = new Map(accessibleLeads.map(l => [l.id, l]));

    const scoreOrder = { hot: 0, warm: 1, cold: 2 };
    const sortByScore = (a: Reminder & { lead: Lead | null }, b: Reminder & { lead: Lead | null }) => {
      const aScore = a.lead?.score ?? "cold";
      const bScore = b.lead?.score ?? "cold";
      return (scoreOrder[aScore as keyof typeof scoreOrder] ?? 2) - (scoreOrder[bScore as keyof typeof scoreOrder] ?? 2);
    };

    // Today's incomplete follow-ups (due between now and end of today, not overdue)
    const todayFollowUpsRaw = allUserReminders.filter(r => {
      if (!r.dueDate) return false;
      const due = new Date(r.dueDate);
      return due >= now && due < todayEnd && !r.isCompleted && (r.leadId ? accessibleLeadIds.has(r.leadId) : true);
    }).map(r => ({ ...r, lead: r.leadId ? (leadMap.get(r.leadId) ?? null) : null }));

    // Overdue (any reminder due before now and not completed)
    const overdueFollowUpsRaw = allUserReminders.filter(r => {
      if (!r.dueDate) return false;
      const due = new Date(r.dueDate);
      return due < now && !r.isCompleted && (r.leadId ? accessibleLeadIds.has(r.leadId) : true);
    }).map(r => ({ ...r, lead: r.leadId ? (leadMap.get(r.leadId) ?? null) : null }));

    // Done today: reminders completed today (by completedAt), plus leads without reminder that had a call log today
    const doneTodayFromReminders = allUserReminders.filter(r => {
      if (!r.isCompleted) return false;
      const completedDate = r.completedAt ? new Date(r.completedAt) : null;
      if (!completedDate) return false;
      return completedDate >= todayStart && completedDate < todayEnd && (r.leadId ? accessibleLeadIds.has(r.leadId) : true);
    }).map(r => ({ ...r, lead: r.leadId ? (leadMap.get(r.leadId) ?? null) : null }));

    // Also include call logs today that had no reminder (e.g., from New Leads)
    const todayCallLogs = await db.select().from(callLogs)
      .where(
        and(
          eq(callLogs.userId, userId),
          gte(callLogs.createdAt, todayStart),
          lte(callLogs.createdAt, todayEnd)
        )
      );
    const reminderLeadIds = new Set(doneTodayFromReminders.map(r => r.leadId).filter(Boolean));
    const doneTodayFromCallLogs = todayCallLogs
      .filter(cl => cl.leadId && accessibleLeadIds.has(cl.leadId) && !reminderLeadIds.has(cl.leadId))
      .map(cl => {
        const lead = cl.leadId ? (leadMap.get(cl.leadId) ?? null) : null;
        // Create a synthetic "done" entry using call log details
        return {
          id: `calllog-${cl.id}`,
          leadId: cl.leadId,
          userId: cl.userId,
          title: `مكالمة: ${lead?.name ?? "عميل"}`,
          description: cl.notes ?? null,
          dueDate: cl.createdAt ?? todayStart,
          isCompleted: true,
          completedAt: cl.createdAt ?? todayStart,
          priority: "medium" as const,
          createdAt: cl.createdAt ?? todayStart,
          lead,
        };
      });

    const doneTodayRaw = [...doneTodayFromReminders, ...doneTodayFromCallLogs];

    // New uncontacted leads (no first contact ever)
    const newLeads = accessibleLeads.filter(l =>
      !l.firstContactAt
    ).sort((a, b) => {
      const aScore = a.score ?? "cold";
      const bScore = b.score ?? "cold";
      return (scoreOrder[aScore as keyof typeof scoreOrder] ?? 2) - (scoreOrder[bScore as keyof typeof scoreOrder] ?? 2);
    });

    return {
      todayFollowUps: todayFollowUpsRaw.sort(sortByScore),
      newLeads,
      overdueFollowUps: overdueFollowUpsRaw.sort(sortByScore),
      doneToday: doneTodayRaw.sort(sortByScore),
    };
  }

  async getAgentCompletionRates(teamId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    scheduled: number;
    completed: number;
  }[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const allUsers = await db.select().from(users).where(eq(users.isActive, true));
    let agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "team_leader");
    if (teamId) {
      agents = agents.filter(u => u.teamId === teamId);
    }

    const todayReminders = await db.select().from(reminders)
      .where(
        and(
          gte(reminders.dueDate, todayStart),
          lte(reminders.dueDate, todayEnd)
        )
      );

    return agents.map(agent => {
      const agentName = `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || agent.username;
      const agentReminders = todayReminders.filter(r => r.userId === agent.id);
      return {
        agentId: agent.id,
        agentName,
        scheduled: agentReminders.length,
        completed: agentReminders.filter(r => r.isCompleted).length,
      };
    });
  }
}

export const storage = new DatabaseStorage();
