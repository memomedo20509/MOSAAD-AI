import { storage } from "./storage";
import { hashPassword } from "./auth";

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
}
