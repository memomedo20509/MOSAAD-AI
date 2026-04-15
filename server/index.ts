import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDefaultAdmin } from "./seed";
import { pool } from "./db";
import { syncDatabaseSchema } from "./db-sync";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR NOT NULL PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR UNIQUE NOT NULL,
      password VARCHAR NOT NULL,
      email VARCHAR UNIQUE,
      first_name VARCHAR,
      last_name VARCHAR,
      phone VARCHAR,
      profile_image_url VARCHAR,
      role VARCHAR DEFAULT 'sales_agent',
      team_id VARCHAR REFERENCES teams(id),
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT NOT NULL DEFAULT 'My Company',
      industry TEXT,
      website TEXT,
      logo_url TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_base_items (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price NUMERIC,
      status VARCHAR(20) DEFAULT 'active',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE knowledge_base_items ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chatbot_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      persona_name TEXT NOT NULL DEFAULT 'SalesBot',
      greeting TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
      lead_questions JSONB DEFAULT '[]',
      language TEXT NOT NULL DEFAULT 'en',
      is_active BOOLEAN DEFAULT true,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      platform TEXT NOT NULL DEFAULT 'web',
      contact_name TEXT,
      contact_phone TEXT,
      contact_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      channel TEXT,
      assigned_to VARCHAR REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id VARCHAR NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL DEFAULT 'user',
      content TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      phone TEXT,
      email TEXT,
      interest TEXT,
      source_channel TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      conversation_id VARCHAR REFERENCES conversations(id),
      assigned_to VARCHAR REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await syncDatabaseSchema();

  await registerRoutes(httpServer, app);
  await seedDefaultAdmin();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => { log(`serving on port ${port}`); },
  );
})();
