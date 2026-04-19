import type { Lead, WhatsappMessagesLog, Project, Unit, KnowledgeBaseItem, IntegrationSettings, Product } from "@shared/schema";
import { storage } from "./storage";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER ?? "https://crm.seosahl.cloud";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE ?? "HomeAdvisor CRM";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

let _cachedSettings: IntegrationSettings | null = null;
let _settingsCachedAt = 0;
const SETTINGS_CACHE_TTL = 30_000;

export function invalidateAISettingsCache(): void {
  _cachedSettings = null;
  _settingsCachedAt = 0;
}

async function loadAISettings(): Promise<IntegrationSettings | undefined> {
  const now = Date.now();
  if (_cachedSettings && (now - _settingsCachedAt) < SETTINGS_CACHE_TTL) {
    return _cachedSettings;
  }
  try {
    const settings = await storage.getIntegrationSettings();
    if (settings) {
      _cachedSettings = settings;
      _settingsCachedAt = now;
    }
    return settings;
  } catch {
    return _cachedSettings ?? undefined;
  }
}

interface OpenAIChoice {
  message: { role: string; content: string };
}
interface OpenAIResponse {
  choices: OpenAIChoice[];
  error?: { message: string };
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model = "gpt-4o-mini"
): Promise<string> {
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("لم يُرجع OpenAI أي محتوى");
  return content.trim();
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  _openAiApiKey?: string | null,
  _openAiModel?: string | null
): Promise<string> {
  const settings = await loadAISettings();
  const provider = settings?.aiProvider || "openrouter";

  if (provider === "openai") {
    const resolvedKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY || null;
    if (resolvedKey) {
      return callOpenAI(systemPrompt, userPrompt, resolvedKey, settings?.openAiModel || "gpt-4o-mini");
    }
  }

  const orKey = settings?.openrouterApiKey || process.env.OPENROUTER_API_KEY || null;
  if (orKey) {
    const orModel = settings?.openrouterModel || process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5";
    return callOpenRouter(systemPrompt, userPrompt, orKey, orModel);
  }

  const resolvedOpenAiKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY || null;
  if (resolvedOpenAiKey) {
    return callOpenAI(systemPrompt, userPrompt, resolvedOpenAiKey, settings?.openAiModel || "gpt-4o-mini");
  }

  throw new Error("لا يوجد مفتاح API لأي مزود ذكاء اصطناعي. أضف مفتاح OpenRouter أو OpenAI من صفحة الإعدادات.");
}

interface OpenRouterChoice {
  message: {
    role: string;
    content: string;
  };
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
  error?: { message: string };
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 404 && model === "google/gemini-flash-1.5") {
      return callOpenRouter(systemPrompt, userPrompt, apiKey, "google/gemini-2.0-flash-001");
    }
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("لم يُرجع النموذج أي محتوى");
  }
  return content.trim();
}


function buildLeadContext(lead: Lead): string {
  const parts: string[] = [];
  if (lead.name) parts.push(`الاسم: ${lead.name}`);
  if (lead.phone) parts.push(`الهاتف: ${lead.phone}`);
  if (lead.budget) parts.push(`الميزانية: ${lead.budget}`);
  if (lead.unitType) parts.push(`نوع الوحدة: ${lead.unitType}`);
  if (lead.bedrooms) parts.push(`عدد الغرف: ${lead.bedrooms}`);
  if (lead.area) parts.push(`المنطقة: ${lead.area}`);
  if (lead.location) parts.push(`الموقع: ${lead.location}`);
  if (lead.paymentType) parts.push(`نوع الدفع: ${lead.paymentType}`);
  if (lead.downPayment) parts.push(`المقدم: ${lead.downPayment}`);
  if (lead.preferredProject) parts.push(`المشروع المفضل: ${lead.preferredProject}`);
  if (lead.timeline) parts.push(`الجدول الزمني: ${lead.timeline}`);
  if (lead.notes) parts.push(`ملاحظات: ${lead.notes}`);
  if (lead.score) parts.push(`تقييم الليد: ${lead.score}`);
  return parts.length > 0 ? parts.join(" | ") : "لا توجد بيانات مفصّلة";
}

function buildConversationHistory(messages: WhatsappMessagesLog[]): string {
  if (messages.length === 0) return "لا توجد محادثة واتساب حتى الآن.";
  return messages
    .filter((m) => m.messageText)
    .map((m) => {
      const dir = m.direction === "inbound" ? "العميل" : (m.agentName || "المندوب");
      return `${dir}: ${m.messageText}`;
    })
    .join("\n");
}

export interface SuggestRepliesResult {
  replies: string[];
}

interface ParsedReplies {
  replies?: unknown;
}

