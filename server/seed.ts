import { storage } from "./storage";
import { hashPassword } from "./auth";

const DEFAULT_LEAD_STATES = [
  { name: "ليد جديد", color: "#3b82f6", order: 1 },
  { name: "تحت المتابعة", color: "#f59e0b", order: 2 },
  { name: "ميتنج", color: "#8b5cf6", order: 3 },
  { name: "عرض سعر", color: "#06b6d4", order: 4 },
  { name: "محجوز", color: "#f97316", order: 5 },
  { name: "تم الصفقة", color: "#22c55e", order: 6 },
  { name: "ملغي", color: "#ef4444", order: 7 },
];

const ENGLISH_TO_ARABIC_STATE_NAMES: Record<string, string> = {
  "New Leads": "ليد جديد",
  "New Lead": "ليد جديد",
  "Follow Up": "تحت المتابعة",
  "Meeting": "ميتنج",
  "Price Offer": "عرض سعر",
  "Reserved": "محجوز",
  "Done Deal": "تم الصفقة",
  "Canceled": "ملغي",
  "Not Interested": "غير مهتم",
};

export async function seedDefaultLeadStates() {
  try {
    const existingStates = await storage.getAllStates();
    if (existingStates.length === 0) {
      for (const state of DEFAULT_LEAD_STATES) {
        await storage.createState(state);
      }
      console.log("Default lead states seeded successfully");
    } else {
      let migratedCount = 0;
      const alreadyMigratedTargets = new Set<string>();
      for (const state of existingStates) {
        const arabicName = ENGLISH_TO_ARABIC_STATE_NAMES[state.name];
        if (arabicName && !alreadyMigratedTargets.has(arabicName)) {
          const targetAlreadyExists = existingStates.some(s => s.id !== state.id && s.name === arabicName);
          if (targetAlreadyExists) {
            alreadyMigratedTargets.add(arabicName);
            continue;
          }
          await storage.updateState(state.id, { name: arabicName });
          alreadyMigratedTargets.add(arabicName);
          migratedCount++;
        }
      }
      if (migratedCount > 0) {
        console.log(`Migrated ${migratedCount} lead states to Arabic terminology`);
      }
      const allStatesAfterMigration = await storage.getAllStates();
      const existingNames = allStatesAfterMigration.map(s => s.name);
      for (const required of DEFAULT_LEAD_STATES) {
        if (!existingNames.includes(required.name)) {
          await storage.createState(required);
          console.log(`Created missing required state: ${required.name}`);
        }
      }
    }
  } catch (error) {
    console.error("Error seeding default lead states:", error);
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
