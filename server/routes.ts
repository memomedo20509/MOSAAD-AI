import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, requireRole } from "./auth";
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
  insertDeveloperSchema,
  updateDeveloperSchema,
  insertProjectSchema,
  updateProjectSchema,
  insertUnitSchema,
  updateUnitSchema,
  insertLeadUnitInterestSchema,
  insertReminderSchema,
  updateReminderSchema,
} from "@shared/schema";

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

  app.post("/api/teams", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(data);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(400).json({ error: "Failed to create team" });
    }
  });

  app.patch("/api/teams/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
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
      res.json(users);
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

  app.patch("/api/users/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const data = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(id, data);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: "Failed to update user" });
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

  app.post("/api/states", async (req, res) => {
    try {
      const data = insertLeadStateSchema.parse(req.body);
      const state = await storage.createState(data);
      res.status(201).json(state);
    } catch (error) {
      console.error("Error creating state:", error);
      res.status(400).json({ error: "Failed to create state" });
    }
  });

  app.patch("/api/states/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateLeadStateSchema.parse(req.body);
      const state = await storage.updateState(id, data);
      if (!state) {
        return res.status(404).json({ error: "State not found" });
      }
      res.json(state);
    } catch (error) {
      console.error("Error updating state:", error);
      res.status(400).json({ error: "Failed to update state" });
    }
  });

  app.delete("/api/states/:id", async (req, res) => {
    try {
      const { id } = req.params;
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
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const data = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);
      res.status(201).json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(400).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateLeadSchema.parse(req.body);
      const lead = await storage.updateLead(id, data);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(400).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteLead(id);
      if (!deleted) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Lead Tasks
  app.get("/api/leads/:leadId/tasks", async (req, res) => {
    try {
      const { leadId } = req.params;
      const tasks = await storage.getTasksByLeadId(leadId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Lead History
  app.get("/api/leads/:leadId/history", async (req, res) => {
    try {
      const { leadId } = req.params;
      const history = await storage.getHistoryByLeadId(leadId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // All History (for actions log page)
  app.get("/api/history", async (req, res) => {
    try {
      const history = await storage.getAllHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching all history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Tasks
  app.post("/api/tasks", async (req, res) => {
    try {
      const data = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
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

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
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

  app.post("/api/clients", async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
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
      const reminders = await storage.getRemindersByLead(leadId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching lead reminders:", error);
      res.status(500).json({ error: "Failed to fetch lead reminders" });
    }
  });

  app.post("/api/reminders", isAuthenticated, async (req, res) => {
    try {
      const data = insertReminderSchema.parse(req.body);
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

  return httpServer;
}