export async function suggestReplies(
  messages: WhatsappMessagesLog[],
  lead: Lead
): Promise<SuggestRepliesResult> {
  const systemPrompt = `أنت مساعد مبيعات عقارات محترف في مصر. مهمتك اقتراح ردود واتساب ذكية ومناسبة لمندوب المبيعات ليرد على العميل.
القواعد:
- الردود باللغة العربية المصرية الواضحة
- الردود مهنية ولطيفة وتُحفّز على اتخاذ قرار الشراء
- كل رد يجب أن يكون قصيرًا (جملة أو جملتان)
- لا تُدرج أرقامًا أو تفاصيل مالية غير موجودة في بيانات الليد
- أرجع بالضبط 3 ردود مختلفة في الأسلوب: رد جاد، رد ودّي، رد يطلب تحديد موعد

أرجع JSON فقط بهذا الشكل:
{"replies": ["الرد الأول", "الرد الثاني", "الرد الثالث"]}`;

  const userPrompt = `بيانات الليد: ${buildLeadContext(lead)}

سجل المحادثة:
${buildConversationHistory(messages)}

اقترح 3 ردود مناسبة.`;

  const raw = await callAI(systemPrompt, userPrompt);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("تعذّر تحليل استجابة الذكاء الاصطناعي");
  }

  const parsed = JSON.parse(jsonMatch[0]) as ParsedReplies;
  const replies = Array.isArray(parsed.replies)
    ? (parsed.replies as unknown[])
        .filter((r): r is string => typeof r === "string")
        .slice(0, 3)
    : [];

  if (replies.length === 0) {
    throw new Error("لم يُرجع النموذج اقتراحات");
  }
  if (replies.length < 3) {
    throw new Error(`النموذج أرجع ${replies.length} ردود فقط، المطلوب 3 ردود بالضبط`);
  }

  return { replies };
}

export interface AnalyzeLeadResult {
  budget: string | null;
  unitType: string | null;
  bedrooms: number | null;
  interestLevel: "hot" | "warm" | "cold" | null;
  summary: string;
}

interface ParsedAnalysis {
  budget?: unknown;
  unitType?: unknown;
  bedrooms?: unknown;
  interestLevel?: unknown;
  summary?: unknown;
}

export type BotStage =
  | "greeting"
  | "collecting_name"
  | "collecting_needs"
  | "recommending_units"
  | "collecting_details"
  | "qualified"
  | "handed_off"
  | "show_products"
  | "collecting_order"
  | "collecting_address"
  | "order_confirmed";

export type BotActionType = "change_state" | "create_reminder" | "update_score" | "update_lead" | "create_order";

const ALLOWED_LEAD_FIELDS = ["name", "budget", "unitType", "bedrooms", "bathrooms", "location", "area", "paymentType", "downPayment", "email", "notes"] as const;
type AllowedLeadField = typeof ALLOWED_LEAD_FIELDS[number];

export interface OrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface BotAction {
  type: BotActionType;
  stateName?: string;
  isoDate?: string;
  note?: string;
  score?: "hot" | "warm" | "cold";
  field?: AllowedLeadField;
  value?: string | number | null;
  orderItems?: OrderItem[];
  deliveryAddress?: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount?: number;
}

export interface BotReplyResult {
  reply: string;
  nextStage: BotStage;
  extractedName?: string | null;
  extractedBudget?: string | null;
  extractedUnitType?: string | null;
  extractedBedrooms?: number | null;
  extractedBathrooms?: number | null;
  extractedLocation?: string | null;
  extractedArea?: string | null;
  extractedPaymentType?: string | null;
  extractedDownPayment?: string | null;
  extractedProject?: string | null;
  extractedTimeline?: string | null;
  extractedPhone?: string | null;
  extractedDeliveryAddress?: string | null;
  shouldHandoff: boolean;
  botActions: BotAction[];
}

interface ParsedBotReply {
  reply?: unknown;
  nextStage?: unknown;
  extractedName?: unknown;
  extractedBudget?: unknown;
  extractedUnitType?: unknown;
  extractedBedrooms?: unknown;
  extractedBathrooms?: unknown;
  extractedLocation?: unknown;
  extractedArea?: unknown;
  extractedPaymentType?: unknown;
  extractedDownPayment?: unknown;
  extractedProject?: unknown;
  extractedTimeline?: unknown;
  extractedPhone?: unknown;
  extractedDeliveryAddress?: unknown;
  shouldHandoff?: unknown;
  botActions?: unknown;
}

export interface BotConfig {
  botName?: string;
  companyName?: string;
  botRole?: string;
  botPersonality?: string;
  botMission?: string;
  companyKnowledge?: string;
  welcomeMessage?: string;
  enabledProjectIds?: string[] | null;
  openAiApiKey?: string | null;
  openAiModel?: string | null;
  businessType?: string;
  chatGoal?: string;
}

