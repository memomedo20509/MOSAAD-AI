import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDefaultAdmin, seedDefaultLeadStates, backfillDeveloperNameEn } from "./seed";
import { pool } from "./db";

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
  // Run DB migrations to ensure new tables exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      role VARCHAR NOT NULL UNIQUE,
      permissions JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_report_settings (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL UNIQUE,
      to_email VARCHAR NOT NULL,
      frequency VARCHAR NOT NULL DEFAULT 'monthly',
      language VARCHAR NOT NULL DEFAULT 'ar',
      enabled BOOLEAN NOT NULL DEFAULT false,
      last_sent_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE email_report_settings ADD COLUMN IF NOT EXISTS language VARCHAR NOT NULL DEFAULT 'ar'
  `);

  // Add is_read column to whatsapp_messages_log if it doesn't exist
  await pool.query(`
    ALTER TABLE whatsapp_messages_log ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE
  `).catch(() => {});

  // WhatsApp Campaigns tables (Task #10)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      filter_state_id VARCHAR,
      filter_channel TEXT,
      filter_days_no_reply INTEGER,
      scheduled_at TIMESTAMP,
      status TEXT DEFAULT 'draft',
      created_by TEXT NOT NULL,
      total_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_campaign_recipients (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id VARCHAR REFERENCES whatsapp_campaigns(id),
      lead_id VARCHAR REFERENCES leads(id),
      phone TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at TIMESTAMP,
      error_message TEXT
    )
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_followup_rules (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      days_after_no_reply INTEGER NOT NULL DEFAULT 3,
      is_active BOOLEAN DEFAULT true,
      created_by TEXT NOT NULL,
      last_run_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});

  // Meta (Messenger/Instagram) integration tables (Task #9)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meta_page_connections (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      page_id TEXT NOT NULL UNIQUE,
      page_name TEXT NOT NULL,
      page_access_token TEXT NOT NULL,
      instagram_account_id TEXT,
      connected_by VARCHAR,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_messages_log (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id VARCHAR REFERENCES leads(id),
      platform TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'inbound',
      message_text TEXT,
      message_id TEXT UNIQUE,
      agent_name TEXT,
      is_read BOOLEAN DEFAULT false,
      bot_actions_summary TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});

  await registerRoutes(httpServer, app);
  
  await seedDefaultAdmin();
  await seedDefaultLeadStates();
  await backfillDeveloperNameEn();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
