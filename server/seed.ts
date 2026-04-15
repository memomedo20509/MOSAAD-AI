import { storage } from "./storage";
import { hashPassword } from "./auth";
import { pool } from "./db";

export async function seedDefaultAdmin() {
  const adminUsername = "admin";
  const adminPassword = "Admin@123";
  const adminEmail = "admin@salesbot.ai";

  // Step 1: Ensure Demo Company exists
  let demoCompanyId: string | null = null;
  try {
    const { rows } = await pool.query(`SELECT id FROM companies WHERE slug = 'demo-company' LIMIT 1`);
    if (rows.length > 0) {
      demoCompanyId = rows[0].id;
    } else {
      const { rows: inserted } = await pool.query(
        `INSERT INTO companies (name, slug, industry, status, onboarding_step, primary_color)
         VALUES ('Demo Company', 'demo-company', 'real_estate', 'active', 0, '#6366f1')
         RETURNING id`
      );
      demoCompanyId = inserted[0].id;
      console.log(`[seed] Demo Company created with id: ${demoCompanyId}`);
    }
  } catch (error) {
    console.error("[seed] Error creating Demo Company:", error);
  }

  // Step 2: Seed default admin user and assign to Demo Company
  try {
    const existingAdmin = await storage.getUserByUsername(adminUsername);

    if (!existingAdmin) {
      const hashedPassword = await hashPassword(adminPassword);
      await storage.createUser({
        username: adminUsername,
        password: hashedPassword,
        email: adminEmail,
        firstName: "Admin",
        lastName: "User",
        role: "super_admin",
        companyId: demoCompanyId,
        isActive: true,
      });
      console.log("[seed] Default admin user created (admin / Admin@123)");
    } else if (existingAdmin.companyId === null && demoCompanyId) {
      // Migrate existing admin to Demo Company
      await pool.query(`UPDATE users SET company_id = $1 WHERE username = $2`, [demoCompanyId, adminUsername]);
      console.log("[seed] Existing admin assigned to Demo Company");
    }
  } catch (error) {
    console.error("[seed] Error seeding default admin:", error);
  }

  // Step 3: Seed default lead states
  try {
    const states = [
      { name: "New", color: "#6366f1", order: 0, category: "untouched", can_go_back: true, is_system_state: true, zone: 0 },
      { name: "Contacted", color: "#f59e0b", order: 1, category: "active", can_go_back: true, is_system_state: true, zone: 1 },
      { name: "Qualified", color: "#3b82f6", order: 2, category: "active", can_go_back: true, is_system_state: false, zone: 1 },
      { name: "Negotiation", color: "#8b5cf6", order: 3, category: "active", can_go_back: true, is_system_state: false, zone: 1 },
      { name: "Won", color: "#22c55e", order: 4, category: "won", can_go_back: false, is_system_state: true, zone: 2 },
      { name: "Lost", color: "#ef4444", order: 5, category: "lost", can_go_back: false, is_system_state: true, zone: 2 },
    ];
    let inserted = 0;
    for (const s of states) {
      const { rowCount } = await pool.query(
        `INSERT INTO lead_states (name, color, "order", category, can_go_back, is_system_state, zone)
         SELECT $1, $2, $3, $4, $5, $6, $7
         WHERE NOT EXISTS (SELECT 1 FROM lead_states WHERE name = $1)`,
        [s.name, s.color, s.order, s.category, s.can_go_back, s.is_system_state, s.zone]
      );
      if (rowCount && rowCount > 0) inserted++;
    }
    if (inserted > 0) {
      console.log(`[seed] Inserted ${inserted} default lead states`);
    }
  } catch (error) {
    console.error("[seed] Error seeding lead states:", error);
  }

  // Step 4: Migrate all existing data to Demo Company
  if (demoCompanyId) {
    try {
      await migrateDataToDemoCompany(demoCompanyId);
    } catch (error) {
      console.error("[seed] Error migrating data to Demo Company:", error);
    }
  }
}

async function migrateDataToDemoCompany(demoCompanyId: string): Promise<void> {
  const tables = [
    "users",
    "leads",
    "lead_states",
    "clients",
    "tasks",
    "lead_history",
    "developers",
    "projects",
    "units",
    "communications",
    "reminders",
    "documents",
    "commissions",
    "notifications",
    "call_logs",
    "whatsapp_templates",
    "whatsapp_messages_log",
    "whatsapp_campaigns",
    "whatsapp_followup_rules",
    "chatbot_settings",
    "monthly_targets",
    "email_report_settings",
    "social_messages_log",
    "knowledge_base_items",
    "stale_lead_settings",
    "teams",
  ];

  let migratedCount = 0;
  for (const table of tables) {
    try {
      // Check if column exists first
      const { rows: colCheck } = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'company_id' LIMIT 1`,
        [table]
      );
      if (colCheck.length === 0) continue;

      const { rowCount } = await pool.query(
        `UPDATE ${table} SET company_id = $1 WHERE company_id IS NULL`,
        [demoCompanyId]
      );
      if (rowCount && rowCount > 0) migratedCount += rowCount;
    } catch {
      // Table might not exist yet, skip
    }
  }

  // Migrate singleton tables (scoring_config, integration_settings) by setting company_id
  try {
    await pool.query(`UPDATE scoring_config SET company_id = $1 WHERE company_id IS NULL`, [demoCompanyId]);
    await pool.query(`UPDATE integration_settings SET company_id = $1 WHERE company_id IS NULL`, [demoCompanyId]);
  } catch {
    // These tables may not exist yet
  }

  if (migratedCount > 0) {
    console.log(`[seed] Migrated ${migratedCount} rows to Demo Company (${demoCompanyId})`);
  }
}