function buildKnowledgeBaseContext(items: KnowledgeBaseItem[]): string {
  const activeItems = items.filter(i => i.isActive !== false && i.status !== "inactive");
  if (activeItems.length === 0) return "";
  const lines: string[] = [];
  for (const item of activeItems) {
    let line = `• ${item.name}`;
    if (item.category) line += ` [${item.category}]`;
    if (item.description) line += ` — ${item.description}`;
    if (item.price) line += ` | السعر: ${item.price.toLocaleString()} جنيه`;
    lines.push(line);
  }
  return `📦 منتجات وخدمات الشركة:\n${lines.join("\n")}`;
}

function buildProductContext(products: Product[]): string {
  const activeProducts = products.filter(p => p.isActive !== false && p.stock > 0);
  if (activeProducts.length === 0) {
    const outOfStock = products.filter(p => p.isActive !== false && p.stock <= 0);
    if (outOfStock.length > 0) return "⚠️ جميع المنتجات غير متوفرة حالياً في المخزون.";
    return "لا توجد منتجات متاحة حالياً.";
  }
  const lines: string[] = [];
  for (const product of activeProducts) {
    let line = `• ${product.name}`;
    if (product.category) line += ` [${product.category}]`;
    if (product.description) line += ` — ${product.description}`;
    line += ` | السعر: ${Number(product.price).toLocaleString()} جنيه`;
    line += ` | المخزون: ${product.stock} قطعة`;
    lines.push(line);
  }
  return `🛍️ المنتجات المتاحة:\n${lines.join("\n")}`;
}

function buildInventoryContext(projects: Project[], units: Unit[]): string {
  if (projects.length === 0) return "لا توجد مشاريع مسجّلة حالياً في النظام.";

  const sections: string[] = [];
  for (const p of projects) {
    const projectUnits = units.filter(u => u.projectId === p.id && u.status === "available");
    let section = `📍 مشروع "${p.name}"`;
    if (p.type) section += ` (${p.type})`;
    if (p.location) section += ` — ${p.location}`;
    if (p.description) section += `\n   ${p.description}`;
    if (p.minPrice || p.maxPrice) {
      section += `\n   الأسعار: من ${p.minPrice?.toLocaleString() ?? "?"} إلى ${p.maxPrice?.toLocaleString() ?? "?"} جنيه`;
    }
    if (p.amenities && p.amenities.length > 0) {
      section += `\n   المميزات: ${p.amenities.join("، ")}`;
    }
    if (p.deliveryDate) section += ` | التسليم: ${p.deliveryDate}`;
    if (p.status) section += ` | الحالة: ${p.status === "ready" ? "جاهز للتسليم" : p.status === "under_construction" ? "تحت الإنشاء" : p.status}`;

    if (projectUnits.length > 0) {
      section += `\n   الوحدات المتاحة (${projectUnits.length} وحدة):`;
      for (const u of projectUnits.slice(0, 15)) {
        let unitLine = `     • ${u.type ?? "وحدة"} ${u.unitNumber}`;
        if (u.bedrooms) unitLine += ` | ${u.bedrooms} غرف`;
        if (u.bathrooms) unitLine += ` | ${u.bathrooms} حمام`;
        if (u.area) unitLine += ` | ${u.area} م²`;
        if (u.price) unitLine += ` | ${u.price.toLocaleString()} جنيه`;
        if (u.floor) unitLine += ` | دور ${u.floor}`;
        if (u.finishing) unitLine += ` | ${u.finishing}`;
        if (u.view) unitLine += ` | إطلالة: ${u.view}`;
        section += `\n${unitLine}`;
      }
      if (projectUnits.length > 15) {
        section += `\n     ... و${projectUnits.length - 15} وحدة أخرى`;
      }
    } else {
      section += `\n   لا توجد وحدات متاحة حالياً في هذا المشروع.`;
    }
    sections.push(section);
  }
  return sections.join("\n\n");
}

export async function generateBotReply(
  currentMessage: string,
  currentStage: BotStage,
  lead: Lead,
  recentMessages: WhatsappMessagesLog[],
  projects: Project[],
  units: Unit[],
  config: BotConfig,
  isFirstInteraction?: boolean,
  knowledgeBaseItems?: KnowledgeBaseItem[],
  products?: Product[],
): Promise<BotReplyResult> {
  const isEcommerce = config.businessType === "ecommerce";

  if (isEcommerce) {
    return generateEcommerceBotReply(
      currentMessage,
      currentStage,
      lead,
      recentMessages,
      config,
      isFirstInteraction,
      knowledgeBaseItems,
      products ?? [],
    );
  }

  return generateServiceBotReply(
    currentMessage,
    currentStage,
    lead,
    recentMessages,
    projects,
    units,
    config,
    isFirstInteraction,
    knowledgeBaseItems,
  );
}

