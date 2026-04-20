import { db, pool } from "./db";
import { eq, and, or, ne, isNotNull, isNull, lt, gte, lte, sql, ilike, desc, count, asc } from "drizzle-orm";
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
  whatsappTemplates,
  whatsappMessagesLog,
  leadManagerComments,
  emailReportSettings,
  monthlyTargets,
  chatbotSettings,
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
  type WhatsappTemplate,
  type InsertWhatsappTemplate,
  type UpdateWhatsappTemplate,
  type WhatsappMessagesLog,
  type InsertWhatsappMessagesLog,
  type LeadManagerComment,
  type InsertLeadManagerComment,
  type EmailReportSettings,
  type InsertEmailReportSettings,
  type UpdateEmailReportSettings,
  type MonthlyTarget,
  type InsertMonthlyTarget,
  type UpdateMonthlyTarget,
  type ChatbotSettings,
  type InsertChatbotSettings,
  type UpdateChatbotSettings,
  whatsappCampaigns,
  whatsappCampaignRecipients,
  whatsappFollowupRules,
  metaPageConnections,
  socialMessagesLog,
  type WhatsappCampaign,
  type InsertWhatsappCampaign,
  type WhatsappCampaignRecipient,
  type WhatsappFollowupRule,
  type InsertWhatsappFollowupRule,
  type MetaPageConnection,
  type InsertMetaPageConnection,
  type SocialMessagesLog,
  type InsertSocialMessagesLog,
  staleLeadSettings,
  integrationSettings,
  type StaleLeadSettings,
  type IntegrationSettings,
  type UpdateIntegrationSettings,
  knowledgeBase,
  type KnowledgeBaseItem,
  type InsertKnowledgeBase,
  type UpdateKnowledgeBase,
  subscriptionPlans,
  subscriptions,
  usageRecords,
  invoices,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type UpdateSubscriptionPlan,
  type Subscription,
  type InsertSubscription,
  type UpdateSubscription,
  type UsageRecord,
  type Invoice,
  type InsertInvoice,
  companies,
  plans,
  tickets,
  ticketReplies,
  platformNotifications,
  type Plan,
  type InsertPlan,
  type UpdatePlan,
  type Ticket,
  type InsertTicket,
  type UpdateTicket,
  type TicketReply,
  type InsertTicketReply,
  type PlatformNotification,
  type InsertPlatformNotification,
  platformLeads,
  platformLeadHistory,
  type PlatformLead,
  type InsertPlatformLead,
  type UpdatePlatformLead,
  type PlatformLeadHistory,
  type InsertPlatformLeadHistory,
  articleCategories,
  articles,
  type ArticleCategory,
  type InsertArticleCategory,
  type UpdateArticleCategory,
  type Article,
  type InsertArticle,
  type UpdateArticle,
  products,
  orders,
  type Product,
  type InsertProduct,
  type UpdateProduct,
  type Order,
  type InsertOrder,
  type UpdateOrder,
} from "@shared/schema";
import {
  customRoles,
  type CustomRole,
  type InsertCustomRole,
} from "@shared/models/auth";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(companyId?: string | null): Promise<User[]>;
  updateUser(id: string, data: UpdateUser): Promise<User | undefined>;
  
  // Teams
  getAllTeams(companyId?: string | null): Promise<Team[]>;
  getTeam(id: string, companyId?: string | null): Promise<Team | undefined>;
  createTeam(team: InsertTeam, companyId?: string | null): Promise<Team>;
  updateTeam(id: string, data: Partial<Team>, companyId?: string | null): Promise<Team | undefined>;
  deleteTeam(id: string, companyId?: string | null): Promise<boolean>;

  // Lead States
  getAllStates(companyId?: string | null): Promise<LeadState[]>;
  getState(id: string): Promise<LeadState | undefined>;
  createState(state: InsertLeadState): Promise<LeadState>;
  updateState(id: string, data: Partial<LeadState>): Promise<LeadState | undefined>;
  deleteState(id: string): Promise<boolean>;

  // Leads
  getAllLeads(companyId?: string | null): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead, creatingUserTeamId?: string | null, companyId?: string | null): Promise<Lead>;
  updateLead(id: string, data: Partial<Lead>, performedByName?: string): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Clients
  getAllClients(companyId?: string | null): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient, companyId?: string | null): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Tasks
  getAllTasks(companyId?: string | null): Promise<Task[]>;
  getTasksByLeadId(leadId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask, companyId?: string | null): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Lead History
  getAllHistory(companyId?: string | null): Promise<LeadHistory[]>;
  getHistoryByLeadId(leadId: string): Promise<LeadHistory[]>;
  createHistory(history: InsertLeadHistory, companyId?: string | null): Promise<LeadHistory>;

  // Developers
  getAllDevelopers(companyId?: string | null): Promise<Developer[]>;
  getDeveloper(id: string): Promise<Developer | undefined>;
  createDeveloper(developer: InsertDeveloper, companyId?: string | null): Promise<Developer>;
  updateDeveloper(id: string, data: Partial<Developer>): Promise<Developer | undefined>;
  deleteDeveloper(id: string): Promise<boolean>;

  // Projects
  getAllProjects(companyId?: string | null): Promise<Project[]>;
  getProjectsByDeveloper(developerId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject, companyId?: string | null): Promise<Project>;
  updateProject(id: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Units
  getAllUnits(companyId?: string | null): Promise<Unit[]>;
  getUnitsByProject(projectId: string): Promise<Unit[]>;
  getUnit(id: string): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit, companyId?: string | null): Promise<Unit>;
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
  createCommunication(comm: InsertCommunication, companyId?: string | null): Promise<Communication>;

  // Scoring
  refreshLeadScore(id: string): Promise<Lead | undefined>;
  refreshAllLeadScores(): Promise<void>;
  getAllLeadsWithRefreshedScores(companyId?: string | null): Promise<Lead[]>;

  // Team Load & Auto Assign
  getTeamLoad(teamId?: string | null, companyId?: string | null): Promise<{ userId: string; userName: string; leadCount: number; role: string }[]>;
  autoAssignLead(leadId: string, requestingUserTeamId?: string | null): Promise<Lead | undefined>;

  // Reminders
  getAllReminders(companyId?: string | null): Promise<Reminder[]>;
  getRemindersByUser(userId: string): Promise<Reminder[]>;
  getRemindersByLead(leadId: string): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder, companyId?: string | null): Promise<Reminder>;
  updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;

  // Documents
  getDocumentsByLead(leadId: string): Promise<Document[]>;
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;

  // Response Time & Team Activity
  getResponseTimeReport(companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    avgResponseMinutes: number | null;
    fastestResponseMinutes: number | null;
    slowestResponseMinutes: number | null;
    uncontactedCount: number;
  }[]>;
  getTeamActivityToday(companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    leadsContactedToday: number;
    leadsAddedToday: number;
    avgResponseMinutesThisWeek: number | null;
    uncontactedOver24h: number;
  }[]>;

  // Commissions
  getAllCommissions(companyId?: string | null): Promise<Commission[]>;
  getCommissionsByAgent(agentId: string): Promise<Commission[]>;
  getCommission(id: string): Promise<Commission | undefined>;
  createCommission(commission: InsertCommission, companyId?: string | null): Promise<Commission>;
  updateCommission(id: string, data: UpdateCommission): Promise<Commission | undefined>;
  deleteCommission(id: string): Promise<boolean>;
  getCommissionSummary(agentId?: string, teamMemberIds?: string[], companyId?: string | null): Promise<{ agentId: string; agentName: string; month: string; total: number; count: number }[]>;

  // Role Permissions (dynamic, per super_admin)
  getRolePermissions(): Promise<Record<string, RolePermissions>>;
  getPermissionsForRole(role: string): Promise<RolePermissions | null>;
  setRolePermissions(role: string, permissions: RolePermissions): Promise<void>;
  
  // Lead filtering by role
  getLeadsByRole(userId: string, role: string, teamId?: string | null, username?: string | null, companyId?: string | null): Promise<Lead[]>;
  transferLead(leadId: string, toUserId: string, performedBy: string, options?: { showHistoryToNew?: boolean; transferNote?: string; resetState?: boolean; fromUserId?: string; fromUserName?: string }): Promise<Lead | undefined>;
  getReassignmentReport(companyId?: string | null): Promise<{ leadId: string; leadName: string | null; fromUser: string | null; toUser: string | null; performedBy: string | null; note: string | null; historyVisible: boolean; createdAt: Date | null }[]>;

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
  getMyDayData(userId: string, userRole: string, teamId?: string | null, username?: string | null, companyId?: string | null): Promise<{
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

  // WhatsApp Templates
  getAllWhatsappTemplates(activeOnly?: boolean, companyId?: string | null): Promise<WhatsappTemplate[]>;
  getWhatsappTemplate(id: string): Promise<WhatsappTemplate | undefined>;
  createWhatsappTemplate(template: InsertWhatsappTemplate, companyId?: string | null): Promise<WhatsappTemplate>;
  updateWhatsappTemplate(id: string, data: UpdateWhatsappTemplate): Promise<WhatsappTemplate | undefined>;
  deleteWhatsappTemplate(id: string): Promise<boolean>;

  // WhatsApp Messages Log
  logWhatsappMessage(log: InsertWhatsappMessagesLog): Promise<WhatsappMessagesLog>;
  getWhatsappLogsByLead(leadId: string): Promise<WhatsappMessagesLog[]>;
  getWhatsappConversation(leadId: string): Promise<WhatsappMessagesLog[]>;
  countAgentMessagesInLastHour(agentId: string): Promise<number>;
  countAgentMessagesInLastDay(agentId: string): Promise<number>;
  findLeadByPhone(phone: string, companyId?: string | null): Promise<Lead | undefined>;
  findMessageByWhatsAppId(messageId: string): Promise<WhatsappMessagesLog | undefined>;
  getWhatsappInbox(userId: string, userRole: string, teamId?: string | null, companyId?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    phone: string;
    phone2: string | null;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
    totalCount: number;
  }[]>;
  markWhatsappMessagesRead(leadId: string): Promise<void>;
  getUnreadWhatsappCount(userId: string, userRole: string, teamId?: string | null): Promise<number>;

  // Lead Manager Comments
  getManagerCommentsByLead(leadId: string): Promise<LeadManagerComment[]>;
  getManagerComment(id: string): Promise<LeadManagerComment | undefined>;
  createManagerComment(comment: InsertLeadManagerComment): Promise<LeadManagerComment>;
  updateManagerComment(id: string, data: Partial<LeadManagerComment>): Promise<LeadManagerComment | undefined>;
  deleteManagerComment(id: string): Promise<boolean>;
  markManagerCommentRead(id: string): Promise<LeadManagerComment | undefined>;
  getUnreadManagerCommentsByAssignee(assignedToUserId: string): Promise<LeadManagerComment[]>;

  // Email Report Settings
  getEmailReportSettings(userId: string): Promise<EmailReportSettings | undefined>;
  upsertEmailReportSettings(data: InsertEmailReportSettings): Promise<EmailReportSettings>;
  getAllEnabledEmailReportSettings(): Promise<EmailReportSettings[]>;
  updateEmailReportLastSent(userId: string): Promise<void>;

  // Monthly Targets
  getMonthlyTarget(userId: string, targetMonth: string): Promise<MonthlyTarget | undefined>;
  getMonthlyTargetsByMonth(targetMonth: string, companyId?: string | null): Promise<MonthlyTarget[]>;
  upsertMonthlyTarget(data: InsertMonthlyTarget): Promise<MonthlyTarget>;
  getLeaderboard(period: string, teamId?: string, companyId?: string | null): Promise<{
    userId: string;
    userName: string;
    teamId: string | null;
    teamName: string | null;
    dealsCount: number;
    leadsCount: number;
    commissionTotal: number;
  }[]>;

  // Chatbot Settings
  getChatbotSettings(userId: string): Promise<ChatbotSettings | undefined>;
  upsertChatbotSettings(data: InsertChatbotSettings): Promise<ChatbotSettings>;
  updateChatbotSettings(userId: string, data: UpdateChatbotSettings): Promise<ChatbotSettings | undefined>;

  // WhatsApp Campaigns
  getAllCampaigns(companyId?: string | null): Promise<WhatsappCampaign[]>;
  getCampaign(id: string): Promise<WhatsappCampaign | undefined>;
  createCampaign(data: InsertWhatsappCampaign, companyId?: string | null): Promise<WhatsappCampaign>;
  updateCampaign(id: string, data: Partial<WhatsappCampaign>): Promise<WhatsappCampaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;
  getCampaignRecipients(campaignId: string): Promise<WhatsappCampaignRecipient[]>;
  createCampaignRecipients(recipients: { campaignId: string; leadId: string; phone: string }[]): Promise<void>;
  updateRecipientStatus(id: string, status: string, sentAt?: Date, errorMessage?: string): Promise<void>;
  getLeadsForCampaignFilter(filterStateId?: string | null, filterChannel?: string | null, filterDaysNoReply?: number | null, companyId?: string | null): Promise<Lead[]>;
  getPendingCampaigns(): Promise<WhatsappCampaign[]>;

  // WhatsApp Follow-up Rules
  getAllFollowupRules(): Promise<WhatsappFollowupRule[]>;
  getFollowupRule(id: string): Promise<WhatsappFollowupRule | undefined>;
  createFollowupRule(data: InsertWhatsappFollowupRule): Promise<WhatsappFollowupRule>;
  updateFollowupRule(id: string, data: Partial<WhatsappFollowupRule>): Promise<WhatsappFollowupRule | undefined>;
  deleteFollowupRule(id: string): Promise<boolean>;
  getActiveFollowupRules(): Promise<WhatsappFollowupRule[]>;
  getLeadsForFollowupRule(daysAfterNoReply: number): Promise<Lead[]>;

  // Custom Roles
  getAllCustomRoles(): Promise<CustomRole[]>;
  getCustomRole(id: string): Promise<CustomRole | undefined>;
  getCustomRoleByName(name: string): Promise<CustomRole | undefined>;
  createCustomRole(data: InsertCustomRole): Promise<CustomRole>;
  deleteCustomRole(id: string): Promise<boolean>;

  // Meta Page Connections
  getMetaPageConnection(): Promise<MetaPageConnection | undefined>;
  upsertMetaPageConnection(data: InsertMetaPageConnection): Promise<MetaPageConnection>;
  updateMetaPageConnectionSettings(pageId: string, data: { commentBotEnabled?: boolean; commentAutoReply?: string }): Promise<MetaPageConnection | undefined>;
  deleteMetaPageConnection(pageId: string): Promise<boolean>;

  // Social Messages Log
  logSocialMessage(data: InsertSocialMessagesLog): Promise<SocialMessagesLog>;
  getSocialMessagesByLead(leadId: string, platform?: string): Promise<SocialMessagesLog[]>;
  findLeadBySenderId(senderId: string, platform: string, companyId?: string | null): Promise<Lead | undefined>;
  findSocialMessageById(messageId: string): Promise<SocialMessagesLog | undefined>;
  markSocialMessagesRead(leadId: string, platform: string): Promise<void>;
  getUnreadSocialCount(userId: string, userRole: string, teamId?: string | null, companyId?: string | null): Promise<number>;
  getSocialInbox(userId: string, userRole: string, teamId?: string | null, companyId?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    senderId: string;
    platform: string;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
    totalCount: number;
  }[]>;

  // Unified Conversations (merged WA + Social)
  getUnifiedConversations(userId: string, userRole: string, teamId?: string | null, companyId?: string | null, search?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    assignedTo: string | null;
    score: string | null;
    platforms: string[];
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
    totalCount: number;
    unreadByPlatform: Record<string, number>;
    matchedMessage: string | null;
  }[]>;
  getUnifiedThreadMessages(leadId: string): Promise<{
    id: string;
    platform: string;
    direction: string;
    messageText: string | null;
    agentName: string | null;
    createdAt: Date | null;
    botActionsSummary: string | null;
    isRead: boolean | null;
  }[]>;

  // Sales Performance Reports
  getSalesActivityReport(from?: Date, to?: Date, companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    callsCount: number;
    whatsappCount: number;
    meetingsCount: number;
    notesCount: number;
    totalActions: number;
    callsToMeetingRate: number;
    inboundWhatsappCount: number;
    outboundWhatsappCount: number;
    whatsappReplyRate: number;
    weekCallsCount: number;
    weekMeetingsCount: number;
    weekTotalActions: number;
    monthCallsCount: number;
    monthMeetingsCount: number;
    monthTotalActions: number;
  }[]>;

  getFollowUpReport(from?: Date, to?: Date, companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    scheduledFollowUps: number;
    overdueFollowUps: number;
    completedFollowUps: number;
    followUpRate: number;
    neverContactedLeads: number;
    within24hLeads: number;
    within48hLeads: number;
    meetingsHeld: number;
    meetingsAttendanceRate: number;
  }[]>;

  getSalesFunnelReport(companyId?: string | null): Promise<{
    stateId: string;
    stateName: string;
    stateColor: string;
    stateOrder: number;
    count: number;
    conversionToNext: number | null;
    avgDaysInState: number | null;
  }[]>;

  getDailyActivityReport(companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    todayActions: number;
    weekActions: number;
    todayCalls: number;
    todayWhatsapp: number;
    todayMeetings: number;
    todayNotes: number;
    isInactive: boolean;
    lastActivityAt: Date | null;
  }[]>;

  getColdLeadsReport(companyId?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    leadPhone: string | null;
    agentId: string | null;
    agentName: string | null;
    lastContactDate: Date | null;
    daysSinceContact: number;
    stateId: string | null;
    stateName: string | null;
  }[]>;

  getProjectPerformanceReport(companyId?: string | null): Promise<{
    projectId: string;
    projectName: string;
    totalLeads: number;
    bookingsCount: number;
    conversionRate: number;
    avgDaysToClose: number | null;
  }[]>;

  getWeeklyMonthlyComparison(companyId?: string | null): Promise<{
    period: string;
    label: string;
    newLeads: number;
    meetings: number;
    bookings: number;
    totalActions: number;
  }[]>;

  // Funnel Health Analytics
  getFunnelOverview(companyId?: string | null): Promise<{
    stateId: string;
    stateName: string;
    stateColor: string;
    stateOrder: number;
    category: string;
    count: number;
  }[]>;

  getTimeInStage(companyId?: string | null): Promise<{
    stateId: string;
    stateName: string;
    stateColor: string;
    avgDays: number | null;
    minDays: number | null;
    maxDays: number | null;
    leadsCount: number;
  }[]>;

  getStaleLeads(thresholds: Record<string, number>, companyId?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    leadPhone: string | null;
    agentId: string | null;
    agentName: string | null;
    stateId: string;
    stateName: string;
    daysInState: number;
    threshold: number;
  }[]>;

  getAgentFunnelPerformance(companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    totalLeads: number;
    doneDeals: number;
    conversionRate: number;
    avgResponseMinutes: number | null;
    leadsByState: { stateId: string; stateName: string; count: number }[];
  }[]>;

  getLeadFlow(companyId?: string | null): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    closedToday: number;
    closedThisWeek: number;
    closedThisMonth: number;
  }>;

  // Stale Lead Settings
  getAllStaleLeadSettings(companyId?: string | null): Promise<{ stateId: string; staleDays: number }[]>;
  upsertStaleLeadSetting(stateId: string, staleDays: number, companyId?: string | null): Promise<void>;

  // Integration Settings (WhatsApp Cloud API, OpenAI, etc.)
  getIntegrationSettings(companyId?: string | null): Promise<IntegrationSettings | undefined>;
  getIntegrationSettingsByPhoneNumberId(phoneNumberId: string): Promise<IntegrationSettings | undefined>;
  upsertIntegrationSettings(data: UpdateIntegrationSettings, companyId?: string | null): Promise<IntegrationSettings>;

  // Knowledge Base
  getAllKnowledgeBaseItems(companyId?: string | null): Promise<KnowledgeBaseItem[]>;
  getKnowledgeBaseItem(id: string): Promise<KnowledgeBaseItem | undefined>;
  createKnowledgeBaseItem(data: InsertKnowledgeBase, companyId?: string | null): Promise<KnowledgeBaseItem>;
  updateKnowledgeBaseItem(id: string, data: UpdateKnowledgeBase, companyId?: string | null): Promise<KnowledgeBaseItem | undefined>;
  deleteKnowledgeBaseItem(id: string, companyId?: string | null): Promise<boolean>;

  // Subscription Plans
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(data: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, data: UpdateSubscriptionPlan): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<boolean>;

  // Subscriptions
  getSubscription(companyId: string): Promise<(Subscription & { plan: SubscriptionPlan }) | undefined>;
  createSubscription(data: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: UpdateSubscription): Promise<Subscription | undefined>;

  // Usage Records
  getCurrentUsage(companyId: string): Promise<UsageRecord | undefined>;
  incrementUsage(companyId: string, field: "leadsCount" | "messagesCount" | "usersCount" | "aiCallsCount"): Promise<void>;
  refreshUsersCount(companyId: string): Promise<void>;

  // Invoices
  getInvoices(companyId: string): Promise<Invoice[]>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;

  // Platform Admin - Plans
  getAllPlans(activeOnly?: boolean): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(data: InsertPlan): Promise<Plan>;
  updatePlan(id: string, data: UpdatePlan): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<boolean>;

  // Platform Admin - Tickets
  getAllTickets(filters?: { status?: string; priority?: string; companyId?: string }): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(data: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, data: UpdateTicket): Promise<Ticket | undefined>;
  getTicketReplies(ticketId: string): Promise<TicketReply[]>;
  createTicketReply(data: InsertTicketReply): Promise<TicketReply>;

  // Platform Admin - Platform Notifications
  getAllPlatformNotifications(unreadOnly?: boolean): Promise<PlatformNotification[]>;
  createPlatformNotification(data: InsertPlatformNotification): Promise<PlatformNotification>;
  markPlatformNotificationRead(id: string): Promise<PlatformNotification | undefined>;
  markAllPlatformNotificationsRead(): Promise<void>;
  getUnreadPlatformNotificationCount(): Promise<number>;

  // Platform Admin - Stats & Analytics
  getPlatformStats(): Promise<{
    totalActiveCompanies: number;
    totalTrialCompanies: number;
    totalSuspendedCompanies: number;
    newRegistrationsThisMonth: number;
    openTickets: number;
    renewalsNext30Days: number;
  }>;

  getPlatformCompanies(filters?: { status?: string; planId?: string }): Promise<(typeof companies.$inferSelect & { usersCount: number; leadsCount: number })[]>;
  getPlatformCompanyDetail(id: string): Promise<(typeof companies.$inferSelect & { users: (typeof users.$inferSelect)[]; subscription: (Subscription & { plan: SubscriptionPlan | null }) | null }) | undefined>;
  getCompanyInvoices(companyId: string): Promise<Invoice[]>;
  createCompanyInvoice(data: InsertInvoice): Promise<Invoice>;

  // Platform Leads (Sales CRM for platform owner)
  getAllPlatformLeads(): Promise<PlatformLead[]>;
  getPlatformLead(id: string): Promise<PlatformLead | undefined>;
  createPlatformLead(data: InsertPlatformLead): Promise<PlatformLead>;
  updatePlatformLead(id: string, data: UpdatePlatformLead, performedBy?: string): Promise<PlatformLead | undefined>;
  deletePlatformLead(id: string): Promise<boolean>;
  getPlatformLeadHistory(platformLeadId: string): Promise<PlatformLeadHistory[]>;
  createPlatformLeadHistory(data: InsertPlatformLeadHistory): Promise<PlatformLeadHistory>;
  getPlatformSalesKPIs(): Promise<{
    leadsThisMonth: number;
    demosScheduled: number;
    conversionRate: number;
    pipelineValue: number;
  }>;

  // Blog / CMS
  getAllArticleCategories(): Promise<ArticleCategory[]>;
  getArticleCategory(id: string): Promise<ArticleCategory | undefined>;
  getArticleCategoryBySlug(slug: string): Promise<ArticleCategory | undefined>;
  createArticleCategory(data: InsertArticleCategory): Promise<ArticleCategory>;
  updateArticleCategory(id: string, data: UpdateArticleCategory): Promise<ArticleCategory | undefined>;
  deleteArticleCategory(id: string): Promise<boolean>;

  getAllArticles(filters?: { status?: string; categoryId?: string; search?: string; page?: number; limit?: number }): Promise<{ articles: Article[]; total: number }>;
  getArticle(id: string): Promise<Article | undefined>;
  getArticleBySlug(slug: string): Promise<Article | undefined>;
  createArticle(data: InsertArticle): Promise<Article>;
  updateArticle(id: string, data: UpdateArticle): Promise<Article | undefined>;
  deleteArticle(id: string): Promise<boolean>;
  getPublishedArticles(filters?: { categorySlug?: string; search?: string; page?: number; limit?: number }): Promise<{ articles: (Article & { category: ArticleCategory | null })[]; total: number }>;
  getRelatedArticles(articleId: string, categoryId?: string | null, limit?: number): Promise<Article[]>;

  // Products (E-commerce)
  getAllProducts(companyId?: string | null): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct, companyId?: string | null): Promise<Product>;
  updateProduct(id: string, data: UpdateProduct, companyId?: string | null): Promise<Product | undefined>;
  deleteProduct(id: string, companyId?: string | null): Promise<boolean>;

  // Orders (E-commerce)
  getAllOrders(companyId?: string | null): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(data: InsertOrder, companyId?: string | null): Promise<Order>;
  updateOrder(id: string, data: UpdateOrder, companyId?: string | null): Promise<Order | undefined>;
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

  async getAllUsers(companyId?: string | null): Promise<User[]> {
    if (companyId) {
      return db.select().from(users).where(eq(users.companyId, companyId)).orderBy(users.createdAt);
    }
    return db.select().from(users).orderBy(users.createdAt);
  }

  async updateUser(id: string, data: UpdateUser): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }

  // Teams
  async getAllTeams(companyId?: string | null): Promise<Team[]> {
    if (companyId) {
      return db.select().from(teams).where(eq(teams.companyId, companyId)).orderBy(teams.createdAt);
    }
    return db.select().from(teams).orderBy(teams.createdAt);
  }

  async getTeam(id: string, companyId?: string | null): Promise<Team | undefined> {
    const [team] = companyId
      ? await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.companyId, companyId)))
      : await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam, companyId?: string | null): Promise<Team> {
    const [newTeam] = await db.insert(teams).values({ ...team, ...(companyId ? { companyId } : {}) }).returning();
    return newTeam;
  }

  async updateTeam(id: string, data: Partial<Team>, companyId?: string | null): Promise<Team | undefined> {
    const whereClause = companyId ? and(eq(teams.id, id), eq(teams.companyId, companyId)) : eq(teams.id, id);
    const [updated] = await db.update(teams).set(data).where(whereClause).returning();
    return updated;
  }

  async deleteTeam(id: string, companyId?: string | null): Promise<boolean> {
    const whereClause = companyId ? and(eq(teams.id, id), eq(teams.companyId, companyId)) : eq(teams.id, id);
    const result = await db.delete(teams).where(whereClause).returning();
    return result.length > 0;
  }

  // Lead States
  async getAllStates(companyId?: string | null): Promise<LeadState[]> {
    if (!companyId) {
      return db.select().from(leadStates).orderBy(leadStates.order);
    }
    // Include system/global states (company_id IS NULL) plus this company's states
    return db.select().from(leadStates)
      .where(sql`(${leadStates.companyId} IS NULL OR ${leadStates.companyId} = ${companyId})`)
      .orderBy(leadStates.order);
  }

  async getState(id: string): Promise<LeadState | undefined> {
    const [state] = await db.select().from(leadStates).where(eq(leadStates.id, id));
    return state;
  }

  async createState(state: InsertLeadState): Promise<LeadState> {
    // Scope ordering to the same company so each tenant's order is independent
    const companyStates = await this.getAllStates(state.companyId ?? null);
    const maxOrder = companyStates.length > 0 ? Math.max(...companyStates.map(s => s.order)) : -1;
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
  async getAllLeads(companyId?: string | null): Promise<Lead[]> {
    if (companyId) {
      return db.select().from(leads).where(eq(leads.companyId, companyId)).orderBy(leads.createdAt);
    }
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

  async createLead(lead: InsertLead, creatingUserTeamId?: string | null, companyId?: string | null): Promise<Lead> {
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
      aiAnalyzedAt: null,
    };
    const config = await getScoringConfig();
    const score = computeScore(leadForScoring, { commCount: 0, completedTaskCount: 0 }, config);
    const { firstContactAt: _fca, responseTimeMinutes: _rtm, ...safeLeadData } = lead as any;
    const effectiveCompanyId = companyId !== undefined ? companyId : (lead.companyId ?? null);
    const [newLead] = await db.insert(leads).values({ ...safeLeadData, score, companyId: effectiveCompanyId }).returning();
    await this.createHistory({
      leadId: newLead.id,
      action: "دخل السيستم",
      description: `تم إضافة الليد — المصدر: ${newLead.channel ?? "غير محدد"}${newLead.campaign ? ` / ${newLead.campaign}` : ""}`,
      performedBy: "النظام",
      type: "created",
    });
    if (!newLead.assignedTo) {
      const assigned = await this.autoAssignLead(newLead.id, creatingUserTeamId ?? null);
      return assigned ?? newLead;
    }
    return newLead;
  }

  async updateLead(id: string, data: Partial<Lead>, performedByName?: string): Promise<Lead | undefined> {
    const existing = await this.getLead(id);
    if (!existing) return undefined;
    const { firstContactAt: _fca, responseTimeMinutes: _rtm, ...safeUpdateData } = data as any;
    const merged: Lead = { ...existing, ...safeUpdateData };
    const ctx = await this.buildScoringContext(id);
    const config = await getScoringConfig();
    const score = computeScore(merged, ctx, config);
    const [updated] = await db.update(leads).set({ ...safeUpdateData, score, updatedAt: new Date() }).where(eq(leads.id, id)).returning();
    if (updated) {
      const byName = performedByName ?? "النظام";
      // Record typed history entries for specific changes
      if (safeUpdateData.stateId !== undefined && safeUpdateData.stateId !== existing.stateId) {
        const [fromState] = existing.stateId ? await db.select().from(leadStates).where(eq(leadStates.id, existing.stateId)).limit(1) : [null];
        const [toState] = safeUpdateData.stateId ? await db.select().from(leadStates).where(eq(leadStates.id, safeUpdateData.stateId)).limit(1) : [null];
        const fromName = fromState?.name ?? "—";
        const toName = toState?.name ?? "—";
        await this.createHistory({
          leadId: id,
          action: `انتقل من ${fromName} إلى ${toName}`,
          description: `تغيير حالة الليد`,
          performedBy: byName,
          type: "state_change",
          fromStateId: existing.stateId ?? null,
          toStateId: safeUpdateData.stateId ?? null,
        });
      } else if (safeUpdateData.assignedTo !== undefined && safeUpdateData.assignedTo !== existing.assignedTo) {
        const [toUser] = safeUpdateData.assignedTo ? await db.select().from(users).where(eq(users.id, safeUpdateData.assignedTo)).limit(1) : [null];
        const toUserName = toUser ? `${toUser.firstName ?? ""} ${toUser.lastName ?? ""}`.trim() || toUser.username : safeUpdateData.assignedTo;
        await this.createHistory({
          leadId: id,
          action: `اتوزع على ${toUserName}`,
          description: `تم تعيين الليد لـ ${toUserName}`,
          performedBy: byName,
          type: "assignment",
        });
      } else {
        await this.createHistory({
          leadId: id,
          action: "تم تحديث بيانات الليد",
          description: `تم تعديل معلومات الليد`,
          performedBy: byName,
          type: "other",
        });
      }
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

  async getAllLeadsWithRefreshedScores(companyId?: string | null): Promise<Lead[]> {
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId)).orderBy(leads.createdAt)
      : await db.select().from(leads).orderBy(leads.createdAt);
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
    // Nullify optional FK references (preserve these records but detach from lead)
    await db.update(clients).set({ leadId: null }).where(eq(clients.leadId, id));
    await db.update(commissions).set({ leadId: null }).where(eq(commissions.leadId, id));
    await db.update(whatsappCampaignRecipients).set({ leadId: null }).where(eq(whatsappCampaignRecipients.leadId, id));
    await db.update(whatsappFollowupRules).set({ leadId: null }).where(eq(whatsappFollowupRules.leadId, id));

    // Preserve lead history by nullifying leadId (history is never deleted)
    await db.update(leadHistory).set({ leadId: null }).where(eq(leadHistory.leadId, id));

    // Delete child records (cascade delete)
    await db.delete(leadUnitInterests).where(eq(leadUnitInterests.leadId, id));
    await db.delete(callLogs).where(eq(callLogs.leadId, id));
    await db.delete(leadManagerComments).where(eq(leadManagerComments.leadId, id));
    await db.delete(whatsappMessagesLog).where(eq(whatsappMessagesLog.leadId, id));
    await db.delete(notifications).where(eq(notifications.leadId, id));
    await db.delete(reminders).where(eq(reminders.leadId, id));
    await db.delete(documents).where(eq(documents.leadId, id));
    await db.delete(tasks).where(eq(tasks.leadId, id));
    await db.delete(communications).where(eq(communications.leadId, id));

    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result.length > 0;
  }

  // Clients
  async getAllClients(companyId?: string | null): Promise<Client[]> {
    if (companyId) {
      return db.select().from(clients).where(eq(clients.companyId, companyId)).orderBy(clients.createdAt);
    }
    return db.select().from(clients).orderBy(clients.createdAt);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient, companyId?: string | null): Promise<Client> {
    const [newClient] = await db.insert(clients).values({ ...client, companyId: companyId ?? null }).returning();
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
  async getAllTasks(companyId?: string | null): Promise<Task[]> {
    if (companyId) {
      return db.select().from(tasks).where(eq(tasks.companyId, companyId)).orderBy(tasks.createdAt);
    }
    return db.select().from(tasks).orderBy(tasks.createdAt);
  }

  async getTasksByLeadId(leadId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.leadId, leadId)).orderBy(tasks.createdAt);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask, companyId?: string | null): Promise<Task> {
    const [newTask] = await db.insert(tasks).values({ ...task, companyId: companyId ?? null }).returning();
    if (task.leadId) {
      await this.createHistory({
        leadId: task.leadId,
        action: "تم إضافة تاسك",
        description: `التاسك: "${task.title}"`,
        performedBy: "النظام",
        type: "other",
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
  async getAllHistory(companyId?: string | null): Promise<LeadHistory[]> {
    if (companyId) {
      return db.select().from(leadHistory).where(eq(leadHistory.companyId, companyId)).orderBy(leadHistory.createdAt);
    }
    return db.select().from(leadHistory).orderBy(leadHistory.createdAt);
  }

  async getHistoryByLeadId(leadId: string): Promise<LeadHistory[]> {
    return db.select().from(leadHistory).where(eq(leadHistory.leadId, leadId)).orderBy(leadHistory.createdAt);
  }

  async createHistory(history: InsertLeadHistory, companyId?: string | null): Promise<LeadHistory> {
    let resolvedCompanyId = companyId ?? history.companyId ?? null;
    // Auto-inherit company from lead when not provided
    if (!resolvedCompanyId && history.leadId) {
      const [lead] = await db.select({ companyId: leads.companyId }).from(leads).where(eq(leads.id, history.leadId)).limit(1);
      resolvedCompanyId = lead?.companyId ?? null;
    }
    const [newHistory] = await db.insert(leadHistory).values({ ...history, companyId: resolvedCompanyId }).returning();
    return newHistory;
  }

  // Developers
  async getAllDevelopers(companyId?: string | null): Promise<Developer[]> {
    if (companyId) {
      return db.select().from(developers).where(eq(developers.companyId, companyId)).orderBy(developers.name);
    }
    return db.select().from(developers).orderBy(developers.name);
  }

  async getDeveloper(id: string): Promise<Developer | undefined> {
    const [developer] = await db.select().from(developers).where(eq(developers.id, id));
    return developer;
  }

  async createDeveloper(developer: InsertDeveloper, companyId?: string | null): Promise<Developer> {
    const [newDeveloper] = await db.insert(developers).values({ ...developer, companyId: companyId ?? null }).returning();
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
  async getAllProjects(companyId?: string | null): Promise<Project[]> {
    if (companyId) {
      return db.select().from(projects).where(eq(projects.companyId, companyId)).orderBy(projects.name);
    }
    return db.select().from(projects).orderBy(projects.name);
  }

  async getProjectsByDeveloper(developerId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.developerId, developerId)).orderBy(projects.name);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject, companyId?: string | null): Promise<Project> {
    const [newProject] = await db.insert(projects).values({ ...project, companyId: companyId ?? null }).returning();
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
  async getAllUnits(companyId?: string | null): Promise<Unit[]> {
    if (companyId) {
      return db.select().from(units).where(eq(units.companyId, companyId)).orderBy(units.unitNumber);
    }
    return db.select().from(units).orderBy(units.unitNumber);
  }

  async getUnitsByProject(projectId: string): Promise<Unit[]> {
    return db.select().from(units).where(eq(units.projectId, projectId)).orderBy(units.floor, units.unitNumber);
  }

  async getUnit(id: string): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit;
  }

  async createUnit(unit: InsertUnit, companyId?: string | null): Promise<Unit> {
    const [newUnit] = await db.insert(units).values({ ...unit, companyId: companyId ?? null }).returning();
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

  async createCommunication(comm: InsertCommunication, companyId?: string | null): Promise<Communication> {
    let resolvedCompanyId = companyId ?? comm.companyId ?? null;
    // Auto-inherit company from lead when not provided
    if (!resolvedCompanyId && comm.leadId) {
      const [lead] = await db.select({ companyId: leads.companyId }).from(leads).where(eq(leads.id, comm.leadId)).limit(1);
      resolvedCompanyId = lead?.companyId ?? null;
    }
    const [newComm] = await db.insert(communications).values({ ...comm, companyId: resolvedCompanyId }).returning();
    const lead = await this.getLead(comm.leadId);
    const now = newComm.createdAt ?? new Date();
    // Set firstContactAt and responseTimeMinutes on lead if this is the first communication
    if (lead && !lead.firstContactAt) {
      let responseTimeMinutes: number | null = null;
      if (lead.createdAt) {
        responseTimeMinutes = Math.max(0, Math.round((now.getTime() - new Date(lead.createdAt).getTime()) / 60000));
      }
      await db.update(leads).set({ firstContactAt: now, responseTimeMinutes, lastActionDate: now }).where(eq(leads.id, comm.leadId));
    } else if (lead) {
      // Always update lastActionDate when a new communication is logged
      await db.update(leads).set({ lastActionDate: now }).where(eq(leads.id, comm.leadId));
    }
    // Write to lead_history so it shows up in the History tab
    const typeLabels: Record<string, string> = {
      call: "مكالمة هاتفية",
      no_answer: "لم يرد على المكالمة",
      whatsapp: "رسالة واتساب",
      email: "بريد إلكتروني",
      meeting: "اجتماع",
      note: "ملاحظة",
    };
    const historyTypeMap: Record<string, string> = {
      call: "call",
      no_answer: "call",
      whatsapp: "whatsapp",
      email: "other",
      meeting: "other",
      note: "note",
    };
    const actionLabel = typeLabels[comm.type] ?? comm.type;
    await this.createHistory({
      leadId: comm.leadId,
      action: actionLabel,
      description: comm.note ?? `${actionLabel} من ${comm.userName ?? "المستخدم"}`,
      performedBy: comm.userName ?? undefined,
      type: historyTypeMap[comm.type] ?? "other",
    });
    return newComm;
  }

  // Team Load & Auto Assign
  async getTeamLoad(teamId?: string | null, companyId?: string | null): Promise<{ userId: string; userName: string; leadCount: number; role: string }[]> {
    const allUsers = companyId
      ? await db.select().from(users).where(and(eq(users.isActive, true), eq(users.companyId, companyId)))
      : await db.select().from(users).where(eq(users.isActive, true));
    let agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "sales_manager");
    if (teamId) {
      agents = agents.filter(u => u.teamId === teamId);
    }
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId))
      : await db.select().from(leads);
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
    // Scope users and leads to the same company as the lead
    const leadCompanyId = lead.companyId;
    const allUsers = leadCompanyId
      ? await db.select().from(users).where(and(eq(users.isActive, true), eq(users.companyId, leadCompanyId)))
      : await db.select().from(users).where(eq(users.isActive, true));
    let candidates = allUsers.filter(u => u.role === "sales_agent");
    if (requestingUserTeamId) {
      candidates = candidates.filter(u => u.teamId === requestingUserTeamId);
    }
    if (candidates.length === 0) return undefined;
    const allLeads = leadCompanyId
      ? await db.select().from(leads).where(eq(leads.companyId, leadCompanyId))
      : await db.select().from(leads);
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
    const agentName = `${agentWithLeast.firstName ?? ""} ${agentWithLeast.lastName ?? ""}`.trim() || agentWithLeast.username;
    await this.createHistory({
      leadId,
      action: `اتوزع على ${agentName}`,
      description: `تم توزيع الليد تلقائياً على ${agentName}`,
      performedBy: "النظام",
      type: "assignment",
    });
    return updated;
  }

  // Reminders
  async getAllReminders(companyId?: string | null): Promise<Reminder[]> {
    if (companyId) {
      return db.select().from(reminders).where(eq(reminders.companyId, companyId)).orderBy(reminders.dueDate);
    }
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

  async createReminder(reminder: InsertReminder, companyId?: string | null): Promise<Reminder> {
    const [newReminder] = await db.insert(reminders).values({ ...reminder, ...(companyId ? { companyId } : {}) }).returning();
    // If linked to a lead, write to lead_history so it shows in the History tab
    if (reminder.leadId) {
      const user = reminder.userId
        ? (await db.select().from(users).where(eq(users.id, reminder.userId)).limit(1))[0]
        : null;
      const performedBy = user
        ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username
        : undefined;
      await this.createHistory({
        leadId: reminder.leadId,
        action: "جدولة متابعة",
        description: `${reminder.title} — ${new Date(reminder.dueDate).toLocaleDateString("ar-EG")}`,
        performedBy,
        type: "other",
      });
    }
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
  async getResponseTimeReport(companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    avgResponseMinutes: number | null;
    fastestResponseMinutes: number | null;
    slowestResponseMinutes: number | null;
    uncontactedCount: number;
  }[]> {
    const allUsers = companyId
      ? await db.select().from(users).where(and(eq(users.isActive, true), eq(users.companyId, companyId)))
      : await db.select().from(users).where(eq(users.isActive, true));
    const agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "sales_manager");
    
    // Period for stats (this month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId))
      : await db.select().from(leads);
    
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

  async getTeamActivityToday(companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    leadsContactedToday: number;
    leadsAddedToday: number;
    avgResponseMinutesThisWeek: number | null;
    uncontactedOver24h: number;
  }[]> {
    const allUsers = companyId
      ? await db.select().from(users).where(and(eq(users.isActive, true), eq(users.companyId, companyId)))
      : await db.select().from(users).where(eq(users.isActive, true));
    const agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "sales_manager");
    
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId))
      : await db.select().from(leads);
    const allComms = companyId
      ? await db.select().from(communications).where(eq(communications.companyId, companyId))
      : await db.select().from(communications);
    
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
  async getAllCommissions(companyId?: string | null): Promise<Commission[]> {
    if (!companyId) {
      return db.select().from(commissions).orderBy(commissions.createdAt);
    }
    return db.select().from(commissions)
      .where(eq(commissions.companyId, companyId))
      .orderBy(commissions.createdAt);
  }

  async getCommissionsByAgent(agentId: string): Promise<Commission[]> {
    return db.select().from(commissions).where(eq(commissions.agentId, agentId)).orderBy(commissions.createdAt);
  }

  async getCommission(id: string): Promise<Commission | undefined> {
    const [commission] = await db.select().from(commissions).where(eq(commissions.id, id));
    return commission;
  }

  async createCommission(commission: InsertCommission, companyId?: string | null): Promise<Commission> {
    const [newCommission] = await db.insert(commissions).values({ ...commission, ...(companyId ? { companyId } : {}) }).returning();
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

  async getCommissionSummary(agentId?: string, teamMemberIds?: string[], companyId?: string | null): Promise<{ agentId: string; agentName: string; month: string; total: number; count: number }[]> {
    const all = agentId
      ? await db.select().from(commissions).where(and(eq(commissions.agentId, agentId), ...(companyId ? [eq(commissions.companyId, companyId)] : [])))
      : companyId
        ? await db.select().from(commissions).where(eq(commissions.companyId, companyId))
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
  async getLeadsByRole(userId: string, role: string, teamId?: string | null, username?: string | null, companyId?: string | null): Promise<Lead[]> {
    const allLeads = await this.getAllLeadsWithRefreshedScores(companyId);
    if (role === "sales_agent") {
      // Support both id-based and legacy username-based assignment
      return allLeads.filter(l => l.assignedTo === userId || (username && l.assignedTo === username));
    }
    if (role === "team_leader" && teamId) {
      const teamUsers = await this.getAllUsers(companyId).then(users => users.filter(u => u.teamId === teamId).map(u => u.id));
      return allLeads.filter(l => l.assignedTo && teamUsers.includes(l.assignedTo));
    }
    return allLeads;
  }

  async transferLead(leadId: string, toUserId: string, performedBy: string, options?: { showHistoryToNew?: boolean; transferNote?: string; resetState?: boolean; fromUserId?: string; fromUserName?: string }): Promise<Lead | undefined> {
    const lead = await this.getLead(leadId);
    if (!lead) return undefined;
    const toUser = await this.getUser(toUserId);
    if (!toUser) return undefined;
    const toUserName = `${toUser.firstName ?? ""} ${toUser.lastName ?? ""}`.trim() || toUser.username;
    const fromUserName = options?.fromUserName || lead.assignedTo || null;
    const showHistory = options?.showHistoryToNew !== false;

    const updateData: Partial<Lead> = {
      assignedTo: toUserId,
      previousAssignedTo: lead.assignedTo,
      historyVisibleToAssigned: showHistory,
      updatedAt: new Date(),
    };

    if (options?.resetState) {
      const freshState = await db.select().from(leadStates).orderBy(leadStates.order).limit(1);
      if (freshState.length > 0) {
        updateData.stateId = freshState[0].id;
      }
    }

    const [updated] = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, leadId))
      .returning();

    const meta = JSON.stringify({
      fromUser: fromUserName || null,
      toUser: toUserName,
      historyVisible: showHistory,
      note: options?.transferNote || null,
    });
    await this.createHistory({
      leadId,
      action: `تحويل إلى ${toUserName}`,
      description: meta,
      performedBy,
      type: "reassignment",
    });
    return updated;
  }

  async getReassignmentReport(companyId?: string | null): Promise<{ leadId: string; leadName: string | null; fromUser: string | null; toUser: string | null; performedBy: string | null; note: string | null; historyVisible: boolean; createdAt: Date | null }[]> {
    // When companyId is provided, scope to leads belonging to that company
    let scopedLeadIds: string[] | null = null;
    if (companyId) {
      const companyLeads = await db.select({ id: leads.id, name: leads.name }).from(leads).where(eq(leads.companyId, companyId));
      scopedLeadIds = companyLeads.map(l => l.id);
      if (scopedLeadIds.length === 0) return [];
    }

    const historyQuery = db.select().from(leadHistory).where(eq(leadHistory.type, "reassignment"));
    const allHistory = await historyQuery.orderBy(sql`${leadHistory.createdAt} DESC`);
    const reassignments = scopedLeadIds
      ? allHistory.filter(h => h.leadId && scopedLeadIds!.includes(h.leadId))
      : allHistory;

    const leadIds = [...new Set(reassignments.map((h) => h.leadId).filter(Boolean))] as string[];
    const leadMap: Record<string, string | null> = {};
    if (leadIds.length > 0) {
      const leadsQ = db.select({ id: leads.id, name: leads.name }).from(leads);
      const leadRecords = companyId
        ? await leadsQ.where(eq(leads.companyId, companyId))
        : await leadsQ;
      for (const l of leadRecords) {
        if (leadIds.includes(l.id)) leadMap[l.id] = l.name;
      }
    }

    return reassignments.map((h) => {
      let fromUser: string | null = null;
      let toUser: string | null = null;
      let historyVisible = true;
      let note: string | null = null;

      if (h.description) {
        try {
          const parsed = JSON.parse(h.description);
          fromUser = parsed.fromUser ?? null;
          toUser = parsed.toUser ?? null;
          historyVisible = parsed.historyVisible !== false;
          note = parsed.note ?? null;
        } catch {
          fromUser = null;
          toUser = null;
        }
      }

      return {
        leadId: h.leadId || "",
        leadName: h.leadId ? (leadMap[h.leadId] ?? null) : null,
        fromUser,
        toUser,
        performedBy: h.performedBy || null,
        note,
        historyVisible,
        createdAt: h.createdAt || null,
      };
    });
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
    // Record typed history entry for call log
    const outcomeLabels: Record<string, string> = {
      answered: "رد",
      no_answer: "لم يرد",
      interested: "مهتم",
      not_interested: "غير مهتم",
      needs_time: "يحتاج وقت",
      requested_visit: "طلب زيارة",
    };
    const [caller] = await db.select().from(users).where(eq(users.id, callLog.userId)).limit(1);
    const callerName = caller ? `${caller.firstName ?? ""} ${caller.lastName ?? ""}`.trim() || caller.username : undefined;
    await this.createHistory({
      leadId: callLog.leadId,
      action: `مكالمة — ${outcomeLabels[callLog.outcome] ?? callLog.outcome}`,
      description: callLog.notes ?? undefined,
      performedBy: callerName,
      type: "call",
    });
    return newCallLog;
  }

  // My Day
  async getMyDayData(userId: string, userRole: string, teamId?: string | null, username?: string | null, companyId?: string | null): Promise<{
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
    const accessibleLeads = await this.getLeadsByRole(userId, userRole, teamId, username, companyId);
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

  // WhatsApp Templates
  async getAllWhatsappTemplates(activeOnly = false, companyId?: string | null): Promise<WhatsappTemplate[]> {
    if (activeOnly && companyId) {
      return db.select().from(whatsappTemplates).where(and(eq(whatsappTemplates.isActive, true), eq(whatsappTemplates.companyId, companyId))).orderBy(whatsappTemplates.createdAt);
    }
    if (activeOnly) {
      return db.select().from(whatsappTemplates).where(eq(whatsappTemplates.isActive, true)).orderBy(whatsappTemplates.createdAt);
    }
    if (companyId) {
      return db.select().from(whatsappTemplates).where(eq(whatsappTemplates.companyId, companyId)).orderBy(whatsappTemplates.createdAt);
    }
    return db.select().from(whatsappTemplates).orderBy(whatsappTemplates.createdAt);
  }

  async getWhatsappTemplate(id: string): Promise<WhatsappTemplate | undefined> {
    const [template] = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, id));
    return template;
  }

  async createWhatsappTemplate(template: InsertWhatsappTemplate, companyId?: string | null): Promise<WhatsappTemplate> {
    const [newTemplate] = await db.insert(whatsappTemplates).values({ ...template, companyId: companyId ?? null }).returning();
    return newTemplate;
  }

  async updateWhatsappTemplate(id: string, data: UpdateWhatsappTemplate): Promise<WhatsappTemplate | undefined> {
    const [updated] = await db.update(whatsappTemplates).set({ ...data, updatedAt: new Date() }).where(eq(whatsappTemplates.id, id)).returning();
    return updated;
  }

  async deleteWhatsappTemplate(id: string): Promise<boolean> {
    const result = await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, id)).returning();
    return result.length > 0;
  }

  // WhatsApp Messages Log
  async logWhatsappMessage(log: InsertWhatsappMessagesLog): Promise<WhatsappMessagesLog> {
    const [entry] = await db.insert(whatsappMessagesLog).values(log).returning();
    // Record typed history entry for outbound WhatsApp messages only
    if (log.leadId && log.direction === "outbound") {
      const msgPreview = log.messageText ? (log.messageText.length > 80 ? log.messageText.slice(0, 80) + "..." : log.messageText) : undefined;
      await this.createHistory({
        leadId: log.leadId,
        action: `رسالة واتساب ${log.templateName ? `— ${log.templateName}` : ""}`,
        description: msgPreview,
        performedBy: log.agentName ?? undefined,
        type: "whatsapp",
      });
    }
    return entry;
  }

  async getWhatsappLogsByLead(leadId: string): Promise<WhatsappMessagesLog[]> {
    return db.select().from(whatsappMessagesLog).where(eq(whatsappMessagesLog.leadId, leadId)).orderBy(whatsappMessagesLog.createdAt);
  }

  async getWhatsappConversation(leadId: string): Promise<WhatsappMessagesLog[]> {
    return db.select().from(whatsappMessagesLog).where(eq(whatsappMessagesLog.leadId, leadId)).orderBy(whatsappMessagesLog.createdAt);
  }

  async findLeadByPhone(phone: string, companyId?: string | null): Promise<Lead | undefined> {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return undefined;
    const variants: string[] = [cleaned];
    if (cleaned.startsWith("20")) variants.push("0" + cleaned.slice(2));
    else if (cleaned.startsWith("0")) variants.push("20" + cleaned.slice(1));
    else variants.push("20" + cleaned, "0" + cleaned);

    // Search primary phone — return newest match (scoped to company if provided)
    const primaryMatches: Lead[] = [];
    for (const variant of variants) {
      const rows = companyId
        ? await db.select().from(leads).where(and(eq(leads.phone, variant), eq(leads.companyId, companyId))).orderBy(sql`${leads.createdAt} DESC`)
        : await db.select().from(leads).where(eq(leads.phone, variant)).orderBy(sql`${leads.createdAt} DESC`);
      primaryMatches.push(...rows);
    }
    if (primaryMatches.length > 0) {
      primaryMatches.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      return primaryMatches[0];
    }

    // Search phone2 — return newest match (scoped to company if provided)
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId)).orderBy(sql`${leads.createdAt} DESC`)
      : await db.select().from(leads).orderBy(sql`${leads.createdAt} DESC`);
    const phone2Match = allLeads.filter(l => l.phone2 && variants.includes(l.phone2.replace(/\D/g, "")));
    if (phone2Match.length > 0) return phone2Match[0];

    return undefined;
  }

  async findMessageByWhatsAppId(messageId: string): Promise<WhatsappMessagesLog | undefined> {
    const [msg] = await db.select().from(whatsappMessagesLog).where(eq(whatsappMessagesLog.messageId, messageId));
    return msg;
  }

  async getWhatsappInbox(userId: string, userRole: string, teamId?: string | null, companyId?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    phone: string;
    phone2: string | null;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
    totalCount: number;
  }[]> {
    // Get leads accessible by this user
    const accessibleLeads = await this.getLeadsByRole(userId, userRole, teamId ?? null, null, companyId);
    if (accessibleLeads.length === 0) return [];

    const accessibleLeadIds = accessibleLeads.map(l => l.id);
    const leadMap = new Map(accessibleLeads.map(l => [l.id, l]));

    // Use SQL aggregation scoped to accessible lead IDs
    const placeholders = accessibleLeadIds.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(`
      SELECT
        lead_id AS "leadId",
        MAX(created_at) AS "lastMessageAt",
        (ARRAY_AGG(message_text ORDER BY created_at DESC))[1] AS "lastMessage",
        (ARRAY_AGG(phone ORDER BY created_at DESC))[1] AS "phone",
        COUNT(*)::int AS "totalCount",
        COUNT(*) FILTER (WHERE direction = 'inbound' AND is_read = false)::int AS "unreadCount"
      FROM whatsapp_messages_log
      WHERE lead_id = ANY(ARRAY[${placeholders}])
        AND lead_id IS NOT NULL
      GROUP BY lead_id
      ORDER BY MAX(created_at) DESC
    `, accessibleLeadIds);

    return rows.map((row: any) => ({
      leadId: row.leadId,
      leadName: leadMap.get(row.leadId)?.name ?? null,
      phone: row.phone ?? "",
      phone2: leadMap.get(row.leadId)?.phone2 ?? null,
      lastMessage: row.lastMessage ?? null,
      lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt) : null,
      unreadCount: Number(row.unreadCount ?? 0),
      totalCount: Number(row.totalCount ?? 0),
    }));
  }

  async markWhatsappMessagesRead(leadId: string): Promise<void> {
    await db
      .update(whatsappMessagesLog)
      .set({ isRead: true })
      .where(and(eq(whatsappMessagesLog.leadId, leadId), eq(whatsappMessagesLog.direction, "inbound")));
  }

  async getUnreadWhatsappCount(userId: string, userRole: string, teamId?: string | null): Promise<number> {
    const accessibleLeads = await this.getLeadsByRole(userId, userRole, teamId ?? null);
    const accessibleLeadIds = accessibleLeads.map(l => l.id);
    if (accessibleLeadIds.length === 0) return 0;

    const placeholders = accessibleLeadIds.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM whatsapp_messages_log
       WHERE lead_id = ANY(ARRAY[${placeholders}])
         AND direction = 'inbound'
         AND is_read = false`,
      accessibleLeadIds
    );
    return Number(rows[0]?.count ?? 0);
  }

  async countAgentMessagesInLastHour(agentId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(whatsappMessagesLog)
      .where(
        and(
          eq(whatsappMessagesLog.agentId, agentId),
          gte(whatsappMessagesLog.createdAt, oneHourAgo)
        )
      );
    return Number(result[0]?.count ?? 0);
  }

  async countAgentMessagesInLastDay(agentId: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(whatsappMessagesLog)
      .where(
        and(
          eq(whatsappMessagesLog.agentId, agentId),
          gte(whatsappMessagesLog.createdAt, oneDayAgo)
        )
      );
    return Number(result[0]?.count ?? 0);
  }

  // Lead Manager Comments
  async getManagerCommentsByLead(leadId: string): Promise<LeadManagerComment[]> {
    return db.select().from(leadManagerComments).where(eq(leadManagerComments.leadId, leadId)).orderBy(leadManagerComments.createdAt);
  }

  async getManagerComment(id: string): Promise<LeadManagerComment | undefined> {
    const [comment] = await db.select().from(leadManagerComments).where(eq(leadManagerComments.id, id));
    return comment;
  }

  async createManagerComment(comment: InsertLeadManagerComment): Promise<LeadManagerComment> {
    const [newComment] = await db.insert(leadManagerComments).values(comment).returning();
    return newComment;
  }

  async updateManagerComment(id: string, data: Partial<LeadManagerComment>): Promise<LeadManagerComment | undefined> {
    const [updated] = await db.update(leadManagerComments).set({ ...data, updatedAt: new Date() }).where(eq(leadManagerComments.id, id)).returning();
    return updated;
  }

  async deleteManagerComment(id: string): Promise<boolean> {
    const result = await db.delete(leadManagerComments).where(eq(leadManagerComments.id, id)).returning();
    return result.length > 0;
  }

  async markManagerCommentRead(id: string): Promise<LeadManagerComment | undefined> {
    const [updated] = await db.update(leadManagerComments).set({ isReadByAgent: true, updatedAt: new Date() }).where(eq(leadManagerComments.id, id)).returning();
    return updated;
  }

  async getUnreadManagerCommentsByAssignee(assignedToUserId: string): Promise<LeadManagerComment[]> {
    // Get all unread comments, then filter by leads assigned to the user
    const unread = await db.select().from(leadManagerComments).where(eq(leadManagerComments.isReadByAgent, false));
    if (unread.length === 0) return [];
    const assignedLeads = await db.select().from(leads).where(eq(leads.assignedTo, assignedToUserId));
    const assignedLeadIds = new Set(assignedLeads.map(l => l.id));
    return unread.filter(c => assignedLeadIds.has(c.leadId));
  }

  // Email Report Settings
  async getEmailReportSettings(userId: string): Promise<EmailReportSettings | undefined> {
    const [settings] = await db.select().from(emailReportSettings).where(eq(emailReportSettings.userId, userId));
    return settings;
  }

  async upsertEmailReportSettings(data: InsertEmailReportSettings): Promise<EmailReportSettings> {
    const existing = await this.getEmailReportSettings(data.userId);
    if (existing) {
      const [updated] = await db
        .update(emailReportSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(emailReportSettings.userId, data.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(emailReportSettings).values(data).returning();
    return created;
  }

  async getAllEnabledEmailReportSettings(): Promise<EmailReportSettings[]> {
    return db.select().from(emailReportSettings).where(eq(emailReportSettings.enabled, true));
  }

  async updateEmailReportLastSent(userId: string): Promise<void> {
    await db
      .update(emailReportSettings)
      .set({ lastSentAt: new Date(), updatedAt: new Date() })
      .where(eq(emailReportSettings.userId, userId));
  }

  // Monthly Targets
  async getMonthlyTarget(userId: string, targetMonth: string): Promise<MonthlyTarget | undefined> {
    const [target] = await db.select().from(monthlyTargets)
      .where(and(eq(monthlyTargets.userId, userId), eq(monthlyTargets.targetMonth, targetMonth)));
    return target;
  }

  async getMonthlyTargetsByMonth(targetMonth: string, companyId?: string | null): Promise<MonthlyTarget[]> {
    return companyId
      ? db.select().from(monthlyTargets).where(and(eq(monthlyTargets.targetMonth, targetMonth), eq(monthlyTargets.companyId, companyId)))
      : db.select().from(monthlyTargets).where(eq(monthlyTargets.targetMonth, targetMonth));
  }

  async upsertMonthlyTarget(data: InsertMonthlyTarget): Promise<MonthlyTarget> {
    const existing = await this.getMonthlyTarget(data.userId, data.targetMonth);
    if (existing) {
      const [updated] = await db.update(monthlyTargets)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(monthlyTargets.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(monthlyTargets).values(data).returning();
    return created;
  }

  async getLeaderboard(period: string, teamId?: string, companyId?: string | null): Promise<{
    userId: string;
    userName: string;
    teamId: string | null;
    teamName: string | null;
    dealsCount: number;
    leadsCount: number;
    commissionTotal: number;
  }[]> {
    const allUsers = companyId
      ? await db.select().from(users).where(and(eq(users.isActive, true), eq(users.companyId, companyId)))
      : await db.select().from(users).where(eq(users.isActive, true));
    const allTeams = await db.select().from(teams);
    const teamMap = new Map(allTeams.map(t => [t.id, t.name]));

    let agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "team_leader");
    if (teamId) {
      agents = agents.filter(u => u.teamId === teamId);
    }

    // Parse period: either "YYYY-MM" (month) or "YYYY" (full year)
    let periodStart: Date;
    let periodEnd: Date;
    let commissionFilter: string | null = null;

    if (/^\d{4}$/.test(period)) {
      // Year period
      const year = parseInt(period, 10);
      periodStart = new Date(year, 0, 1);
      periodEnd = new Date(year + 1, 0, 1);
      commissionFilter = null; // match any commission with month starting with year
    } else {
      // Month period "YYYY-MM"
      const [year, month] = period.split("-").map(Number);
      periodStart = new Date(year, month - 1, 1);
      periodEnd = new Date(year, month, 1);
      commissionFilter = period;
    }

    // Get done deal state ids
    const allStates = companyId
      ? await db.select().from(leadStates).where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId)))
      : await db.select().from(leadStates);
    const doneStateIds = new Set(
      allStates.filter(s => s.name === "Done Deal" || s.name === "تم الصفقة").map(s => s.id)
    );

    // Get all leads assigned to any agent (we'll filter per-agent)
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId))
      : await db.select().from(leads);

    // Get all commissions
    const allCommissions = companyId
      ? await db.select().from(commissions).where(eq(commissions.companyId, companyId))
      : await db.select().from(commissions);

    return agents.map(agent => {
      const agentName = `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || agent.username;
      const agentKeys = [agent.id, agent.username];
      if (agent.firstName && agent.lastName) agentKeys.push(`${agent.firstName} ${agent.lastName}`);

      // Leads added (created) in the period assigned to this agent
      const agentLeads = allLeads.filter(l =>
        l.assignedTo && agentKeys.includes(l.assignedTo) &&
        l.createdAt && new Date(l.createdAt) >= periodStart && new Date(l.createdAt) < periodEnd
      );
      const leadsCount = agentLeads.length;

      // Deals CLOSED in the period: leads in done state whose updatedAt falls in period
      const dealsCount = allLeads.filter(l =>
        l.assignedTo && agentKeys.includes(l.assignedTo) &&
        l.stateId && doneStateIds.has(l.stateId) &&
        l.updatedAt && new Date(l.updatedAt) >= periodStart && new Date(l.updatedAt) < periodEnd
      ).length;

      // Commissions for this period
      const commissionTotal = allCommissions
        .filter(c => {
          if (c.agentId !== agent.id) return false;
          if (commissionFilter) return c.month === commissionFilter;
          // Year: match any month starting with year
          return c.month && c.month.startsWith(period);
        })
        .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

      return {
        userId: agent.id,
        userName: agentName,
        teamId: agent.teamId ?? null,
        teamName: agent.teamId ? (teamMap.get(agent.teamId) ?? null) : null,
        dealsCount,
        leadsCount,
        commissionTotal,
      };
    });
  }

  // Chatbot Settings
  async getChatbotSettings(userId: string): Promise<ChatbotSettings | undefined> {
    const [settings] = await db.select().from(chatbotSettings).where(eq(chatbotSettings.userId, userId));
    return settings;
  }

  async upsertChatbotSettings(data: InsertChatbotSettings): Promise<ChatbotSettings> {
    const existing = await this.getChatbotSettings(data.userId);
    if (existing) {
      const [updated] = await db.update(chatbotSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(chatbotSettings.userId, data.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(chatbotSettings).values(data).returning();
    return created;
  }

  async updateChatbotSettings(userId: string, data: UpdateChatbotSettings): Promise<ChatbotSettings | undefined> {
    const [updated] = await db.update(chatbotSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chatbotSettings.userId, userId))
      .returning();
    return updated;
  }

  // WhatsApp Campaigns
  async getAllCampaigns(companyId?: string | null): Promise<WhatsappCampaign[]> {
    if (companyId) {
      return db.select().from(whatsappCampaigns).where(eq(whatsappCampaigns.companyId, companyId)).orderBy(sql`created_at DESC`);
    }
    return db.select().from(whatsappCampaigns).orderBy(sql`created_at DESC`);
  }

  async getCampaign(id: string): Promise<WhatsappCampaign | undefined> {
    const [c] = await db.select().from(whatsappCampaigns).where(eq(whatsappCampaigns.id, id));
    return c;
  }

  async createCampaign(data: InsertWhatsappCampaign, companyId?: string | null): Promise<WhatsappCampaign> {
    const [c] = await db.insert(whatsappCampaigns).values({ ...data, status: "scheduled", companyId: companyId ?? null }).returning();
    return c;
  }

  async updateCampaign(id: string, data: Partial<WhatsappCampaign>): Promise<WhatsappCampaign | undefined> {
    const [c] = await db.update(whatsappCampaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(whatsappCampaigns.id, id))
      .returning();
    return c;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    await pool.query(`DELETE FROM whatsapp_campaign_recipients WHERE campaign_id = $1`, [id]);
    const result = await db.delete(whatsappCampaigns).where(eq(whatsappCampaigns.id, id)).returning();
    return result.length > 0;
  }

  async getCampaignRecipients(campaignId: string): Promise<WhatsappCampaignRecipient[]> {
    return db.select().from(whatsappCampaignRecipients).where(eq(whatsappCampaignRecipients.campaignId, campaignId));
  }

  async createCampaignRecipients(recipients: { campaignId: string; leadId: string; phone: string }[]): Promise<void> {
    if (recipients.length === 0) return;
    await db.insert(whatsappCampaignRecipients).values(recipients.map(r => ({ ...r, status: "pending" })));
  }

  async updateRecipientStatus(id: string, status: string, sentAt?: Date, errorMessage?: string): Promise<void> {
    await db.update(whatsappCampaignRecipients)
      .set({ status, ...(sentAt ? { sentAt } : {}), ...(errorMessage ? { errorMessage } : {}) })
      .where(eq(whatsappCampaignRecipients.id, id));
  }

  async getLeadsForCampaignFilter(filterStateId?: string | null, filterChannel?: string | null, filterDaysNoReply?: number | null, companyId?: string | null): Promise<Lead[]> {
    let query = db.select().from(leads).$dynamic();
    const conditions = [isNotNull(leads.phone)];
    if (companyId) conditions.push(eq(leads.companyId, companyId));
    if (filterStateId) conditions.push(eq(leads.stateId, filterStateId));
    if (filterChannel) conditions.push(eq(leads.channel, filterChannel));
    if (filterDaysNoReply && filterDaysNoReply > 0) {
      const cutoff = new Date(Date.now() - filterDaysNoReply * 24 * 60 * 60 * 1000);
      conditions.push(
        sql`(${leads.lastActionDate} IS NULL AND ${leads.createdAt} < ${cutoff}) OR (${leads.lastActionDate} IS NOT NULL AND ${leads.lastActionDate} < ${cutoff})`
      );
    }
    query = query.where(and(...conditions));
    return query;
  }

  async getPendingCampaigns(): Promise<WhatsappCampaign[]> {
    const now = new Date();
    const result = await pool.query<WhatsappCampaign>(
      `SELECT * FROM whatsapp_campaigns WHERE status = 'scheduled' AND (scheduled_at IS NULL OR scheduled_at <= $1) ORDER BY created_at ASC`,
      [now]
    );
    return result.rows;
  }

  // WhatsApp Follow-up Rules
  async getAllFollowupRules(): Promise<WhatsappFollowupRule[]> {
    return db.select().from(whatsappFollowupRules).orderBy(sql`created_at DESC`);
  }

  async getFollowupRule(id: string): Promise<WhatsappFollowupRule | undefined> {
    const [r] = await db.select().from(whatsappFollowupRules).where(eq(whatsappFollowupRules.id, id));
    return r;
  }

  async createFollowupRule(data: InsertWhatsappFollowupRule): Promise<WhatsappFollowupRule> {
    const [r] = await db.insert(whatsappFollowupRules).values(data).returning();
    return r;
  }

  async updateFollowupRule(id: string, data: Partial<WhatsappFollowupRule>): Promise<WhatsappFollowupRule | undefined> {
    const [r] = await db.update(whatsappFollowupRules).set(data).where(eq(whatsappFollowupRules.id, id)).returning();
    return r;
  }

  async deleteFollowupRule(id: string): Promise<boolean> {
    const result = await db.delete(whatsappFollowupRules).where(eq(whatsappFollowupRules.id, id)).returning();
    return result.length > 0;
  }

  async getActiveFollowupRules(): Promise<WhatsappFollowupRule[]> {
    return db.select().from(whatsappFollowupRules).where(eq(whatsappFollowupRules.isActive, true));
  }

  async getLeadsForFollowupRule(daysAfterNoReply: number): Promise<Lead[]> {
    const cutoff = new Date(Date.now() - daysAfterNoReply * 24 * 60 * 60 * 1000);
    const result = await pool.query<Lead>(
      `SELECT * FROM leads WHERE phone IS NOT NULL AND (
        (last_action_date IS NULL AND created_at < $1) OR
        (last_action_date IS NOT NULL AND last_action_date < $1)
      )`,
      [cutoff]
    );
    return result.rows;
  }

  // Custom Roles
  async getAllCustomRoles(): Promise<CustomRole[]> {
    return db.select().from(customRoles).orderBy(customRoles.createdAt);
  }

  async getCustomRole(id: string): Promise<CustomRole | undefined> {
    const [r] = await db.select().from(customRoles).where(eq(customRoles.id, id));
    return r;
  }

  async getCustomRoleByName(name: string): Promise<CustomRole | undefined> {
    const [r] = await db.select().from(customRoles).where(eq(customRoles.name, name));
    return r;
  }

  async createCustomRole(data: InsertCustomRole): Promise<CustomRole> {
    const [r] = await db.insert(customRoles).values(data).returning();
    return r;
  }

  async deleteCustomRole(id: string): Promise<boolean> {
    const result = await db.delete(customRoles).where(eq(customRoles.id, id)).returning();
    return result.length > 0;
  }

  // Meta Page Connections
  async getMetaPageConnection(): Promise<MetaPageConnection | undefined> {
    const [conn] = await db.select().from(metaPageConnections).where(eq(metaPageConnections.isActive, true)).limit(1);
    return conn;
  }

  async upsertMetaPageConnection(data: InsertMetaPageConnection): Promise<MetaPageConnection> {
    // Enforce single active connection: deactivate all others before upserting
    await db
      .update(metaPageConnections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(sql`${metaPageConnections.pageId} != ${data.pageId}`);

    const existing = await db.select().from(metaPageConnections).where(eq(metaPageConnections.pageId, data.pageId)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db
        .update(metaPageConnections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(metaPageConnections.pageId, data.pageId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(metaPageConnections).values(data).returning();
    return created;
  }

  async updateMetaPageConnectionSettings(pageId: string, data: { commentBotEnabled?: boolean; commentAutoReply?: string }): Promise<MetaPageConnection | undefined> {
    const [updated] = await db
      .update(metaPageConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(metaPageConnections.pageId, pageId))
      .returning();
    return updated;
  }

  async deleteMetaPageConnection(pageId: string): Promise<boolean> {
    const result = await db.delete(metaPageConnections).where(eq(metaPageConnections.pageId, pageId)).returning();
    return result.length > 0;
  }

  // Social Messages Log
  async logSocialMessage(data: InsertSocialMessagesLog): Promise<SocialMessagesLog> {
    const [msg] = await db.insert(socialMessagesLog).values(data).returning();
    return msg;
  }

  async getSocialMessagesByLead(leadId: string, platform?: string): Promise<SocialMessagesLog[]> {
    if (platform) {
      return db
        .select()
        .from(socialMessagesLog)
        .where(and(eq(socialMessagesLog.leadId, leadId), eq(socialMessagesLog.platform, platform)))
        .orderBy(socialMessagesLog.createdAt);
    }
    return db
      .select()
      .from(socialMessagesLog)
      .where(eq(socialMessagesLog.leadId, leadId))
      .orderBy(socialMessagesLog.createdAt);
  }

  async findLeadBySenderId(senderId: string, platform: string, companyId?: string | null): Promise<Lead | undefined> {
    const channelLabel = platform === "instagram" ? "إنستجرام" : "ماسنجر";

    // Primary lookup: find lead by phone (senderId) and matching channel label (scoped to company if provided)
    const primaryCondition = companyId
      ? and(eq(leads.phone, senderId), eq(leads.channel, channelLabel), eq(leads.companyId, companyId))
      : and(eq(leads.phone, senderId), eq(leads.channel, channelLabel));
    const [leadByPhone] = await db.select().from(leads).where(primaryCondition).limit(1);
    if (leadByPhone) return leadByPhone;

    // Secondary lookup: find via social messages log (handles pre-existing logs)
    const msgs = await db
      .select()
      .from(socialMessagesLog)
      .where(and(eq(socialMessagesLog.senderId, senderId), eq(socialMessagesLog.platform, platform)))
      .limit(1);
    if (msgs.length === 0) return undefined;
    const leadId = msgs[0].leadId;
    if (!leadId) return undefined;
    const condition = companyId
      ? and(eq(leads.id, leadId), eq(leads.companyId, companyId))
      : eq(leads.id, leadId);
    const [lead] = await db.select().from(leads).where(condition);
    return lead;
  }

  async findSocialMessageById(messageId: string): Promise<SocialMessagesLog | undefined> {
    const [msg] = await db
      .select()
      .from(socialMessagesLog)
      .where(eq(socialMessagesLog.messageId, messageId))
      .limit(1);
    return msg;
  }

  async markSocialMessagesRead(leadId: string, platform: string): Promise<void> {
    await db
      .update(socialMessagesLog)
      .set({ isRead: true })
      .where(
        and(
          eq(socialMessagesLog.leadId, leadId),
          eq(socialMessagesLog.platform, platform),
          or(
            eq(socialMessagesLog.direction, "inbound"),
            eq(socialMessagesLog.direction, "comment_reply")
          ),
          eq(socialMessagesLog.isRead, false)
        )
      );
  }

  async getUnreadSocialCount(userId: string, userRole: string, teamId?: string | null, companyId?: string | null): Promise<number> {
    try {
      const adminRoles = ["super_admin", "company_owner", "sales_admin", "admin", "sales_manager"];
      const isAdmin = adminRoles.includes(userRole);

      let query: string;
      let params: unknown[];
      if (isAdmin) {
        if (companyId) {
          query = `SELECT COUNT(*) FROM social_messages_log WHERE is_read = false AND direction = 'inbound' AND company_id = $1`;
          params = [companyId];
        } else {
          query = `SELECT COUNT(*) FROM social_messages_log WHERE is_read = false AND direction = 'inbound'`;
          params = [];
        }
      } else {
        if (companyId) {
          query = `
            SELECT COUNT(*) FROM social_messages_log sm
            JOIN leads l ON sm.lead_id = l.id
            WHERE sm.is_read = false AND sm.direction = 'inbound'
            AND l.assigned_to = $1 AND l.company_id = $2
          `;
          params = [userId, companyId];
        } else {
          query = `
            SELECT COUNT(*) FROM social_messages_log sm
            JOIN leads l ON sm.lead_id = l.id
            WHERE sm.is_read = false AND sm.direction = 'inbound'
            AND l.assigned_to = $1
          `;
          params = [userId];
        }
      }
      const result = await pool.query<{ count: string }>(query, params);
      return parseInt(result.rows[0]?.count ?? "0", 10);
    } catch {
      return 0;
    }
  }

  async getSocialInbox(userId: string, userRole: string, teamId?: string | null, companyId?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    senderId: string;
    platform: string;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
    totalCount: number;
  }[]> {
    const accessibleLeads = await this.getLeadsByRole(userId, userRole, teamId ?? null, null, companyId);
    if (accessibleLeads.length === 0) return [];

    const accessibleLeadIds = accessibleLeads.map(l => l.id);
    const leadMap = new Map(accessibleLeads.map(l => [l.id, l]));

    const placeholders = accessibleLeadIds.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(`
      SELECT
        lead_id AS "leadId",
        platform,
        (ARRAY_AGG(sender_id ORDER BY created_at DESC))[1] AS "senderId",
        MAX(created_at) AS "lastMessageAt",
        (ARRAY_AGG(message_text ORDER BY created_at DESC))[1] AS "lastMessage",
        COUNT(*)::int AS "totalCount",
        COUNT(*) FILTER (WHERE direction = 'inbound' AND is_read = false)::int AS "unreadCount"
      FROM social_messages_log
      WHERE lead_id = ANY(ARRAY[${placeholders}])
        AND lead_id IS NOT NULL
      GROUP BY lead_id, platform
      ORDER BY MAX(created_at) DESC
    `, accessibleLeadIds);

    return rows.map((row: any) => ({
      leadId: row.leadId,
      leadName: leadMap.get(row.leadId)?.name ?? null,
      senderId: row.senderId ?? "",
      platform: row.platform ?? "messenger",
      lastMessage: row.lastMessage ?? null,
      lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt) : null,
      unreadCount: row.unreadCount ?? 0,
      totalCount: row.totalCount ?? 0,
    }));
  }

  async getUnifiedConversations(userId: string, userRole: string, teamId?: string | null, companyId?: string | null, search?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    assignedTo: string | null;
    score: string | null;
    platforms: string[];
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
    totalCount: number;
    unreadByPlatform: Record<string, number>;
    matchedMessage: string | null;
  }[]> {
    const accessibleLeads = await this.getLeadsByRole(userId, userRole, teamId ?? null, null, companyId);
    if (accessibleLeads.length === 0) return [];

    const accessibleLeadIds = accessibleLeads.map(l => l.id);
    const leadMap = new Map(accessibleLeads.map(l => [l.id, l]));
    const placeholders = accessibleLeadIds.map((_, i) => `$${i + 1}`).join(", ");

    const hasSearch = search && search.trim().length > 0;
    const params: any[] = [...accessibleLeadIds];
    let havingClause = "";
    let matchedMessageExpr = "NULL::text";

    if (hasSearch) {
      const searchParam = `$${accessibleLeadIds.length + 1}`;
      params.push(`%${search!.trim()}%`);
      havingClause = `HAVING bool_or(message_text ILIKE ${searchParam})`;
      matchedMessageExpr = `(ARRAY_AGG(message_text ORDER BY created_at DESC) FILTER (WHERE message_text ILIKE ${searchParam}))[1]`;
    }

    const { rows } = await pool.query(`
      WITH combined AS (
        SELECT
          lead_id,
          'whatsapp' AS platform,
          message_text,
          created_at,
          direction,
          is_read
        FROM whatsapp_messages_log
        WHERE lead_id = ANY(ARRAY[${placeholders}]) AND lead_id IS NOT NULL
        UNION ALL
        SELECT
          lead_id,
          CASE WHEN direction = 'comment_reply' THEN 'facebook_comment' ELSE platform END AS platform,
          message_text,
          created_at,
          direction,
          is_read
        FROM social_messages_log
        WHERE lead_id = ANY(ARRAY[${placeholders}]) AND lead_id IS NOT NULL
      )
      SELECT
        lead_id AS "leadId",
        MAX(created_at) AS "lastMessageAt",
        (ARRAY_AGG(message_text ORDER BY created_at DESC))[1] AS "lastMessage",
        ${matchedMessageExpr} AS "matchedMessage",
        COUNT(*)::int AS "totalCount",
        COUNT(*) FILTER (WHERE direction IN ('inbound','comment_reply') AND is_read = false)::int AS "unreadCount",
        ARRAY_AGG(DISTINCT platform) AS platforms,
        COUNT(*) FILTER (WHERE platform = 'whatsapp' AND direction = 'inbound' AND is_read = false)::int AS "unreadWhatsapp",
        COUNT(*) FILTER (WHERE platform = 'messenger' AND direction = 'inbound' AND is_read = false)::int AS "unreadMessenger",
        COUNT(*) FILTER (WHERE platform = 'instagram' AND direction = 'inbound' AND is_read = false)::int AS "unreadInstagram",
        COUNT(*) FILTER (WHERE platform = 'facebook_comment' AND is_read = false)::int AS "unreadFbComment"
      FROM combined
      GROUP BY lead_id
      ${havingClause}
      ORDER BY MAX(created_at) DESC
    `, params);

    let results = rows.map((row: any) => {
      const lead = leadMap.get(row.leadId);
      const unreadByPlatform: Record<string, number> = {
        whatsapp: row.unreadWhatsapp ?? 0,
        messenger: row.unreadMessenger ?? 0,
        instagram: row.unreadInstagram ?? 0,
        facebook_comment: row.unreadFbComment ?? 0,
      };
      return {
        leadId: row.leadId,
        leadName: lead?.name ?? null,
        assignedTo: lead?.assignedTo ?? null,
        score: lead?.score ?? null,
        platforms: (row.platforms ?? []).filter(Boolean),
        lastMessage: row.lastMessage ?? null,
        lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt) : null,
        unreadCount: row.unreadCount ?? 0,
        totalCount: row.totalCount ?? 0,
        unreadByPlatform,
        matchedMessage: row.matchedMessage ?? null,
      };
    });

    if (hasSearch) {
      const s = search!.trim().toLowerCase();
      const nameMatches = accessibleLeads
        .filter(l => l.name && l.name.toLowerCase().includes(s))
        .map(l => l.id);
      const resultIds = new Set(results.map(r => r.leadId));
      for (const leadId of nameMatches) {
        if (!resultIds.has(leadId)) {
          const lead = leadMap.get(leadId);
          if (lead) {
            results.push({
              leadId,
              leadName: lead.name ?? null,
              assignedTo: lead.assignedTo ?? null,
              score: lead.score ?? null,
              platforms: [],
              lastMessage: null,
              lastMessageAt: null,
              unreadCount: 0,
              totalCount: 0,
              unreadByPlatform: { whatsapp: 0, messenger: 0, instagram: 0, facebook_comment: 0 },
              matchedMessage: null,
            });
          }
        }
      }
    }

    return results;
  }

  async getUnifiedThreadMessages(leadId: string): Promise<{
    id: string;
    platform: string;
    direction: string;
    messageText: string | null;
    agentName: string | null;
    createdAt: Date | null;
    botActionsSummary: string | null;
    isRead: boolean | null;
  }[]> {
    const { rows } = await pool.query(`
      SELECT
        id,
        'whatsapp' AS platform,
        direction,
        message_text AS "messageText",
        agent_name AS "agentName",
        created_at AS "createdAt",
        bot_actions_summary AS "botActionsSummary",
        is_read AS "isRead"
      FROM whatsapp_messages_log
      WHERE lead_id = $1
      UNION ALL
      SELECT
        id,
        CASE WHEN direction = 'comment_reply' THEN 'facebook_comment' ELSE platform END AS platform,
        direction,
        message_text AS "messageText",
        agent_name AS "agentName",
        created_at AS "createdAt",
        bot_actions_summary AS "botActionsSummary",
        is_read AS "isRead"
      FROM social_messages_log
      WHERE lead_id = $1
      ORDER BY "createdAt" ASC NULLS LAST
    `, [leadId]);

    return rows.map((row: any) => ({
      id: row.id,
      platform: row.platform,
      direction: row.direction,
      messageText: row.messageText ?? null,
      agentName: row.agentName ?? null,
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      botActionsSummary: row.botActionsSummary ?? null,
      isRead: row.isRead ?? null,
    }));
  }

  // Sales Performance Reports
  async getSalesActivityReport(from?: Date, to?: Date, companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    callsCount: number;
    whatsappCount: number;
    meetingsCount: number;
    notesCount: number;
    totalActions: number;
    callsToMeetingRate: number;
    inboundWhatsappCount: number;
    outboundWhatsappCount: number;
    whatsappReplyRate: number;
    weekCallsCount: number;
    weekMeetingsCount: number;
    weekTotalActions: number;
    monthCallsCount: number;
    monthMeetingsCount: number;
    monthTotalActions: number;
  }[]> {
    const allUsers = companyId
      ? await db.select().from(users).where(eq(users.companyId, companyId))
      : await db.select().from(users);
    const agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "team_leader");

    const now = new Date();
    const fromDate = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ?? now;
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch enough history for weekly/monthly breakdowns
    const earliestDate = monthStart < fromDate ? monthStart : fromDate;
    const allComms = companyId
      ? await db.select().from(communications).where(and(eq(communications.companyId, companyId), gte(communications.createdAt, earliestDate), lte(communications.createdAt, toDate)))
      : await db.select().from(communications).where(and(gte(communications.createdAt, earliestDate), lte(communications.createdAt, toDate)));

    // Fetch WhatsApp messages log to compute inbound/outbound reply rates
    const allWaLog = companyId
      ? await db.select().from(whatsappMessagesLog)
          .where(and(eq(whatsappMessagesLog.companyId, companyId), gte(whatsappMessagesLog.createdAt, earliestDate), lte(whatsappMessagesLog.createdAt, toDate)))
      : await db.select().from(whatsappMessagesLog)
          .where(and(gte(whatsappMessagesLog.createdAt, earliestDate), lte(whatsappMessagesLog.createdAt, toDate)));

    return agents.map(agent => {
      const agentComms = allComms.filter(c => c.userId === agent.id);
      // Selected period stats
      const periodComms = agentComms.filter(c => c.createdAt && new Date(c.createdAt) >= fromDate);
      const callsCount = periodComms.filter(c => c.type === "call" || c.type === "no_answer").length;
      const whatsappCount = periodComms.filter(c => c.type === "whatsapp").length;
      const meetingsCount = periodComms.filter(c => c.type === "meeting").length;
      const notesCount = periodComms.filter(c => c.type === "note").length;
      const totalActions = periodComms.length;
      const callsToMeetingRate = callsCount > 0 ? parseFloat(((meetingsCount / callsCount) * 100).toFixed(1)) : 0;
      // WhatsApp inbound/outbound reply rate from whatsapp_messages_log
      const agentWaLog = allWaLog.filter(m => m.agentId === agent.id && m.createdAt && new Date(m.createdAt) >= fromDate);
      const inboundWhatsappCount = agentWaLog.filter(m => m.direction === "inbound").length;
      const outboundWhatsappCount = agentWaLog.filter(m => m.direction !== "inbound").length;
      // Reply rate: % of inbound messages that got an outbound reply (approximate by outbound/inbound ratio)
      const whatsappReplyRate = inboundWhatsappCount > 0
        ? parseFloat(Math.min((outboundWhatsappCount / inboundWhatsappCount) * 100, 100).toFixed(1))
        : 0;
      // This week (last 7 days)
      const weekComms = agentComms.filter(c => c.createdAt && new Date(c.createdAt) >= weekStart);
      const weekCallsCount = weekComms.filter(c => c.type === "call" || c.type === "no_answer").length;
      const weekMeetingsCount = weekComms.filter(c => c.type === "meeting").length;
      const weekTotalActions = weekComms.length;
      // This calendar month
      const monthComms = agentComms.filter(c => c.createdAt && new Date(c.createdAt) >= monthStart);
      const monthCallsCount = monthComms.filter(c => c.type === "call" || c.type === "no_answer").length;
      const monthMeetingsCount = monthComms.filter(c => c.type === "meeting").length;
      const monthTotalActions = monthComms.length;
      const agentName = `${agent.firstName ?? ""} ${agent.lastName ?? ""}`.trim() || agent.username;
      return { agentId: agent.id, agentName, callsCount, whatsappCount, meetingsCount, notesCount, totalActions, callsToMeetingRate, inboundWhatsappCount, outboundWhatsappCount, whatsappReplyRate, weekCallsCount, weekMeetingsCount, weekTotalActions, monthCallsCount, monthMeetingsCount, monthTotalActions };
    }).sort((a, b) => b.totalActions - a.totalActions);
  }

  async getFollowUpReport(from?: Date, to?: Date, companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    scheduledFollowUps: number;
    overdueFollowUps: number;
    completedFollowUps: number;
    followUpRate: number;
    neverContactedLeads: number;
    within24hLeads: number;
    within48hLeads: number;
    meetingsHeld: number;
    meetingsAttendanceRate: number;
  }[]> {
    const allUsers = companyId
      ? await db.select().from(users).where(eq(users.companyId, companyId))
      : await db.select().from(users);
    const agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "team_leader");

    const now = new Date();
    const fromDate = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ?? now;

    const allReminders = companyId
      ? await db.select().from(reminders).where(and(eq(reminders.companyId, companyId), gte(reminders.createdAt, fromDate), lte(reminders.createdAt, toDate)))
      : await db.select().from(reminders).where(and(gte(reminders.createdAt, fromDate), lte(reminders.createdAt, toDate)));
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId))
      : await db.select().from(leads);
    const allComms = companyId
      ? await db.select().from(communications).where(and(eq(communications.companyId, companyId), gte(communications.createdAt, fromDate), lte(communications.createdAt, toDate)))
      : await db.select().from(communications).where(and(gte(communications.createdAt, fromDate), lte(communications.createdAt, toDate)));

    return agents.map(agent => {
      const agentReminders = allReminders.filter(r => r.userId === agent.id);
      const scheduledFollowUps = agentReminders.length;
      const overdueFollowUps = agentReminders.filter(r => !r.isCompleted && new Date(r.dueDate) < now).length;
      const completedFollowUps = agentReminders.filter(r => r.isCompleted).length;
      const followUpRate = scheduledFollowUps > 0
        ? parseFloat(((completedFollowUps / scheduledFollowUps) * 100).toFixed(1))
        : 0;
      const agentLeads = allLeads.filter(l => l.assignedTo === agent.id);
      const neverContactedLeads = agentLeads.filter(l => !l.firstContactAt).length;
      const within24hLeads = agentLeads.filter(l => {
        if (!l.firstContactAt || !l.createdAt) return false;
        const diff = new Date(l.firstContactAt).getTime() - new Date(l.createdAt).getTime();
        return diff <= 24 * 60 * 60 * 1000;
      }).length;
      const within48hLeads = agentLeads.filter(l => {
        if (!l.firstContactAt || !l.createdAt) return false;
        const diff = new Date(l.firstContactAt).getTime() - new Date(l.createdAt).getTime();
        return diff <= 48 * 60 * 60 * 1000;
      }).length;
      const agentComms = allComms.filter(c => c.userId === agent.id);
      const meetingsHeld = agentComms.filter(c => c.type === "meeting").length;
      const meetingsAttendanceRate = scheduledFollowUps > 0
        ? parseFloat(((meetingsHeld / scheduledFollowUps) * 100).toFixed(1))
        : 0;
      const agentName = `${agent.firstName ?? ""} ${agent.lastName ?? ""}`.trim() || agent.username;
      return { agentId: agent.id, agentName, scheduledFollowUps, overdueFollowUps, completedFollowUps, followUpRate, neverContactedLeads, within24hLeads, within48hLeads, meetingsHeld, meetingsAttendanceRate };
    }).sort((a, b) => b.scheduledFollowUps - a.scheduledFollowUps);
  }

  async getSalesFunnelReport(companyId?: string | null): Promise<{
    stateId: string;
    stateName: string;
    stateColor: string;
    stateOrder: number;
    count: number;
    conversionToNext: number | null;
    avgDaysInState: number | null;
  }[]> {
    const allStates = companyId
      ? await db.select().from(leadStates).where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId))).orderBy(leadStates.order)
      : await db.select().from(leadStates).orderBy(leadStates.order);
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId))
      : await db.select().from(leads);

    const stateCountMap: Record<string, number> = {};
    for (const s of allStates) stateCountMap[s.id] = 0;
    for (const l of allLeads) {
      if (l.stateId && stateCountMap[l.stateId] !== undefined) {
        stateCountMap[l.stateId]++;
      }
    }

    // Compute avgDaysInState: average days since lead.updatedAt (proxy for when current state was set)
    // grouped by current stateId
    const now = new Date();
    const avgDaysMap: Record<string, number | null> = {};
    for (const state of allStates) {
      const stateLeads = allLeads.filter(l => l.stateId === state.id && l.updatedAt);
      if (stateLeads.length === 0) {
        avgDaysMap[state.id] = null;
      } else {
        const totalDays = stateLeads.reduce((sum, l) => {
          const diffMs = now.getTime() - new Date(l.updatedAt!).getTime();
          return sum + Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }, 0);
        avgDaysMap[state.id] = Math.round(totalDays / stateLeads.length);
      }
    }

    const result = allStates.map((state, idx) => {
      const count = stateCountMap[state.id] ?? 0;
      const nextState = allStates[idx + 1];
      const nextCount = nextState ? (stateCountMap[nextState.id] ?? 0) : null;
      // Conversion to next: how many of current stage went to the next stage
      const conversionToNext = count > 0 && nextCount !== null
        ? parseFloat(((nextCount / count) * 100).toFixed(1))
        : null;
      return {
        stateId: state.id,
        stateName: state.name,
        stateColor: state.color,
        stateOrder: state.order,
        count,
        conversionToNext,
        avgDaysInState: avgDaysMap[state.id] ?? null,
      };
    });

    return result;
  }

  async getDailyActivityReport(companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    todayActions: number;
    weekActions: number;
    todayCalls: number;
    todayWhatsapp: number;
    todayMeetings: number;
    todayNotes: number;
    isInactive: boolean;
    lastActivityAt: Date | null;
  }[]> {
    const allUsers = companyId
      ? await db.select().from(users).where(eq(users.companyId, companyId))
      : await db.select().from(users);
    const agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "team_leader");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const allComms = companyId
      ? await db.select().from(communications).where(and(gte(communications.createdAt, weekStart), eq(communications.companyId, companyId)))
      : await db.select().from(communications).where(gte(communications.createdAt, weekStart));

    return agents.map(agent => {
      const agentComms = allComms.filter(c => c.userId === agent.id);
      const todayComms = agentComms.filter(c => c.createdAt && new Date(c.createdAt) >= todayStart);
      const todayActions = todayComms.length;
      const weekActions = agentComms.length;
      const todayCalls = todayComms.filter(c => c.type === "call" || c.type === "no_answer").length;
      const todayWhatsapp = todayComms.filter(c => c.type === "whatsapp").length;
      const todayMeetings = todayComms.filter(c => c.type === "meeting").length;
      const todayNotes = todayComms.filter(c => c.type === "note").length;
      const lastComm = agentComms.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];
      const lastActivityAt = lastComm?.createdAt ? new Date(lastComm.createdAt) : null;
      const isInactive = !lastActivityAt || lastActivityAt < yesterday;
      const agentName = `${agent.firstName ?? ""} ${agent.lastName ?? ""}`.trim() || agent.username;
      return { agentId: agent.id, agentName, todayActions, weekActions, todayCalls, todayWhatsapp, todayMeetings, todayNotes, isInactive, lastActivityAt };
    }).sort((a, b) => b.todayActions - a.todayActions);
  }

  async getColdLeadsReport(companyId?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    leadPhone: string | null;
    agentId: string | null;
    agentName: string | null;
    lastContactDate: Date | null;
    daysSinceContact: number;
    stateId: string | null;
    stateName: string | null;
  }[]> {
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId))
      : await db.select().from(leads);
    const allUsers = companyId
      ? await db.select().from(users).where(eq(users.companyId, companyId))
      : await db.select().from(users);
    const allStates = companyId
      ? await db.select().from(leadStates).where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId)))
      : await db.select().from(leadStates);

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username]));
    const stateMap = new Map(allStates.map(s => [s.id, s.name]));

    const coldLeads = allLeads.filter(l => {
      const lastContact = l.lastActionDate ? new Date(l.lastActionDate) : (l.createdAt ? new Date(l.createdAt) : null);
      return !lastContact || lastContact < threeDaysAgo;
    });

    return coldLeads.map(l => {
      const lastContactDate = l.lastActionDate ? new Date(l.lastActionDate) : (l.createdAt ? new Date(l.createdAt) : null);
      const daysSinceContact = lastContactDate
        ? Math.floor((now.getTime() - lastContactDate.getTime()) / (24 * 60 * 60 * 1000))
        : 999;
      const agentName = l.assignedTo ? (userMap.get(l.assignedTo) ?? null) : null;
      const stateName = l.stateId ? (stateMap.get(l.stateId) ?? null) : null;
      return {
        leadId: l.id,
        leadName: l.name,
        leadPhone: l.phone,
        agentId: l.assignedTo,
        agentName,
        lastContactDate,
        daysSinceContact,
        stateId: l.stateId,
        stateName,
      };
    }).sort((a, b) => b.daysSinceContact - a.daysSinceContact);
  }

  async getProjectPerformanceReport(companyId?: string | null): Promise<{
    projectId: string;
    projectName: string;
    totalLeads: number;
    bookingsCount: number;
    conversionRate: number;
    avgDaysToClose: number | null;
  }[]> {
    const allProjects = companyId
      ? await db.select().from(projects).where(and(eq(projects.isActive, true), eq(projects.companyId, companyId)))
      : await db.select().from(projects).where(eq(projects.isActive, true));
    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId))
      : await db.select().from(leads);
    const allStates = companyId
      ? await db.select().from(leadStates).where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId)))
      : await db.select().from(leadStates);

    const bookingStates = new Set(
      allStates.filter(s => s.name.toLowerCase().includes("done") || s.name.toLowerCase().includes("closed") || s.name.includes("صفقة") || s.name.includes("محجوز") || s.name.toLowerCase().includes("book") || s.name.toLowerCase().includes("reserved")).map(s => s.id)
    );

    return allProjects.map(proj => {
      const projLeads = allLeads.filter(l => l.preferredProject === proj.name || l.preferredProject === proj.id);
      const totalLeads = projLeads.length;
      const bookingsCount = projLeads.filter(l => l.stateId && bookingStates.has(l.stateId)).length;
      const conversionRate = totalLeads > 0 ? parseFloat(((bookingsCount / totalLeads) * 100).toFixed(1)) : 0;

      const closedLeads = projLeads.filter(l => l.stateId && bookingStates.has(l.stateId) && l.createdAt && l.updatedAt);
      const avgDaysToClose = closedLeads.length > 0
        ? parseFloat((closedLeads.reduce((sum, l) => {
            const diff = new Date(l.updatedAt!).getTime() - new Date(l.createdAt!).getTime();
            return sum + diff / (24 * 60 * 60 * 1000);
          }, 0) / closedLeads.length).toFixed(1))
        : null;

      return { projectId: proj.id, projectName: proj.name, totalLeads, bookingsCount, conversionRate, avgDaysToClose };
    }).sort((a, b) => b.totalLeads - a.totalLeads);
  }

  async getWeeklyMonthlyComparison(companyId?: string | null): Promise<{
    period: string;
    label: string;
    newLeads: number;
    meetings: number;
    bookings: number;
    totalActions: number;
  }[]> {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const allLeads = companyId
      ? await db.select().from(leads).where(eq(leads.companyId, companyId))
      : await db.select().from(leads);
    const allComms = companyId
      ? await db.select().from(communications).where(eq(communications.companyId, companyId))
      : await db.select().from(communications);
    const allStates = companyId
      ? await db.select().from(leadStates).where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId)))
      : await db.select().from(leadStates);
    const bookingStates = new Set(
      allStates.filter(s => s.name.toLowerCase().includes("done") || s.name.toLowerCase().includes("closed") || s.name.includes("صفقة") || s.name.includes("محجوز")).map(s => s.id)
    );

    const buildPeriod = (label: string, period: string, start: Date, end: Date) => {
      const periodLeads = allLeads.filter(l => l.createdAt && new Date(l.createdAt) >= start && new Date(l.createdAt) <= end);
      const periodComms = allComms.filter(c => c.createdAt && new Date(c.createdAt) >= start && new Date(c.createdAt) <= end);
      return {
        period,
        label,
        newLeads: periodLeads.length,
        meetings: periodComms.filter(c => c.type === "meeting").length,
        bookings: periodLeads.filter(l => l.stateId && bookingStates.has(l.stateId)).length,
        totalActions: periodComms.length,
      };
    };

    // Labels use period keys (frontend translates via i18n)
    return [
      buildPeriod("lastWeek", "lastWeek", lastWeekStart, lastWeekEnd),
      buildPeriod("thisWeek", "thisWeek", thisWeekStart, now),
      buildPeriod("lastMonth", "lastMonth", lastMonthStart, lastMonthEnd),
      buildPeriod("thisMonth", "thisMonth", thisMonthStart, now),
    ];
  }

  // ─── Funnel Health Analytics ────────────────────────────────────────────────

  async getFunnelOverview(companyId?: string | null): Promise<{
    stateId: string;
    stateName: string;
    stateColor: string;
    stateOrder: number;
    category: string;
    count: number;
  }[]> {
    const statesQuery = db.select().from(leadStates).orderBy(leadStates.order);
    const allStates = companyId
      ? await statesQuery.where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId)))
      : await statesQuery;
    const leadsQuery = db.select({ stateId: leads.stateId }).from(leads);
    const allLeads = companyId
      ? await leadsQuery.where(eq(leads.companyId, companyId))
      : await leadsQuery;

    const countMap: Record<string, number> = {};
    for (const s of allStates) countMap[s.id] = 0;
    for (const l of allLeads) {
      if (l.stateId && countMap[l.stateId] !== undefined) countMap[l.stateId]++;
    }

    return allStates.map(s => ({
      stateId: s.id,
      stateName: s.name,
      stateColor: s.color,
      stateOrder: s.order,
      category: s.category,
      count: countMap[s.id] ?? 0,
    }));
  }

  async getTimeInStage(companyId?: string | null): Promise<{
    stateId: string;
    stateName: string;
    stateColor: string;
    avgDays: number | null;
    minDays: number | null;
    maxDays: number | null;
    leadsCount: number;
  }[]> {
    const statesQuery = db.select().from(leadStates).orderBy(leadStates.order);
    const allStates = companyId
      ? await statesQuery.where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId)))
      : await statesQuery;
    const leadsQuery = db.select({ stateId: leads.stateId, updatedAt: leads.updatedAt }).from(leads);
    const allLeads = companyId ? await leadsQuery.where(eq(leads.companyId, companyId)) : await leadsQuery;

    const now = new Date();

    return allStates.map(state => {
      const stateLeads = allLeads.filter(l => l.stateId === state.id && l.updatedAt);
      if (stateLeads.length === 0) {
        return { stateId: state.id, stateName: state.name, stateColor: state.color, avgDays: null, minDays: null, maxDays: null, leadsCount: 0 };
      }
      const days = stateLeads.map(l => Math.floor((now.getTime() - new Date(l.updatedAt!).getTime()) / (1000 * 60 * 60 * 24)));
      const avgDays = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
      const minDays = Math.min(...days);
      const maxDays = Math.max(...days);
      return { stateId: state.id, stateName: state.name, stateColor: state.color, avgDays, minDays, maxDays, leadsCount: stateLeads.length };
    });
  }

  async getStaleLeads(thresholds: Record<string, number>, companyId?: string | null): Promise<{
    leadId: string;
    leadName: string | null;
    leadPhone: string | null;
    agentId: string | null;
    agentName: string | null;
    stateId: string;
    stateName: string;
    daysInState: number;
    threshold: number;
  }[]> {
    const leadsQ = db.select().from(leads);
    const allLeads = companyId ? await leadsQ.where(eq(leads.companyId, companyId)) : await leadsQ;
    const usersQ = db.select().from(users);
    const allUsers = companyId ? await usersQ.where(eq(users.companyId, companyId)) : await usersQ;
    const statesQ = db.select().from(leadStates);
    const allStates = companyId
      ? await statesQ.where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId)))
      : await statesQ;

    const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username]));
    const stateMap = new Map(allStates.map(s => [s.id, s.name]));

    const now = new Date();
    const result: {
      leadId: string;
      leadName: string | null;
      leadPhone: string | null;
      agentId: string | null;
      agentName: string | null;
      stateId: string;
      stateName: string;
      daysInState: number;
      threshold: number;
    }[] = [];

    for (const lead of allLeads) {
      if (!lead.stateId) continue;
      const threshold = thresholds[lead.stateId] ?? 7;
      const updatedAt = lead.updatedAt ? new Date(lead.updatedAt) : (lead.createdAt ? new Date(lead.createdAt) : null);
      if (!updatedAt) continue;
      const daysInState = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysInState >= threshold) {
        result.push({
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          agentId: lead.assignedTo,
          agentName: lead.assignedTo ? (userMap.get(lead.assignedTo) ?? null) : null,
          stateId: lead.stateId,
          stateName: stateMap.get(lead.stateId) ?? "—",
          daysInState,
          threshold,
        });
      }
    }

    return result.sort((a, b) => b.daysInState - a.daysInState);
  }

  async getAgentFunnelPerformance(companyId?: string | null): Promise<{
    agentId: string;
    agentName: string;
    totalLeads: number;
    doneDeals: number;
    conversionRate: number;
    avgResponseMinutes: number | null;
    leadsByState: { stateId: string; stateName: string; count: number }[];
  }[]> {
    const usersQ = db.select().from(users);
    const allUsers = companyId ? await usersQ.where(eq(users.companyId, companyId)) : await usersQ;
    const leadsQ = db.select().from(leads);
    const allLeads = companyId ? await leadsQ.where(eq(leads.companyId, companyId)) : await leadsQ;
    const statesQ = db.select().from(leadStates).orderBy(leadStates.order);
    const allStates = companyId
      ? await statesQ.where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId)))
      : await statesQ;

    const agents = allUsers.filter(u => u.role === "sales_agent" || u.role === "team_leader");
    const doneStateIds = new Set(
      allStates.filter(s => s.category === "won").map(s => s.id)
    );
    const stateMap = new Map(allStates.map(s => [s.id, s.name]));

    return agents.map(agent => {
      const agentLeads = allLeads.filter(l => l.assignedTo === agent.id || l.assignedTo === agent.username);
      const doneDeals = agentLeads.filter(l => l.stateId && doneStateIds.has(l.stateId)).length;
      const conversionRate = agentLeads.length > 0 ? parseFloat(((doneDeals / agentLeads.length) * 100).toFixed(1)) : 0;

      const responseTimes = agentLeads.filter(l => l.responseTimeMinutes !== null && l.responseTimeMinutes !== undefined).map(l => l.responseTimeMinutes!);
      const avgResponseMinutes = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;

      const leadsByState: { stateId: string; stateName: string; count: number }[] = [];
      for (const state of allStates) {
        const count = agentLeads.filter(l => l.stateId === state.id).length;
        if (count > 0) {
          leadsByState.push({ stateId: state.id, stateName: state.name, count });
        }
      }

      const agentName = `${agent.firstName ?? ""} ${agent.lastName ?? ""}`.trim() || agent.username;
      return { agentId: agent.id, agentName, totalLeads: agentLeads.length, doneDeals, conversionRate, avgResponseMinutes, leadsByState };
    }).sort((a, b) => b.doneDeals - a.doneDeals);
  }

  async getLeadFlow(companyId?: string | null): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    closedToday: number;
    closedThisWeek: number;
    closedThisMonth: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const leadsQ = db.select().from(leads);
    const allLeads = companyId ? await leadsQ.where(eq(leads.companyId, companyId)) : await leadsQ;
    const statesQ = db.select().from(leadStates);
    const allStates = companyId
      ? await statesQ.where(or(eq(leadStates.companyId, companyId), isNull(leadStates.companyId)))
      : await statesQ;
    const closedStateIds = new Set(allStates.filter(s => s.category === "won" || s.category === "lost").map(s => s.id));

    const inRange = (date: Date | null | undefined, start: Date) => date && date >= start;

    return {
      today: allLeads.filter(l => inRange(l.createdAt ? new Date(l.createdAt) : null, todayStart)).length,
      thisWeek: allLeads.filter(l => inRange(l.createdAt ? new Date(l.createdAt) : null, weekStart)).length,
      thisMonth: allLeads.filter(l => inRange(l.createdAt ? new Date(l.createdAt) : null, monthStart)).length,
      closedToday: allLeads.filter(l => l.stateId && closedStateIds.has(l.stateId) && inRange(l.updatedAt ? new Date(l.updatedAt) : null, todayStart)).length,
      closedThisWeek: allLeads.filter(l => l.stateId && closedStateIds.has(l.stateId) && inRange(l.updatedAt ? new Date(l.updatedAt) : null, weekStart)).length,
      closedThisMonth: allLeads.filter(l => l.stateId && closedStateIds.has(l.stateId) && inRange(l.updatedAt ? new Date(l.updatedAt) : null, monthStart)).length,
    };
  }

  async getAllStaleLeadSettings(companyId?: string | null): Promise<{ stateId: string; staleDays: number }[]> {
    const q = db.select().from(staleLeadSettings);
    const rows = companyId ? await q.where(eq(staleLeadSettings.companyId, companyId)) : await q;
    return rows.map(r => ({ stateId: r.stateId, staleDays: r.staleDays }));
  }

  async upsertStaleLeadSetting(stateId: string, staleDays: number, companyId?: string | null): Promise<void> {
    // Use SELECT-then-UPDATE/INSERT pattern because the unique constraint uses
    // COALESCE(company_id,'') which cannot be expressed as an ON CONFLICT target.
    const existing = companyId
      ? await db.select().from(staleLeadSettings)
          .where(and(eq(staleLeadSettings.stateId, stateId), eq(staleLeadSettings.companyId, companyId)))
          .limit(1)
      : await db.select().from(staleLeadSettings)
          .where(and(eq(staleLeadSettings.stateId, stateId), isNull(staleLeadSettings.companyId)))
          .limit(1);

    if (existing.length > 0) {
      await db.update(staleLeadSettings)
        .set({ staleDays, updatedAt: new Date() })
        .where(eq(staleLeadSettings.id, existing[0].id));
    } else {
      await db.insert(staleLeadSettings)
        .values({ stateId, staleDays, ...(companyId ? { companyId } : {}) });
    }
  }

  async getIntegrationSettings(companyId?: string | null): Promise<IntegrationSettings | undefined> {
    if (companyId) {
      // Strict tenant scope: return only this company's row; never fall back to
      // another tenant's secrets to prevent cross-tenant credential leakage.
      const [row] = await db.select().from(integrationSettings).where(eq(integrationSettings.companyId, companyId)).limit(1);
      return row;
    }
    // Legacy/global path: return the id=1 row for backward-compatible callers
    // (e.g., scoring, ai.ts) that have no company context yet.
    const [row] = await db.select().from(integrationSettings).where(eq(integrationSettings.id, 1)).limit(1);
    return row;
  }

  async getIntegrationSettingsByPhoneNumberId(phoneNumberId: string): Promise<IntegrationSettings | undefined> {
    const [row] = await db.select().from(integrationSettings)
      .where(eq(integrationSettings.whatsappPhoneNumberId, phoneNumberId))
      .limit(1);
    return row;
  }

  async upsertIntegrationSettings(data: UpdateIntegrationSettings, companyId?: string | null): Promise<IntegrationSettings> {
    // Find existing row by companyId if provided, else use id=1 legacy row
    const existing = companyId
      ? await db.select().from(integrationSettings).where(eq(integrationSettings.companyId, companyId)).limit(1)
      : await db.select().from(integrationSettings).where(eq(integrationSettings.id, 1)).limit(1);
    if (existing.length > 0) {
      const [row] = await db.update(integrationSettings)
        .set({ ...data, companyId: companyId ?? existing[0].companyId, updatedAt: new Date() })
        .where(eq(integrationSettings.id, existing[0].id))
        .returning();
      return row;
    } else {
      // Insert new row for this company with next available id
      const [maxRow] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(integrationSettings);
      const nextId = (maxRow?.maxId ?? 0) + 1;
      const [row] = await db.insert(integrationSettings)
        .values({ id: nextId, ...data, companyId: companyId ?? null, updatedAt: new Date() })
        .returning();
      return row;
    }
  }

  async getAllKnowledgeBaseItems(companyId?: string | null): Promise<KnowledgeBaseItem[]> {
    return companyId
      ? db.select().from(knowledgeBase).where(eq(knowledgeBase.companyId, companyId))
      : db.select().from(knowledgeBase);
  }

  async getKnowledgeBaseItem(id: string): Promise<KnowledgeBaseItem | undefined> {
    const [row] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
    return row;
  }

  async createKnowledgeBaseItem(data: InsertKnowledgeBase, companyId?: string | null): Promise<KnowledgeBaseItem> {
    const [row] = await db.insert(knowledgeBase).values({ ...data, companyId: companyId ?? data.companyId ?? null }).returning();
    return row;
  }

  async updateKnowledgeBaseItem(id: string, data: UpdateKnowledgeBase, companyId?: string | null): Promise<KnowledgeBaseItem | undefined> {
    const existing = await this.getKnowledgeBaseItem(id);
    if (!existing) return undefined;
    if (companyId && existing.companyId !== companyId) return undefined;
    const [row] = await db.update(knowledgeBase).set({ ...data, updatedAt: new Date() }).where(eq(knowledgeBase.id, id)).returning();
    return row;
  }

  async deleteKnowledgeBaseItem(id: string, companyId?: string | null): Promise<boolean> {
    const existing = await this.getKnowledgeBaseItem(id);
    if (!existing) return false;
    if (companyId && existing.companyId !== companyId) return false;
    const [row] = await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id)).returning();
    return !!row;
  }

  // ─── Subscription Plans ──────────────────────────────────────────────────────
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans).orderBy(subscriptionPlans.sortOrder);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [row] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return row;
  }

  async createSubscriptionPlan(data: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [row] = await db.insert(subscriptionPlans).values(data).returning();
    return row;
  }

  async updateSubscriptionPlan(id: string, data: UpdateSubscriptionPlan): Promise<SubscriptionPlan | undefined> {
    const [row] = await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning();
    return row;
  }

  async deleteSubscriptionPlan(id: string): Promise<boolean> {
    const [row] = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id)).returning();
    return !!row;
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────────
  async getSubscription(companyId: string): Promise<(Subscription & { plan: SubscriptionPlan }) | undefined> {
    const rows = await db
      .select()
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.companyId, companyId))
      .orderBy(subscriptions.createdAt)
      .limit(1);
    if (!rows.length) return undefined;
    return { ...rows[0].subscriptions, plan: rows[0].subscription_plans };
  }

  async createSubscription(data: InsertSubscription): Promise<Subscription> {
    const [row] = await db.insert(subscriptions).values(data).returning();
    return row;
  }

  async updateSubscription(id: string, data: UpdateSubscription): Promise<Subscription | undefined> {
    const [row] = await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.id, id)).returning();
    return row;
  }

  // ─── Usage Records ────────────────────────────────────────────────────────────
  async getCurrentUsage(companyId: string): Promise<UsageRecord | undefined> {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [row] = await db.select().from(usageRecords).where(
      and(eq(usageRecords.companyId, companyId), eq(usageRecords.month, month))
    );
    return row;
  }

  async incrementUsage(companyId: string, field: "leadsCount" | "messagesCount" | "usersCount" | "aiCallsCount"): Promise<void> {
    const month = new Date().toISOString().slice(0, 7);
    const colMap = {
      leadsCount: usageRecords.leadsCount,
      messagesCount: usageRecords.messagesCount,
      usersCount: usageRecords.usersCount,
      aiCallsCount: usageRecords.aiCallsCount,
    };
    const col = colMap[field];
    await db
      .insert(usageRecords)
      .values({ companyId, month, [field]: 1 })
      .onConflictDoUpdate({
        target: [usageRecords.companyId, usageRecords.month],
        set: { [field]: sql`${col} + 1` },
      });
  }

  async refreshUsersCount(companyId: string): Promise<void> {
    const month = new Date().toISOString().slice(0, 7);
    const allUsers = await db.select().from(users).where(eq(users.isActive, true));
    const count = allUsers.length;
    await db
      .insert(usageRecords)
      .values({ companyId, month, usersCount: count })
      .onConflictDoUpdate({
        target: [usageRecords.companyId, usageRecords.month],
        set: { usersCount: count },
      });
  }

  // ─── Invoices ────────────────────────────────────────────────────────────────
  async getInvoices(companyId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.companyId, companyId)).orderBy(invoices.createdAt);
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const [row] = await db.insert(invoices).values(data).returning();
    return row;
  }

  // Platform Admin - Plans
  async getAllPlans(activeOnly?: boolean): Promise<Plan[]> {
    if (activeOnly) {
      return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.priceMonthly);
    }
    return db.select().from(plans).orderBy(plans.priceMonthly);
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const [row] = await db.select().from(plans).where(eq(plans.id, id));
    return row;
  }

  async createPlan(data: InsertPlan): Promise<Plan> {
    const [row] = await db.insert(plans).values(data).returning();
    return row;
  }

  async updatePlan(id: string, data: UpdatePlan): Promise<Plan | undefined> {
    const [row] = await db.update(plans).set({ ...data, updatedAt: new Date() }).where(eq(plans.id, id)).returning();
    return row;
  }

  async deletePlan(id: string): Promise<boolean> {
    const [row] = await db.delete(plans).where(eq(plans.id, id)).returning();
    return !!row;
  }

  // Platform Admin - Tickets
  async getAllTickets(filters?: { status?: string; priority?: string; companyId?: string }): Promise<Ticket[]> {
    let query = db.select().from(tickets).$dynamic();
    const conditions = [];
    if (filters?.status) conditions.push(eq(tickets.status, filters.status));
    if (filters?.priority) conditions.push(eq(tickets.priority, filters.priority));
    if (filters?.companyId) conditions.push(eq(tickets.companyId, filters.companyId));
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return query.orderBy(sql`${tickets.createdAt} DESC`);
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [row] = await db.select().from(tickets).where(eq(tickets.id, id));
    return row;
  }

  async createTicket(data: InsertTicket): Promise<Ticket> {
    const [row] = await db.insert(tickets).values(data).returning();
    return row;
  }

  async updateTicket(id: string, data: UpdateTicket): Promise<Ticket | undefined> {
    const [row] = await db.update(tickets).set({ ...data, updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    return row;
  }

  async getTicketReplies(ticketId: string): Promise<TicketReply[]> {
    return db.select().from(ticketReplies).where(eq(ticketReplies.ticketId, ticketId)).orderBy(ticketReplies.createdAt);
  }

  async createTicketReply(data: InsertTicketReply): Promise<TicketReply> {
    const [row] = await db.insert(ticketReplies).values(data).returning();
    return row;
  }

  // Platform Admin - Platform Notifications
  async getAllPlatformNotifications(unreadOnly?: boolean): Promise<PlatformNotification[]> {
    if (unreadOnly) {
      return db.select().from(platformNotifications).where(eq(platformNotifications.isRead, false)).orderBy(sql`${platformNotifications.createdAt} DESC`);
    }
    return db.select().from(platformNotifications).orderBy(sql`${platformNotifications.createdAt} DESC`);
  }

  async createPlatformNotification(data: InsertPlatformNotification): Promise<PlatformNotification> {
    const [row] = await db.insert(platformNotifications).values(data).returning();
    return row;
  }

  async markPlatformNotificationRead(id: string): Promise<PlatformNotification | undefined> {
    const [row] = await db.update(platformNotifications).set({ isRead: true }).where(eq(platformNotifications.id, id)).returning();
    return row;
  }

  async markAllPlatformNotificationsRead(): Promise<void> {
    await db.update(platformNotifications).set({ isRead: true }).where(eq(platformNotifications.isRead, false));
  }

  async getUnreadPlatformNotificationCount(): Promise<number> {
    const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(platformNotifications).where(eq(platformNotifications.isRead, false));
    return row?.count ?? 0;
  }

  // Platform Admin - Stats & Analytics
  async getPlatformStats(): Promise<{
    totalActiveCompanies: number;
    totalTrialCompanies: number;
    totalSuspendedCompanies: number;
    newRegistrationsThisMonth: number;
    openTickets: number;
    renewalsNext30Days: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const [activeRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(companies).where(eq(companies.status, "active"));
    const [trialRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(companies).where(eq(companies.status, "trial"));
    const [suspendedRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(companies).where(eq(companies.status, "suspended"));
    const [newRegRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(companies).where(gte(companies.createdAt, startOfMonth));
    const [openTicketsRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(tickets).where(eq(tickets.status, "open"));
    const [renewalsRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(subscriptions)
      .where(and(
        eq(subscriptions.status, "active"),
        gte(subscriptions.currentPeriodEnd, now),
        lte(subscriptions.currentPeriodEnd, in30Days),
      ));

    return {
      totalActiveCompanies: activeRow?.count ?? 0,
      totalTrialCompanies: trialRow?.count ?? 0,
      totalSuspendedCompanies: suspendedRow?.count ?? 0,
      newRegistrationsThisMonth: newRegRow?.count ?? 0,
      openTickets: openTicketsRow?.count ?? 0,
      renewalsNext30Days: renewalsRow?.count ?? 0,
    };
  }

  async getPlatformCompanies(filters?: { status?: string; planId?: string }): Promise<(typeof companies.$inferSelect & { usersCount: number; leadsCount: number })[]> {
    const allCompanies = await db.select().from(companies).orderBy(sql`${companies.createdAt} DESC`);
    const result = [];
    for (const company of allCompanies) {
      if (filters?.status && company.status !== filters.status) continue;
      if (filters?.planId && company.planId !== filters.planId) continue;
      const [usersRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.companyId, company.id));
      const [leadsRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(leads).where(eq(leads.companyId, company.id));
      result.push({ ...company, usersCount: usersRow?.count ?? 0, leadsCount: leadsRow?.count ?? 0 });
    }
    return result;
  }

  async getPlatformCompanyDetail(id: string): Promise<(typeof companies.$inferSelect & { users: (typeof users.$inferSelect)[]; subscription: (Subscription & { plan: SubscriptionPlan | null }) | null }) | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    if (!company) return undefined;
    const companyUsers = await db.select().from(users).where(eq(users.companyId, id));
    const subRows = await db.select().from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.companyId, id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    const subscription = subRows.length > 0
      ? { ...subRows[0].subscriptions, plan: subRows[0].subscription_plans ?? null }
      : null;
    return { ...company, users: companyUsers, subscription };
  }

  async getCompanyInvoices(companyId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.companyId, companyId)).orderBy(desc(invoices.createdAt));
  }

  async createCompanyInvoice(data: InsertInvoice): Promise<Invoice> {
    const [row] = await db.insert(invoices).values(data).returning();
    return row;
  }

  // ─── Platform Leads ──────────────────────────────────────────────────────────
  async getAllPlatformLeads(): Promise<PlatformLead[]> {
    return db.select().from(platformLeads).orderBy(platformLeads.createdAt);
  }

  async getPlatformLead(id: string): Promise<PlatformLead | undefined> {
    const [row] = await db.select().from(platformLeads).where(eq(platformLeads.id, id));
    return row;
  }

  async createPlatformLead(data: InsertPlatformLead): Promise<PlatformLead> {
    const [row] = await db.insert(platformLeads).values(data).returning();
    await db.insert(platformLeadHistory).values({
      platformLeadId: row.id,
      action: "created",
      description: `تم إضافة الليد: ${row.companyName}`,
    });
    return row;
  }

  async updatePlatformLead(id: string, data: UpdatePlatformLead, performedBy?: string): Promise<PlatformLead | undefined> {
    const existing = await this.getPlatformLead(id);
    if (!existing) return undefined;
    const [row] = await db.update(platformLeads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(platformLeads.id, id))
      .returning();
    if (!row) return undefined;
    if (data.stage && data.stage !== existing.stage) {
      await db.insert(platformLeadHistory).values({
        platformLeadId: id,
        action: "stage_change",
        description: `تغيير المرحلة`,
        performedBy,
        fromStage: existing.stage,
        toStage: data.stage,
      });
    } else {
      await db.insert(platformLeadHistory).values({
        platformLeadId: id,
        action: "updated",
        description: "تم تحديث بيانات الليد",
        performedBy,
      });
    }
    return row;
  }

  async deletePlatformLead(id: string): Promise<boolean> {
    const result = await db.delete(platformLeads).where(eq(platformLeads.id, id)).returning();
    return result.length > 0;
  }

  async getPlatformLeadHistory(platformLeadId: string): Promise<PlatformLeadHistory[]> {
    return db.select().from(platformLeadHistory)
      .where(eq(platformLeadHistory.platformLeadId, platformLeadId))
      .orderBy(platformLeadHistory.createdAt);
  }

  async createPlatformLeadHistory(data: InsertPlatformLeadHistory): Promise<PlatformLeadHistory> {
    const [row] = await db.insert(platformLeadHistory).values(data).returning();
    return row;
  }

  async getPlatformSalesKPIs(): Promise<{ leadsThisMonth: number; demosScheduled: number; conversionRate: number; pipelineValue: number }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const allLeads = await db.select().from(platformLeads);
    const leadsThisMonth = allLeads.filter(l => l.createdAt && new Date(l.createdAt) >= monthStart).length;
    const demosScheduled = allLeads.filter(l => l.stage === "demo_scheduled" || l.stage === "demo_done").length;
    const wonLeads = allLeads.filter(l => l.stage === "won").length;
    const totalClosed = allLeads.filter(l => l.stage === "won" || l.stage === "lost").length;
    const conversionRate = totalClosed > 0 ? Math.round((wonLeads / totalClosed) * 100) : 0;
    const pipelineValue = allLeads
      .filter(l => !["won", "lost"].includes(l.stage))
      .reduce((sum, l) => sum + (l.dealValue ?? 0), 0);
    return { leadsThisMonth, demosScheduled, conversionRate, pipelineValue };
  }

  // Blog / CMS
  async getAllArticleCategories(): Promise<ArticleCategory[]> {
    return db.select().from(articleCategories).orderBy(asc(articleCategories.name));
  }

  async getArticleCategory(id: string): Promise<ArticleCategory | undefined> {
    const [cat] = await db.select().from(articleCategories).where(eq(articleCategories.id, id));
    return cat;
  }

  async getArticleCategoryBySlug(slug: string): Promise<ArticleCategory | undefined> {
    const [cat] = await db.select().from(articleCategories).where(eq(articleCategories.slug, slug));
    return cat;
  }

  async createArticleCategory(data: InsertArticleCategory): Promise<ArticleCategory> {
    const [cat] = await db.insert(articleCategories).values(data).returning();
    return cat;
  }

  async updateArticleCategory(id: string, data: UpdateArticleCategory): Promise<ArticleCategory | undefined> {
    const [cat] = await db.update(articleCategories).set(data).where(eq(articleCategories.id, id)).returning();
    return cat;
  }

  async deleteArticleCategory(id: string): Promise<boolean> {
    const result = await db.delete(articleCategories).where(eq(articleCategories.id, id)).returning();
    return result.length > 0;
  }

  async getAllArticles(filters?: { status?: string; categoryId?: string; search?: string; page?: number; limit?: number }): Promise<{ articles: Article[]; total: number }> {
    const conditions = [];
    if (filters?.status) conditions.push(eq(articles.status, filters.status));
    if (filters?.categoryId) conditions.push(eq(articles.categoryId, filters.categoryId));
    if (filters?.search) conditions.push(ilike(articles.title, `%${filters.search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const [{ total }] = await db.select({ total: count() }).from(articles).where(where);
    const rows = await db.select().from(articles).where(where).orderBy(desc(articles.createdAt)).limit(limit).offset(offset);
    return { articles: rows, total };
  }

  async getArticle(id: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article;
  }

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
    return article;
  }

  async createArticle(data: InsertArticle): Promise<Article> {
    const [article] = await db.insert(articles).values(data).returning();
    return article;
  }

  async updateArticle(id: string, data: UpdateArticle): Promise<Article | undefined> {
    const [article] = await db.update(articles).set({ ...data, updatedAt: new Date() }).where(eq(articles.id, id)).returning();
    return article;
  }

  async deleteArticle(id: string): Promise<boolean> {
    const result = await db.delete(articles).where(eq(articles.id, id)).returning();
    return result.length > 0;
  }

  async getPublishedArticles(filters?: { categorySlug?: string; search?: string; page?: number; limit?: number }): Promise<{ articles: (Article & { category: ArticleCategory | null })[]; total: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const offset = (page - 1) * limit;

    let categoryId: string | undefined;
    if (filters?.categorySlug) {
      const cat = await this.getArticleCategoryBySlug(filters.categorySlug);
      categoryId = cat?.id;
    }

    const conditions = [eq(articles.status, "published")];
    if (categoryId) conditions.push(eq(articles.categoryId, categoryId));
    if (filters?.search) conditions.push(ilike(articles.title, `%${filters.search}%`));

    const where = and(...conditions);

    const [{ total }] = await db.select({ total: count() }).from(articles).where(where);
    const rows = await db.select().from(articles).where(where).orderBy(desc(articles.publishedAt)).limit(limit).offset(offset);

    const allCategories = await this.getAllArticleCategories();
    const catMap = Object.fromEntries(allCategories.map(c => [c.id, c]));

    const result = rows.map(a => ({
      ...a,
      category: a.categoryId ? (catMap[a.categoryId] ?? null) : null,
    }));
    return { articles: result, total };
  }

  async getRelatedArticles(articleId: string, categoryId?: string | null, limit = 3): Promise<Article[]> {
    const conditions = [eq(articles.status, "published"), ne(articles.id, articleId)];
    if (categoryId) conditions.push(eq(articles.categoryId, categoryId));
    return db.select().from(articles).where(and(...conditions)).orderBy(desc(articles.publishedAt)).limit(limit);
  }

  // Products (E-commerce)
  async getAllProducts(companyId?: string | null): Promise<Product[]> {
    if (companyId) {
      return db.select().from(products).where(eq(products.companyId, companyId)).orderBy(desc(products.createdAt));
    }
    return db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(data: InsertProduct, companyId?: string | null): Promise<Product> {
    const [product] = await db.insert(products).values({ ...data, companyId: companyId ?? data.companyId ?? null }).returning();
    return product;
  }

  async updateProduct(id: string, data: UpdateProduct, companyId?: string | null): Promise<Product | undefined> {
    const conditions = [eq(products.id, id)];
    if (companyId) conditions.push(eq(products.companyId, companyId));
    const [product] = await db.update(products).set({ ...data, updatedAt: new Date() }).where(and(...conditions)).returning();
    return product;
  }

  async deleteProduct(id: string, companyId?: string | null): Promise<boolean> {
    const conditions = [eq(products.id, id)];
    if (companyId) conditions.push(eq(products.companyId, companyId));
    const result = await db.delete(products).where(and(...conditions)).returning();
    return result.length > 0;
  }

  // Orders (E-commerce)
  async getAllOrders(companyId?: string | null): Promise<Order[]> {
    if (companyId) {
      return db.select().from(orders).where(eq(orders.companyId, companyId)).orderBy(desc(orders.createdAt));
    }
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(data: InsertOrder, companyId?: string | null): Promise<Order> {
    const [order] = await db.insert(orders).values({ ...data, companyId: companyId ?? data.companyId ?? null }).returning();
    return order;
  }

  async updateOrder(id: string, data: UpdateOrder, companyId?: string | null): Promise<Order | undefined> {
    const conditions = [eq(orders.id, id)];
    if (companyId) conditions.push(eq(orders.companyId, companyId));
    const [order] = await db.update(orders).set({ ...data, updatedAt: new Date() }).where(and(...conditions)).returning();
    return order;
  }
}

export const storage = new DatabaseStorage();
