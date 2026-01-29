import { storage } from "./storage";
import { hashPassword } from "./auth";

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