async function generateServiceBotReply(
  currentMessage: string,
  currentStage: BotStage,
  lead: Lead,
  recentMessages: WhatsappMessagesLog[],
  projects: Project[],
  units: Unit[],
  config: BotConfig,
  isFirstInteraction?: boolean,
  knowledgeBaseItems?: KnowledgeBaseItem[],
): Promise<BotReplyResult> {
  const filteredProjects = (config.enabledProjectIds && config.enabledProjectIds.length > 0)
    ? projects.filter(p => config.enabledProjectIds!.includes(p.id))
    : projects;

  const inventoryContext = buildInventoryContext(filteredProjects, units);
  const kbContext = knowledgeBaseItems ? buildKnowledgeBaseContext(knowledgeBaseItems) : "";

  const conversationHistory = recentMessages
    .slice(-8)
    .map(m => `${m.direction === "inbound" ? "العميل" : "البوت"}: ${m.messageText}`)
    .join("\n");

  const leadInfo = buildLeadContext(lead);

  const greetingInstruction = (isFirstInteraction && config.welcomeMessage && currentStage === "greeting")
    ? `للتحية الأولى استخدم هذه الرسالة تحديداً: "${config.welcomeMessage}"`
    : "ابدأ بتحية ودية واسأل عن الاسم";

  const resolvedName = config.botName ?? "المساعد الذكي";
  const resolvedCompany = config.companyName ?? "شركتنا";
  const resolvedRole = config.botRole ?? "مستشار مبيعات";
  const resolvedPersonality = config.botPersonality ?? "أنت مستشار مبيعات مصري محترف وودود. بتتكلم بالمصري بشكل طبيعي. بتساعد العملاء وبتجمع بياناتهم بطريقة محترمة.";
  const resolvedMission = config.botMission ?? "جمع بيانات العميل الكاملة وترشيح الخدمات المناسبة قبل تحويله للمندوب.";
  const resolvedKnowledge = config.companyKnowledge ?? "";
  const nowISO = new Date().toISOString();

  const chatGoal = config.chatGoal ?? "lead_qualified";
  const goalInstructions: Record<string, string> = {
    appointment_booking: "هدفك حجز موعد مع العميل. بعد ما تجمع بياناته الأساسية، اطلب منه تحديد موعد للزيارة أو اللقاء.",
    call_booking: "هدفك ترتيب مكالمة مع فريق المبيعات. بعد ما تجمع بياناته، اقترح عليه موعد مكالمة مناسب.",
    lead_qualified: "هدفك تأهيل الليد وجمع بياناته الكاملة قبل تحويله للمندوب.",
    custom: resolvedMission,
  };
  const goalInstruction = goalInstructions[chatGoal] ?? goalInstructions["lead_qualified"];

  const hasProjects = filteredProjects.length > 0;

  const systemPrompt = `أنت "${resolvedName}" — ${resolvedRole} في شركة "${resolvedCompany}".
${resolvedPersonality}

🎯 هدف المحادثة:
${goalInstruction}

🎯 مهمتك:
${resolvedMission}

${resolvedKnowledge ? `📋 معلومات إضافية عن الشركة:\n${resolvedKnowledge}\n` : ""}
${kbContext ? `${kbContext}\n` : ""}
${hasProjects ? `🏗️ المشاريع والوحدات المتاحة:\n${inventoryContext}\n` : ""}
📊 البيانات المجمّعة للعميل حتى الآن:
${leadInfo}

📋 مراحل المحادثة:
1. greeting: ${greetingInstruction}
2. collecting_name: بعد التحية، اعرف اسم العميل. لو قال اسمه في أول رسالة، انتقل لـ collecting_needs على طول.
3. collecting_needs: اسأل عن احتياجاته ومتطلباته. ممكن تجمع أكتر من معلومة في رسالة واحدة.
4. recommending_units: بناءً على اللي العميل قاله، رشّحله خدمات أو منتجات مناسبة من القائمة أعلاه. لو مافيش معروض، قوله واقترح بدائل.
5. collecting_details: بعد ما يبدي اهتمام، اسأل عن تفاصيل إضافية تساعد في إتمام الخدمة.
6. qualified: البيانات الأساسية اكتملت. جهّز للتحويل للمندوب.

⚡ قواعد مهمة:
- اتكلم بالمصري العامي الطبيعي مش الفصحى
- ردود قصيرة ومركزة (2-4 جمل) — ده واتساب مش إيميل
- لو العميل سأل عن خدمة أو منتج أو سعر، رد بمعلومات حقيقية من القائمة أعلاه — ماتأخترعش أرقام
- لو العميل مش عايز يكمل أو قال "لا شكراً"، احترم قراره بلباقة
- استخرج أي بيانات ذكرها العميل في رسالته حتى لو ماطلبتهاش
- shouldHandoff = true بس لما يبقى عندك على الأقل: الاسم + اهتمام واضح بخدمة أو منتج
- لو العميل طلب يتكلم مع حد أو طلب مندوب، حط shouldHandoff = true على طول

🤖 إجراءات CRM تلقائية (botActions):
الوقت الحالي هو: ${nowISO}
بناءً على رسالة العميل، ممكن تضيف إجراءات CRM في مصفوفة botActions:

1. change_state — غيّر حالة الليد لو:
   - العميل قال مش مهتم / غير مهتم / لا شكراً / مش محتاج → stateName: "غير مهتم"
   - رقم غلط / مش أنا / مش صح → stateName: "ملغي"

2. create_reminder — أنشئ تذكير متابعة لو:
   - العميل طلب تأجيل: "كلمني بكرة"، "الساعة X"، "بعد X أيام"، "مشغول دلوقتي"
   - احسب التاريخ الفعلي من الوقت الحالي:
     * "بكرة الساعة 3" = تاريخ الغد بوقت 15:00
     * "بعد يومين" = بعد يومين من الآن
     * "الأسبوع الجاي" = بعد 7 أيام
     * "مشغول / بعدين / امشي" = بعد ساعتين من الآن
   - أرجع: { "type": "create_reminder", "isoDate": "ISO datetime string", "note": "سبب التذكير" }

3. update_score — حدّث تقييم الاهتمام لو:
   - اهتمام عالي: طلب موعد، جاهز للشراء → score: "hot"
   - اهتمام متوسط: استفسار جدي، أسئلة تفصيلية → score: "warm"

4. update_lead — حدّث بيانات الليد مباشرة لو العميل ذكر بيانات واضحة:
   - الحقول المسموحة: name, budget, unitType, bedrooms, bathrooms, location, area, paymentType, downPayment, email, notes
   - أمثلة:
     * العميل قال "أنا أحمد" → { "type": "update_lead", "field": "name", "value": "أحمد" }
     * العميل قال "ميزانيتي 2 مليون" → { "type": "update_lead", "field": "budget", "value": "2,000,000" }
   - ملحوظة: لا تكرر بيانات مستخرجة بالفعل في حقول extracted...

لو مافيش إجراءات مطلوبة، ارجع مصفوفة فارغة: "botActions": []

🔄 أرجع JSON فقط بهذا الشكل:
{
  "reply": "نص الرد بالمصري",
  "nextStage": "اسم المرحلة التالية",
  "extractedName": "الاسم أو null",
  "extractedBudget": "الميزانية أو null",
  "extractedUnitType": "نوع الخدمة/المنتج أو null",
  "extractedBedrooms": عدد الغرف كرقم أو null,
  "extractedBathrooms": عدد الحمامات كرقم أو null,
  "extractedLocation": "المنطقة/الموقع المفضل أو null",
  "extractedArea": "المساحة المطلوبة أو null",
  "extractedPaymentType": "طريقة الدفع أو null",
  "extractedDownPayment": "مبلغ المقدم أو null",
  "extractedProject": "اسم الخدمة/المشروع اللي العميل مهتم بيه أو null",
  "extractedTimeline": "الجدول الزمني أو null",
  "extractedPhone": "رقم الموبايل المصري إذا ذكره العميل أو null",
  "extractedDeliveryAddress": null,
  "shouldHandoff": true أو false,
  "botActions": []
}`;

  const userPrompt = `المرحلة الحالية: ${currentStage}
سجل المحادثة:
${conversationHistory}

آخر رسالة من العميل: ${currentMessage}

رد على العميل بصفتك مستشار مبيعات محترف وانتقل للمرحلة المناسبة.`;

  const raw = await callAI(systemPrompt, userPrompt, config.openAiApiKey, config.openAiModel);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      reply: "شكراً على تواصلك! سيتواصل معك أحد مستشارينا قريباً.",
      nextStage: currentStage,
      shouldHandoff: false,
      botActions: [],
    };
  }

  const parsed = JSON.parse(jsonMatch[0]) as ParsedBotReply;
  const validStages: BotStage[] = ["greeting", "collecting_name", "collecting_needs", "recommending_units", "collecting_details", "qualified", "handed_off"];
  const nextStage = validStages.includes(parsed.nextStage as BotStage)
    ? (parsed.nextStage as BotStage)
    : currentStage;

  return {
    reply: typeof parsed.reply === "string" ? parsed.reply : "شكراً على تواصلك!",
    nextStage,
    extractedName: typeof parsed.extractedName === "string" ? parsed.extractedName : null,
    extractedBudget: typeof parsed.extractedBudget === "string" ? parsed.extractedBudget : null,
    extractedUnitType: typeof parsed.extractedUnitType === "string" ? parsed.extractedUnitType : null,
    extractedBedrooms: typeof parsed.extractedBedrooms === "number" ? parsed.extractedBedrooms : null,
    extractedBathrooms: typeof parsed.extractedBathrooms === "number" ? parsed.extractedBathrooms : null,
    extractedLocation: typeof parsed.extractedLocation === "string" ? parsed.extractedLocation : null,
    extractedArea: typeof parsed.extractedArea === "string" ? parsed.extractedArea : null,
    extractedPaymentType: typeof parsed.extractedPaymentType === "string" ? parsed.extractedPaymentType : null,
    extractedDownPayment: typeof parsed.extractedDownPayment === "string" ? parsed.extractedDownPayment : null,
    extractedProject: typeof parsed.extractedProject === "string" ? parsed.extractedProject : null,
    extractedTimeline: typeof parsed.extractedTimeline === "string" ? parsed.extractedTimeline : null,
    extractedPhone: typeof parsed.extractedPhone === "string" ? parsed.extractedPhone : null,
    extractedDeliveryAddress: null,
    shouldHandoff: parsed.shouldHandoff === true,
    botActions: parseBotActions(parsed.botActions),
  };
}

