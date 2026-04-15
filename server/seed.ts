import { storage } from "./storage";
import { hashPassword } from "./auth";
import { pool } from "./db";

export async function seedDefaultAdmin() {
  const adminUsername = "admin";
  const adminPassword = "Admin@123";
  const adminEmail = "admin@salesbot.ai";

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
        isActive: true,
      });
      console.log("[seed] Default admin user created (admin / Admin@123)");
    }
  } catch (error) {
    console.error("[seed] Error seeding default admin:", error);
  }

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
}
