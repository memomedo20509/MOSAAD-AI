import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, requireRole } from "./auth";
import { hashPassword } from "./auth";
import {
  insertKnowledgeBaseItemSchema,
  updateKnowledgeBaseItemSchema,
  updateCompanyProfileSchema,
  updateChatbotConfigSchema,
  insertConversationSchema,
  updateConversationSchema,
  insertMessageSchema,
  insertLeadSchema,
  updateLeadSchema,
} from "@shared/schema";
import {
  insertTeamSchema,
  updateTeamSchema,
  updateUserSchema,
  insertUserSchema,
} from "@shared/models/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  registerAuthRoutes(app);

  // ─── Teams ───────────────────────────────────────────────────────────────────
  app.get("/api/teams", isAuthenticated, async (_req, res) => {
    try {
      res.json(await storage.getAllTeams());
    } catch {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = insertTeamSchema.parse(req.body);
      res.status(201).json(await storage.createTeam(data));
    } catch {
      res.status(400).json({ error: "Failed to create team" });
    }
  });

  app.patch("/api/teams/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = updateTeamSchema.parse(req.body);
      const team = await storage.updateTeam(String(req.params.id), data);
      if (!team) return res.status(404).json({ error: "Team not found" });
      res.json(team);
    } catch {
      res.status(400).json({ error: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
      const deleted = await storage.deleteTeam(String(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Team not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  // ─── Users ───────────────────────────────────────────────────────────────────
  app.get("/api/users", isAuthenticated, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(({ password: _, ...u }) => u));
    } catch {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const { username, password, email, firstName, lastName, phone, role, teamId, isActive } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
      if (await storage.getUserByUsername(username)) return res.status(400).json({ error: "Username already exists" });
      if (email && await storage.getUserByEmail(email)) return res.status(400).json({ error: "Email already exists" });
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ username, password: hashedPassword, email: email || null, firstName: firstName || null, lastName: lastName || null, phone: phone || null, role: role || "sales_agent", teamId: teamId || null, isActive: isActive !== undefined ? isActive : true });
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch {
      res.status(400).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = updateUserSchema.parse(req.body);
      if (data.password) data.password = await hashPassword(data.password);
      const user = await storage.updateUser(String(req.params.id), data);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch {
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  // ─── Company Profile ─────────────────────────────────────────────────────────
  app.get("/api/company-profile", isAuthenticated, async (_req, res) => {
    try {
      const profile = await storage.getCompanyProfile();
      res.json(profile ?? null);
    } catch {
      res.status(500).json({ error: "Failed to fetch company profile" });
    }
  });

  app.put("/api/company-profile", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = updateCompanyProfileSchema.parse(req.body);
      res.json(await storage.upsertCompanyProfile(data));
    } catch {
      res.status(400).json({ error: "Failed to update company profile" });
    }
  });

  app.delete("/api/company-profile", isAuthenticated, requireRole("super_admin"), async (_req, res) => {
    try {
      await storage.resetCompanyProfile();
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to reset company profile" });
    }
  });

  // ─── Knowledge Base ───────────────────────────────────────────────────────────
  app.get("/api/knowledge-base", isAuthenticated, async (_req, res) => {
    try {
      res.json(await storage.getAllKnowledgeBaseItems());
    } catch {
      res.status(500).json({ error: "Failed to fetch knowledge base" });
    }
  });

  app.post("/api/knowledge-base", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = insertKnowledgeBaseItemSchema.parse(req.body);
      res.status(201).json(await storage.createKnowledgeBaseItem(data));
    } catch {
      res.status(400).json({ error: "Failed to create knowledge base item" });
    }
  });

  app.patch("/api/knowledge-base/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = updateKnowledgeBaseItemSchema.parse(req.body);
      const item = await storage.updateKnowledgeBaseItem(String(req.params.id), data);
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    } catch {
      res.status(400).json({ error: "Failed to update knowledge base item" });
    }
  });

  app.delete("/api/knowledge-base/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const deleted = await storage.deleteKnowledgeBaseItem(String(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Item not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to delete knowledge base item" });
    }
  });

  // ─── Chatbot Config ───────────────────────────────────────────────────────────
  app.get("/api/chatbot-config", isAuthenticated, async (_req, res) => {
    try {
      const config = await storage.getChatbotConfig();
      res.json(config ?? null);
    } catch {
      res.status(500).json({ error: "Failed to fetch chatbot config" });
    }
  });

  app.put("/api/chatbot-config", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = updateChatbotConfigSchema.parse(req.body);
      res.json(await storage.upsertChatbotConfig(data));
    } catch {
      res.status(400).json({ error: "Failed to update chatbot config" });
    }
  });

  app.delete("/api/chatbot-config", isAuthenticated, requireRole("super_admin"), async (_req, res) => {
    try {
      await storage.resetChatbotConfig();
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to reset chatbot config" });
    }
  });

  // ─── Conversations ────────────────────────────────────────────────────────────
  app.get("/api/conversations", isAuthenticated, async (_req, res) => {
    try {
      res.json(await storage.getAllConversations());
    } catch {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const conv = await storage.getConversation(String(req.params.id));
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      res.json(conv);
    } catch {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const data = insertConversationSchema.parse(req.body);
      res.status(201).json(await storage.createConversation(data));
    } catch {
      res.status(400).json({ error: "Failed to create conversation" });
    }
  });

  app.patch("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const data = updateConversationSchema.parse(req.body);
      const conv = await storage.updateConversation(String(req.params.id), data);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      res.json(conv);
    } catch {
      res.status(400).json({ error: "Failed to update conversation" });
    }
  });

  // ─── Messages ─────────────────────────────────────────────────────────────────
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    try {
      res.json(await storage.getMessagesByConversation(String(req.params.id)));
    } catch {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const data = insertMessageSchema.parse({ ...req.body, conversationId: String(req.params.id) });
      res.status(201).json(await storage.createMessage(data));
    } catch {
      res.status(400).json({ error: "Failed to create message" });
    }
  });

  // ─── Leads ────────────────────────────────────────────────────────────────────
  app.get("/api/leads", isAuthenticated, async (_req, res) => {
    try {
      res.json(await storage.getAllLeads());
    } catch {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const lead = await storage.getLead(String(req.params.id));
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch {
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const data = insertLeadSchema.parse(req.body);
      res.status(201).json(await storage.createLead(data));
    } catch {
      res.status(400).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const data = updateLeadSchema.parse(req.body);
      const lead = await storage.updateLead(String(req.params.id), data);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch {
      res.status(400).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const deleted = await storage.deleteLead(String(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Lead not found" });
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // ─── Analytics ────────────────────────────────────────────────────────────────
  app.get("/api/analytics", isAuthenticated, async (_req, res) => {
    try {
      res.json(await storage.getAnalytics());
    } catch {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}