async function generateEcommerceBotReply(
  currentMessage: string,
  currentStage: BotStage,
  lead: Lead,
  recentMessages: WhatsappMessagesLog[],
  config: BotConfig,
  isFirstInteraction?: boolean,
  knowledgeBaseItems?: KnowledgeBaseItem[],
  products: Product[] = [],
): Promise<BotReplyResult> {
  const productContext = buildProductContext(products);
  const kbContext = knowledgeBaseItems ? buildKnowledgeBaseContext(knowledgeBaseItems) : "";

  const conversationHistory = recentMessages
    .slice(-10)
    .map(m => `${m.direction === "inbound" ? "العميل" : "البوت"}: ${m.messageText}`)
    .join("\n");

  const leadInfo = buildLeadContext(lead);

  const greetingInstruction = (isFirstInteraction && config.welcomeMessage && currentStage === "greeting")
    ? `للتحية الأولى استخدم هذه الرسالة تحديداً: "${config.welcomeMessage}"`
    : "ابدأ بتحية ودية واعرض خدماتك";

  const resolvedName = config.botName ?? "مساعد المتجر";
  const resolvedCompany = config.companyName ?? "متجرنا";
  const resolvedRole = config.botRole ?? "مساعد متجر";
  const resolvedPersonality = config.botPersonality ?? "أنت مساعد متجر إلكتروني مصري محترف وودود. بتتكلم بالمصري بشكل طبيعي. بتساعد العملاء يلاقوا المنتجات المناسبة وبتخلصهم طلباتهم بسهولة وسرعة.";
  const resolvedMission = config.botMission ?? "مساعدة العميل في تصفح المنتجات المتاحة وإتمام طلبه بالكامل بما يشمل: المنتجات، الكميات، وعنوان التوصيل.";
  const resolvedKnowledge = config.companyKnowledge ?? "";
  const nowISO = new Date().toISOString();

  const systemPrompt = `أنت "${resolvedName}" — ${resolvedRole} في "${resolvedCompany}".
${resolvedPersonality}

🎯 مهمتك:
${resolvedMission}

${resolvedKnowledge ? `📋 معلومات إضافية عن المتجر:\n${resolvedKnowledge}\n` : ""}
${kbContext ? `${kbContext}\n` : ""}
${productContext}

📊 بيانات العميل الحالية:
${leadInfo}

📋 مراحل المحادثة:
1. greeting: ${greetingInstruction}. رحّب بالعميل واسأله إيه اللي يدور عليه.
2. show_products: اعرض المنتجات المتاحة بشكل منظم وجذاب. ساعد العميل يختار المنتج المناسب.
3. collecting_order: بعد اختيار العميل، اتأكد من المنتج والكمية المطلوبة. لو اختار أكتر من منتج، اتأكد من كلهم.
4. collecting_address: اطلب عنوان التوصيل بالتفصيل (الشارع، المنطقة، المحافظة).
5. order_confirmed: لخّص الطلب الكامل (المنتجات + الكميات + الأسعار + الإجمالي + عنوان التوصيل) واطلب تأكيد العميل. لما يأكد، أنشئ الطلب.

⚡ قواعد مهمة:
- اتكلم بالمصري العامي الطبيعي مش الفصحى
- ردود قصيرة ومركزة (2-4 جمل)
- اذكر دايماً الأسعار والكميات المتاحة بدقة من القائمة أعلاه
- ماتبيعش منتجات مش في القائمة أو منتهية المخزون
- لو العميل سأل عن منتج مش موجود، قوله بلطف واعرض بديل
- استخرج اسم العميل ورقمه لو ذكرهم في الرسالة

🤖 إجراءات CRM تلقائية (botActions):
الوقت الحالي هو: ${nowISO}

1. create_order — أنشئ الطلب لما العميل يؤكد طلبه بشكل كامل (بعد جمع المنتجات والكميات والعنوان):
   - أرجع: {
       "type": "create_order",
       "orderItems": [{ "productName": "اسم المنتج كما في القائمة", "quantity": الكمية, "unitPrice": سعر_الوحدة_كرقم }],
       "deliveryAddress": "عنوان التوصيل",
       "customerName": "اسم العميل أو null",
       "customerPhone": "رقم العميل أو null",
       "totalAmount": المبلغ_الإجمالي_كرقم
     }
   - فقط عند وجود تأكيد صريح من العميل ("أيوه"، "تمام"، "اطلب"، "كمّل")
   - تأكد أن unitPrice هو السعر الفعلي من القائمة كرقم (مثال: 150 مش "150 جنيه")

2. update_lead — حدّث بيانات العميل:
   - الحقول المسموحة: name, email, notes
   - مثال: العميل قال "أنا مريم" → { "type": "update_lead", "field": "name", "value": "مريم" }

3. change_state — غيّر الحالة لو:
   - العميل رفض أو غير مهتم → stateName: "غير مهتم"

لو مافيش إجراءات، ارجع: "botActions": []

🔄 أرجع JSON فقط بهذا الشكل:
{
  "reply": "نص الرد بالمصري",
  "nextStage": "greeting | show_products | collecting_order | collecting_address | order_confirmed",
  "extractedName": "الاسم أو null",
  "extractedPhone": "رقم الموبايل المصري إذا ذكره أو null",
  "extractedDeliveryAddress": "عنوان التوصيل إذا ذكره العميل أو null",
  "extractedBudget": null,
  "extractedUnitType": null,
  "extractedBedrooms": null,
  "extractedBathrooms": null,
  "extractedLocation": null,
  "extractedArea": null,
  "extractedPaymentType": null,
  "extractedDownPayment": null,
  "extractedProject": null,
  "extractedTimeline": null,
  "shouldHandoff": false,
  "botActions": []
}`;

  const userPrompt = `المرحلة الحالية: ${currentStage}
سجل المحادثة:
${conversationHistory}

آخر رسالة من العميل: ${currentMessage}

رد على العميل وأكمل مسار الطلب.`;

  const raw = await callAI(systemPrompt, userPrompt, config.openAiApiKey, config.openAiModel);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      reply: "شكراً! سيتواصل معك فريقنا قريباً.",
      nextStage: currentStage,
      shouldHandoff: false,
      botActions: [],
    };
  }

  const parsed = JSON.parse(jsonMatch[0]) as ParsedBotReply;
  const validEcommerceStages: BotStage[] = ["greeting", "show_products", "collecting_order", "collecting_address", "order_confirmed", "handed_off"];
  const nextStage = validEcommerceStages.includes(parsed.nextStage as BotStage)
    ? (parsed.nextStage as BotStage)
    : currentStage;

  return {
    reply: typeof parsed.reply === "string" ? parsed.reply : "شكراً على تواصلك!",
    nextStage,
    extractedName: typeof parsed.extractedName === "string" ? parsed.extractedName : null,
    extractedBudget: null,
    extractedUnitType: null,
    extractedBedrooms: null,
    extractedBathrooms: null,
    extractedLocation: null,
    extractedArea: null,
    extractedPaymentType: null,
    extractedDownPayment: null,
    extractedProject: null,
    extractedTimeline: null,
    extractedPhone: typeof parsed.extractedPhone === "string" ? parsed.extractedPhone : null,
    extractedDeliveryAddress: typeof parsed.extractedDeliveryAddress === "string" ? parsed.extractedDeliveryAddress : null,
    shouldHandoff: false,
    botActions: parseBotActions(parsed.botActions),
  };
}

