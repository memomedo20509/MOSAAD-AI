import type { Express } from "express";
import type { BotStage } from "./ai";
import { createServer, type Server } from "http";
import { addSseClient, removeSseClient, broadcastToUser, broadcastToAll } from "./sse";
import path from "path";
import fs from "fs";
import multer from "multer";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, requireRole, requirePermission } from "./auth";
import { hashPassword } from "./auth";
import { updateScoringConfig } from "./scoring";
import {
  startConnection,
  disconnectSession,
  getSessionStatus,
  sendWhatsAppMessage,
  restoreSessionsOnStartup,
  setIncomingMessageHandler,
  onLidResolved,
  type IncomingWAMessage,
} from "./whatsapp";
import { 
  insertLeadSchema, 
  insertLeadStateSchema, 
  insertClientSchema, 
  insertTaskSchema,
  updateLeadSchema,
  updateLeadStateSchema,
  updateTaskSchema,
  insertTeamSchema,
  updateTeamSchema,
  updateUserSchema,
  insertUserSchema,
  insertDeveloperSchema,
  updateDeveloperSchema,
  insertProjectSchema,
  updateProjectSchema,
  insertUnitSchema,
  updateUnitSchema,
  insertLeadUnitInterestSchema,
  insertCommunicationSchema,
  insertReminderSchema,
  updateReminderSchema,
  insertCommissionSchema,
  updateCommissionSchema,
  insertCallLogSchema,
  insertWhatsappTemplateSchema,
  updateWhatsappTemplateSchema,
  insertLeadManagerCommentSchema,
  updateLeadManagerCommentSchema,
  insertEmailReportSettingsSchema,
  insertMonthlyTargetSchema,
  insertWhatsappCampaignSchema,
  insertWhatsappFollowupRuleSchema,
  insertKnowledgeBaseSchema,
  updateKnowledgeBaseSchema,
  type Lead,
  type InsertLead,
} from "@shared/schema";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Memory-storage multer for Excel/CSV imports (needs buffer access)
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup username/password authentication
  setupAuth(app);
  registerAuthRoutes(app);

  // Teams endpoints (admin only for mutations, all authenticated can view)
  app.get("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", isAuthenticated, requirePermission("canManageTeams"), async (req, res) => {
    try {
      const data = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(data);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(400).json({ error: "Failed to create team" });
    }
  });

  app.patch("/api/teams/:id", isAuthenticated, requirePermission("canManageTeams"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = updateTeamSchema.parse(req.body);
      const team = await storage.updateTeam(id, data);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(400).json({ error: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteTeam(id);
      if (!deleted) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  // Users list - all authenticated users can read (for agent filters, etc.)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(({ password: _, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, requirePermission("canManageUsers"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = updateUserSchema.parse(req.body);
      const requestingUserRole = req.user?.role;
      const privilegedRoles = ["super_admin", "company_owner"];
      if (requestingUserRole !== "super_admin" && data.role && privilegedRoles.includes(data.role)) {
        return res.status(403).json({ error: "Insufficient permissions to assign this role" });
      }
      if (data.password) {
        data.password = await hashPassword(data.password);
      }
      const user = await storage.updateUser(id, data);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  app.post("/api/users", isAuthenticated, requirePermission("canManageUsers"), async (req, res) => {
    try {
      const { username, password, email, firstName, lastName, phone, role, teamId, isActive } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      const requestingUserRole = req.user?.role;
      const privilegedRoles = ["super_admin", "company_owner"];
      if (requestingUserRole !== "super_admin" && role && privilegedRoles.includes(role)) {
        return res.status(403).json({ error: "Insufficient permissions to assign this role" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        role: role || "sales_agent",
        teamId: teamId || null,
        isActive: isActive !== undefined ? isActive : true,
      });
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ error: "Failed to create user" });
    }
  });

  // Lead States
  app.get("/api/states", async (req, res) => {
    try {
      const states = await storage.getAllStates();
      res.json(states);
    } catch (error) {
      console.error("Error fetching states:", error);
      res.status(500).json({ error: "Failed to fetch states" });
    }
  });

  // Map category to zone number deterministically
  const categoryToZone: Record<string, number> = {
    untouched: 1,
    active: 2,
    won: 3,
    lost: 4,
  };

  app.post("/api/states", isAuthenticated, requireRole("super_admin", "admin", "sales_admin", "company_owner"), async (req, res) => {
    try {
      const data = insertLeadStateSchema.parse(req.body);
      // Always derive zone from category to keep them in sync
      const zone = categoryToZone[data.category ?? "active"] ?? 2;
      const state = await storage.createState({ ...data, zone });
      res.status(201).json(state);
    } catch (error) {
      console.error("Error creating state:", error);
      res.status(400).json({ error: "Failed to create state" });
    }
  });

  app.patch("/api/states/:id", isAuthenticated, requireRole("super_admin", "admin", "sales_admin", "company_owner"), async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateLeadStateSchema.parse(req.body);
      // If category is being updated, sync zone automatically
      const zone = data.category ? (categoryToZone[data.category] ?? 2) : undefined;
      const state = await storage.updateState(id, zone !== undefined ? { ...data, zone } : data);
      if (!state) {
        return res.status(404).json({ error: "State not found" });
      }
      res.json(state);
    } catch (error) {
      console.error("Error updating state:", error);
      res.status(400).json({ error: "Failed to update state" });
    }
  });

  app.delete("/api/states/:id", isAuthenticated, requireRole("super_admin", "admin", "sales_admin", "company_owner"), async (req, res) => {
    try {
      const { id } = req.params;
      const state = await storage.getState(id);
      if (!state) {
        return res.status(404).json({ error: "State not found" });
      }
      if (state.isSystemState) {
        return res.status(403).json({ error: "لا يمكن حذف الحالات الأساسية للنظام" });
      }
      const deleted = await storage.deleteState(id);
      if (!deleted) {
        return res.status(404).json({ error: "State not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting state:", error);
      res.status(500).json({ error: "Failed to delete state" });
    }
  });

  // Leads
  app.get("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const role = user?.role ?? "sales_agent";
      const userId = user?.id ?? "";
      const teamId = user?.teamId ?? null;
      let leads;
      if (role === "sales_agent" || role === "team_leader") {
        leads = await storage.getLeadsByRole(userId, role, teamId, user?.username);
      } else {
        leads = await storage.getAllLeadsWithRefreshedScores();
      }
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const lead = await storage.refreshLeadScore(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      const allowed = await canAccessLead(req.user, id);
      if (!allowed) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const data = insertLeadSchema.parse(req.body);
      const user = req.user;
      const lead = await storage.createLead(data, user?.teamId ?? null);

      // Send notifications to admins/managers and assigned agent
      try {
        const allUsers = await storage.getAllUsers();
        const adminRoles = ["super_admin", "company_owner", "sales_admin", "admin", "team_leader", "sales_manager"];
        const leadName = lead.name || lead.phone || "ليد جديد";
        const message = `ليد جديد: ${leadName}`;
        const notifyUserIds = new Set<string>();

        // Add all admins/managers
        for (const u of allUsers) {
          if (u.role && adminRoles.includes(u.role)) {
            notifyUserIds.add(u.id);
          }
        }

        // Add assigned agent if any (and not already included)
        if (lead.assignedTo) {
          const assignedUser = allUsers.find(u => u.username === lead.assignedTo || u.id === lead.assignedTo);
          if (assignedUser) {
            notifyUserIds.add(assignedUser.id);
          }
        }

        // Don't notify the person who created the lead
        if (user?.id) {
          notifyUserIds.delete(user.id);
        }

        for (const userId of notifyUserIds) {
          await storage.createNotification({
            userId,
            type: "new_lead",
            message,
            leadId: lead.id,
            isRead: false,
          });
        }
      } catch (notifErr) {
        console.error("Error sending new lead notifications:", notifErr);
      }

      res.status(201).json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(400).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const allowed = await canAccessLead(req.user, id);
      if (!allowed) {
        return res.status(403).json({ error: "Access denied" });
      }
      const data = updateLeadSchema.parse(req.body);
      const user = req.user;
      const performedByName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username : undefined;

      // Transition rule enforcement when stateId is being changed
      if (data.stateId) {
        const currentLead = await storage.getLead(id);
        if (currentLead && currentLead.stateId && currentLead.stateId !== data.stateId) {
          const fromState = await storage.getState(currentLead.stateId);
          const toState = await storage.getState(data.stateId);
          const userRole = req.user?.role ?? "sales_agent";
          const isAdmin = ["super_admin", "admin", "company_owner", "sales_admin"].includes(userRole);

          if (fromState && toState) {
            const fromCategory = fromState.category ?? "active";
            const toCategory = toState.category ?? "active";
            const fromZone = fromState.zone ?? 0;
            const toZone = toState.zone ?? 0;

            const fromOrder = fromState.order ?? 0;
            const toOrder = toState.order ?? 0;

            if (!isAdmin) {
              // Rule 1: Cannot move back to Untouched zone once lead has left Untouched
              if (toCategory === "untouched" && fromCategory !== "untouched") {
                return res.status(403).json({
                  error: "لا يمكن إرجاع الليد لمرحلة 'غير متفاعل' بعد التعامل معه. فقط الأدمن يمكنه ذلك.",
                  code: "TRANSITION_BLOCKED"
                });
              }

              // Rule 2: Cannot move backwards across zones unless canGoBack is true on target
              if (toZone < fromZone && !toState.canGoBack) {
                return res.status(403).json({
                  error: `لا يمكن الرجوع لمرحلة "${toState.name}" من "${fromState.name}". هذا الانتقال غير مسموح.`,
                  code: "TRANSITION_BLOCKED"
                });
              }

              // Rule 3: From Won/Lost zones, cannot go backwards to Active or Untouched (won/lost are final for non-admins)
              if ((fromCategory === "won" || fromCategory === "lost") && 
                  (toCategory === "untouched" || toCategory === "active")) {
                return res.status(403).json({
                  error: `لا يمكن إرجاع الليد من مرحلة "${fromState.name}" لمرحلة "${toState.name}". هذا الانتقال يحتاج صلاحية أدمن.`,
                  code: "TRANSITION_BLOCKED"
                });
              }

              // Rule 4: Within the same zone, movement must be forward (ascending order) unless canGoBack on target
              if (toZone === fromZone && toOrder < fromOrder && !toState.canGoBack) {
                return res.status(403).json({
                  error: `لا يمكن الرجوع لمرحلة "${toState.name}" من "${fromState.name}" داخل نفس المنطقة.`,
                  code: "TRANSITION_BLOCKED"
                });
              }
            }
          }
        }
      }

      const lead = await storage.updateLead(id, data, performedByName);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(400).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, requirePermission("canDeleteData"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const leadBeforeDelete = await storage.getLead(id);
      const deleted = await storage.deleteLead(id);
      if (!deleted) {
        return res.status(404).json({ error: "Lead not found" });
      }
      console.log(`[Lead] Deleted lead ${id} (phone: ${leadBeforeDelete?.phone}, name: ${leadBeforeDelete?.name}) — all related data removed`);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Lead Transfer - controlled by dynamic canTransferLeads permission
  app.post("/api/leads/:id/transfer", isAuthenticated, requirePermission("canTransferLeads"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const { toUserId, showHistoryToNew, transferNote, resetState } = req.body;
      if (!toUserId) {
        return res.status(400).json({ error: "toUserId is required" });
      }
      const user = req.user;
      const performedByName = user
        ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username
        : "System";

      const currentLead = await storage.getLead(id);
      const fromUserId = currentLead?.assignedTo || null;
      let fromUserName: string | undefined;
      if (fromUserId) {
        const fromUser = await storage.getUser(fromUserId);
        if (fromUser) {
          fromUserName = `${fromUser.firstName ?? ""} ${fromUser.lastName ?? ""}`.trim() || fromUser.username;
        }
      }

      const lead = await storage.transferLead(id, toUserId, performedByName, {
        showHistoryToNew: showHistoryToNew !== false,
        transferNote: transferNote || undefined,
        resetState: resetState === true,
        fromUserId: fromUserId || undefined,
        fromUserName,
      });
      if (!lead) {
        return res.status(404).json({ error: "Lead or target user not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error transferring lead:", error);
      res.status(500).json({ error: "Failed to transfer lead" });
    }
  });

  // Lead Tasks
  app.get("/api/leads/:leadId/tasks", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const tasks = await storage.getTasksByLeadId(leadId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Lead History
  app.get("/api/leads/:leadId/history", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const history = await storage.getHistoryByLeadId(leadId);
      const userRole = req.user?.role || "";
      const isAdmin = ["super_admin", "company_owner", "admin", "sales_admin", "sales_manager", "team_leader"].includes(userRole);

      if (!isAdmin) {
        const lead = await storage.getLead(leadId);
        if (lead && lead.historyVisibleToAssigned === false) {
          const lastReassignIdx = [...history].reverse().findIndex((h) => h.action === "reassignment");
          if (lastReassignIdx !== -1) {
            const actualIdx = history.length - 1 - lastReassignIdx;
            const filtered = history.slice(actualIdx);
            return res.json(filtered);
          }
        }
      }

      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // All History (for actions log page)
  app.get("/api/history", isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getAllHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching all history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Reassignment Report
  app.get("/api/reports/reassignments", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager", "sales_admin"), async (req, res) => {
    try {
      const report = await storage.getReassignmentReport();
      res.json(report);
    } catch (error) {
      console.error("Error fetching reassignment report:", error);
      res.status(500).json({ error: "Failed to fetch reassignment report" });
    }
  });

  // Tasks
  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const data = insertTaskSchema.parse(req.body);
      if (data.leadId && !(await canAccessLead(req.user, data.leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const existing = await storage.getTask(id);
      if (existing?.leadId && !(await canAccessLead(req.user, existing.leadId as string))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const data = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(id, data);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const existing = await storage.getTask(id);
      if (existing?.leadId && !(await canAccessLead(req.user, existing.leadId as string))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const deleted = await storage.deleteTask(id);
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);

      // Auto-create commission record when a deal is closed
      try {
        const user = req.user;
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        // Default commission percent: configurable via environment or fallback to 2%
        const DEFAULT_COMMISSION_PERCENT = parseInt(process.env.DEFAULT_COMMISSION_PERCENT ?? "2", 10) || 2;
        let agentId = user?.id ?? "";
        let agentName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username : "";

        // Derive unit price from lead's budget or related unit interests
        let unitPrice = 0;
        if (data.leadId) {
          const lead = await storage.getLead(data.leadId);
          if (lead?.assignedTo) {
            agentId = lead.assignedTo;
            const agentUser = await storage.getUser(lead.assignedTo);
            if (agentUser) {
              agentName = `${agentUser.firstName ?? ""} ${agentUser.lastName ?? ""}`.trim() || agentUser.username;
            }
          }
          // Try to get unit price from lead unit interests
          const unitInterests = await storage.getLeadUnitInterests(lead?.id ?? "");
          if (unitInterests.length > 0) {
            const firstUnit = await storage.getUnit(unitInterests[0].unitId);
            if (firstUnit?.price) {
              unitPrice = firstUnit.price;
            }
          }
        }

        const commissionAmount = Math.round((unitPrice * DEFAULT_COMMISSION_PERCENT) / 100);

        await storage.createCommission({
          clientId: client.id,
          leadId: data.leadId ?? null,
          agentId,
          agentName,
          unitPrice,
          commissionPercent: DEFAULT_COMMISSION_PERCENT,
          commissionAmount,
          month,
          project: data.project ?? null,
          notes: null,
        });
      } catch (commErr) {
        console.error("Failed to auto-create commission for client", client.id, ":", commErr);
        // Note: commission creation failure does not roll back client creation,
        // but it is logged so admins can manually create the commission record.
      }

      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ error: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.updateClient(id, req.body);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(400).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteClient(id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // ==================== INVENTORY MANAGEMENT ====================

  // Developers
  app.get("/api/developers", isAuthenticated, async (req, res) => {
    try {
      const developers = await storage.getAllDevelopers();
      res.json(developers);
    } catch (error) {
      console.error("Error fetching developers:", error);
      res.status(500).json({ error: "Failed to fetch developers" });
    }
  });

  app.get("/api/developers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const developer = await storage.getDeveloper(id);
      if (!developer) {
        return res.status(404).json({ error: "Developer not found" });
      }
      res.json(developer);
    } catch (error) {
      console.error("Error fetching developer:", error);
      res.status(500).json({ error: "Failed to fetch developer" });
    }
  });

  app.post("/api/developers", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = insertDeveloperSchema.parse(req.body);
      const developer = await storage.createDeveloper(data);
      res.status(201).json(developer);
    } catch (error) {
      console.error("Error creating developer:", error);
      res.status(400).json({ error: "Failed to create developer" });
    }
  });

  app.patch("/api/developers/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = updateDeveloperSchema.parse(req.body);
      const developer = await storage.updateDeveloper(id, data);
      if (!developer) {
        return res.status(404).json({ error: "Developer not found" });
      }
      res.json(developer);
    } catch (error) {
      console.error("Error updating developer:", error);
      res.status(400).json({ error: "Failed to update developer" });
    }
  });

  app.delete("/api/developers/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteDeveloper(id);
      if (!deleted) {
        return res.status(404).json({ error: "Developer not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting developer:", error);
      res.status(500).json({ error: "Failed to delete developer" });
    }
  });

  // Projects
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/developers/:developerId/projects", isAuthenticated, async (req, res) => {
    try {
      const developerId = req.params.developerId as string;
      const projects = await storage.getProjectsByDeveloper(developerId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = updateProjectSchema.parse(req.body);
      const project = await storage.updateProject(id, data);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Sync project images from Nawy (admin only)
  app.post("/api/admin/sync-project-images", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      interface NawyCompound {
        images?: Array<{ id: number }>;
        coverImageUrl?: string;
        imageUrl?: string;
      }

      const allProjects = await storage.getAllProjects();
      const nawyUrlRegex = /🔗 المصدر: (https?:\/\/[^\n]+)/;

      let updated = 0;
      let failed = 0;
      let skipped = 0;

      for (const project of allProjects) {
        // Skip projects that already have images
        if (project.images && project.images.length > 0) {
          skipped++;
          continue;
        }
        // Extract Nawy URL from description
        const match = project.description ? project.description.match(nawyUrlRegex) : null;
        const rawUrl = match ? match[1].trim() : null;
        if (!rawUrl) {
          skipped++;
          continue;
        }

        // SSRF protection: only allow https://www.nawy.com/ar/compound/* or https://nawy.com/ar/compound/*
        let nawyUrl: string;
        try {
          const parsed = new URL(rawUrl);
          const validProtocol = parsed.protocol === "https:";
          const validHost = parsed.host === "www.nawy.com" || parsed.host === "nawy.com";
          const validPath = parsed.pathname.startsWith("/ar/compound/");
          if (!validProtocol || !validHost || !validPath) {
            console.warn(`[sync-images] Skipping invalid URL for project ${project.id}: ${rawUrl}`);
            skipped++;
            continue;
          }
          nawyUrl = parsed.href;
        } catch {
          console.warn(`[sync-images] Malformed URL for project ${project.id}: ${rawUrl}`);
          skipped++;
          continue;
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(nawyUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            console.warn(`[sync-images] HTTP ${response.status} for project ${project.id} (${nawyUrl})`);
            failed++;
            continue;
          }

          const html = await response.text();
          const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
          if (!nextDataMatch) {
            console.warn(`[sync-images] No __NEXT_DATA__ for project ${project.id}`);
            failed++;
            continue;
          }

          let compound: NawyCompound | null = null;
          try {
            const nextData = JSON.parse(nextDataMatch[1]) as { props?: { pageProps?: { compound?: NawyCompound } } };
            compound = nextData?.props?.pageProps?.compound ?? null;
          } catch {
            console.warn(`[sync-images] JSON parse error for project ${project.id}`);
            failed++;
            continue;
          }

          if (!compound) {
            console.warn(`[sync-images] No compound data for project ${project.id}`);
            failed++;
            continue;
          }

          const imageIds: number[] = [];
          if (Array.isArray(compound.images)) {
            for (const img of compound.images) {
              if (img?.id) imageIds.push(img.id);
            }
          }

          // Fallback: coverImageUrl or imageUrl as direct URL
          const imageUrls: string[] = imageIds.map(
            (id) => `https://prod-images.nawy.com/processed/compound_image/image/${id}/high.webp`
          );

          if (imageUrls.length === 0 && compound.coverImageUrl) {
            imageUrls.push(compound.coverImageUrl);
          }
          if (imageUrls.length === 0 && compound.imageUrl) {
            imageUrls.push(compound.imageUrl);
          }

          if (imageUrls.length === 0) {
            console.warn(`[sync-images] No images found for project ${project.id}`);
            failed++;
            continue;
          }

          await storage.updateProject(project.id, { images: imageUrls });
          console.log(`[sync-images] Updated project ${project.id} with ${imageUrls.length} images`);
          updated++;

          // Small delay between requests to avoid rate limiting
          await new Promise((r) => setTimeout(r, 500));
        } catch (fetchErr: unknown) {
          if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
            console.warn(`[sync-images] Timeout for project ${project.id}`);
          } else {
            const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            console.warn(`[sync-images] Fetch error for project ${project.id}:`, msg);
          }
          failed++;
        }
      }

      res.json({ updated, failed, skipped });
    } catch (error) {
      console.error("Error syncing project images:", error);
      res.status(500).json({ error: "Failed to sync project images" });
    }
  });

  // Units
  app.get("/api/units", isAuthenticated, async (req, res) => {
    try {
      const units = await storage.getAllUnits();
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.get("/api/projects/:projectId/units", isAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.projectId as string;
      const units = await storage.getUnitsByProject(projectId);
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.get("/api/units/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const unit = await storage.getUnit(id);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      console.error("Error fetching unit:", error);
      res.status(500).json({ error: "Failed to fetch unit" });
    }
  });

  app.post("/api/units", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(data);
      res.status(201).json(unit);
    } catch (error) {
      console.error("Error creating unit:", error);
      res.status(400).json({ error: "Failed to create unit" });
    }
  });

  app.patch("/api/units/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = updateUnitSchema.parse(req.body);
      const unit = await storage.updateUnit(id, data);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      console.error("Error updating unit:", error);
      res.status(400).json({ error: "Failed to update unit" });
    }
  });

  app.delete("/api/units/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteUnit(id);
      if (!deleted) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting unit:", error);
      res.status(500).json({ error: "Failed to delete unit" });
    }
  });

  // Lead Unit Interests
  app.get("/api/leads/:leadId/unit-interests", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const interests = await storage.getLeadUnitInterests(leadId);
      res.json(interests);
    } catch (error) {
      console.error("Error fetching lead unit interests:", error);
      res.status(500).json({ error: "Failed to fetch lead unit interests" });
    }
  });

  app.get("/api/units/:unitId/interests", isAuthenticated, async (req, res) => {
    try {
      const unitId = req.params.unitId as string;
      const interests = await storage.getUnitInterests(unitId);
      res.json(interests);
    } catch (error) {
      console.error("Error fetching unit interests:", error);
      res.status(500).json({ error: "Failed to fetch unit interests" });
    }
  });

  app.post("/api/lead-unit-interests", isAuthenticated, async (req, res) => {
    try {
      const data = insertLeadUnitInterestSchema.parse(req.body);
      if (data.leadId && !(await canAccessLead(req.user, data.leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const interest = await storage.createLeadUnitInterest(data);
      res.status(201).json(interest);
    } catch (error) {
      console.error("Error creating lead unit interest:", error);
      res.status(400).json({ error: "Failed to create lead unit interest" });
    }
  });

  app.delete("/api/lead-unit-interests/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const existing = await storage.getLeadUnitInterest(id);
      if (existing && !(await canAccessLead(req.user, existing.leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const deleted = await storage.deleteLeadUnitInterest(id);
      if (!deleted) {
        return res.status(404).json({ error: "Interest not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead unit interest:", error);
      res.status(500).json({ error: "Failed to delete lead unit interest" });
    }
  });

  // ==================== SCORING CONFIG ====================

  app.get("/api/scoring-config", isAuthenticated, async (req, res) => {
    try {
      const { getScoringConfig } = await import("./scoring");
      const config = await getScoringConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scoring config" });
    }
  });

  app.post("/api/scoring-config", isAuthenticated, requireRole("super_admin", "admin", "sales_manager"), async (req, res) => {
    try {
      const { hotMaxDays, coldMinDays, weightRecency, weightEngagement, weightTaskCompletion, weightCreation } = req.body;
      const config = await updateScoringConfig({ hotMaxDays, coldMinDays, weightRecency, weightEngagement, weightTaskCompletion, weightCreation });
      storage.refreshAllLeadScores().catch(err => console.error("Background score refresh error:", err));
      res.json(config);
    } catch (error) {
      console.error("Error updating scoring config:", error);
      res.status(400).json({ error: "Failed to update scoring config" });
    }
  });

  // ==================== TEAM LOAD & AUTO ASSIGN ====================

  app.get("/api/team-load", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const teamId = (user?.role === "team_leader" || user?.role === "sales_manager") ? user?.teamId ?? null : null;
      const teamLoad = await storage.getTeamLoad(teamId);
      res.json(teamLoad);
    } catch (error) {
      console.error("Error fetching team load:", error);
      res.status(500).json({ error: "Failed to fetch team load" });
    }
  });

  app.post("/api/leads/auto-assign", isAuthenticated, requireRole("super_admin", "sales_admin", "team_leader", "admin", "sales_manager"), async (req, res) => {
    try {
      const { leadId, leadIds } = req.body;
      const user = req.user;
      const ids: string[] = leadId ? [leadId] : (Array.isArray(leadIds) ? leadIds : []);
      if (ids.length === 0) {
        return res.status(400).json({ error: "leadId or leadIds required" });
      }
      const results = await Promise.all(ids.map(id => storage.autoAssignLead(id, user?.teamId ?? null)));
      const assigned = results.filter(Boolean);
      if (assigned.length === 0) {
        return res.status(400).json({ error: "No agents available for assignment" });
      }
      res.json(ids.length === 1 ? assigned[0] : assigned);
    } catch (error) {
      console.error("Error auto-assigning lead:", error);
      res.status(500).json({ error: "Failed to auto-assign lead" });
    }
  });

  app.post("/api/leads/:leadId/auto-assign", isAuthenticated, requireRole("super_admin", "sales_admin", "team_leader", "admin", "sales_manager"), async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      const user = req.user;
      const lead = await storage.autoAssignLead(leadId, user?.teamId ?? null);
      if (!lead) {
        return res.status(400).json({ error: "No agents available for assignment" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error auto-assigning lead:", error);
      res.status(500).json({ error: "Failed to auto-assign lead" });
    }
  });

  // ==================== MARKETING ANALYTICS REPORT ====================

  app.get("/api/reports/marketing", isAuthenticated, requireRole("super_admin", "admin", "sales_manager"), async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const [allLeads, allCommissions, allStates] = await Promise.all([
        storage.getAllLeads(),
        storage.getAllCommissions(),
        storage.getAllStates(),
      ]);

      const startDate = from ? new Date(from) : null;
      const endDate = to ? new Date(to) : null;

      const filteredLeads = allLeads.filter((lead) => {
        if (!lead.createdAt) return false;
        const created = new Date(lead.createdAt);
        if (startDate && created < startDate) return false;
        if (endDate && created > endDate) return false;
        return true;
      });

      const convertedStateIds = allStates
        .filter(
          (s) =>
            s.name.toLowerCase().includes("done") ||
            s.name.toLowerCase().includes("closed") ||
            s.name.includes("صفقة")
        )
        .map((s) => s.id);

      // Build commission revenue per lead — commissionAmount is the actual earned revenue per source
      const commissionsByLead = new Map<string, { commissionAmount: number }[]>();
      for (const c of allCommissions) {
        if (!c.leadId) continue;
        if (!commissionsByLead.has(c.leadId)) commissionsByLead.set(c.leadId, []);
        commissionsByLead.get(c.leadId)!.push({ commissionAmount: c.commissionAmount });
      }

      const sourceMap: Record<string, {
        source: string;
        leadCount: number;
        convertedCount: number;
        totalMarketingCost: number;
        totalRevenue: number;
        dealValues: number[];
      }> = {};

      for (const lead of filteredLeads) {
        const source = lead.channel || "Unknown";
        if (!sourceMap[source]) {
          sourceMap[source] = {
            source,
            leadCount: 0,
            convertedCount: 0,
            totalMarketingCost: 0,
            totalRevenue: 0,
            dealValues: [],
          };
        }
        sourceMap[source].leadCount++;

        if (lead.stateId && convertedStateIds.includes(lead.stateId)) {
          sourceMap[source].convertedCount++;
          // Revenue from commissions: use commissionAmount (actual commission revenue) per lead
          const leadCommissions = commissionsByLead.get(lead.id);
          if (leadCommissions && leadCommissions.length > 0) {
            for (const c of leadCommissions) {
              if (c.commissionAmount > 0) {
                sourceMap[source].totalRevenue += c.commissionAmount;
                sourceMap[source].dealValues.push(c.commissionAmount);
              }
            }
          }
        }

        if (lead.marketingCost) {
          sourceMap[source].totalMarketingCost += Number(lead.marketingCost);
        }
      }

      const results = Object.values(sourceMap)
        .map((item) => ({
          source: item.source,
          leadCount: item.leadCount,
          convertedCount: item.convertedCount,
          totalMarketingCost: parseFloat(item.totalMarketingCost.toFixed(2)),
          totalRevenue: parseFloat(item.totalRevenue.toFixed(2)),
          avgDealValue: item.dealValues.length > 0
            ? parseFloat((item.dealValues.reduce((a, b) => a + b, 0) / item.dealValues.length).toFixed(2))
            : null,
          conversionRate: item.leadCount > 0
            ? parseFloat(((item.convertedCount / item.leadCount) * 100).toFixed(1))
            : 0,
          roi: item.totalMarketingCost > 0 && item.totalRevenue > 0
            ? parseFloat(((item.totalRevenue - item.totalMarketingCost) / item.totalMarketingCost * 100).toFixed(1))
            : (item.totalMarketingCost > 0 ? -100 : null),
          costPerLead: item.leadCount > 0 && item.totalMarketingCost > 0
            ? parseFloat((item.totalMarketingCost / item.leadCount).toFixed(2))
            : 0,
          costPerConversion: item.convertedCount > 0 && item.totalMarketingCost > 0
            ? parseFloat((item.totalMarketingCost / item.convertedCount).toFixed(2))
            : null,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue || b.leadCount - a.leadCount);

      res.json(results);
    } catch (error) {
      console.error("Error fetching marketing report:", error);
      res.status(500).json({ error: "Failed to fetch marketing report" });
    }
  });

  // ==================== RESPONSE TIME REPORTS ====================

  app.get("/api/reports/response-time", isAuthenticated, requireRole("super_admin", "company_owner", "sales_admin", "team_leader", "admin", "sales_manager"), async (req, res) => {
    try {
      const report = await storage.getResponseTimeReport();
      res.json(report);
    } catch (error) {
      console.error("Error fetching response time report:", error);
      res.status(500).json({ error: "Failed to fetch response time report" });
    }
  });

  // ==================== SALES PERFORMANCE REPORTS ====================

  app.get("/api/reports/sales-activity", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      const report = await storage.getSalesActivityReport(fromDate, toDate);
      res.json(report);
    } catch (error) {
      console.error("Error fetching sales activity report:", error);
      res.status(500).json({ error: "Failed to fetch sales activity report" });
    }
  });

  app.get("/api/reports/followup", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      const report = await storage.getFollowUpReport(fromDate, toDate);
      res.json(report);
    } catch (error) {
      console.error("Error fetching follow-up report:", error);
      res.status(500).json({ error: "Failed to fetch follow-up report" });
    }
  });

  app.get("/api/reports/funnel", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (req, res) => {
    try {
      const report = await storage.getSalesFunnelReport();
      res.json(report);
    } catch (error) {
      console.error("Error fetching funnel report:", error);
      res.status(500).json({ error: "Failed to fetch funnel report" });
    }
  });

  app.get("/api/reports/daily-activity", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (req, res) => {
    try {
      const report = await storage.getDailyActivityReport();
      res.json(report);
    } catch (error) {
      console.error("Error fetching daily activity report:", error);
      res.status(500).json({ error: "Failed to fetch daily activity report" });
    }
  });

  app.get("/api/reports/cold-leads", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (req, res) => {
    try {
      const report = await storage.getColdLeadsReport();
      res.json(report);
    } catch (error) {
      console.error("Error fetching cold leads report:", error);
      res.status(500).json({ error: "Failed to fetch cold leads report" });
    }
  });

  app.get("/api/reports/project-performance", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (req, res) => {
    try {
      const report = await storage.getProjectPerformanceReport();
      res.json(report);
    } catch (error) {
      console.error("Error fetching project performance report:", error);
      res.status(500).json({ error: "Failed to fetch project performance report" });
    }
  });

  app.get("/api/reports/comparison", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (req, res) => {
    try {
      const report = await storage.getWeeklyMonthlyComparison();
      res.json(report);
    } catch (error) {
      console.error("Error fetching comparison report:", error);
      res.status(500).json({ error: "Failed to fetch comparison report" });
    }
  });

  app.patch("/api/leads/:id/reassign", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const { assignedTo } = req.body;
      if (!assignedTo) {
        return res.status(400).json({ error: "assignedTo is required" });
      }
      const lead = await storage.updateLead(id, { assignedTo });
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error reassigning lead:", error);
      res.status(500).json({ error: "Failed to reassign lead" });
    }
  });

  app.get("/api/dashboard/team-activity", isAuthenticated, requireRole("super_admin", "company_owner", "sales_admin", "team_leader", "admin", "sales_manager"), async (req, res) => {
    try {
      const activity = await storage.getTeamActivityToday();
      res.json(activity);
    } catch (error) {
      console.error("Error fetching team activity:", error);
      res.status(500).json({ error: "Failed to fetch team activity" });
    }
  });

  // ==================== COMMUNICATIONS ====================

  app.get("/api/leads/:leadId/communications", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const comms = await storage.getCommunicationsByLead(leadId);
      res.json(comms);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  app.post("/api/leads/:leadId/communications", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const user = req.user;
      const data = insertCommunicationSchema.parse({
        ...req.body,
        leadId,
        userId: user?.id,
        userName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username : "System",
      });
      const comm = await storage.createCommunication(data);
      res.status(201).json(comm);
    } catch (error) {
      console.error("Error creating communication:", error);
      res.status(400).json({ error: "Failed to create communication" });
    }
  });

  // ==================== REMINDERS ====================

  app.get("/api/reminders", isAuthenticated, async (req, res) => {
    try {
      const reminders = await storage.getAllReminders();
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  app.get("/api/reminders/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId as string;
      const reminders = await storage.getRemindersByUser(userId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching user reminders:", error);
      res.status(500).json({ error: "Failed to fetch user reminders" });
    }
  });

  app.get("/api/leads/:leadId/reminders", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const reminders = await storage.getRemindersByLead(leadId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching lead reminders:", error);
      res.status(500).json({ error: "Failed to fetch lead reminders" });
    }
  });

  app.post("/api/reminders", isAuthenticated, async (req, res) => {
    try {
      const body = { ...req.body, userId: req.user?.id ?? "" };
      const data = insertReminderSchema.parse(body);
      // If a leadId is provided, ensure the user can access that lead
      if (data.leadId && !(await canAccessLead(req.user, data.leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const reminder = await storage.createReminder(data);
      res.status(201).json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(400).json({ error: "Failed to create reminder" });
    }
  });

  app.patch("/api/reminders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = updateReminderSchema.parse(req.body);
      const reminder = await storage.updateReminder(id, data);
      if (!reminder) {
        return res.status(404).json({ error: "Reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      console.error("Error updating reminder:", error);
      res.status(400).json({ error: "Failed to update reminder" });
    }
  });

  app.delete("/api/reminders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteReminder(id);
      if (!deleted) {
        return res.status(404).json({ error: "Reminder not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  // ==================== MY DAY ====================

  app.get("/api/my-day", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const data = await storage.getMyDayData(user.id, user.role ?? "sales_agent", user.teamId ?? null, user.username);
      res.json(data);
    } catch (error) {
      console.error("Error fetching My Day data:", error);
      res.status(500).json({ error: "Failed to fetch My Day data" });
    }
  });

  app.get("/api/my-day/completion-rates", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const managerRoles = ["super_admin", "company_owner", "admin", "sales_admin", "sales_manager", "team_leader"];
      if (!managerRoles.includes(user.role ?? "")) {
        return res.status(403).json({ error: "Access denied: managers only" });
      }
      const teamId = (user.role === "sales_manager" || user.role === "team_leader") ? user.teamId ?? null : null;
      const rates = await storage.getAgentCompletionRates(teamId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching completion rates:", error);
      res.status(500).json({ error: "Failed to fetch completion rates" });
    }
  });

  // ==================== NOTIFICATIONS ====================

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const allNotifications = await storage.getNotificationsByUser(userId);
      const recent = allNotifications.slice(-50).reverse();
      res.json(recent);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;
      const notification = await storage.getNotificationById(id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      if (notification.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.markNotificationRead(id);
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ error: "Failed to mark all notifications read" });
    }
  });

  // ==================== CALL LOGS ====================

  app.get("/api/leads/:leadId/call-logs", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const logs = await storage.getCallLogsByLead(leadId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching call logs:", error);
      res.status(500).json({ error: "Failed to fetch call logs" });
    }
  });

  app.post("/api/call-logs", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const data = insertCallLogSchema.parse({ ...req.body, userId: user.id });
      if (!(await canAccessLead(req.user, data.leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Validate reminderId belongs to this user and lead (prevent IDOR)
      if (data.reminderId) {
        const reminder = await storage.getReminder(data.reminderId);
        if (!reminder || reminder.userId !== user.id || reminder.leadId !== data.leadId) {
          return res.status(403).json({ error: "Access denied to reminder" });
        }
      }

      const callLog = await storage.createCallLog(data);

      // If there's a reminderId, mark that reminder as completed with timestamp
      if (data.reminderId) {
        await storage.updateReminder(data.reminderId, { isCompleted: true, completedAt: new Date() });
      }

      // Set firstContactAt on the lead if this is the first call log
      const existingLogs = await storage.getCallLogsByLead(data.leadId);
      const lead = await storage.getLead(data.leadId);
      const updatePayload: Record<string, unknown> = {
        lastAction: data.outcome,
        lastActionDate: new Date(),
      };
      if (!lead?.firstContactAt && existingLogs.length <= 1) {
        updatePayload.firstContactAt = new Date();
      }
      await storage.updateLead(data.leadId, updatePayload as Parameters<typeof storage.updateLead>[1]);

      // If next follow-up date provided, create a new reminder
      if (data.nextFollowUpDate) {
        await storage.createReminder({
          leadId: data.leadId,
          userId: user.id,
          title: `متابعة: ${lead?.name ?? "عميل"}`,
          description: data.notes ?? undefined,
          dueDate: new Date(data.nextFollowUpDate),
          isCompleted: false,
          priority: lead?.score === "hot" ? "high" : lead?.score === "warm" ? "medium" : "low",
        });
      }

      res.status(201).json(callLog);
    } catch (error) {
      console.error("Error creating call log:", error);
      res.status(400).json({ error: "Failed to create call log" });
    }
  });

  // ==================== DOCUMENTS ====================

  // Authorization helper: checks if the requesting user can access a specific lead.
  // super_admin, company_owner, sales_admin, admin, sales_manager can access any lead.
  // team_leader can only access leads assigned to members of their team.
  // sales_agent can only access leads assigned to them.
  async function canAccessLead(user: Express.User | undefined, leadId: string): Promise<boolean> {
    if (!user) return false;
    const globalRoles = ["super_admin", "company_owner", "sales_admin", "admin", "sales_manager"];
    if (globalRoles.includes(user.role ?? "")) return true;
    const lead = await storage.getLead(leadId);
    if (!lead) return false;
    if (user.role === "team_leader" && user.teamId) {
      const teamUsers = await storage.getAllUsers().then(users =>
        users.filter(u => u.teamId === user.teamId).map(u => u.id)
      );
      return lead.assignedTo !== null && teamUsers.includes(lead.assignedTo);
    }
    // Support both id-based and legacy username-based assignment
    return lead.assignedTo === user.id || lead.assignedTo === user.username;
  }

  // Authorization helper: clients are accessible by super_admin, admin, sales_manager and the agent
  // who owns the originating lead. Sales agents can access all clients for now (clients don't have assignedTo).
  async function canAccessClient(user: Express.User | undefined, _clientId: string): Promise<boolean> {
    if (!user) return false;
    return true;
  }

  // Authorization helper: checks if user can access a document by looking up its parent lead/client.
  async function canAccessDocument(user: Express.User | undefined, doc: { leadId: string | null; clientId: string | null }): Promise<boolean> {
    if (!user) return false;
    if (user.role === "super_admin" || user.role === "admin" || user.role === "sales_manager") return true;
    if (doc.leadId) return canAccessLead(user, doc.leadId);
    if (doc.clientId) return canAccessClient(user, doc.clientId);
    return false;
  }

  app.get("/api/leads/:leadId/documents", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      const user = req.user;
      if (!(await canAccessLead(user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const docs = await storage.getDocumentsByLead(leadId);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/leads/:leadId/documents", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      const user = req.user;
      if (!(await canAccessLead(user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const label = req.body.label || null;
      const uploaderName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username
        : null;
      const doc = await storage.createDocument({
        leadId,
        clientId: null,
        uploadedBy: user?.id ?? null,
        uploadedByName: uploaderName,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        label,
      });
      res.status(201).json(doc);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(400).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/clients/:clientId/documents", isAuthenticated, async (req, res) => {
    try {
      const clientId = req.params.clientId as string;
      const user = req.user;
      if (!(await canAccessClient(user, clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const docs = await storage.getDocumentsByClient(clientId);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/clients/:clientId/documents", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const clientId = req.params.clientId as string;
      const user = req.user;
      if (!(await canAccessClient(user, clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const label = req.body.label || null;
      const uploaderName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username
        : null;
      const doc = await storage.createDocument({
        leadId: null,
        clientId,
        uploadedBy: user?.id ?? null,
        uploadedByName: uploaderName,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        label,
      });
      res.status(201).json(doc);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(400).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/documents/:id/download", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = req.user;
      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      if (!(await canAccessDocument(user, doc))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const filePath = path.join(UPLOADS_DIR, doc.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on server" });
      }
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
      res.setHeader("Content-Type", doc.mimeType);
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = req.user;
      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      if (!(await canAccessDocument(user, doc))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const filePath = path.join(UPLOADS_DIR, doc.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ==================== COMMISSIONS ====================

  app.get("/api/commissions/summary", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const role = user?.role;
      let agentId: string | undefined;
      let teamMemberIds: string[] | undefined;
      if (role === "sales_agent") {
        agentId = user?.id;
      } else if (role === "sales_manager") {
        const allUsers = await storage.getAllUsers();
        teamMemberIds = allUsers
          .filter(u => u.teamId === user?.teamId)
          .map(u => u.id);
      }
      const summary = await storage.getCommissionSummary(agentId, teamMemberIds);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching commission summary:", error);
      res.status(500).json({ error: "Failed to fetch commission summary" });
    }
  });

  app.get("/api/commissions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const role = user?.role;
      let allCommissions = await storage.getAllCommissions();
      if (role === "sales_agent") {
        allCommissions = allCommissions.filter(c => c.agentId === user?.id);
      } else if (role === "sales_manager") {
        const teamUsers = await storage.getAllUsers();
        const teamMemberIds = teamUsers
          .filter(u => u.teamId === user?.teamId)
          .map(u => u.id);
        allCommissions = allCommissions.filter(c => c.agentId && teamMemberIds.includes(c.agentId));
      }
      res.json(allCommissions);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.get("/api/commissions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = req.user;
      const role = user?.role;
      const commission = await storage.getCommission(id);
      if (!commission) {
        return res.status(404).json({ error: "Commission not found" });
      }
      // Access control: agents can only see their own commissions
      if (role === "sales_agent" && commission.agentId !== user?.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      // Managers can only see their team's commissions
      if (role === "sales_manager") {
        const allUsers = await storage.getAllUsers();
        const teamMemberIds = allUsers
          .filter(u => u.teamId === user?.teamId)
          .map(u => u.id);
        if (commission.agentId && !teamMemberIds.includes(commission.agentId)) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      res.json(commission);
    } catch (error) {
      console.error("Error fetching commission:", error);
      res.status(500).json({ error: "Failed to fetch commission" });
    }
  });

  app.post("/api/commissions", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = insertCommissionSchema.parse(req.body);
      const commission = await storage.createCommission(data);
      res.status(201).json(commission);
    } catch (error) {
      console.error("Error creating commission:", error);
      res.status(400).json({ error: "Failed to create commission" });
    }
  });

  app.patch("/api/commissions/:id", isAuthenticated, requireRole("super_admin", "admin", "sales_manager"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = req.user;
      const role = user?.role;
      const existing = await storage.getCommission(id);
      if (!existing) {
        return res.status(404).json({ error: "Commission not found" });
      }
      // Managers can only edit commissions belonging to their team
      if (role === "sales_manager") {
        const allUsers = await storage.getAllUsers();
        const teamMemberIds = allUsers
          .filter(u => u.teamId === user?.teamId)
          .map(u => u.id);
        if (existing.agentId && !teamMemberIds.includes(existing.agentId)) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      // Only allow editing mutable fields — ownership/linkage fields are immutable
      const mutableFieldsSchema = updateCommissionSchema.pick({
        unitPrice: true,
        commissionPercent: true,
        commissionAmount: true,
        project: true,
        notes: true,
      });
      const data = mutableFieldsSchema.parse(req.body);
      const commission = await storage.updateCommission(id, data);
      if (!commission) {
        return res.status(404).json({ error: "Commission not found" });
      }
      res.json(commission);
    } catch (error) {
      console.error("Error updating commission:", error);
      res.status(400).json({ error: "Failed to update commission" });
    }
  });

  app.delete("/api/commissions/:id", isAuthenticated, requireRole("super_admin", "sales_admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteCommission(id);
      if (!deleted) {
        return res.status(404).json({ error: "Commission not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting commission:", error);
      res.status(500).json({ error: "Failed to delete commission" });
    }
  });

  // ==================== MANAGER COMMENTS ====================

  const isManager = (role: string | undefined) =>
    role === "super_admin" || role === "admin" || role === "sales_admin" || role === "sales_manager" || role === "team_leader" || role === "company_owner";

  // Get unread manager comment count for the current user (agent) - MUST be before /:id routes
  app.get("/api/manager-comments/unread-count", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const unread = await storage.getUnreadManagerCommentsByAssignee(user!.id);
      res.json({ count: unread.length, comments: unread });
    } catch (error) {
      console.error("Error fetching unread comments:", error);
      res.status(500).json({ error: "Failed to fetch unread comments" });
    }
  });

  // Get manager comments for a lead
  app.get("/api/leads/:leadId/manager-comments", isAuthenticated, async (req, res) => {
    try {
      const { leadId } = req.params;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const comments = await storage.getManagerCommentsByLead(leadId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching manager comments:", error);
      res.status(500).json({ error: "Failed to fetch manager comments" });
    }
  });

  // Create a manager comment
  app.post("/api/leads/:leadId/manager-comments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isManager(user?.role)) {
        return res.status(403).json({ error: "Only managers can post coaching notes" });
      }
      const { leadId } = req.params;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const managerName = user
        ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username
        : "Manager";
      const data = insertLeadManagerCommentSchema.parse({
        ...req.body,
        leadId,
        managerId: user!.id,
        managerName,
      });
      const comment = await storage.createManagerComment(data);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating manager comment:", error);
      res.status(400).json({ error: "Failed to create manager comment" });
    }
  });

  // Edit a manager comment (only the author)
  app.patch("/api/manager-comments/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isManager(user?.role)) {
        return res.status(403).json({ error: "Only managers can edit coaching notes" });
      }
      const { id } = req.params;
      const existing = await storage.getManagerComment(id);
      if (!existing) return res.status(404).json({ error: "Comment not found" });
      if (existing.managerId !== user!.id) {
        return res.status(403).json({ error: "Can only edit your own comments" });
      }
      const data = updateLeadManagerCommentSchema.parse(req.body);
      const updated = await storage.updateManagerComment(id, data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating manager comment:", error);
      res.status(400).json({ error: "Failed to update manager comment" });
    }
  });

  // Delete a manager comment (only the author)
  app.delete("/api/manager-comments/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!isManager(user?.role)) {
        return res.status(403).json({ error: "Only managers can delete coaching notes" });
      }
      const { id } = req.params;
      const existing = await storage.getManagerComment(id);
      if (!existing) return res.status(404).json({ error: "Comment not found" });
      if (existing.managerId !== user!.id) {
        return res.status(403).json({ error: "Can only delete your own comments" });
      }
      await storage.deleteManagerComment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting manager comment:", error);
      res.status(500).json({ error: "Failed to delete manager comment" });
    }
  });

  // Mark a manager comment as read (only the assigned agent)
  app.post("/api/manager-comments/:id/mark-read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const existing = await storage.getManagerComment(id);
      if (!existing) return res.status(404).json({ error: "Comment not found" });
      const lead = await storage.getLead(existing.leadId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      if (lead.assignedTo !== user!.id) {
        return res.status(403).json({ error: "Only the assigned agent can mark comments as read" });
      }
      const updated = await storage.markManagerCommentRead(id);
      res.json(updated);
    } catch (error) {
      console.error("Error marking comment as read:", error);
      res.status(500).json({ error: "Failed to mark comment as read" });
    }
  });

  // ==================== ROLE PERMISSIONS ====================

  app.get("/api/role-permissions", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const permissions = await storage.getRolePermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  app.put("/api/role-permissions/:role", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const role = req.params.role as string;
      const permissions = req.body;
      await storage.setRolePermissions(role, permissions);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating role permissions:", error);
      res.status(400).json({ error: "Failed to update role permissions" });
    }
  });

  // ==================== CUSTOM ROLES ====================

  app.get("/api/custom-roles", isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getAllCustomRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching custom roles:", error);
      res.status(500).json({ error: "Failed to fetch custom roles" });
    }
  });

  app.post("/api/custom-roles", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const { name, permissions } = req.body;
      if (!name || !permissions) {
        return res.status(400).json({ error: "name and permissions are required" });
      }
      // Normalize name: trim whitespace
      const normalizedName = name.trim();
      if (!normalizedName) {
        return res.status(400).json({ error: "Role name cannot be empty" });
      }
      // Prevent collision with built-in role names (case-insensitive)
      const BUILTIN_ROLES = ["super_admin", "company_owner", "sales_admin", "team_leader", "sales_agent", "admin", "sales_manager"];
      if (BUILTIN_ROLES.includes(normalizedName.toLowerCase())) {
        return res.status(400).json({ error: "Cannot use a built-in role name" });
      }
      const existing = await storage.getCustomRoleByName(normalizedName);
      if (existing) {
        return res.status(400).json({ error: "A role with this name already exists" });
      }
      const role = await storage.createCustomRole({ name: normalizedName, permissions });
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating custom role:", error);
      res.status(400).json({ error: "Failed to create custom role" });
    }
  });

  app.delete("/api/custom-roles/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteCustomRole(id);
      if (!deleted) {
        return res.status(404).json({ error: "Custom role not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting custom role:", error);
      res.status(500).json({ error: "Failed to delete custom role" });
    }
  });

  // ─── Import Leads from Excel/CSV ───────────────────────────────────────────
  app.post(
    "/api/leads/import",
    isAuthenticated,
    requireRole("super_admin", "admin", "sales_manager"),
    uploadMemory.single("file"),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const XLSX = await import("xlsx");
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          return res.status(400).json({ error: "File is empty or has no data rows" });
        }

        // Column name aliases (Arabic & English keys)
        const COL = {
          name:     ["الاسم", "Name", "name", "اسم"],
          phone:    ["الهاتف", "Phone", "phone", "هاتف", "موبايل", "Mobile"],
          phone2:   ["هاتف 2", "Phone 2", "phone2", "هاتف2", "mobile2"],
          email:    ["البريد الإلكتروني", "Email", "email", "بريد"],
          channel:  ["القناة", "Channel", "channel", "المصدر", "Source", "source"],
          campaign: ["الحملة", "Campaign", "campaign"],
          budget:   ["الميزانية", "Budget", "budget"],
          notes:    ["الملاحظات", "Notes", "notes", "ملاحظات"],
        };

        const pick = (row: any, keys: string[]) => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== "") return String(row[k]).trim();
          }
          return undefined;
        };

        let imported = 0;
        const errors: { row: number; reason: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const name = pick(row, COL.name);
          if (!name) {
            errors.push({ row: i + 2, reason: "الاسم مطلوب" });
            continue;
          }
          try {
            await storage.createLead(
              {
                name,
                phone:    pick(row, COL.phone)    ?? null,
                phone2:   pick(row, COL.phone2)   ?? null,
                email:    pick(row, COL.email)     ?? null,
                channel:  pick(row, COL.channel)   ?? null,
                campaign: pick(row, COL.campaign)  ?? null,
                budget:   pick(row, COL.budget)    ?? null,
                notes:    pick(row, COL.notes)     ?? null,
                assignedTo: user?.teamId ? null : null,
                stateId:  null,
              } as any,
              user?.teamId
            );
            imported++;
          } catch (err) {
            errors.push({ row: i + 2, reason: err instanceof Error ? err.message : "خطأ غير معروف" });
          }
        }

        res.json({ imported, errors, total: rows.length });
      } catch (error) {
        console.error("Import error:", error);
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to import leads" });
      }
    }
  );

  // ==================== BACKGROUND JOB: REMINDER NOTIFICATIONS ====================
  // Runs every minute, checks for reminders due in the next 15 minutes
  // and creates in-app notifications for the assigned user

  setInterval(async () => {
    try {
      const upcoming = await storage.getRemindersUpcomingIn15Min();
      for (const reminder of upcoming) {
        if (!reminder.userId) continue;
        // Skip if a notification was already sent for this reminder in the last 20 minutes (DB-persisted dedup)
        const alreadyNotified = await storage.recentReminderNotificationExists(reminder.id);
        if (alreadyNotified) continue;
        const lead = reminder.leadId ? await storage.getLead(reminder.leadId) : null;
        const clientName = lead?.name ?? "عميل";
        await storage.createNotification({
          userId: reminder.userId,
          type: "reminder",
          message: `تذكير: ${reminder.title} - ${clientName} خلال 15 دقيقة`,
          leadId: reminder.leadId ?? null,
          reminderId: reminder.id,
          isRead: false,
        });
      }
    } catch (err) {
      console.error("Background reminder job error:", err);
    }
  }, 60_000);

  // ============ WhatsApp Routes ============

  // GET /api/whatsapp/status — get connection status for the current user
  app.get("/api/whatsapp/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { status, qrDataUrl, errorMessage } = getSessionStatus(userId);
      res.json({ status, qrDataUrl, errorMessage });
    } catch (error) {
      console.error("WhatsApp status error:", error);
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // POST /api/whatsapp/connect — start connecting (generates QR)
  app.post("/api/whatsapp/connect", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      registerWAIncomingHandler(userId);
      await startConnection(userId, true);
      const { status, qrDataUrl, errorMessage } = getSessionStatus(userId);
      res.json({ status, qrDataUrl, errorMessage });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error("[WhatsApp] connect error:", message, "\n", stack);
      res.status(500).json({
        error: "Failed to start connection",
        detail: process.env.NODE_ENV !== "production" ? message : undefined,
      });
    }
  });

  // GET /api/whatsapp/diagnose — diagnose WhatsApp connection issues (admin only)
  app.get("/api/whatsapp/diagnose", isAuthenticated, async (req, res) => {
    if ((req.user as any)?.role !== "super_admin" && (req.user as any)?.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }
    const steps: Record<string, string> = {};
    try {
      steps.node_version = process.version;
      steps.platform = process.platform;
      steps.arch = process.arch;

      const { fetchLatestBaileysVersion, makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = await import("@whiskeysockets/baileys");
      steps.baileys_import = "OK";

      try {
        const { version } = await Promise.race([
          fetchLatestBaileysVersion(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout after 5s")), 5000)),
        ]);
        steps.fetch_version = `OK — ${version.join(".")}`;
      } catch (e) {
        steps.fetch_version = `FAILED: ${(e as Error).message}`;
      }

      const pino = (await import("pino")).default;
      const logger = pino({ level: "silent" });
      steps.pino = "OK";

      const fs = await import("fs");
      const path = await import("path");
      const testDir = path.join(process.cwd(), ".whatsapp_sessions", "_diag_test");
      fs.mkdirSync(testDir, { recursive: true });
      const { state } = await useMultiFileAuthState(testDir);
      steps.auth_state = "OK";

      try {
        const sock = makeWASocket({
          version: [2, 3000, 1015901307],
          auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
          printQRInTerminal: false,
          logger,
          browser: ["HomeAdvisor CRM", "Chrome", "1.0"],
          connectTimeoutMs: 5000,
          defaultQueryTimeoutMs: 5000,
        });
        steps.make_socket = "OK — socket created";
        setTimeout(() => { try { sock.end(undefined); } catch {} fs.rmSync(testDir, { recursive: true, force: true }); }, 500);
      } catch (e) {
        steps.make_socket = `FAILED: ${(e as Error).message}`;
        fs.rmSync(testDir, { recursive: true, force: true });
      }

      res.json({ ok: true, steps });
    } catch (e) {
      res.json({ ok: false, steps, fatal: (e as Error).message });
    }
  });

  // POST /api/whatsapp/reset — clear session data and reconnect (fixes corrupted auth state)
  app.post("/api/whatsapp/reset", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      await disconnectSession(userId);
      await startConnection(userId, true);
      const { status, qrDataUrl, errorMessage } = getSessionStatus(userId);
      res.json({ status, qrDataUrl, errorMessage });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("WhatsApp reset error:", message);
      res.status(500).json({ error: "فشل في إعادة ضبط الاتصال" });
    }
  });

  // POST /api/whatsapp/disconnect — disconnect the session
  app.post("/api/whatsapp/disconnect", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      await disconnectSession(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("WhatsApp disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  // POST /api/whatsapp/send — send a WhatsApp message to a lead
  // leadId is required; phone is resolved from the lead to prevent arbitrary sending
  app.post("/api/whatsapp/send", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = req.user!;
      const { leadId, templateId, message } = req.body;

      if (!leadId) {
        return res.status(400).json({ error: "leadId is required" });
      }
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      // Authorization: verify this user can access the lead
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied to this lead" });
      }

      // Resolve phone from the lead (prevents arbitrary number targeting)
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      const phone = lead.phone;
      if (!phone) {
        return res.status(400).json({ error: "Lead has no phone number" });
      }

      // Rate limiting: max 20 messages per agent per hour
      const HOURLY_LIMIT = 20;
      const sentInLastHour = await storage.countAgentMessagesInLastHour(userId);
      if (sentInLastHour >= HOURLY_LIMIT) {
        return res.status(429).json({
          error: `Hourly limit reached (${HOURLY_LIMIT} messages/hour). Please wait before sending more.`,
        });
      }

      // Rate limiting: max 100 messages per agent per day (rolling 24h)
      const DAILY_LIMIT = 100;
      const sentInLastDay = await storage.countAgentMessagesInLastDay(userId);
      if (sentInLastDay >= DAILY_LIMIT) {
        return res.status(429).json({
          error: `Daily limit reached (${DAILY_LIMIT} messages/day). Please try again tomorrow.`,
        });
      }

      console.log(`[WhatsApp Send Route] Attempting send: userId=${userId}, leadId=${leadId}, phone=${phone}, msgLength=${message.length}`);
      const result = await sendWhatsAppMessage(userId, phone, message);
      console.log(`[WhatsApp Send Route] Result: success=${result.success}, msgId=${result.messageId || 'none'}, error=${result.error || 'none'}`);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Log the message
      let templateName: string | undefined;
      if (templateId) {
        const tmpl = await storage.getWhatsappTemplate(templateId);
        templateName = tmpl?.name;
      }

      const agentName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;

      const logEntry = await storage.logWhatsappMessage({
        leadId,
        agentId: userId,
        agentName,
        templateId: templateId || null,
        templateName: templateName || null,
        phone,
        direction: "outbound",
        messageText: message,
        messageId: result.messageId || null,
      });

      // Add to lead history (without message body for privacy)
      await storage.createHistory({
        leadId,
        action: "WhatsApp Message Sent",
        description: templateName ? `تم إرسال "${templateName}"` : "تم إرسال رسالة واتساب",
        performedBy: agentName,
      });

      res.json({ success: true, log: logEntry });
    } catch (error) {
      console.error("WhatsApp send error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // GET /api/whatsapp/templates — list templates (admins see all; agents see active-only)
  app.get("/api/whatsapp/templates", isAuthenticated, async (req, res) => {
    try {
      const isAdmin = req.user?.canManageUsers === true;
      const templates = await storage.getAllWhatsappTemplates(!isAdmin);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching WhatsApp templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // POST /api/whatsapp/templates — create a template (admin only)
  app.post("/api/whatsapp/templates", isAuthenticated, requirePermission("canManageUsers"), async (req, res) => {
    try {
      const userId = req.user!.id;
      const data = insertWhatsappTemplateSchema.parse({ ...req.body, createdBy: userId });
      const template = await storage.createWhatsappTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating WhatsApp template:", error);
      res.status(400).json({ error: "Failed to create template" });
    }
  });

  // PATCH /api/whatsapp/templates/:id — update a template (admin only)
  app.patch("/api/whatsapp/templates/:id", isAuthenticated, requirePermission("canManageUsers"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = updateWhatsappTemplateSchema.parse(req.body);
      const template = await storage.updateWhatsappTemplate(id, data);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error) {
      console.error("Error updating WhatsApp template:", error);
      res.status(400).json({ error: "Failed to update template" });
    }
  });

  // DELETE /api/whatsapp/templates/:id — delete a template (admin only)
  app.delete("/api/whatsapp/templates/:id", isAuthenticated, requirePermission("canManageUsers"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteWhatsappTemplate(id);
      if (!deleted) return res.status(404).json({ error: "Template not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting WhatsApp template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // GET /api/leads/:leadId/whatsapp-log — get whatsapp messages for a lead
  app.get("/api/leads/:leadId/whatsapp-log", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const logs = await storage.getWhatsappLogsByLead(leadId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching WhatsApp log:", error);
      res.status(500).json({ error: "Failed to fetch log" });
    }
  });

  // GET /api/whatsapp/inbox — get all conversations grouped by lead
  app.get("/api/whatsapp/inbox", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = (req.user as any)?.role ?? "sales_agent";
      const teamId = (req.user as any)?.teamId ?? null;
      const conversations = await storage.getWhatsappInbox(userId, userRole, teamId);
      res.json(conversations);
    } catch (error) {
      console.error("WhatsApp inbox error:", error);
      res.status(500).json({ error: "Failed to fetch inbox" });
    }
  });

  // POST /api/whatsapp/inbox/:leadId/mark-read — mark all inbound messages as read
  app.post("/api/whatsapp/inbox/:leadId/mark-read", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.markWhatsappMessagesRead(leadId);
      res.json({ success: true });
    } catch (error) {
      console.error("WhatsApp mark-read error:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // GET /api/whatsapp/inbox/unread-count — get total unread count for sidebar badge
  app.get("/api/whatsapp/inbox/unread-count", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = (req.user as any)?.role ?? "sales_agent";
      const teamId = (req.user as any)?.teamId ?? null;
      const count = await storage.getUnreadWhatsappCount(userId, userRole, teamId);
      res.json({ count });
    } catch (error) {
      console.error("WhatsApp unread count error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // Helper: escape HTML to prevent injection
  function escHtml(s: string): string {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Helper: build HTML email body from report data
  function buildEmailHtml(
    isArabic: boolean,
    totalLeads: number,
    closedDeals: number,
    conversionRate: string | number,
    sources: { name: string; value: number }[],
    agents: { name: string; count: number; deals: number }[]
  ): string {
    const dir = isArabic ? "rtl" : "ltr";
    const reportTitle = isArabic ? "تقرير الأداء" : "Performance Report";
    const generatedOn = isArabic ? "تم الإنشاء في" : "Generated on";
    const now = new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const sourcesRows = sources
      .map(
        (s) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escHtml(s.name)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${Number(s.value)}</td></tr>`
      )
      .join("");

    const agentsRows = agents
      .map(
        (a) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escHtml(a.name)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${Number(a.count)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${Number(a.deals)}</td></tr>`
      )
      .join("");

    return `<!DOCTYPE html>
<html dir="${dir}" lang="${isArabic ? "ar" : "en"}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(reportTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${isArabic ? "'Noto Sans Arabic', Arial" : "Arial"}, sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">HomeAdvisor CRM</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:16px;font-weight:600;">${escHtml(reportTitle)}</p>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">${escHtml(generatedOn)}: ${escHtml(now)}</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:12px 8px;background:#f5f3ff;border-radius:8px;text-align:center;width:33%;">
            <div style="font-size:26px;font-weight:700;color:#6366f1;">${Number(totalLeads)}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">${isArabic ? "إجمالي الليدز" : "Total Leads"}</div>
          </td>
          <td style="width:4%;"></td>
          <td style="padding:12px 8px;background:#f0fdf4;border-radius:8px;text-align:center;width:33%;">
            <div style="font-size:26px;font-weight:700;color:#16a34a;">${Number(closedDeals)}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">${isArabic ? "الصفقات المغلقة" : "Closed Deals"}</div>
          </td>
          <td style="width:4%;"></td>
          <td style="padding:12px 8px;background:#fff7ed;border-radius:8px;text-align:center;width:33%;">
            <div style="font-size:26px;font-weight:700;color:#ea580c;">${escHtml(String(conversionRate))}%</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">${isArabic ? "نسبة التحويل" : "Conversion Rate"}</div>
          </td>
        </tr>
      </table>
      ${sources.length > 0 ? `
      <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 10px;">${isArabic ? "مصادر الليدز" : "Lead Sources"}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:${isArabic ? "right" : "left"};font-size:12px;color:#6b7280;font-weight:600;">${isArabic ? "المصدر" : "Source"}</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">${isArabic ? "الليدز" : "Leads"}</th>
          </tr>
        </thead>
        <tbody>${sourcesRows}</tbody>
      </table>` : ""}
      ${agents.length > 0 ? `
      <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 10px;">${isArabic ? "أداء الفريق" : "Team Performance"}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:${isArabic ? "right" : "left"};font-size:12px;color:#6b7280;font-weight:600;">${isArabic ? "المندوب" : "Agent"}</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">${isArabic ? "الليدز" : "Leads"}</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">${isArabic ? "الصفقات" : "Deals"}</th>
          </tr>
        </thead>
        <tbody>${agentsRows}</tbody>
      </table>` : ""}
    </div>
    <div style="padding:14px 24px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">HomeAdvisor CRM &mdash; ${escHtml(reportTitle)}</p>
    </div>
  </div>
</body>
</html>`;
  }

  // Helper: create nodemailer transporter from env
  function createEmailTransporter() {
    const emailHost = process.env.EMAIL_HOST;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailPort = parseInt(process.env.EMAIL_PORT || "587", 10);
    if (!emailHost || !emailUser || !emailPass) return null;
    return {
      transporter: nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: { user: emailUser, pass: emailPass },
      }),
      emailUser,
    };
  }

  // Helper: build report data from DB for a given period
  async function buildReportDataFromDb(since?: Date) {
    const allLeads = await storage.getAllLeads();
    const allStates = await storage.getAllStates();
    const allUsers = await storage.getAllUsers();

    const periodLeads = since
      ? allLeads.filter((l) => l.createdAt && new Date(l.createdAt) >= since)
      : allLeads;

    const doneDealState = allStates.find(
      (s) =>
        s.name.toLowerCase().includes("done") ||
        s.name.toLowerCase().includes("closed") ||
        s.name.includes("صفقة")
    );

    const totalLeads = periodLeads.length;
    const closedDeals = doneDealState
      ? periodLeads.filter((l) => l.stateId === doneDealState.id).length
      : 0;
    const conversionRate =
      totalLeads > 0 ? ((closedDeals / totalLeads) * 100).toFixed(1) : "0";

    const sourceMap: Record<string, number> = {};
    periodLeads.forEach((l) => {
      const src = l.channel || "Unknown";
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const sources = Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const agentMap: Record<string, { count: number; deals: number }> = {};
    periodLeads.forEach((l) => {
      const u = allUsers.find((u) => u.id === l.assignedTo);
      const name =
        u
          ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
          : "Unassigned";
      if (!agentMap[name]) agentMap[name] = { count: 0, deals: 0 };
      agentMap[name].count++;
      if (doneDealState && l.stateId === doneDealState.id) agentMap[name].deals++;
    });
    const agents = Object.entries(agentMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { totalLeads, closedDeals, conversionRate, sources, agents };
  }

  // GET /api/email/settings — get email report settings for current user
  app.get("/api/email/settings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const settings = await storage.getEmailReportSettings(user.id);
      res.json(settings || null);
    } catch (error) {
      console.error("Email settings fetch error:", error);
      res.status(500).json({ error: "Failed to fetch email settings" });
    }
  });

  // PUT /api/email/settings — save email report settings for current user
  app.put("/api/email/settings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const isManagerRole =
        user.role === "super_admin" ||
        user.role === "admin" ||
        user.role === "sales_manager" ||
        user.role === "company_owner";
      if (!isManagerRole) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { toEmail: bodyEmail, frequency, language: bodyLang, enabled } = req.body;

      if (!bodyEmail || typeof bodyEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bodyEmail)) {
        return res.status(400).json({ error: "Valid toEmail address is required" });
      }
      if (!["weekly", "monthly"].includes(frequency)) {
        return res.status(400).json({ error: "frequency must be 'weekly' or 'monthly'" });
      }
      if (bodyLang !== undefined && !["ar", "en"].includes(bodyLang)) {
        return res.status(400).json({ error: "language must be 'ar' or 'en'" });
      }

      const parsed = insertEmailReportSettingsSchema.safeParse({
        toEmail: bodyEmail,
        frequency,
        language: bodyLang ?? "ar",
        enabled: Boolean(enabled),
        userId: user.id,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid settings data" });
      }

      const saved = await storage.upsertEmailReportSettings(parsed.data);
      res.json(saved);
    } catch (error) {
      console.error("Email settings save error:", error);
      res.status(500).json({ error: "Failed to save email settings" });
    }
  });

  // POST /api/email/send-report — send an HTML performance report via email
  app.post("/api/email/send-report", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const isManagerRole =
        user.role === "super_admin" ||
        user.role === "admin" ||
        user.role === "sales_manager" ||
        user.role === "company_owner";
      if (!isManagerRole) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { toEmail, reportData, language } = req.body;
      if (!toEmail || typeof toEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
        return res.status(400).json({ error: "Valid toEmail is required" });
      }

      const emailConfig = createEmailTransporter();
      if (!emailConfig) {
        return res.status(503).json({
          error: "Email not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS environment variables.",
        });
      }

      const isArabic = language === "ar";
      const rd = reportData || {};
      const totalLeads = Number(rd.totalLeads ?? 0);
      const closedDeals = Number(rd.closedDeals ?? 0);
      const conversionRate = rd.conversionRate ?? "0";
      const sources: { name: string; value: number }[] = Array.isArray(rd.sources) ? rd.sources : [];
      const agents: { name: string; count: number; deals: number }[] = Array.isArray(rd.agents) ? rd.agents : [];

      const reportTitle = isArabic ? "تقرير الأداء" : "Performance Report";
      const now = new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });
      const htmlBody = buildEmailHtml(isArabic, totalLeads, closedDeals, conversionRate, sources, agents);

      await emailConfig.transporter.sendMail({
        from: `"HomeAdvisor CRM" <${emailConfig.emailUser}>`,
        to: toEmail,
        subject: `${reportTitle} - ${now}`,
        html: htmlBody,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Email send error:", error);
      res.status(500).json({ error: "Failed to send email report" });
    }
  });

  // Scheduled email report sender — runs every hour to check if reports need sending
  async function runEmailReportScheduler() {
    try {
      const enabledSettings = await storage.getAllEnabledEmailReportSettings();
      if (enabledSettings.length === 0) return;

      const emailConfig = createEmailTransporter();
      if (!emailConfig) return;

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
      const dayOfMonth = now.getDate();
      const hour = now.getHours();

      for (const setting of enabledSettings) {
        const shouldSend =
          (setting.frequency === "weekly" && dayOfWeek === 1 && hour === 8) ||
          (setting.frequency === "monthly" && dayOfMonth === 1 && hour === 8);

        if (!shouldSend) continue;

        // Prevent duplicate sends: check if already sent today
        if (setting.lastSentAt) {
          const lastSent = new Date(setting.lastSentAt);
          const sameDay =
            lastSent.getFullYear() === now.getFullYear() &&
            lastSent.getMonth() === now.getMonth() &&
            lastSent.getDate() === now.getDate();
          if (sameDay) continue;
        }

        try {
          // Compute period start date for period-specific metrics
          const periodStart = new Date(now);
          if (setting.frequency === "weekly") {
            periodStart.setDate(periodStart.getDate() - 7);
          } else {
            periodStart.setMonth(periodStart.getMonth() - 1);
          }

          const { totalLeads, closedDeals, conversionRate, sources, agents } =
            await buildReportDataFromDb(periodStart);
          const isArabic = setting.language !== "en";
          const reportTitle = isArabic ? "تقرير الأداء" : "Performance Report";
          const periodLabel = isArabic
            ? (setting.frequency === "weekly" ? "الأسبوع الماضي" : "الشهر الماضي")
            : (setting.frequency === "weekly" ? "Last Week" : "Last Month");
          const locale = isArabic ? "ar-EG" : "en-US";
          const now2 = now.toLocaleDateString(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          const htmlBody = buildEmailHtml(
            isArabic,
            totalLeads,
            closedDeals,
            conversionRate,
            sources,
            agents
          );

          await emailConfig.transporter.sendMail({
            from: `"HomeAdvisor CRM" <${emailConfig.emailUser}>`,
            to: setting.toEmail,
            subject: `${reportTitle} — ${periodLabel} (${now2})`,
            html: htmlBody,
          });

          await storage.updateEmailReportLastSent(setting.userId);
          console.log(
            `[EmailScheduler] Sent ${setting.frequency} report to ${setting.toEmail} covering ${periodStart.toISOString()} - ${now.toISOString()}`
          );
        } catch (sendErr) {
          console.error(
            `[EmailScheduler] Failed to send report to ${setting.toEmail}:`,
            sendErr
          );
        }
      }
    } catch (err) {
      console.error("[EmailScheduler] Scheduler error:", err);
    }
  }

  // Run scheduler every hour
  setInterval(runEmailReportScheduler, 60 * 60 * 1000);
  // Also run once at startup after 30s delay
  setTimeout(runEmailReportScheduler, 30000);

  // Monthly Targets - GET targets for a specific month (managers/admins only)
  app.get("/api/monthly-targets", isAuthenticated, requirePermission("canManageTeams"), async (req, res) => {
    try {
      const { month } = req.query;
      const targetMonth = (month as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const targets = await storage.getMonthlyTargetsByMonth(targetMonth);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching monthly targets:", error);
      res.status(500).json({ error: "Failed to fetch monthly targets" });
    }
  });

  // Monthly Targets - GET target for a specific user and month
  // Auth rules: self-access; admin/sales_admin/super_admin for any user; team_leader for team members only
  app.get("/api/monthly-targets/:userId", isAuthenticated, async (req, res) => {
    try {
      const requestingUser = req.user as any;
      const userId = req.params.userId as string;
      const isAdminRole = ["super_admin", "admin", "sales_admin"].includes(requestingUser.role);
      const isSelf = requestingUser.id === userId;

      if (!isSelf && !isAdminRole) {
        if (requestingUser.role === "team_leader") {
          // Team leader must be in the same team as the target user
          const targetUser = await storage.getUser(userId);
          if (!targetUser || targetUser.teamId !== requestingUser.teamId) {
            return res.status(403).json({ error: "Access denied" });
          }
        } else {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const { month } = req.query;
      const targetMonth = (month as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const target = await storage.getMonthlyTarget(userId, targetMonth);
      res.json(target || null);
    } catch (error) {
      console.error("Error fetching monthly target:", error);
      res.status(500).json({ error: "Failed to fetch monthly target" });
    }
  });

  // Monthly Targets - POST/PUT upsert target (admin/manager only)
  const monthFormatRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  const upsertMonthlyTargetHandler = async (req: any, res: any) => {
    try {
      const data = insertMonthlyTargetSchema.parse(req.body);
      if (!monthFormatRegex.test(data.targetMonth)) {
        return res.status(400).json({ error: "targetMonth must be in YYYY-MM format" });
      }
      const target = await storage.upsertMonthlyTarget(data);
      res.json(target);
    } catch (error) {
      console.error("Error upserting monthly target:", error);
      res.status(400).json({ error: "Failed to save monthly target" });
    }
  };
  app.post("/api/monthly-targets", isAuthenticated, requirePermission("canManageTeams"), upsertMonthlyTargetHandler);
  app.put("/api/monthly-targets", isAuthenticated, requirePermission("canManageTeams"), upsertMonthlyTargetHandler);

  // Leaderboard - GET leaderboard data (supports period = YYYY-MM or YYYY for full year)
  // Role-based scoping: team_leaders see their team only; sales_agents see all rankings (no commission data)
  app.get("/api/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const requestingUser = req.user as any;
      const { month, period, teamId } = req.query;
      const resolvedPeriod = (period as string) || (month as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

      // Team leaders can only see their team
      let scopedTeamId = teamId as string | undefined;
      if (requestingUser.role === "team_leader") {
        scopedTeamId = requestingUser.teamId;
      }

      const data = await storage.getLeaderboard(resolvedPeriod, scopedTeamId);

      // Remove commissionTotal from leaderboard — it's sensitive compensation data
      // Only deals/leads ranking metrics are returned
      const safeData = data.map(({ commissionTotal: _c, ...entry }) => entry);

      res.json(safeData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Monthly Targets with achievement data - GET targets + actual for all users in a month
  // Restricted to managers/admins/team_leaders; team_leaders see only their own team
  app.get("/api/monthly-targets-with-achievement", isAuthenticated, async (req, res) => {
    try {
      const requestingUser = req.user as any;
      const isAdminRole = ["super_admin", "admin", "sales_admin", "company_owner", "sales_manager"].includes(requestingUser.role);
      const isTeamLeader = requestingUser.role === "team_leader";

      if (!isAdminRole && !isTeamLeader) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { month } = req.query;
      const targetMonth = (month as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

      // For team leaders, scope to their team only
      const teamIdFilter = isTeamLeader ? requestingUser.teamId : undefined;

      const [targets, leaderboard] = await Promise.all([
        storage.getMonthlyTargetsByMonth(targetMonth),
        storage.getLeaderboard(targetMonth, teamIdFilter),
      ]);
      const combined = leaderboard.map(entry => {
        const target = targets.find(t => t.userId === entry.userId);
        const { commissionTotal: _c, ...safeEntry } = entry;
        return {
          ...safeEntry,
          dealsTarget: target?.dealsTarget ?? 0,
          leadsTarget: target?.leadsTarget ?? 0,
          revenueTarget: target?.revenueTarget ?? null,
        };
      });
      res.json(combined);
    } catch (error) {
      console.error("Error fetching monthly targets with achievement:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // GET /api/leads/:leadId/whatsapp-conversation — get full chat conversation (inbound + outbound)
  app.get("/api/leads/:leadId/whatsapp-conversation", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getWhatsappConversation(leadId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching WhatsApp conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // POST /api/leads/:leadId/ai/suggest-replies — AI suggested WhatsApp replies (Gemini Flash)
  app.post("/api/leads/:leadId/ai/suggest-replies", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const messages = await storage.getWhatsappConversation(leadId);
      const { suggestReplies } = await import("./ai");
      const result = await suggestReplies(messages, lead);
      res.json(result);
    } catch (error) {
      console.error("[AI] suggest-replies error:", error);
      const msg = error instanceof Error ? error.message : "AI request failed";
      res.status(500).json({ error: msg });
    }
  });

  // POST /api/leads/:leadId/ai/analyze — AI lead analysis (Gemini Flash)
  app.post("/api/leads/:leadId/ai/analyze", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const messages = await storage.getWhatsappConversation(leadId);
      const { analyzeLead } = await import("./ai");
      const result = await analyzeLead(messages, lead);
      res.json(result);
    } catch (error) {
      console.error("[AI] analyze error:", error);
      const msg = error instanceof Error ? error.message : "AI request failed";
      res.status(500).json({ error: msg });
    }
  });

  // ── Knowledge Base CRUD ──────────────────────────────────────────────────

  app.get("/api/knowledge-base", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getAllKnowledgeBaseItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ error: "Failed to fetch knowledge base items" });
    }
  });

  app.post("/api/knowledge-base", isAuthenticated, requireRole("super_admin", "admin", "sales_admin", "company_owner"), async (req, res) => {
    try {
      const data = insertKnowledgeBaseSchema.parse(req.body);
      const item = await storage.createKnowledgeBaseItem(data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating knowledge base item:", error);
      res.status(400).json({ error: "Failed to create knowledge base item" });
    }
  });

  app.patch("/api/knowledge-base/:id", isAuthenticated, requireRole("super_admin", "admin", "sales_admin", "company_owner"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = updateKnowledgeBaseSchema.parse(req.body);
      const item = await storage.updateKnowledgeBaseItem(id, data);
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    } catch (error) {
      console.error("Error updating knowledge base item:", error);
      res.status(400).json({ error: "Failed to update knowledge base item" });
    }
  });

  app.delete("/api/knowledge-base/:id", isAuthenticated, requireRole("super_admin", "admin", "sales_admin", "company_owner"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteKnowledgeBaseItem(id);
      if (!deleted) return res.status(404).json({ error: "Item not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting knowledge base item:", error);
      res.status(500).json({ error: "Failed to delete knowledge base item" });
    }
  });

  // GET /api/chatbot/settings — get chatbot settings for current user
  app.get("/api/chatbot/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const settings = await storage.getChatbotSettings(userId);
      res.json(settings ?? {
        userId,
        isActive: false,
        workingHoursStart: 9,
        workingHoursEnd: 18,
        welcomeMessage: "أهلاً! 👋 أنا المساعد الذكي لشركتنا العقارية. يسعدني مساعدتك. ممكن تعرفني باسمك الكريم؟",
      });
    } catch (error) {
      console.error("Error fetching chatbot settings:", error);
      res.status(500).json({ error: "Failed to fetch chatbot settings" });
    }
  });

  // PUT /api/chatbot/settings — upsert chatbot settings for current user
  app.put("/api/chatbot/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const {
        isActive,
        workingHoursStart,
        workingHoursEnd,
        welcomeMessage,
        botName,
        companyName,
        botRole,
        botPersonality,
        botMission,
        companyKnowledge,
        respondAlways,
        enabledProjectIds,
      } = req.body;
      const settings = await storage.upsertChatbotSettings({
        userId,
        isActive: isActive ?? false,
        workingHoursStart: workingHoursStart ?? 9,
        workingHoursEnd: workingHoursEnd ?? 18,
        welcomeMessage: welcomeMessage ?? "أهلاً! 👋 أنا المساعد الذكي لشركتنا العقارية.",
        botName: botName ?? undefined,
        companyName: companyName ?? undefined,
        botRole: botRole ?? undefined,
        botPersonality: botPersonality ?? undefined,
        botMission: botMission ?? undefined,
        companyKnowledge: companyKnowledge ?? undefined,
        respondAlways: respondAlways ?? false,
        enabledProjectIds: Array.isArray(enabledProjectIds) ? (enabledProjectIds as string[]) : null,
      });
      res.json(settings);
    } catch (error) {
      console.error("Error saving chatbot settings:", error);
      res.status(500).json({ error: "Failed to save chatbot settings" });
    }
  });

  // POST /api/leads/:leadId/bot/takeover — agent takes over from bot
  app.post("/api/leads/:leadId/bot/takeover", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const lead = await storage.updateLead(leadId, { botActive: false, botStage: "handed_off" });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      await storage.createHistory({
        leadId,
        action: "تسلّم المحادثة",
        description: `تسلّم المندوب ${req.user?.username || ""} المحادثة من البوت`,
        performedBy: req.user?.username || "النظام",
      });
      res.json(lead);
    } catch (error) {
      console.error("Error taking over bot conversation:", error);
      res.status(500).json({ error: "Failed to take over" });
    }
  });

  // POST /api/leads/:leadId/bot/reactivate — reactivate bot for lead
  app.post("/api/leads/:leadId/bot/reactivate", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const lead = await storage.updateLead(leadId, { botActive: true, botStage: "greeting" });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (error) {
      console.error("Error reactivating bot:", error);
      res.status(500).json({ error: "Failed to reactivate bot" });
    }
  });

  // Helper: check if current time is outside working hours for chatbot
  function isOutsideWorkingHours(startHour: number, endHour: number): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    return currentHour < startHour || currentHour >= endHour;
  }

  // Helper: register incoming WhatsApp message handler for a user
  function registerWAIncomingHandler(userId: string): void {
    setIncomingMessageHandler(userId, async (msg: IncomingWAMessage) => {
      try {
        // Deduplicate by WhatsApp message ID
        if (msg.messageId) {
          const existing = await storage.findMessageByWhatsAppId(msg.messageId);
          if (existing) return;
        }

        // Normalize the incoming phone number (same logic as whatsapp.ts)
        let phone = msg.phone;
        if (!phone.startsWith("20") && phone.startsWith("0")) {
          phone = "20" + phone.slice(1);
        } else if (!phone.startsWith("20") && phone.length === 10) {
          phone = "20" + phone;
        }

        // Find or create the lead
        let lead = await storage.findLeadByPhone(phone);
        let isNewLead = false;

        // If not found by real phone, check if there's an existing lead stored with the LID number
        // (e.g. leads created before this fix when WhatsApp LID was used)
        if (!lead && msg.jid && msg.jid.endsWith("@lid")) {
          const lidPhone = msg.jid.split("@")[0];
          if (lidPhone && lidPhone !== phone) {
            const lidLead = await storage.findLeadByPhone(lidPhone);
            if (lidLead) {
              // Migrate: update the lead's phone from LID to real phone number
              await storage.updateLead(lidLead.id, { phone });
              lead = { ...lidLead, phone };
              console.log(`[WhatsApp] Migrated LID lead ${lidLead.id}: ${lidPhone} → ${phone}`);
            }
          }
        }

        if (!lead) {
          isNewLead = true;
          // Resolve the "ليد جديد" state id
          const allStates = await storage.getAllStates();
          const newLeadState = allStates.find(s => s.name === "ليد جديد" || s.order === 0);
          const leadName = msg.senderName || `واتساب - ${phone}`;
          const newLeadData: InsertLead = {
            name: leadName,
            phone,
            channel: "واتساب",
            assignedTo: userId,
            stateId: newLeadState?.id ?? null,
            botActive: true,
            botStage: "greeting",
          };
          lead = await storage.createLead(newLeadData);
          console.log(`[WhatsApp] Auto-created lead ${lead.id} for phone ${phone} (name: ${leadName})`);
        } else if (msg.senderName && lead.name && lead.name.startsWith("واتساب -")) {
          await storage.updateLead(lead.id, { name: msg.senderName });
          lead = { ...lead, name: msg.senderName };
          console.log(`[WhatsApp] Updated lead ${lead.id} name to: ${msg.senderName}`);
        }

        // Determine if this is the very first bot interaction BEFORE logging inbound message
        // A first interaction means: no prior outbound bot messages exist for this lead
        const priorMessages = await storage.getWhatsappConversation(lead.id);
        const isFirstBotInteraction = priorMessages.filter(m => m.direction === "outbound" && m.agentName === "البوت").length === 0;

        // Save inbound message (use WhatsApp message timestamp as createdAt for accurate ordering)
        await storage.logWhatsappMessage({
          leadId: lead.id,
          agentId: null,
          agentName: null,
          templateId: null,
          templateName: null,
          phone,
          direction: "inbound",
          messageText: msg.messageText,
          messageId: msg.messageId || null,
          createdAt: msg.timestamp,
          isRead: false,
        });

        // Add to lead history
        await storage.createHistory({
          leadId: lead.id,
          action: "رسالة واتساب واردة",
          description: `رسالة من ${phone}: ${msg.messageText.substring(0, 100)}${msg.messageText.length > 100 ? "..." : ""}`,
          performedBy: "واتساب",
        });

        // ── Auto-detect Egyptian phone numbers in any inbound message ───────
        if (!lead.phone2) {
          const phoneMatch = msg.messageText.match(/\b(01[0-9]{9})\b/);
          if (phoneMatch) {
            const detectedPhone = phoneMatch[1];
            await storage.updateLead(lead.id, { phone2: detectedPhone });
            lead = { ...lead, phone2: detectedPhone };
          }
        }

        // ── Chatbot Logic ───────────────────────────────────────────────────
        try {
          const botSettings = await storage.getChatbotSettings(userId);
          const botEnabled = botSettings?.isActive === true;
          const leadBotActive = lead.botActive !== false; // default true

          console.log(`[Chatbot] Check for lead ${lead.id} (${phone}): botEnabled=${botEnabled}, leadBotActive=${leadBotActive}, botStage=${lead.botStage}, isNew=${isNewLead}`);

          if (botEnabled && leadBotActive && lead.botStage !== "handed_off") {
            // Bot responds always if respondAlways=true, otherwise only outside working hours
            const respondAlways = botSettings?.respondAlways === true;
            const outsideHours = isOutsideWorkingHours(
              botSettings?.workingHoursStart ?? 9,
              botSettings?.workingHoursEnd ?? 18
            );

            console.log(`[Chatbot] Hours check: respondAlways=${respondAlways}, outsideHours=${outsideHours}`);

            if (respondAlways || outsideHours) {
              const { generateBotReply } = await import("./ai");
              const stageMap: Record<string, BotStage> = {
                "collecting_budget": "collecting_needs",
                "collecting_unit": "collecting_needs",
                "collecting_rooms": "collecting_needs",
              };
              const rawStage = lead.botStage ?? "greeting";
              const currentStage: BotStage = (stageMap[rawStage] ?? rawStage) as BotStage;

              const allProjects = await storage.getAllProjects();
              const activeProjects = allProjects.filter(p => p.isActive !== false);
              const allUnits = await storage.getAllUnits();
              const kbItems = await storage.getAllKnowledgeBaseItems();

              const botResult = await generateBotReply(
                msg.messageText,
                currentStage,
                lead,
                priorMessages,
                activeProjects,
                allUnits,
                {
                  botName: botSettings?.botName ?? undefined,
                  companyName: botSettings?.companyName ?? undefined,
                  botRole: (botSettings as Record<string, unknown>)?.botRole as string | undefined,
                  botPersonality: botSettings?.botPersonality ?? undefined,
                  botMission: (botSettings as Record<string, unknown>)?.botMission as string | undefined,
                  companyKnowledge: (botSettings as Record<string, unknown>)?.companyKnowledge as string | undefined,
                  welcomeMessage: botSettings?.welcomeMessage ?? undefined,
                  enabledProjectIds: (botSettings as Record<string, unknown>)?.enabledProjectIds as string[] | null | undefined,
                },
                isFirstBotInteraction,
                kbItems,
              );

              const leadUpdates: Partial<Lead> = {
                botStage: botResult.nextStage,
              };
              if (botResult.extractedName && (!lead.name || lead.name.startsWith("واتساب -"))) {
                leadUpdates.name = botResult.extractedName;
              }
              if (botResult.extractedBudget && !lead.budget) {
                leadUpdates.budget = botResult.extractedBudget;
              }
              if (botResult.extractedUnitType && !lead.unitType) {
                leadUpdates.unitType = botResult.extractedUnitType;
              }
              if (botResult.extractedBedrooms && !lead.bedrooms) {
                leadUpdates.bedrooms = botResult.extractedBedrooms;
              }
              if (botResult.extractedBathrooms && !lead.bathrooms) {
                leadUpdates.bathrooms = botResult.extractedBathrooms;
              }
              if (botResult.extractedLocation && !lead.location) {
                leadUpdates.location = botResult.extractedLocation;
              }
              if (botResult.extractedArea && !lead.area) {
                leadUpdates.area = botResult.extractedArea;
              }
              if (botResult.extractedPaymentType && !lead.paymentType) {
                leadUpdates.paymentType = botResult.extractedPaymentType;
              }
              if (botResult.extractedDownPayment && !lead.downPayment) {
                leadUpdates.downPayment = botResult.extractedDownPayment;
              }
              if (botResult.extractedProject && !lead.preferredProject) {
                leadUpdates.preferredProject = botResult.extractedProject;
              }
              if (botResult.extractedTimeline && !lead.timeline) {
                leadUpdates.timeline = botResult.extractedTimeline;
              }
              if (botResult.extractedPhone && !lead.phone2) {
                const cleanPhone = botResult.extractedPhone.replace(/\D/g, "");
                if (/^01[0-9]{9}$/.test(cleanPhone)) {
                  leadUpdates.phone2 = cleanPhone;
                }
              }


                // ── Execute Bot Actions (CRM automation) ──────────────────────
                const botActionsSummaryParts: string[] = [];
                if (botResult.botActions && botResult.botActions.length > 0) {
                  const allStates = await storage.getAllStates();
                  const notifTargetForActions = lead.assignedTo || userId;
                  const leadDisplayNameForActions = leadUpdates.name || lead.name || phone;

                  for (const action of botResult.botActions) {
                    try {
                      if (action.type === "change_state" && action.stateName) {
                        const targetState = allStates.find(s =>
                          s.name === action.stateName ||
                          s.name.includes(action.stateName!)
                        );
                        if (targetState) {
                          leadUpdates.stateId = targetState.id;
                          // Stop the bot for terminal states (uninterested / canceled)
                          const terminalStateNames = ["غير مهتم", "ملغي", "cancelled", "not_interested"];
                          const isTerminal = terminalStateNames.some(n => targetState.name.includes(n) || (action.stateName && action.stateName.includes(n)));
                          if (isTerminal) {
                            leadUpdates.botActive = false;
                            leadUpdates.botStage = "handed_off";
                            console.log(`[BotAction] Bot deactivated for terminal state: ${targetState.name}`);
                          }
                          botActionsSummaryParts.push(`تغيير الحالة: ${targetState.name}`);
                          await storage.createHistory({
                            leadId: lead.id,
                            action: `البوت غيّر الحالة لـ "${targetState.name}"`,
                            description: `إجراء تلقائي من البوت بناءً على رسالة العميل`,
                            performedBy: "البوت",
                          });
                          await storage.createNotification({
                            userId: notifTargetForActions,
                            type: "bot_action",
                            message: `🤖 البوت غيّر حالة الليد لـ "${targetState.name}" — ${leadDisplayNameForActions}`,
                            leadId: lead.id,
                            isRead: false,
                          });
                          console.log(`[BotAction] change_state: ${targetState.name} for lead ${lead.id}`);
                        }
                      } else if (action.type === "create_reminder" && action.isoDate) {
                        const reminderDate = new Date(action.isoDate);
                        if (!isNaN(reminderDate.getTime())) {
                          const reminderNote = action.note || `متابعة بوت واتساب — ${leadDisplayNameForActions}`;
                          await storage.createReminder({
                            leadId: lead.id,
                            userId: notifTargetForActions,
                            title: reminderNote,
                            dueDate: reminderDate,
                            priority: "medium",
                            isCompleted: false,
                          });
                          const formattedDate = reminderDate.toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                          botActionsSummaryParts.push(`تذكير متابعة: ${formattedDate}`);
                          await storage.createHistory({
                            leadId: lead.id,
                            action: `البوت حدّد موعد متابعة`,
                            description: `${reminderNote} — ${formattedDate}`,
                            performedBy: "البوت",
                          });
                          await storage.createNotification({
                            userId: notifTargetForActions,
                            type: "bot_action",
                            message: `🤖 البوت حدّد موعد متابعة — ${leadDisplayNameForActions}: ${reminderNote} (${formattedDate})`,
                            leadId: lead.id,
                            isRead: false,
                          });
                          console.log(`[BotAction] create_reminder: ${action.isoDate} for lead ${lead.id}`);
                        }
                      } else if (action.type === "update_score" && action.score) {
                        leadUpdates.score = action.score;
                        const scoreLabels: Record<string, string> = { hot: "ساخن", warm: "دافئ", cold: "بارد" };
                        botActionsSummaryParts.push(`تقييم: ${scoreLabels[action.score] || action.score}`);
                        // For high-interest leads, also progress state if still at "ليد جديد"
                        if (action.score === "hot") {
                          const currentStateId = lead.stateId;
                          const currentState = allStates.find(s => s.id === currentStateId);
                          const isNewLead = !currentState || currentState.order === 0;
                          if (isNewLead) {
                            const followUpState = allStates.find(s => s.name === "تحت المتابعة" || s.order === 1);
                            if (followUpState && !leadUpdates.stateId) {
                              leadUpdates.stateId = followUpState.id;
                              botActionsSummaryParts.push(`تقدّم للحالة: ${followUpState.name}`);
                            }
                          }
                        }
                        await storage.createNotification({
                          userId: notifTargetForActions,
                          type: "bot_action",
                          message: `🤖 البوت رصد اهتمام ${scoreLabels[action.score] || action.score} — ${leadDisplayNameForActions}`,
                          leadId: lead.id,
                          isRead: false,
                        });
                        console.log(`[BotAction] update_score: ${action.score} for lead ${lead.id}`);
                      } else if (action.type === "update_lead" && action.field && action.value !== undefined) {
                        const fieldMap: Record<string, string> = {
                          name: "name", budget: "budget", unitType: "unitType", bedrooms: "bedrooms",
                          bathrooms: "bathrooms", location: "location", area: "area",
                          paymentType: "paymentType", downPayment: "downPayment", email: "email", notes: "notes",
                        };
                        const dbField = fieldMap[action.field];
                        if (dbField) {
                          (leadUpdates as Record<string, unknown>)[dbField] = action.value;
                          botActionsSummaryParts.push(`تحديث ${action.field}: ${action.value}`);
                          console.log(`[BotAction] update_lead: ${action.field}=${action.value} for lead ${lead.id}`);
                        }
                      }
                    } catch (actionErr) {
                      console.error(`[BotAction] Error executing action ${action.type}:`, actionErr);
                    }
                  }
                }
                const botActionsSummary = botActionsSummaryParts.length > 0 ? botActionsSummaryParts.join(" | ") : null;
                // ── End Bot Actions ───────────────────────────────────────────

                const resolvedName = leadUpdates.name || lead.name;
              const resolvedBudget = leadUpdates.budget || lead.budget;
              const resolvedUnit = leadUpdates.unitType || lead.unitType;
              const allFieldsCollected = !!(resolvedName && !resolvedName.startsWith("واتساب -") && (resolvedBudget || resolvedUnit));

              if (botResult.shouldHandoff && allFieldsCollected) {
                leadUpdates.botActive = false;
                leadUpdates.botStage = "handed_off";

                // Send handoff message to client
                const handoffMsg = "شكراً جزيلاً على وقتك! 🙏 سيتواصل معك أحد مستشارينا في أقرب وقت ممكن.";
                await sendWhatsAppMessage(userId, phone, handoffMsg);
                await storage.logWhatsappMessage({
                  leadId: lead.id,
                  agentId: null,
                  agentName: "البوت",
                  templateId: null,
                  templateName: null,
                  phone,
                  direction: "outbound",
                  messageText: handoffMsg,
                  messageId: null,
                  isRead: false,
                  botActionsSummary: botActionsSummary ?? undefined,
                });

                const resolvedLocation = leadUpdates.location || lead.location;
                const resolvedPayment = leadUpdates.paymentType || lead.paymentType;
                const handoffParts = [`بيانات العميل: ${resolvedName || phone}`];
                if (resolvedBudget) handoffParts.push(`الميزانية: ${resolvedBudget}`);
                if (resolvedUnit) handoffParts.push(`نوع الوحدة: ${resolvedUnit}`);
                if (resolvedLocation) handoffParts.push(`الموقع: ${resolvedLocation}`);
                if (resolvedPayment) handoffParts.push(`الدفع: ${resolvedPayment}`);
                const handoffSummary = handoffParts.join(" | ");
                const notifTarget = lead.assignedTo || userId;
                await storage.createNotification({
                  userId: notifTarget,
                  type: "bot_handoff",
                  message: `🤖 البوت أحال عميلاً للمتابعة — ${resolvedName || phone}: ${handoffSummary}`,
                  leadId: lead.id,
                  isRead: false,
                });
              } else {
                // Send bot reply
                const botSendResult = await sendWhatsAppMessage(userId, phone, botResult.reply);
                if (!botSendResult.success) {
                  console.warn(`[Chatbot] sendWhatsAppMessage FAILED for ${phone}:`, botSendResult.error);
                } else {
                  console.log(`[Chatbot] sendWhatsAppMessage SUCCESS for ${phone}`);
                }
                await storage.logWhatsappMessage({
                  leadId: lead.id,
                  agentId: null,
                  agentName: "البوت",
                  templateId: null,
                  templateName: null,
                  phone,
                  direction: "outbound",
                  messageText: botSendResult.success ? botResult.reply : `[فشل الإرسال] ${botResult.reply}`,
                  messageId: null,
                  isRead: false,
                  botActionsSummary: botActionsSummary ?? undefined,
                });
              }

              // Apply updates to lead
              await storage.updateLead(lead.id, leadUpdates);
            } else {
              console.log(`[Chatbot] Skipped — respondAlways=${respondAlways}, outsideHours=${outsideHours} (working hours: ${botSettings?.workingHoursStart ?? 9}-${botSettings?.workingHoursEnd ?? 18})`);
            }
          } else {
            console.log(`[Chatbot] Skipped — botEnabled=${botEnabled}, leadBotActive=${leadBotActive}, botStage=${lead.botStage}`);
          }
        } catch (botErr) {
          console.error("[Chatbot] Bot reply error:", botErr);
        }
        // ── End Chatbot Logic ────────────────────────────────────────────────

        // Create notification for the assigned agent
        const notifUserId = lead.assignedTo || userId;
        const leadDisplayName = lead.name || phone;
        await storage.createNotification({
          userId: notifUserId,
          type: "whatsapp_message",
          message: isNewLead
            ? `رسالة واتساب جديدة — ليد جديد من ${phone}: ${msg.messageText.substring(0, 80)}`
            : `رسالة واتساب من ${leadDisplayName}: ${msg.messageText.substring(0, 80)}`,
          leadId: lead.id,
          isRead: false,
        });

        // Broadcast real-time SSE events to connected clients
        const ssePayload = { leadId: lead.id, phone, isNewLead };
        if (isNewLead) {
          broadcastToUser(userId, { type: "new_lead", payload: ssePayload });
          if (notifUserId !== userId) broadcastToUser(notifUserId, { type: "new_lead", payload: ssePayload });
        } else {
          broadcastToUser(userId, { type: "new_whatsapp_message", payload: ssePayload });
          if (notifUserId !== userId) broadcastToUser(notifUserId, { type: "new_whatsapp_message", payload: ssePayload });
        }
        broadcastToUser(notifUserId, { type: "new_notification", payload: {} });

      } catch (err) {
        console.error("[WhatsApp] Error in incoming message handler:", err);
      }
    });
  }

  // ── WhatsApp Campaigns ────────────────────────────────────────────────────
  // GET /api/campaigns — list all campaigns
  app.get("/api/campaigns", isAuthenticated, requireRole(["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"]), async (_req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
    } catch (err) {
      console.error("Get campaigns error:", err);
      res.status(500).json({ error: "فشل في تحميل الحملات" });
    }
  });

  // POST /api/campaigns/preview — count leads matching filter
  app.post("/api/campaigns/preview", isAuthenticated, requireRole(["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"]), async (req, res) => {
    try {
      const { filterStateId, filterChannel, filterDaysNoReply } = req.body as { filterStateId?: string; filterChannel?: string; filterDaysNoReply?: number };
      const matchedLeads = await storage.getLeadsForCampaignFilter(filterStateId, filterChannel, filterDaysNoReply);
      res.json({ count: matchedLeads.length, leads: matchedLeads.slice(0, 5).map(l => ({ id: l.id, name: l.name, phone: l.phone })) });
    } catch (err) {
      console.error("Preview campaign error:", err);
      res.status(500).json({ error: "فشل في معاينة الليدز" });
    }
  });

  // POST /api/campaigns — create campaign and prepare recipients
  app.post("/api/campaigns", isAuthenticated, requireRole(["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"]), async (req, res) => {
    try {
      const parsed = insertWhatsappCampaignSchema.safeParse({ ...req.body, createdBy: req.user!.id });
      if (!parsed.success) return res.status(400).json({ error: "بيانات غير صحيحة", details: parsed.error.flatten() });

      const campaign = await storage.createCampaign(parsed.data);

      const matchedLeads = await storage.getLeadsForCampaignFilter(
        parsed.data.filterStateId ?? null,
        parsed.data.filterChannel ?? null,
        parsed.data.filterDaysNoReply ?? null
      );

      const recipients = matchedLeads
        .filter(l => l.phone)
        .map(l => ({ campaignId: campaign.id, leadId: l.id, phone: l.phone! }));

      await storage.createCampaignRecipients(recipients);
      await storage.updateCampaign(campaign.id, { totalCount: recipients.length });

      res.status(201).json({ ...campaign, totalCount: recipients.length });
    } catch (err) {
      console.error("Create campaign error:", err);
      res.status(500).json({ error: "فشل في إنشاء الحملة" });
    }
  });

  // GET /api/campaigns/:id/recipients — get recipients for a campaign
  app.get("/api/campaigns/:id/recipients", isAuthenticated, requireRole(["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"]), async (req, res) => {
    try {
      const recipients = await storage.getCampaignRecipients(req.params.id);
      res.json(recipients);
    } catch (err) {
      console.error("Get recipients error:", err);
      res.status(500).json({ error: "فشل في تحميل المستلمين" });
    }
  });

  // DELETE /api/campaigns/:id — cancel/delete a campaign
  app.delete("/api/campaigns/:id", isAuthenticated, requireRole(["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"]), async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "الحملة غير موجودة" });
      if (campaign.status === "running") return res.status(400).json({ error: "لا يمكن حذف حملة جارية" });
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete campaign error:", err);
      res.status(500).json({ error: "فشل في حذف الحملة" });
    }
  });

  // ── WhatsApp Follow-up Rules ──────────────────────────────────────────────
  // GET /api/followup-rules
  app.get("/api/followup-rules", isAuthenticated, requireRole(["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"]), async (_req, res) => {
    try {
      const rules = await storage.getAllFollowupRules();
      res.json(rules);
    } catch (err) {
      console.error("Get followup rules error:", err);
      res.status(500).json({ error: "فشل في تحميل قواعد المتابعة" });
    }
  });

  // POST /api/followup-rules
  app.post("/api/followup-rules", isAuthenticated, requireRole(["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"]), async (req, res) => {
    try {
      const parsed = insertWhatsappFollowupRuleSchema.safeParse({ ...req.body, createdBy: req.user!.id });
      if (!parsed.success) return res.status(400).json({ error: "بيانات غير صحيحة", details: parsed.error.flatten() });
      const rule = await storage.createFollowupRule(parsed.data);
      res.status(201).json(rule);
    } catch (err) {
      console.error("Create followup rule error:", err);
      res.status(500).json({ error: "فشل في إنشاء قاعدة المتابعة" });
    }
  });

  // PATCH /api/followup-rules/:id — update (toggle active/inactive)
  app.patch("/api/followup-rules/:id", isAuthenticated, requireRole(["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"]), async (req, res) => {
    try {
      const rule = await storage.updateFollowupRule(req.params.id, req.body as Partial<{ isActive: boolean; message: string; daysAfterNoReply: number; name: string }>);
      if (!rule) return res.status(404).json({ error: "القاعدة غير موجودة" });
      res.json(rule);
    } catch (err) {
      console.error("Update followup rule error:", err);
      res.status(500).json({ error: "فشل في تحديث القاعدة" });
    }
  });

  // DELETE /api/followup-rules/:id
  app.delete("/api/followup-rules/:id", isAuthenticated, requireRole(["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"]), async (req, res) => {
    try {
      const deleted = await storage.deleteFollowupRule(req.params.id);
      if (!deleted) return res.status(404).json({ error: "القاعدة غير موجودة" });
      res.json({ success: true });
    } catch (err) {
      console.error("Delete followup rule error:", err);
      res.status(500).json({ error: "فشل في حذف القاعدة" });
    }
  });

  // ── Campaign Cron Job (every 60s) ─────────────────────────────────────────
  let cronRunning = false;
  setInterval(async () => {
    if (cronRunning) return;
    cronRunning = true;
    try {
      // 1. Send pending scheduled campaigns
      const pendingCampaigns = await storage.getPendingCampaigns();
      for (const campaign of pendingCampaigns) {
        try {
          await storage.updateCampaign(campaign.id, { status: "running" });
          const recipients = await storage.getCampaignRecipients(campaign.id);
          const pendingRecipients = recipients.filter(r => r.status === "pending");
          let sentCount = campaign.sentCount ?? 0;
          let failedCount = campaign.failedCount ?? 0;

          for (const recipient of pendingRecipients) {
            try {
              const result = await sendWhatsAppMessage(campaign.createdBy, recipient.phone, campaign.message);
              if (result.success) {
                await storage.updateRecipientStatus(recipient.id, "sent", new Date());
                sentCount++;
              } else {
                await storage.updateRecipientStatus(recipient.id, "failed", undefined, result.error);
                failedCount++;
              }
            } catch (sendErr) {
              await storage.updateRecipientStatus(recipient.id, "failed", undefined, sendErr instanceof Error ? sendErr.message : "خطأ غير معروف");
              failedCount++;
            }
            // Delay 3-6s between messages to avoid spam detection
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000));
          }

          const allDone = await storage.getCampaignRecipients(campaign.id);
          const stillPending = allDone.filter(r => r.status === "pending").length;
          await storage.updateCampaign(campaign.id, {
            status: stillPending === 0 ? "completed" : "running",
            sentCount,
            failedCount,
          });

          console.log(`[Campaign] ${campaign.name}: sent=${sentCount}, failed=${failedCount}`);
        } catch (campErr) {
          console.error(`[Campaign] Error processing campaign ${campaign.id}:`, campErr instanceof Error ? campErr.message : campErr);
          await storage.updateCampaign(campaign.id, { status: "draft" }).catch(() => {});
        }
      }

      // 2. Check follow-up rules
      const activeRules = await storage.getActiveFollowupRules();
      for (const rule of activeRules) {
        try {
          const eligibleLeads = await storage.getLeadsForFollowupRule(rule.daysAfterNoReply);
          let ruleRunCount = 0;

          for (const lead of eligibleLeads) {
            if (!lead.phone || !lead.assignedTo) continue;
            try {
              const result = await sendWhatsAppMessage(lead.assignedTo, lead.phone, rule.message);
              if (result.success) {
                ruleRunCount++;
                await storage.logWhatsappMessage({
                  leadId: lead.id,
                  userId: lead.assignedTo,
                  direction: "outbound",
                  messageText: rule.message,
                  messageId: null,
                  isRead: false,
                });
                await storage.createHistory({
                  leadId: lead.id,
                  action: "whatsapp_followup",
                  performedBy: lead.assignedTo,
                  notes: `رسالة متابعة تلقائية (${rule.name}): ${rule.message.substring(0, 60)}...`,
                  createdAt: new Date(),
                });
              }
            } catch (leadErr) {
              console.error(`[FollowUp] Error sending to lead ${lead.id}:`, leadErr instanceof Error ? leadErr.message : leadErr);
            }
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000));
          }

          if (ruleRunCount > 0) {
            await storage.updateFollowupRule(rule.id, { lastRunAt: new Date() });
            console.log(`[FollowUp] Rule "${rule.name}": sent to ${ruleRunCount} leads`);
          }
        } catch (ruleErr) {
          console.error(`[FollowUp] Error processing rule ${rule.id}:`, ruleErr instanceof Error ? ruleErr.message : ruleErr);
        }
      }
    } catch (err) {
      console.error("[Cron] Campaign/FollowUp job error:", err instanceof Error ? err.message : err);
    } finally {
      cronRunning = false;
    }
  }, 60_000);

  // When a WhatsApp LID is resolved to a real phone, update any existing lead in DB
  onLidResolved(async (lidJid: string, realPhone: string) => {
    try {
      const lidPhone = lidJid.split("@")[0]; // e.g. "143013904912429"
      const existingLead = await storage.findLeadByPhone(lidPhone);
      if (existingLead) {
        await storage.updateLead(existingLead.id, { phone: realPhone });
        console.log(`[WhatsApp] Updated lead ${existingLead.id} phone: ${lidPhone} → ${realPhone}`);
      }
    } catch (err) {
      console.error("[WhatsApp] Error updating lead phone from LID resolution:", err);
    }
  });

  // Restore WhatsApp sessions on startup and register incoming message handlers
  restoreSessionsOnStartup()
    .then(async () => {
      const allUsers = await storage.getAllUsers();
      for (const user of allUsers) {
        registerWAIncomingHandler(user.id);
      }
    })
    .catch(console.error);

  // ── Meta (Messenger / Instagram) Integration ──────────────────────────────

  const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN ?? "crm_meta_verify_token";

  // GET /api/meta/webhook — Meta webhook verification challenge
  app.get("/api/meta/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
      console.log("[Meta] Webhook verified");
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Verification failed" });
  });

  // POST /api/meta/webhook — receive Messenger and Instagram messages
  app.post("/api/meta/webhook", async (req, res) => {
    // Verify Meta webhook signature — fail-closed for security
    const META_APP_SECRET = process.env.META_APP_SECRET;
    if (!META_APP_SECRET) {
      // No secret configured: reject all inbound webhook events to prevent forged payload abuse
      console.warn("[Meta] META_APP_SECRET not set — rejecting webhook. Configure META_APP_SECRET to enable inbound message processing.");
      return res.status(200).send("EVENT_RECEIVED"); // Acknowledge to Meta but do not process
    }

    // Verify X-Hub-Signature-256 using raw body bytes
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    if (!signature) {
      console.warn("[Meta] Missing X-Hub-Signature-256 header — rejecting webhook");
      return res.status(403).json({ error: "Missing signature" });
    }
    const crypto = await import("crypto");
    const rawBodyBuffer = (req as unknown as { rawBody?: Buffer }).rawBody;
    const rawBytes = rawBodyBuffer ?? Buffer.from(JSON.stringify(req.body));
    const expected = `sha256=${crypto.createHmac("sha256", META_APP_SECRET).update(rawBytes).digest("hex")}`;
    const signatureHash = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    const expectedHash = expected.slice(7);
    let sigValid = true;
    try {
      sigValid = crypto.timingSafeEqual(Buffer.from(signatureHash, "hex"), Buffer.from(expectedHash, "hex"));
    } catch {
      sigValid = false;
    }
    if (!sigValid) {
      console.warn("[Meta] Invalid webhook signature — rejecting");
      return res.status(403).json({ error: "Invalid signature" });
    }

    res.status(200).send("EVENT_RECEIVED");
    try {
      const { parseMetaWebhookPayload, sendMetaMessage } = await import("./meta");
      const messages = parseMetaWebhookPayload(req.body as Record<string, unknown>);
      if (messages.length === 0) return;

      const pageConn = await storage.getMetaPageConnection();
      if (!pageConn) return;

      for (const msg of messages) {
        try {
          // Skip if it's the page itself messaging (echo)
          if (msg.senderId === pageConn.pageId) continue;
          if (msg.platform === "instagram" && msg.senderId === pageConn.instagramAccountId) continue;

          // Deduplicate
          if (msg.messageId) {
            const existing = await storage.findSocialMessageById(msg.messageId);
            if (existing) continue;
          }

          const platform = msg.platform;
          const channelLabel = platform === "instagram" ? "إنستجرام" : "ماسنجر";

          // Find or create lead by sender ID
          let lead = await storage.findLeadBySenderId(msg.senderId, platform);
          let isNewLead = false;

          if (!lead) {
            isNewLead = true;
            const allStates = await storage.getAllStates();
            const newLeadState = allStates.find((s) => s.name === "ليد جديد" || s.order === 0);
            const senderName = msg.senderName || `${channelLabel} - ${msg.senderId}`;
            lead = await storage.createLead({
              name: senderName,
              phone: msg.senderId,
              channel: channelLabel,
              stateId: newLeadState?.id ?? null,
            });
            console.log(`[Meta] Auto-created lead ${lead.id} for ${platform} sender ${msg.senderId}`);
          }

          // Get prior messages for bot context
          const priorMessages = await storage.getSocialMessagesByLead(lead.id, platform);
          const isFirstBotInteraction = priorMessages.filter((m) => m.direction === "outbound" && m.agentName === "البوت").length === 0;

          // Log inbound message
          await storage.logSocialMessage({
            leadId: lead.id,
            platform,
            senderId: msg.senderId,
            direction: "inbound",
            messageText: msg.messageText,
            messageId: msg.messageId || null,
            isRead: false,
            createdAt: msg.timestamp,
          });

          await storage.createHistory({
            leadId: lead.id,
            action: `رسالة ${channelLabel} واردة`,
            description: `رسالة من ${msg.senderId}: ${msg.messageText.substring(0, 100)}${msg.messageText.length > 100 ? "..." : ""}`,
            performedBy: channelLabel,
          });

          // Notification for assigned agent
          const notifUserId = lead.assignedTo || pageConn.connectedBy || "";
          if (notifUserId) {
            await storage.createNotification({
              userId: notifUserId,
              type: "social_message",
              message: isNewLead
                ? `رسالة ${channelLabel} جديدة — ليد جديد: ${msg.messageText.substring(0, 80)}`
                : `رسالة ${channelLabel} من ${lead.name || msg.senderId}: ${msg.messageText.substring(0, 80)}`,
              leadId: lead.id,
              isRead: false,
            });
          }

          // ── Bot Logic ──────────────────────────────────────────────────
          try {
            const assignedUserId = lead.assignedTo || pageConn.connectedBy || "";
            if (!assignedUserId) continue;

            const botSettings = await storage.getChatbotSettings(assignedUserId);
            const botEnabled = botSettings?.isActive === true;
            const leadBotActive = lead.botActive !== false;

            if (botEnabled && leadBotActive && lead.botStage !== "handed_off") {
              const respondAlways = botSettings?.respondAlways === true;
              const outsideHours = isOutsideWorkingHours(
                botSettings?.workingHoursStart ?? 9,
                botSettings?.workingHoursEnd ?? 18
              );

              if (respondAlways || outsideHours) {
                const { generateBotReply } = await import("./ai");
                const stageMap: Record<string, BotStage> = {
                  collecting_budget: "collecting_needs",
                  collecting_unit: "collecting_needs",
                  collecting_rooms: "collecting_needs",
                };
                const rawStage = lead.botStage ?? "greeting";
                const currentStage: BotStage = (stageMap[rawStage] ?? rawStage) as BotStage;

                const allProjects = await storage.getAllProjects();
                const activeProjects = allProjects.filter((p) => p.isActive !== false);
                const allUnits = await storage.getAllUnits();

                // Map social messages to WhatsappMessagesLog shape for AI
                const priorForBot = priorMessages.map((m) => ({
                  ...m,
                  agentId: null,
                  templateId: null,
                  templateName: null,
                  phone: msg.senderId,
                  messageId: m.messageId,
                  botActionsSummary: m.botActionsSummary,
                })) as unknown as import("@shared/schema").WhatsappMessagesLog[];

                const integSettings = await storage.getIntegrationSettings().catch(() => null);
                const botResult = await generateBotReply(
                  msg.messageText,
                  currentStage,
                  lead,
                  priorForBot,
                  activeProjects,
                  allUnits,
                  {
                    botName: botSettings?.botName ?? undefined,
                    companyName: botSettings?.companyName ?? undefined,
                    botRole: botSettings?.botRole ?? undefined,
                    botPersonality: botSettings?.botPersonality ?? undefined,
                    botMission: botSettings?.botMission ?? undefined,
                    companyKnowledge: botSettings?.companyKnowledge ?? undefined,
                    welcomeMessage: botSettings?.welcomeMessage ?? undefined,
                    enabledProjectIds: botSettings?.enabledProjectIds ?? undefined,
                    openAiApiKey: integSettings?.openAiApiKey ?? undefined,
                    openAiModel: integSettings?.openAiModel ?? undefined,
                  },
                  isFirstBotInteraction
                );

                const leadUpdates: Partial<Lead> = { botStage: botResult.nextStage };
                if (botResult.extractedName && (!lead.name || lead.name.startsWith(`${channelLabel} -`))) {
                  leadUpdates.name = botResult.extractedName;
                }
                if (botResult.extractedBudget && !lead.budget) leadUpdates.budget = botResult.extractedBudget;
                if (botResult.extractedUnitType && !lead.unitType) leadUpdates.unitType = botResult.extractedUnitType;
                if (botResult.extractedBedrooms && !lead.bedrooms) leadUpdates.bedrooms = botResult.extractedBedrooms;
                if (botResult.extractedBathrooms && !lead.bathrooms) leadUpdates.bathrooms = botResult.extractedBathrooms;
                if (botResult.extractedLocation && !lead.location) leadUpdates.location = botResult.extractedLocation;
                if (botResult.extractedArea && !lead.area) leadUpdates.area = botResult.extractedArea;
                if (botResult.extractedPaymentType && !lead.paymentType) leadUpdates.paymentType = botResult.extractedPaymentType;
                if (botResult.extractedDownPayment && !lead.downPayment) leadUpdates.downPayment = botResult.extractedDownPayment;
                if (botResult.extractedProject && !lead.preferredProject) leadUpdates.preferredProject = botResult.extractedProject;
                if (botResult.extractedTimeline && !lead.timeline) leadUpdates.timeline = botResult.extractedTimeline;

                // Bot CRM actions
                const botActionsSummaryParts: string[] = [];
                if (botResult.botActions && botResult.botActions.length > 0) {
                  const allStates = await storage.getAllStates();
                  const notifTarget = lead.assignedTo || assignedUserId;
                  const leadDisplayName = leadUpdates.name || lead.name || msg.senderId;
                  for (const action of botResult.botActions) {
                    try {
                      if (action.type === "change_state" && action.stateName) {
                        const targetState = allStates.find((s) => s.name === action.stateName || s.name.includes(action.stateName!));
                        if (targetState) {
                          leadUpdates.stateId = targetState.id;
                          const terminalStateNames = ["غير مهتم", "ملغي", "cancelled", "not_interested"];
                          const isTerminal = terminalStateNames.some((n) => targetState.name.includes(n) || (action.stateName && action.stateName.includes(n)));
                          if (isTerminal) {
                            leadUpdates.botActive = false;
                            leadUpdates.botStage = "handed_off";
                          }
                          botActionsSummaryParts.push(`تغيير الحالة: ${targetState.name}`);
                          await storage.createNotification({ userId: notifTarget, type: "bot_action", message: `🤖 البوت غيّر حالة الليد لـ "${targetState.name}" — ${leadDisplayName}`, leadId: lead.id, isRead: false });
                        }
                      } else if (action.type === "create_reminder" && action.isoDate) {
                        const reminderDate = new Date(action.isoDate);
                        if (!isNaN(reminderDate.getTime())) {
                          const note = action.note || `متابعة بوت ${channelLabel} — ${leadDisplayName}`;
                          await storage.createReminder({ leadId: lead.id, userId: notifTarget, title: note, dueDate: reminderDate, priority: "medium", isCompleted: false });
                          botActionsSummaryParts.push(`تذكير: ${reminderDate.toLocaleString("ar-EG")}`);
                          await storage.createNotification({ userId: notifTarget, type: "bot_action", message: `🤖 البوت حدّد موعد متابعة — ${leadDisplayName}`, leadId: lead.id, isRead: false });
                        }
                      } else if (action.type === "update_score" && action.score) {
                        leadUpdates.score = action.score;
                        botActionsSummaryParts.push(`تقييم: ${action.score}`);
                      } else if (action.type === "update_lead" && action.field && action.value !== undefined) {
                        const fieldMap: Record<string, string> = {
                          name: "name", budget: "budget", unitType: "unitType", bedrooms: "bedrooms",
                          bathrooms: "bathrooms", location: "location", area: "area",
                          paymentType: "paymentType", downPayment: "downPayment", email: "email", notes: "notes",
                        };
                        const dbField = fieldMap[action.field];
                        if (dbField) {
                          (leadUpdates as Record<string, unknown>)[dbField] = action.value;
                          botActionsSummaryParts.push(`تحديث ${action.field}: ${action.value}`);
                          console.log(`[MetaBot] update_lead: ${action.field}=${action.value} for lead ${lead.id}`);
                        }
                      }
                    } catch (actionErr) {
                      console.error(`[MetaBot] Action ${action.type} error:`, actionErr);
                    }
                  }
                }

                const botActionsSummary = botActionsSummaryParts.length > 0 ? botActionsSummaryParts.join(" | ") : null;

                const resolvedName = leadUpdates.name || lead.name;
                const resolvedBudget = leadUpdates.budget || lead.budget;
                const resolvedUnit = leadUpdates.unitType || lead.unitType;
                const allFieldsCollected = !!(resolvedName && !resolvedName.startsWith(`${channelLabel} -`) && (resolvedBudget || resolvedUnit));

                if (botResult.shouldHandoff && allFieldsCollected) {
                  leadUpdates.botActive = false;
                  leadUpdates.botStage = "handed_off";
                  const handoffMsg = "شكراً جزيلاً على وقتك! 🙏 سيتواصل معك أحد مستشارينا في أقرب وقت ممكن.";
                  await sendMetaMessage(platform, msg.senderId, handoffMsg, pageConn.pageAccessToken);
                  await storage.logSocialMessage({ leadId: lead.id, platform, senderId: msg.senderId, direction: "outbound", messageText: handoffMsg, agentName: "البوت", isRead: false });
                  const notifTarget = lead.assignedTo || assignedUserId;
                  await storage.createNotification({ userId: notifTarget, type: "bot_handoff", message: `🤖 البوت أحال عميل ${channelLabel} للمتابعة — ${resolvedName || msg.senderId}`, leadId: lead.id, isRead: false });
                } else {
                  const sendResult = await sendMetaMessage(platform, msg.senderId, botResult.reply, pageConn.pageAccessToken);
                  await storage.logSocialMessage({
                    leadId: lead.id,
                    platform,
                    senderId: msg.senderId,
                    direction: "outbound",
                    messageText: sendResult.success ? botResult.reply : `[فشل الإرسال] ${botResult.reply}`,
                    agentName: "البوت",
                    isRead: false,
                    botActionsSummary: botActionsSummary ?? undefined,
                  });
                }

                await storage.updateLead(lead.id, leadUpdates);
              }
            }
          } catch (botErr) {
            console.error("[MetaBot] Bot reply error:", botErr);
          }
        } catch (msgErr) {
          console.error("[Meta] Error processing message:", msgErr);
        }
      }
    } catch (err) {
      console.error("[Meta] Webhook POST error:", err);
    }
  });

  // POST /api/meta/list-pages — list accessible Facebook pages for a user access token (OAuth flow support)
  app.post("/api/meta/list-pages", isAuthenticated, async (req, res) => {
    try {
      if (!canManageMeta(req.user?.role)) {
        return res.status(403).json({ error: "Only admins can manage page connections" });
      }
      const { userAccessToken } = req.body as { userAccessToken: string };
      if (!userAccessToken) {
        return res.status(400).json({ error: "userAccessToken is required" });
      }
      const { fetchPageDetails } = await import("./meta");
      const META_GRAPH_BASE = "https://graph.facebook.com/v19.0";
      const pagesRes = await fetch(`${META_GRAPH_BASE}/me/accounts`, {
        headers: { Authorization: `Bearer ${userAccessToken}` },
      });
      if (!pagesRes.ok) {
        return res.status(400).json({ error: "Failed to fetch pages from Facebook" });
      }
      const pagesData = (await pagesRes.json()) as { data: { id: string; name: string; access_token: string }[] };
      // Return only page metadata to the client — never expose access tokens
      const pages = await Promise.all(
        pagesData.data.map(async (p) => {
          const details = await fetchPageDetails(userAccessToken, p.id);
          return {
            id: p.id,
            name: p.name,
            instagramAccountId: details?.instagramAccountId,
          };
        })
      );
      res.json({ pages });
    } catch (err) {
      console.error("[Meta] List pages error:", err);
      res.status(500).json({ error: "Failed to list pages" });
    }
  });

  // GET /api/meta/connection — get current page connection status
  app.get("/api/meta/connection", isAuthenticated, async (_req, res) => {
    try {
      const conn = await storage.getMetaPageConnection();
      if (!conn) return res.json({ connected: false });
      const { pageAccessToken: _t, ...safeConn } = conn;
      res.json({ connected: true, ...safeConn });
    } catch (err) {
      console.error("[Meta] Get connection error:", err);
      res.status(500).json({ error: "Failed to get connection" });
    }
  });

  // Helper to check if user can manage Meta connections (admin-level only)
  const canManageMeta = (role: string | undefined) =>
    role === "super_admin" || role === "admin" || role === "sales_admin" || role === "company_owner";

  // POST /api/meta/connect — save page connection from OAuth callback
  app.post("/api/meta/connect", isAuthenticated, async (req, res) => {
    try {
      if (!canManageMeta(req.user?.role)) {
        return res.status(403).json({ error: "Only admins can manage page connections" });
      }
      const { userAccessToken, pageId } = req.body as { userAccessToken: string; pageId: string };
      if (!userAccessToken || !pageId) {
        return res.status(400).json({ error: "userAccessToken and pageId are required" });
      }
      const { fetchPageDetails } = await import("./meta");
      const details = await fetchPageDetails(userAccessToken, pageId);
      if (!details) {
        return res.status(400).json({ error: "لم يتم العثور على الصفحة أو لا يوجد صلاحية" });
      }
      const conn = await storage.upsertMetaPageConnection({
        pageId: details.pageId,
        pageName: details.pageName,
        pageAccessToken: details.pageAccessToken,
        instagramAccountId: details.instagramAccountId ?? null,
        connectedBy: req.user!.id,
        isActive: true,
      });
      const { pageAccessToken: _t, ...safeConn } = conn;
      res.json({ connected: true, ...safeConn });
    } catch (err) {
      console.error("[Meta] Connect error:", err);
      res.status(500).json({ error: "Failed to connect page" });
    }
  });

  // POST /api/meta/connect-manual — manually save page connection (for environments without full OAuth flow)
  app.post("/api/meta/connect-manual", isAuthenticated, async (req, res) => {
    try {
      if (!canManageMeta(req.user?.role)) {
        return res.status(403).json({ error: "Only admins can manage page connections" });
      }
      const { pageId, pageName, pageAccessToken, instagramAccountId } = req.body as {
        pageId: string;
        pageName: string;
        pageAccessToken: string;
        instagramAccountId?: string;
      };
      if (!pageId || !pageName || !pageAccessToken) {
        return res.status(400).json({ error: "pageId, pageName, and pageAccessToken are required" });
      }
      const conn = await storage.upsertMetaPageConnection({
        pageId,
        pageName,
        pageAccessToken,
        instagramAccountId: instagramAccountId ?? null,
        connectedBy: req.user!.id,
        isActive: true,
      });
      const { pageAccessToken: _t, ...safeConn } = conn;
      res.json({ connected: true, ...safeConn });
    } catch (err) {
      console.error("[Meta] Manual connect error:", err);
      res.status(500).json({ error: "Failed to save connection" });
    }
  });

  // DELETE /api/meta/connection — disconnect page
  app.delete("/api/meta/connection", isAuthenticated, async (req, res) => {
    try {
      if (!canManageMeta(req.user?.role)) {
        return res.status(403).json({ error: "Only admins can manage page connections" });
      }
      const conn = await storage.getMetaPageConnection();
      if (!conn) return res.json({ success: true });
      await storage.deleteMetaPageConnection(conn.pageId);
      res.json({ success: true });
    } catch (err) {
      console.error("[Meta] Disconnect error:", err);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  // GET /api/leads/:leadId/social-messages — get Messenger/Instagram messages for lead
  app.get("/api/leads/:leadId/social-messages", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const platform = req.query.platform as string | undefined;
      const messages = await storage.getSocialMessagesByLead(leadId, platform);
      res.json(messages);
    } catch (err) {
      console.error("[Meta] Get social messages error:", err);
      res.status(500).json({ error: "Failed to fetch social messages" });
    }
  });

  // POST /api/leads/:leadId/social-messages/send — send manual reply via Messenger/Instagram
  app.post("/api/leads/:leadId/social-messages/send", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const { messageText, platform } = req.body as { messageText: string; platform: string };
      if (!messageText || !platform) {
        return res.status(400).json({ error: "messageText and platform are required" });
      }

      // Validate recipient: always use the lead's phone (which stores the sender PSID) — never trust client-supplied senderId
      const senderId = lead.phone;
      if (!senderId) return res.status(400).json({ error: "Lead has no sender ID (phone) on record" });

      // Verify the lead is actually a Meta channel lead
      const channelLabel = platform === "instagram" ? "إنستجرام" : "ماسنجر";
      if (lead.channel !== channelLabel) {
        return res.status(400).json({ error: "Platform mismatch: lead channel does not match requested platform" });
      }

      const pageConn = await storage.getMetaPageConnection();
      if (!pageConn) return res.status(400).json({ error: "لا يوجد صفحة مرتبطة" });

      const { sendMetaMessage } = await import("./meta");
      const sendResult = await sendMetaMessage(platform as "messenger" | "instagram", senderId, messageText, pageConn.pageAccessToken);

      const user = req.user!;
      const agentName = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.username;

      const logged = await storage.logSocialMessage({
        leadId,
        platform,
        senderId,
        direction: "outbound",
        messageText: sendResult.success ? messageText : `[فشل] ${messageText}`,
        agentName,
        isRead: false,
      });

      if (sendResult.success) {
        await storage.createHistory({
          leadId,
          action: `رد ${platform === "instagram" ? "إنستجرام" : "ماسنجر"} يدوي`,
          description: `${agentName}: ${messageText.substring(0, 100)}`,
          performedBy: agentName,
        });
      }

      res.json(logged);
    } catch (err) {
      console.error("[Meta] Send social message error:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // POST /api/leads/:leadId/social-messages/read — mark messages as read
  app.post("/api/leads/:leadId/social-messages/read", isAuthenticated, async (req, res) => {
    try {
      const leadId = req.params.leadId as string;
      if (!(await canAccessLead(req.user, leadId))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { platform } = req.body as { platform: string };
      if (platform) {
        await storage.markSocialMessagesRead(leadId, platform);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[Meta] Mark read error:", err);
      res.status(500).json({ error: "Failed to mark read" });
    }
  });

  // GET /api/social-inbox — unified Messenger/Instagram inbox grouped by lead
  app.get("/api/social-inbox", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = (req.user as any)?.role ?? "sales_agent";
      const teamId = (req.user as any)?.teamId ?? null;
      const conversations = await storage.getSocialInbox(userId, userRole, teamId);
      res.json(conversations);
    } catch (error) {
      console.error("Social inbox error:", error);
      res.status(500).json({ error: "Failed to fetch social inbox" });
    }
  });

  // GET /api/meta/verify-token — return verify token for webhook setup guidance
  app.get("/api/meta/verify-token", isAuthenticated, async (_req, res) => {
    res.json({ verifyToken: META_VERIFY_TOKEN });
  });

  // GET /api/meta/app-config — return public Meta App ID for frontend OAuth
  app.get("/api/meta/app-config", isAuthenticated, async (_req, res) => {
    const appId = process.env.VITE_META_APP_ID || process.env.META_APP_ID || "";
    res.json({ appId });
  });

  // ==================== FUNNEL HEALTH ANALYTICS ====================

  app.get("/api/analytics/funnel-overview", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (_req, res) => {
    try {
      const data = await storage.getFunnelOverview();
      res.json(data);
    } catch (error) {
      console.error("Error fetching funnel overview:", error);
      res.status(500).json({ error: "Failed to fetch funnel overview" });
    }
  });

  app.get("/api/analytics/time-in-stage", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (_req, res) => {
    try {
      const data = await storage.getTimeInStage();
      res.json(data);
    } catch (error) {
      console.error("Error fetching time-in-stage:", error);
      res.status(500).json({ error: "Failed to fetch time-in-stage data" });
    }
  });

  app.get("/api/analytics/stale-leads", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (_req, res) => {
    try {
      const settings = await storage.getAllStaleLeadSettings();
      const thresholds: Record<string, number> = {};
      for (const s of settings) thresholds[s.stateId] = s.staleDays;
      const data = await storage.getStaleLeads(thresholds);
      res.json(data);
    } catch (error) {
      console.error("Error fetching stale leads:", error);
      res.status(500).json({ error: "Failed to fetch stale leads" });
    }
  });

  app.get("/api/analytics/agent-funnel", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (_req, res) => {
    try {
      const data = await storage.getAgentFunnelPerformance();
      res.json(data);
    } catch (error) {
      console.error("Error fetching agent funnel performance:", error);
      res.status(500).json({ error: "Failed to fetch agent funnel performance" });
    }
  });

  app.get("/api/analytics/lead-flow", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (_req, res) => {
    try {
      const data = await storage.getLeadFlow();
      res.json(data);
    } catch (error) {
      console.error("Error fetching lead flow:", error);
      res.status(500).json({ error: "Failed to fetch lead flow" });
    }
  });

  // Stale Lead Settings
  app.get("/api/analytics/stale-settings", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (_req, res) => {
    try {
      const data = await storage.getAllStaleLeadSettings();
      res.json(data);
    } catch (error) {
      console.error("Error fetching stale lead settings:", error);
      res.status(500).json({ error: "Failed to fetch stale lead settings" });
    }
  });

  app.put("/api/analytics/stale-settings/:stateId", isAuthenticated, requireRole("super_admin", "company_owner", "admin", "sales_manager"), async (req, res) => {
    try {
      const { stateId } = req.params;
      const { staleDays } = req.body;
      if (typeof staleDays !== "number" || staleDays < 1) {
        return res.status(400).json({ error: "staleDays must be a positive number" });
      }
      await storage.upsertStaleLeadSetting(stateId, staleDays);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating stale lead setting:", error);
      res.status(500).json({ error: "Failed to update stale lead setting" });
    }
  });

  // ==================== INTEGRATION SETTINGS ====================

  app.get("/api/integration-settings", isAuthenticated, requireRole("super_admin", "admin", "company_owner"), async (_req, res) => {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings) return res.json({});
      // Mask secrets before sending to frontend
      const masked = {
        ...settings,
        whatsappCloudToken: settings.whatsappCloudToken ? "••••••••" : null,
        openAiApiKey: settings.openAiApiKey ? "••••••••" : null,
      };
      res.json(masked);
    } catch (error) {
      console.error("Error fetching integration settings:", error);
      res.status(500).json({ error: "Failed to fetch integration settings" });
    }
  });

  app.put("/api/integration-settings", isAuthenticated, requireRole("super_admin", "admin", "company_owner"), async (req, res) => {
    try {
      const body = req.body as {
        whatsappCloudToken?: string;
        whatsappPhoneNumberId?: string;
        whatsappVerifyToken?: string;
        openAiApiKey?: string;
        openAiModel?: string;
      };

      // Load existing to avoid overwriting masked values
      const existing = await storage.getIntegrationSettings();
      const update: Record<string, unknown> = {};

      if (body.whatsappPhoneNumberId !== undefined) update.whatsappPhoneNumberId = body.whatsappPhoneNumberId || null;
      if (body.whatsappVerifyToken !== undefined) update.whatsappVerifyToken = body.whatsappVerifyToken || null;
      if (body.openAiModel !== undefined) update.openAiModel = body.openAiModel || null;
      // Only update secrets if a real value is provided (not masked)
      if (body.whatsappCloudToken && body.whatsappCloudToken !== "••••••••") {
        update.whatsappCloudToken = body.whatsappCloudToken;
      } else if (!body.whatsappCloudToken && existing) {
        update.whatsappCloudToken = existing.whatsappCloudToken;
      }
      if (body.openAiApiKey && body.openAiApiKey !== "••••••••") {
        update.openAiApiKey = body.openAiApiKey;
      } else if (!body.openAiApiKey && existing) {
        update.openAiApiKey = existing.openAiApiKey;
      }

      const saved = await storage.upsertIntegrationSettings(update);
      const masked = {
        ...saved,
        whatsappCloudToken: saved.whatsappCloudToken ? "••••••••" : null,
        openAiApiKey: saved.openAiApiKey ? "••••••••" : null,
      };
      res.json(masked);
    } catch (error) {
      console.error("Error saving integration settings:", error);
      res.status(500).json({ error: "Failed to save integration settings" });
    }
  });

  // ==================== WHATSAPP CLOUD API WEBHOOK ====================

  // GET /webhook/whatsapp — WhatsApp Cloud API verification challenge
  app.get("/webhook/whatsapp", async (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Accept token from DB settings or env var
    const settings = await storage.getIntegrationSettings().catch(() => null);
    const storedToken = settings?.whatsappVerifyToken || process.env.WHATSAPP_VERIFY_TOKEN || "whatsapp_verify_token";

    if (mode === "subscribe" && token === storedToken) {
      console.log("[WhatsAppCloud] Webhook verified");
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Verification failed" });
  });

  // POST /webhook/whatsapp — receive WhatsApp Cloud API messages
  app.post("/webhook/whatsapp", async (req, res) => {
    // Always acknowledge immediately
    res.status(200).send("EVENT_RECEIVED");

    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.whatsappCloudToken || !settings?.whatsappPhoneNumberId) {
        console.warn("[WhatsAppCloud] Webhook received but WhatsApp Cloud API not configured");
        return;
      }

      const { parseWhatsAppCloudPayload, sendWhatsAppCloudMessage, markWhatsAppCloudMessageRead } = await import("./whatsapp-cloud");
      const messages = parseWhatsAppCloudPayload(req.body as Record<string, unknown>);
      if (messages.length === 0) return;

      for (const msg of messages) {
        try {
          // Deduplicate by message ID
          const existing = await storage.findMessageByWhatsAppId(msg.messageId);
          if (existing) continue;

          // Find or create lead by phone
          let lead = await storage.findLeadByPhone(msg.phone);
          let isNewLead = false;

          if (!lead) {
            isNewLead = true;
            const allStates = await storage.getAllStates();
            const newLeadState = allStates.find((s) => s.name === "ليد جديد" || s.order === 0);
            lead = await storage.createLead({
              name: msg.senderName || msg.phone,
              phone: msg.phone,
              channel: "واتساب",
              stateId: newLeadState?.id ?? null,
            });
            console.log(`[WhatsAppCloud] Auto-created lead ${lead.id} for phone ${msg.phone}`);
          }

          // Log inbound message
          await storage.logWhatsappMessage({
            leadId: lead.id,
            phone: msg.phone,
            direction: "inbound",
            messageText: msg.messageText,
            messageId: msg.messageId,
            isRead: false,
            createdAt: msg.timestamp,
          });

          await storage.createHistory({
            leadId: lead.id,
            action: "رسالة واتساب واردة (Cloud API)",
            description: `من ${msg.phone}: ${msg.messageText.substring(0, 100)}${msg.messageText.length > 100 ? "..." : ""}`,
            performedBy: "واتساب",
          });

          // Mark as read
          await markWhatsAppCloudMessageRead(settings.whatsappPhoneNumberId!, settings.whatsappCloudToken!, msg.messageId);

          // Notification for admins
          try {
            const allUsers = await storage.getAllUsers();
            const adminRoles = ["super_admin", "company_owner", "admin"];
            const notifMsg = isNewLead
              ? `رسالة واتساب جديدة — عميل جديد: ${msg.messageText.substring(0, 80)}`
              : `رسالة واتساب من ${lead.name || msg.phone}: ${msg.messageText.substring(0, 80)}`;
            for (const u of allUsers) {
              if (u.role && adminRoles.includes(u.role)) {
                await storage.createNotification({ userId: u.id, type: "whatsapp_message", message: notifMsg, leadId: lead.id, isRead: false });
              }
            }
            if (lead.assignedTo) {
              const assignedUser = allUsers.find(u => u.username === lead.assignedTo || u.id === lead.assignedTo);
              if (assignedUser && !adminRoles.includes(assignedUser.role ?? "")) {
                await storage.createNotification({ userId: assignedUser.id, type: "whatsapp_message", message: notifMsg, leadId: lead.id, isRead: false });
              }
            }
          } catch (notifErr) {
            console.error("[WhatsAppCloud] Notification error:", notifErr);
          }

          // ── Bot Logic ──────────────────────────────────────────────────
          const botActive = lead.botActive !== false;
          if (!botActive || lead.botStage === "handed_off") continue;

          // Find an admin/owner to look up chatbot settings
          const allUsers = await storage.getAllUsers();
          const adminUser = allUsers.find(u => ["super_admin", "company_owner", "admin"].includes(u.role ?? ""));
          const settingsUserId = lead.assignedTo
            ? (allUsers.find(u => u.username === lead.assignedTo || u.id === lead.assignedTo)?.id ?? adminUser?.id)
            : adminUser?.id;

          if (!settingsUserId) continue;

          const botSettings = await storage.getChatbotSettings(settingsUserId);
          const botEnabled = botSettings?.isActive === true;
          if (!botEnabled) continue;

          const respondAlways = botSettings?.respondAlways === true;
          const outsideHours = isOutsideWorkingHours(
            botSettings?.workingHoursStart ?? 9,
            botSettings?.workingHoursEnd ?? 18
          );

          if (!respondAlways && !outsideHours) continue;

          const { generateBotReply } = await import("./ai");
          const stageMap: Record<string, BotStage> = {
            collecting_budget: "collecting_needs",
            collecting_unit: "collecting_needs",
            collecting_rooms: "collecting_needs",
          };
          const rawStage = lead.botStage ?? "greeting";
          const currentStage: BotStage = (stageMap[rawStage] ?? rawStage) as BotStage;

          const allProjects = await storage.getAllProjects();
          const activeProjects = allProjects.filter((p) => p.isActive !== false);
          const allUnits = await storage.getAllUnits();
          const priorMessages = await storage.getWhatsappConversation(lead.id);
          const isFirstBotInteraction = priorMessages.filter(m => m.direction === "outbound" && m.agentName === "البوت").length === 0;

          const botResult = await generateBotReply(
            msg.messageText,
            currentStage,
            lead,
            priorMessages,
            activeProjects,
            allUnits,
            {
              botName: botSettings?.botName ?? undefined,
              companyName: botSettings?.companyName ?? undefined,
              botRole: botSettings?.botRole ?? undefined,
              botPersonality: botSettings?.botPersonality ?? undefined,
              botMission: botSettings?.botMission ?? undefined,
              companyKnowledge: botSettings?.companyKnowledge ?? undefined,
              welcomeMessage: botSettings?.welcomeMessage ?? undefined,
              enabledProjectIds: botSettings?.enabledProjectIds ?? undefined,
              openAiApiKey: settings.openAiApiKey ?? undefined,
              openAiModel: settings.openAiModel ?? undefined,
            },
            isFirstBotInteraction
          );

          const leadUpdates: Partial<Lead> = { botStage: botResult.nextStage };
          if (botResult.extractedName && !lead.name) leadUpdates.name = botResult.extractedName;
          if (botResult.extractedBudget && !lead.budget) leadUpdates.budget = botResult.extractedBudget;
          if (botResult.extractedUnitType && !lead.unitType) leadUpdates.unitType = botResult.extractedUnitType;
          if (botResult.extractedBedrooms && !lead.bedrooms) leadUpdates.bedrooms = botResult.extractedBedrooms;
          if (botResult.extractedBathrooms && !lead.bathrooms) leadUpdates.bathrooms = botResult.extractedBathrooms;
          if (botResult.extractedLocation && !lead.location) leadUpdates.location = botResult.extractedLocation;
          if (botResult.extractedArea && !lead.area) leadUpdates.area = botResult.extractedArea;
          if (botResult.extractedPaymentType && !lead.paymentType) leadUpdates.paymentType = botResult.extractedPaymentType;
          if (botResult.extractedDownPayment && !lead.downPayment) leadUpdates.downPayment = botResult.extractedDownPayment;
          if (botResult.extractedProject && !lead.preferredProject) leadUpdates.preferredProject = botResult.extractedProject;
          if (botResult.extractedTimeline && !lead.timeline) leadUpdates.timeline = botResult.extractedTimeline;

          // Bot CRM actions
          const botActionsSummaryParts: string[] = [];
          if (botResult.botActions && botResult.botActions.length > 0) {
            const allStatesList = await storage.getAllStates();
            const notifTarget = lead.assignedTo || settingsUserId;
            const leadDisplayName = leadUpdates.name || lead.name || msg.phone;
            for (const action of botResult.botActions) {
              try {
                if (action.type === "change_state" && action.stateName) {
                  const targetState = allStatesList.find(s => s.name === action.stateName || s.name.includes(action.stateName!));
                  if (targetState) {
                    leadUpdates.stateId = targetState.id;
                    const terminalStateNames = ["غير مهتم", "ملغي", "cancelled", "not_interested"];
                    if (terminalStateNames.some(n => targetState.name.includes(n) || (action.stateName && action.stateName.includes(n)))) {
                      leadUpdates.botActive = false;
                      leadUpdates.botStage = "handed_off";
                    }
                    botActionsSummaryParts.push(`تغيير الحالة: ${targetState.name}`);
                    await storage.createNotification({ userId: notifTarget, type: "bot_action", message: `🤖 البوت غيّر حالة الليد لـ "${targetState.name}" — ${leadDisplayName}`, leadId: lead.id, isRead: false });
                  }
                } else if (action.type === "create_reminder" && action.isoDate) {
                  const reminderDate = new Date(action.isoDate);
                  if (!isNaN(reminderDate.getTime())) {
                    const note = action.note || `متابعة بوت واتساب — ${leadDisplayName}`;
                    await storage.createReminder({ leadId: lead.id, userId: notifTarget, title: note, dueDate: reminderDate, priority: "medium", isCompleted: false });
                    botActionsSummaryParts.push(`تذكير: ${reminderDate.toLocaleString("ar-EG")}`);
                    await storage.createNotification({ userId: notifTarget, type: "bot_action", message: `🤖 البوت حدّد موعد متابعة — ${leadDisplayName}`, leadId: lead.id, isRead: false });
                  }
                } else if (action.type === "update_score" && action.score) {
                  leadUpdates.score = action.score;
                  botActionsSummaryParts.push(`تقييم: ${action.score}`);
                } else if (action.type === "update_lead" && action.field && action.value !== undefined) {
                  const fieldMap: Record<string, string> = {
                    name: "name", budget: "budget", unitType: "unitType", bedrooms: "bedrooms",
                    bathrooms: "bathrooms", location: "location", area: "area",
                    paymentType: "paymentType", downPayment: "downPayment", email: "email", notes: "notes",
                  };
                  const dbField = fieldMap[action.field];
                  if (dbField) {
                    (leadUpdates as Record<string, unknown>)[dbField] = action.value;
                    botActionsSummaryParts.push(`تحديث ${action.field}: ${action.value}`);
                    console.log(`[WhatsAppCloudBot] update_lead: ${action.field}=${action.value} for lead ${lead.id}`);
                  }
                }
              } catch (actionErr) {
                console.error(`[WhatsAppCloudBot] Action ${action.type} error:`, actionErr);
              }
            }
          }

          const resolvedName = leadUpdates.name || lead.name;
          const resolvedBudget = leadUpdates.budget || lead.budget;
          const resolvedUnit = leadUpdates.unitType || lead.unitType;
          const allFieldsCollected = !!(resolvedName && (resolvedBudget || resolvedUnit));

          if (botResult.shouldHandoff && allFieldsCollected) {
            leadUpdates.botActive = false;
            leadUpdates.botStage = "handed_off";
            const handoffMsg = "شكراً جزيلاً على وقتك! 🙏 سيتواصل معك أحد مستشارينا في أقرب وقت ممكن.";
            await sendWhatsAppCloudMessage(settings.whatsappPhoneNumberId!, settings.whatsappCloudToken!, msg.phone, handoffMsg);
            await storage.logWhatsappMessage({ leadId: lead.id, phone: msg.phone, direction: "outbound", messageText: handoffMsg, agentName: "البوت", isRead: false });
            await storage.createNotification({ userId: settingsUserId, type: "bot_handoff", message: `🤖 البوت أحال عميل واتساب للمتابعة — ${resolvedName || msg.phone}`, leadId: lead.id, isRead: false });
          } else {
            const sendResult = await sendWhatsAppCloudMessage(settings.whatsappPhoneNumberId!, settings.whatsappCloudToken!, msg.phone, botResult.reply);
            await storage.logWhatsappMessage({
              leadId: lead.id,
              phone: msg.phone,
              direction: "outbound",
              messageText: sendResult.success ? botResult.reply : `[فشل الإرسال] ${botResult.reply}`,
              agentName: "البوت",
              isRead: false,
              botActionsSummary: botActionsSummaryParts.length > 0 ? botActionsSummaryParts.join(" | ") : undefined,
            });
          }

          await storage.updateLead(lead.id, leadUpdates);

        } catch (msgErr) {
          console.error("[WhatsAppCloud] Error processing message:", msgErr);
        }
      }
    } catch (err) {
      console.error("[WhatsAppCloud] Webhook POST error:", err);
    }
  });

  // SSE real-time event stream
  app.get("/api/events/stream", isAuthenticated, (req, res) => {
    const userId = (req.user as { id: string } | undefined)?.id;
    if (!userId) { res.status(401).end(); return; }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);

    addSseClient(userId, res);

    const keepAlive = setInterval(() => {
      try { res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`); } catch { /* disconnected */ }
    }, 25000);

    req.on("close", () => {
      clearInterval(keepAlive);
      removeSseClient(res);
    });
  });

  return httpServer;
}
