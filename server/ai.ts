import type { Lead, WhatsappMessagesLog } from "@shared/schema";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "google/gemini-flash-1.5";

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY غير مضبوط في المتغيرات البيئية");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://crm.seosahl.cloud",
      "X-Title": "HomeAdvisor CRM",
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
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
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
  if (lead.notes) parts.push(`ملاحظات: ${lead.notes}`);
  if (lead.score) parts.push(`تقييم الليد: ${lead.score}`);
  return parts.length > 0 ? parts.join(" | ") : "لا توجد بيانات مفصّلة";
}

function buildConversationHistory(messages: WhatsappMessagesLog[]): string {
  if (messages.length === 0) return "لا توجد محادثة واتساب حتى الآن.";
  return messages
    .filter(m => m.messageText)
    .slice(-20)
    .map(m => {
      const dir = m.direction === "inbound" ? "العميل" : (m.agentName || "المندوب");
      return `${dir}: ${m.messageText}`;
    })
    .join("\n");
}

export interface SuggestRepliesResult {
  replies: string[];
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

  const parsed = JSON.parse(jsonMatch[0]) as { replies?: string[] };
  const replies = Array.isArray(parsed.replies) ? parsed.replies.slice(0, 3) : [];

  if (replies.length === 0) {
    throw new Error("لم يُرجع النموذج اقتراحات");
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

  const parsed = JSON.parse(jsonMatch[0]) as Partial<AnalyzeLeadResult>;

  return {
    budget: parsed.budget ?? null,
    unitType: parsed.unitType ?? null,
    bedrooms: typeof parsed.bedrooms === "number" ? parsed.bedrooms : null,
    interestLevel: (["hot", "warm", "cold"].includes(parsed.interestLevel as string)
      ? parsed.interestLevel
      : null) as AnalyzeLeadResult["interestLevel"],
    summary: parsed.summary ?? "لم يتم استخراج ملخص",
  };
}