function parseBotActions(raw: unknown): BotAction[] {
  if (!Array.isArray(raw)) return [];
  const result: BotAction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const type = obj["type"];
    if (type === "change_state" && typeof obj["stateName"] === "string") {
      result.push({ type: "change_state", stateName: obj["stateName"] });
    } else if (type === "create_reminder") {
      const isoDate = typeof obj["isoDate"] === "string" ? obj["isoDate"] : undefined;
      const note = typeof obj["note"] === "string" ? obj["note"] : undefined;
      if (isoDate) result.push({ type: "create_reminder", isoDate, note });
    } else if (type === "update_score") {
      const score = obj["score"];
      if (score === "hot" || score === "warm" || score === "cold") {
        result.push({ type: "update_score", score });
      }
    } else if (type === "update_lead") {
      const field = obj["field"];
      const value = obj["value"];
      if (typeof field === "string" && (ALLOWED_LEAD_FIELDS as readonly string[]).includes(field)) {
        result.push({ type: "update_lead", field: field as AllowedLeadField, value: value as string | number | null });
      }
    } else if (type === "create_order") {
      const rawItems = Array.isArray(obj["orderItems"]) ? obj["orderItems"] : [];
      const orderItems: OrderItem[] = rawItems
        .filter((i): i is Record<string, unknown> => i !== null && typeof i === "object")
        .map(i => ({
          productId: typeof i["productId"] === "string" ? i["productId"] : undefined,
          productName: typeof i["productName"] === "string" ? i["productName"] : (typeof i["name"] === "string" ? i["name"] : "منتج"),
          quantity: typeof i["quantity"] === "number" && i["quantity"] > 0 ? Math.round(i["quantity"]) : 1,
          unitPrice: typeof i["unitPrice"] === "number" && i["unitPrice"] >= 0 ? i["unitPrice"] : (typeof i["price"] === "number" ? i["price"] : 0),
        }))
        .filter(i => i.productName && i.quantity > 0);
      if (orderItems.length === 0) continue;
      const deliveryAddress = typeof obj["deliveryAddress"] === "string" ? obj["deliveryAddress"] : undefined;
      const customerName = typeof obj["customerName"] === "string" ? obj["customerName"] : undefined;
      const customerPhone = typeof obj["customerPhone"] === "string" ? obj["customerPhone"] : undefined;
      const totalAmount = typeof obj["totalAmount"] === "number" ? obj["totalAmount"] :
        orderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      result.push({ type: "create_order", orderItems, deliveryAddress, customerName, customerPhone, totalAmount });
    }
  }
  return result;
}

