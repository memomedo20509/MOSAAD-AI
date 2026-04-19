import { pool } from "./db";

export async function syncDatabaseSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Companies table (multi-tenant)
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        industry TEXT,
        plan_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        onboarding_step INTEGER DEFAULT 0,
        logo_url TEXT,
        primary_color TEXT DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Backfill companies table with columns that may have been added after initial creation
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_id TEXT`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#6366f1'`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS working_hours TEXT`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone TEXT`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'service'`);

    // Add company_id to users table (users table exists before db-sync runs)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_tour BOOLEAN DEFAULT false`);

    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone2 TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS state_id VARCHAR`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS channel TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS request_type TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS unit_type TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS area TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS space TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bedrooms INTEGER`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bathrooms INTEGER`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS location TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_type TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS down_payment TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[]`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_cost NUMERIC`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_name TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_action TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_action_date TIMESTAMP`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMP`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS score VARCHAR(10) DEFAULT 'warm'`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bot_active BOOLEAN DEFAULT true`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bot_stage TEXT DEFAULT 'greeting'`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_project TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS timeline TEXT`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS history_visible_to_assigned BOOLEAN DEFAULT true`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS previous_assigned_to TEXT`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_states (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        "order" INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL DEFAULT 'active',
        can_go_back BOOLEAN NOT NULL DEFAULT true,
        is_system_state BOOLEAN NOT NULL DEFAULT false,
        zone INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT, phone TEXT, email TEXT, address TEXT, project TEXT,
        units_count INTEGER DEFAULT 0,
        lead_id VARCHAR REFERENCES leads(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR REFERENCES leads(id),
        title TEXT NOT NULL, type TEXT, description TEXT, assigned_to TEXT,
        start_date TIMESTAMP, end_date TIMESTAMP, completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_history (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR REFERENCES leads(id),
        action TEXT NOT NULL, description TEXT, performed_by TEXT,
        type TEXT DEFAULT 'other',
        from_state_id VARCHAR REFERENCES lead_states(id),
        to_state_id VARCHAR REFERENCES lead_states(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS developers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL, name_en TEXT, logo TEXT, phone TEXT, email TEXT,
        website TEXT, address TEXT, description TEXT, description_en TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        developer_id VARCHAR REFERENCES developers(id),
        name TEXT NOT NULL, name_en TEXT, type TEXT, location TEXT, location_en TEXT,
        address TEXT, description TEXT, description_en TEXT,
        status TEXT DEFAULT 'under_construction',
        total_units INTEGER DEFAULT 0, delivery_date TEXT,
        images TEXT[], amenities TEXT[], amenities_en TEXT[],
        min_price INTEGER, max_price INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS units (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        unit_number TEXT NOT NULL, floor INTEGER, building TEXT,
        type TEXT, type_en TEXT, bedrooms INTEGER, bathrooms INTEGER,
        area INTEGER, price INTEGER, status TEXT DEFAULT 'available',
        view TEXT, finishing TEXT, notes TEXT, notes_en TEXT,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_unit_interests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR NOT NULL REFERENCES leads(id),
        unit_id VARCHAR NOT NULL REFERENCES units(id),
        interest_level TEXT DEFAULT 'medium', notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS communications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR NOT NULL REFERENCES leads(id),
        user_id VARCHAR, user_name TEXT, type TEXT NOT NULL, note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR REFERENCES leads(id),
        user_id VARCHAR, title TEXT NOT NULL, description TEXT,
        due_date TIMESTAMP NOT NULL, is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP, priority TEXT DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS scoring_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        hot_max_days INTEGER NOT NULL DEFAULT 3, cold_min_days INTEGER NOT NULL DEFAULT 14,
        weight_recency INTEGER NOT NULL DEFAULT 40, weight_engagement INTEGER NOT NULL DEFAULT 30,
        weight_task_completion INTEGER NOT NULL DEFAULT 20, weight_creation INTEGER NOT NULL DEFAULT 10,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR REFERENCES leads(id),
        client_id VARCHAR REFERENCES clients(id),
        uploaded_by VARCHAR REFERENCES users(id),
        uploaded_by_name TEXT,
        file_name TEXT NOT NULL, original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL, file_size INTEGER NOT NULL, label TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR REFERENCES clients(id), lead_id VARCHAR REFERENCES leads(id),
        agent_id VARCHAR, agent_name TEXT,
        unit_price INTEGER NOT NULL DEFAULT 0,
        commission_percent INTEGER NOT NULL DEFAULT 2,
        commission_amount INTEGER NOT NULL DEFAULT 0,
        month TEXT NOT NULL, project TEXT, notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL, type TEXT NOT NULL DEFAULT 'reminder',
        message TEXT NOT NULL, lead_id VARCHAR REFERENCES leads(id),
        reminder_id VARCHAR, is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS call_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR NOT NULL REFERENCES leads(id),
        user_id VARCHAR NOT NULL, reminder_id VARCHAR,
        outcome TEXT NOT NULL, notes TEXT, duration_seconds INTEGER,
        next_follow_up_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL, body TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true, created_by VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR REFERENCES leads(id),
        agent_id VARCHAR, agent_name TEXT, template_id VARCHAR, template_name TEXT,
        phone TEXT NOT NULL, direction TEXT DEFAULT 'outbound',
        message_text TEXT, message_id VARCHAR,
        is_read BOOLEAN DEFAULT false, bot_actions_summary TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_manager_comments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR NOT NULL REFERENCES leads(id),
        manager_id VARCHAR NOT NULL REFERENCES users(id),
        manager_name TEXT, content TEXT NOT NULL,
        is_read_by_agent BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_report_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
        to_email TEXT NOT NULL, frequency TEXT NOT NULL DEFAULT 'monthly',
        language TEXT NOT NULL DEFAULT 'ar', enabled BOOLEAN NOT NULL DEFAULT false,
        last_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_targets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        target_month TEXT NOT NULL,
        deals_target INTEGER NOT NULL DEFAULT 0, leads_target INTEGER NOT NULL DEFAULT 0,
        revenue_target INTEGER,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS monthly_targets_user_month_unique ON monthly_targets (user_id, target_month)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chatbot_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT false,
        working_hours_start INTEGER DEFAULT 9, working_hours_end INTEGER DEFAULT 18,
        welcome_message TEXT DEFAULT 'أهلاً! 👋 أنا المساعد الذكي لشركتنا العقارية. يسعدني مساعدتك. ممكن تعرفني باسمك الكريم؟',
        bot_name VARCHAR DEFAULT 'المساعد الذكي',
        company_name VARCHAR DEFAULT 'شركتنا العقارية',
        bot_role VARCHAR DEFAULT 'مستشار عقاري',
        bot_personality TEXT DEFAULT 'أنت مستشار عقاري مصري محترف وودود. بتتكلم بالمصري بشكل طبيعي. بتساعد العملاء يلاقوا الوحدة المناسبة ليهم وبتجمع بياناتهم بطريقة محترمة.',
        bot_mission TEXT DEFAULT 'جمع بيانات العميل الكاملة (الاسم، الميزانية، نوع الوحدة، عدد الغرف، الموقع المفضل، طريقة الدفع) وترشيح وحدات مناسبة من المشاريع المتاحة قبل تحويله للمندوب.',
        company_knowledge TEXT DEFAULT '', respond_always BOOLEAN DEFAULT false,
        enabled_project_ids TEXT[],
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL, template_id VARCHAR, message TEXT NOT NULL,
        filter_state_id VARCHAR, filter_channel TEXT, filter_days_no_reply INTEGER,
        scheduled_at TIMESTAMP, status TEXT DEFAULT 'draft',
        created_by TEXT NOT NULL,
        total_count INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0, failed_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE whatsapp_campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP`);
    await client.query(`ALTER TABLE whatsapp_campaigns ADD COLUMN IF NOT EXISTS filter_channel TEXT`);
    await client.query(`ALTER TABLE whatsapp_campaigns ADD COLUMN IF NOT EXISTS filter_days_no_reply INTEGER`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_campaign_recipients (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id VARCHAR REFERENCES whatsapp_campaigns(id),
        lead_id VARCHAR REFERENCES leads(id),
        phone TEXT NOT NULL, status TEXT DEFAULT 'pending',
        sent_at TIMESTAMP, error_message TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_followup_rules (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR REFERENCES leads(id),
        name TEXT NOT NULL, message TEXT NOT NULL,
        days_after_no_reply INTEGER NOT NULL DEFAULT 3,
        is_active BOOLEAN DEFAULT true, created_by TEXT NOT NULL,
        last_run_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS meta_page_connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        page_id TEXT NOT NULL UNIQUE, page_name TEXT NOT NULL,
        page_access_token TEXT NOT NULL, instagram_account_id TEXT,
        connected_by VARCHAR, is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE meta_page_connections ADD COLUMN IF NOT EXISTS comment_bot_enabled BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE meta_page_connections ADD COLUMN IF NOT EXISTS comment_auto_reply TEXT DEFAULT 'شكراً على تعليقك! راسلتك على الخاص 📩'`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS social_messages_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id VARCHAR REFERENCES leads(id),
        platform TEXT NOT NULL, sender_id TEXT NOT NULL,
        direction TEXT NOT NULL DEFAULT 'inbound',
        message_text TEXT, message_id TEXT, agent_name TEXT,
        is_read BOOLEAN DEFAULT false, bot_actions_summary TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        whatsapp_cloud_token TEXT, whatsapp_phone_number_id TEXT,
        whatsapp_verify_token TEXT,
        ai_provider TEXT DEFAULT 'openrouter',
        openrouter_api_key TEXT,
        openrouter_model TEXT DEFAULT 'google/gemini-flash-1.5',
        openai_api_key TEXT,
        openai_model TEXT DEFAULT 'gpt-4o-mini',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE integration_settings ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openrouter'`);
    await client.query(`ALTER TABLE integration_settings ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT`);
    await client.query(`ALTER TABLE integration_settings ADD COLUMN IF NOT EXISTS openrouter_model TEXT DEFAULT 'google/gemini-flash-1.5'`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stale_lead_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        state_id VARCHAR NOT NULL UNIQUE REFERENCES lead_states(id) ON DELETE CASCADE,
        stale_days INTEGER NOT NULL DEFAULT 7,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        role VARCHAR NOT NULL UNIQUE,
        permissions JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_roles (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL UNIQUE,
        permissions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        description TEXT,
        price_monthly NUMERIC NOT NULL DEFAULT 0,
        price_annual NUMERIC NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        max_users INTEGER NOT NULL DEFAULT 5,
        max_leads_per_month INTEGER NOT NULL DEFAULT 100,
        max_whatsapp_messages_per_month INTEGER NOT NULL DEFAULT 500,
        max_channels INTEGER NOT NULL DEFAULT 1,
        has_ai_chatbot BOOLEAN NOT NULL DEFAULT false,
        has_campaigns BOOLEAN NOT NULL DEFAULT false,
        has_analytics BOOLEAN NOT NULL DEFAULT false,
        has_api_access BOOLEAN NOT NULL DEFAULT false,
        has_knowledge_base BOOLEAN NOT NULL DEFAULT false,
        has_priority_support BOOLEAN NOT NULL DEFAULT false,
        trial_days INTEGER NOT NULL DEFAULT 14,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        plan_id VARCHAR NOT NULL REFERENCES subscription_plans(id),
        status TEXT NOT NULL DEFAULT 'trial',
        current_period_start TIMESTAMP DEFAULT NOW(),
        current_period_end TIMESTAMP,
        trial_ends_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_records (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        month TEXT NOT NULL,
        leads_count INTEGER NOT NULL DEFAULT 0,
        messages_count INTEGER NOT NULL DEFAULT 0,
        users_count INTEGER NOT NULL DEFAULT 0,
        ai_calls_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS usage_records_company_month_unique ON usage_records (company_id, month)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        subscription_id VARCHAR REFERENCES subscriptions(id),
        invoice_number TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'draft',
        due_date TIMESTAMP,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add company_id to all tenant-scoped tables (after all CREATE TABLE statements to avoid ordering issues on fresh DB)
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE lead_states ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE lead_history ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE developers ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE units ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE communications ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE commissions ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE whatsapp_messages_log ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE whatsapp_campaigns ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE whatsapp_followup_rules ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS chat_goal TEXT DEFAULT 'lead_qualified'`);
    await client.query(`ALTER TABLE monthly_targets ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE email_report_settings ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE social_messages_log ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE knowledge_base_items ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE stale_lead_settings ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE integration_settings ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);
    await client.query(`ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES companies(id)`);

    // Replace the old global unique(state_id) constraint on stale_lead_settings with a
    // per-company composite unique index so different companies can have their own
    // stale thresholds per state.
    await client.query(`ALTER TABLE stale_lead_settings DROP CONSTRAINT IF EXISTS stale_lead_settings_state_id_key`);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS sls_company_state_unique
      ON stale_lead_settings (COALESCE(company_id, ''), state_id)
    `);

    // Platform Plans
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        price_monthly NUMERIC NOT NULL DEFAULT 0,
        price_yearly NUMERIC,
        features TEXT[],
        max_users INTEGER,
        max_leads INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Support Tickets
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id VARCHAR REFERENCES companies(id),
        company_name TEXT,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'open',
        created_by_user_id VARCHAR,
        created_by_name TEXT,
        assigned_to_user_id VARCHAR,
        assigned_to_name TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Ticket Replies
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_replies (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id VARCHAR NOT NULL REFERENCES tickets(id),
        user_id VARCHAR,
        user_name TEXT,
        content TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Platform Notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_notifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        company_id VARCHAR REFERENCES companies(id),
        company_name TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Platform Leads (Sales CRM for platform owner)
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_leads (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        contact_name TEXT,
        email TEXT,
        phone TEXT,
        source TEXT DEFAULT 'website',
        assigned_rep TEXT,
        notes TEXT,
        next_action_date TIMESTAMP,
        deal_value NUMERIC,
        stage TEXT NOT NULL DEFAULT 'new_lead',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_lead_history (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        platform_lead_id VARCHAR NOT NULL REFERENCES platform_leads(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        description TEXT,
        performed_by TEXT,
        from_stage TEXT,
        to_stage TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Article Categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS article_categories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        name_en TEXT,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Articles
    await client.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        excerpt TEXT,
        body TEXT,
        featured_image TEXT,
        category_id VARCHAR REFERENCES article_categories(id),
        tags TEXT[],
        author_id VARCHAR,
        author_name TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        meta_title TEXT,
        meta_description TEXT,
        og_image TEXT,
        published_at TIMESTAMP,
        reading_time_minutes INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Products (E-commerce)
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id VARCHAR,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price NUMERIC DEFAULT 0 NOT NULL,
        stock INTEGER DEFAULT 0 NOT NULL,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Orders (E-commerce)
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id VARCHAR,
        lead_id VARCHAR REFERENCES leads(id),
        customer_name TEXT,
        customer_phone TEXT,
        items JSONB DEFAULT '[]',
        total_amount NUMERIC DEFAULT 0 NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        delivery_address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query("COMMIT");
    console.log("[db-sync] All tables verified/created successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[db-sync] Schema sync failed:", error);
    throw error;
  } finally {
    client.release();
  }
}
