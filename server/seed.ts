import { storage } from "./storage";
import { hashPassword } from "./auth";
import { pool } from "./db";

// The canonical 12 required funnel states in strict order
// This is the single source of truth - seed will converge DB to exactly this list
const CANONICAL_STATES = [
  { name: "ليد جديد", color: "#64748b", order: 1, category: "untouched" as const, canGoBack: false, isSystemState: true, zone: 1 },
  { name: "لا يرد (Untouched)", color: "#94a3b8", order: 2, category: "untouched" as const, canGoBack: false, isSystemState: true, zone: 1 },
  { name: "خارج الخدمة", color: "#6b7280", order: 3, category: "untouched" as const, canGoBack: false, isSystemState: true, zone: 1 },
  { name: "متابعة", color: "#3b82f6", order: 4, category: "active" as const, canGoBack: true, isSystemState: true, zone: 2 },
  { name: "لا يرد (متابعة)", color: "#60a5fa", order: 5, category: "active" as const, canGoBack: true, isSystemState: true, zone: 2 },
  { name: "ميتنج", color: "#8b5cf6", order: 6, category: "active" as const, canGoBack: true, isSystemState: true, zone: 2 },
  { name: "متابعة بعد الميتنج", color: "#a78bfa", order: 7, category: "active" as const, canGoBack: true, isSystemState: true, zone: 2 },
  { name: "لا يرد (بعد الميتنج)", color: "#c4b5fd", order: 8, category: "active" as const, canGoBack: true, isSystemState: true, zone: 2 },
  { name: "محجوز", color: "#22c55e", order: 9, category: "won" as const, canGoBack: false, isSystemState: true, zone: 3 },
  { name: "إلغاء بعد الميتنج", color: "#f97316", order: 10, category: "lost" as const, canGoBack: false, isSystemState: true, zone: 4 },
  { name: "تم الصفقة", color: "#16a34a", order: 11, category: "won" as const, canGoBack: false, isSystemState: true, zone: 3 },
  { name: "ميزانية منخفضة", color: "#ef4444", order: 12, category: "lost" as const, canGoBack: false, isSystemState: true, zone: 4 },
];

export async function seedDefaultLeadStates() {
  try {
    const existingStates = await storage.getAllStates();
    const existingNames = new Map(existingStates.map(s => [s.name, s]));

    // Step 1: Ensure all canonical states exist with correct metadata
    for (const canonical of CANONICAL_STATES) {
      const existing = existingNames.get(canonical.name);
      if (!existing) {
        // Create missing canonical state - use direct SQL to set exact order
        await pool.query(
          `INSERT INTO lead_states (id, name, color, "order", category, can_go_back, is_system_state, zone)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [canonical.name, canonical.color, canonical.order, canonical.category, canonical.canGoBack, canonical.isSystemState, canonical.zone]
        );
      } else {
        // Update existing state with canonical metadata (preserve user-customized color if not default)
        await pool.query(
          `UPDATE lead_states 
           SET "order" = $1, category = $2, can_go_back = $3, is_system_state = $4, zone = $5
           WHERE id = $6`,
          [canonical.order, canonical.category, canonical.canGoBack, canonical.isSystemState, canonical.zone, existing.id]
        );
      }
    }

    // Step 2: Delete non-system states that are empty (no leads assigned)
    // This cleans up legacy states without data loss risk
    await pool.query(`
      DELETE FROM lead_states 
      WHERE is_system_state = false 
        AND id NOT IN (SELECT DISTINCT state_id FROM leads WHERE state_id IS NOT NULL)
        AND name NOT IN (${CANONICAL_STATES.map((_, i) => `$${i + 1}`).join(',')})
    `, CANONICAL_STATES.map(s => s.name)).catch((err) => {
      console.warn("Could not clean up empty legacy states:", err.message);
    });

    console.log("Lead states seeded/updated with canonical funnel zones successfully");
  } catch (error) {
    console.error("Error seeding default lead states:", error);
  }
}

/**
 * Backfill nameEn for developers seeded from Nawy data.
 */
export async function backfillDeveloperNameEn() {
  try {
    const result = await pool.query(`
      UPDATE developers
      SET name_en = TRIM(SPLIT_PART(name, ' | ', 1))
      WHERE (name_en IS NULL OR TRIM(name_en) = '')
        AND name LIKE '% | %'
        AND LENGTH(TRIM(SPLIT_PART(name, ' | ', 1))) > 0
      RETURNING id, name, name_en
    `);
    if (result.rowCount && result.rowCount > 0) {
      console.log(`Backfilled nameEn for ${result.rowCount} developers`);
    }
    const missing = await pool.query(`
      SELECT COUNT(*) AS count FROM developers
      WHERE name_en IS NULL OR TRIM(name_en) = ''
    `);
    const missingCount = parseInt(missing.rows[0]?.count || "0", 10);
    if (missingCount > 0) {
      console.log(`Note: ${missingCount} developer(s) still missing nameEn (likely Arabic-only entries without bilingual format)`);
    }
  } catch (error) {
    console.error("Error backfilling developer nameEn:", error);
  }
}

export async function seedDefaultAdmin() {
  const adminUsername = "admin";
  const adminPassword = "Admin@123";
  const adminEmail = "admin@homeadvisor.com";

  try {
    const existingAdmin = await storage.getUserByUsername(adminUsername);
    
    if (!existingAdmin) {
      const hashedPassword = await hashPassword(adminPassword);
      await storage.createUser({
        username: adminUsername,
        password: hashedPassword,
        email: adminEmail,
        firstName: "مدير",
        lastName: "النظام",
        role: "super_admin",
        isActive: true,
      });
      console.log("Default admin user created successfully");
    } else {
      const hashedPassword = await hashPassword(adminPassword);
      await storage.updateUser(existingAdmin.id, { password: hashedPassword });
      console.log("Default admin password reset successfully");
    }
  } catch (error) {
    console.error("Error seeding default admin:", error);
  }
}