export async function analyzeLead(
  messages: WhatsappMessagesLog[],
  lead: Lead
): Promise<AnalyzeLeadResult> {
  const systemPrompt = `أنت محلل بيانات عقارات محترف في مصر. مهمتك تحليل محادثة واتساب واستخراج بيانات مهمة عن العميل المحتمل.

أرجع JSON فقط بهذا الشكل:
{
  "budget": "الميزانية التقريبية (مثال: 3,000,000 جنيه) أو null",
  "unitType": "نوع الوحدة المطلوبة (شقة/فيلا/دوبلكس/مكتب/محل) أو null",
  "bedrooms": عدد الغرف كرقم أو null,
  "interestLevel": "hot أو warm أو cold بناءً على مستوى الاهتمام",
  "summary": "ملخص تحليلي بالعربية في جملتين: ما يريده العميل ومستوى جدّيته"
}

قواعد تحديد مستوى الاهتمام:
- hot: سأل عن الأسعار بتحديد، أو طلب موعد معاينة، أو مستعجل
- warm: مهتم لكن لم يحدد قرارًا واضحًا
- cold: يسأل عمومًا أو لا يرد أو غير مهتم`;

  const userPrompt = `بيانات الليد الحالية: ${buildLeadContext(lead)}

سجل المحادثة:
${buildConversationHistory(messages)}

حلّل هذه المحادثة واستخرج البيانات المطلوبة.`;

  const raw = await callAI(systemPrompt, userPrompt);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("تعذّر تحليل استجابة الذكاء الاصطناعي");
  }

  const parsed = JSON.parse(jsonMatch[0]) as ParsedAnalysis;

  const budget = typeof parsed.budget === "string" && parsed.budget !== "null" ? parsed.budget : null;
  const unitType = typeof parsed.unitType === "string" && parsed.unitType !== "null" ? parsed.unitType : null;
  const bedrooms = typeof parsed.bedrooms === "number" ? parsed.bedrooms : null;
  const rawLevel = typeof parsed.interestLevel === "string" ? parsed.interestLevel : "";
  const interestLevel: AnalyzeLeadResult["interestLevel"] =
    rawLevel === "hot" || rawLevel === "warm" || rawLevel === "cold" ? rawLevel : null;
  const summary = typeof parsed.summary === "string" ? parsed.summary : "لم يتم استخراج ملخص";

  return { budget, unitType, bedrooms, interestLevel, summary };
}
