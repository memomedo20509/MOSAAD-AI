import type { Lead, WhatsappMessagesLog, Project, Unit } from "@shared/schema";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER ?? "https://crm.seosahl.cloud";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE ?? "HomeAdvisor CRM";

// google/gemini-flash-1.5 is the default per task spec.
// Falls back to google/gemini-2.0-flash-001 if the 1.5 alias returns 404.
const MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-flash-1.5";

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

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY غير مضبوط في المتغيرات البيئية");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    },
    body: JSON.stringify({
      model: MODEL,
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
    // Try to fall back to the 2.0 variant if the 1.5 alias is not found
    if (response.status === 404 && MODEL === "google/gemini-flash-1.5") {
      return callGeminiFallback(systemPrompt, userPrompt);
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

async function callGeminiFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  const fallbackModel = "google/gemini-2.0-flash-001";
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY!}`,
      "Content-Type": "application/json",
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    },
    body: JSON.stringify({
      model: fallbackModel,
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

  const raw = await callGemini(systemPrompt, userPrompt);

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
  | "handed_off";

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
  shouldHandoff: boolean;
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
  shouldHandoff?: unknown;
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
): Promise<BotReplyResult> {
  // Filter projects by enabledProjectIds if set (non-empty array = whitelist)
  const filteredProjects = (config.enabledProjectIds && config.enabledProjectIds.length > 0)
    ? projects.filter(p => config.enabledProjectIds!.includes(p.id))
    : projects;

  const inventoryContext = buildInventoryContext(filteredProjects, units);

  const conversationHistory = recentMessages
    .slice(-8)
    .map(m => `${m.direction === "inbound" ? "العميل" : "البوت"}: ${m.messageText}`)
    .join("\n");

  const leadInfo = buildLeadContext(lead);

  const greetingInstruction = (isFirstInteraction && config.welcomeMessage && currentStage === "greeting")
    ? `للتحية الأولى استخدم هذه الرسالة تحديداً: "${config.welcomeMessage}"`
    : "ابدأ بتحية ودية واسأل عن الاسم";

  const resolvedName = config.botName ?? "المساعد الذكي";
  const resolvedCompany = config.companyName ?? "شركتنا العقارية";
  const resolvedRole = config.botRole ?? "مستشار عقاري";
  const resolvedPersonality = config.botPersonality ?? "أنت مستشار عقاري مصري محترف وودود. بتتكلم بالمصري بشكل طبيعي. بتساعد العملاء يلاقوا الوحدة المناسبة ليهم وبتجمع بياناتهم بطريقة محترمة.";
  const resolvedMission = config.botMission ?? "جمع بيانات العميل الكاملة وترشيح وحدات مناسبة من المشاريع المتاحة قبل تحويله للمندوب.";
  const resolvedKnowledge = config.companyKnowledge ?? "";

  const systemPrompt = `أنت "${resolvedName}" — ${resolvedRole} في شركة "${resolvedCompany}".
${resolvedPersonality}

🎯 مهمتك:
${resolvedMission}

${resolvedKnowledge ? `📋 معلومات إضافية عن الشركة:\n${resolvedKnowledge}\n` : ""}
🏗️ المشاريع والوحدات المتاحة:
${inventoryContext}

📊 البيانات المجمّعة للعميل حتى الآن:
${leadInfo}

📋 مراحل المحادثة:
1. greeting: ${greetingInstruction}
2. collecting_name: بعد التحية، اعرف اسم العميل. لو قال اسمه في أول رسالة، انتقل لـ collecting_needs على طول.
3. collecting_needs: اسأل عن احتياجاته — الميزانية، نوع الوحدة (شقة/فيلا/دوبلكس/توين هاوس/تاون هاوس/بنتهاوس/ستوديو/محل/مكتب)، عدد الغرف، المنطقة المفضلة. ممكن تجمع أكتر من معلومة في رسالة واحدة. لو العميل ذكر معلومات كتير مرة واحدة، استخرجها كلها.
4. recommending_units: بناءً على اللي العميل قاله، رشّحله وحدات محددة من القائمة أعلاه. اذكر اسم المشروع، رقم الوحدة، المساحة، السعر، والمميزات. لو مافيش وحدات تناسبه، قوله واقترح بدائل قريبة.
5. collecting_details: بعد ما يبدي اهتمام بوحدة أو مشروع، اسأل عن تفاصيل إضافية: طريقة الدفع (كاش/تقسيط)، المقدم المتاح، الجدول الزمني.
6. qualified: البيانات الأساسية اكتملت (اسم + ميزانية أو اهتمام بمشروع + نوع وحدة). جهّز للتحويل للمندوب.

⚡ قواعد مهمة:
- اتكلم بالمصري العامي الطبيعي مش الفصحى (يعني "إيه" مش "ماذا"، "عايز" مش "أريد"، "كويس" مش "جيد")
- ردود قصيرة ومركزة (2-4 جمل) — ده واتساب مش إيميل
- لو العميل سأل عن مشروع أو سعر أو وحدة، رد بمعلومات حقيقية من القائمة أعلاه — ماتأخترعش أرقام
- لو العميل اعترض على السعر أو قال غالي، حاول تعرض بدائل أرخص أو اتكلم عن التقسيط
- لو العميل مش عايز يكمل أو قال "لا شكراً"، احترم قراره بلباقة
- استخرج أي بيانات ذكرها العميل في رسالته حتى لو ماطلبتهاش
- shouldHandoff = true بس لما يبقى عندك على الأقل: الاسم + (الميزانية أو اهتمام واضح بمشروع) + نوع الوحدة
- لو العميل طلب يتكلم مع حد أو طلب مندوب، حط shouldHandoff = true على طول

🔄 أرجع JSON فقط بهذا الشكل:
{
  "reply": "نص الرد بالمصري",
  "nextStage": "اسم المرحلة التالية",
  "extractedName": "الاسم أو null",
  "extractedBudget": "الميزانية أو null",
  "extractedUnitType": "نوع الوحدة أو null",
  "extractedBedrooms": عدد الغرف كرقم أو null,
  "extractedBathrooms": عدد الحمامات كرقم أو null,
  "extractedLocation": "المنطقة/الموقع المفضل أو null",
  "extractedArea": "المساحة المطلوبة أو null",
  "extractedPaymentType": "كاش أو تقسيط أو null",
  "extractedDownPayment": "مبلغ المقدم أو null",
  "extractedProject": "اسم المشروع اللي العميل مهتم بيه أو null",
  "extractedTimeline": "الجدول الزمني للشراء (مثال: خلال شهر، 3 أشهر، نهاية السنة) أو null",
  "extractedPhone": "رقم الموبايل المصري إذا ذكره العميل (مثال: 01020076679) أو null",
  "shouldHandoff": true أو false
}`;

  const userPrompt = `المرحلة الحالية: ${currentStage}
سجل المحادثة:
${conversationHistory}

آخر رسالة من العميل: ${currentMessage}

رد على العميل بصفتك بروكر عقاري مصري محترف وانتقل للمرحلة المناسبة.`;

  const raw = await callGemini(systemPrompt, userPrompt);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      reply: "شكراً على تواصلك! سيتواصل معك أحد مستشارينا قريباً.",
      nextStage: currentStage,
      shouldHandoff: false,
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
    shouldHandoff: parsed.shouldHandoff === true,
  };
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

  const raw = await callGemini(systemPrompt, userPrompt);

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
