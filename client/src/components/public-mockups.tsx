import { useLanguage } from "@/lib/i18n";

export function WAChatMockup() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const content = isAr ? {
    botName: "مساعد SalesBot",
    status: "متصل الآن",
    customerMsg1: "أريد معرفة المزيد عن باقاتكم",
    botLabel: "مساعد AI 🤖",
    botMsg1: <>أهلاً! يسعدني مساعدتك. لدينا 3 باقات مناسبة لكل نمو:<br />• أساسي: $49/شهر<br />• محترف: $149/شهر<br />• مؤسسي: $399/شهر</>,
    customerMsg2: "ما هي مميزات الباقة المحترفة؟",
    botMsg2: <>الباقة المحترفة تشمل:<br />✅ 20 مستخدم<br />✅ 5000 رسالة/شهر<br />✅ تحليلات متقدمة<br />✅ حملات واتساب</>,
    inputPlaceholder: "اكتب رسالة...",
  } : {
    botName: "SalesBot Assistant",
    status: "Online now",
    customerMsg1: "I'd like to learn more about your plans",
    botLabel: "AI Assistant 🤖",
    botMsg1: <>Hi! Happy to help. We have 3 plans for every stage:<br />• Starter: $49/mo<br />• Pro: $149/mo<br />• Enterprise: $399/mo</>,
    customerMsg2: "What's included in the Pro plan?",
    botMsg2: <>The Pro plan includes:<br />✅ 20 users<br />✅ 5,000 messages/mo<br />✅ Advanced analytics<br />✅ WhatsApp campaigns</>,
    inputPlaceholder: "Type a message...",
  };

  return (
    <div className="bg-[#0b141a] rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-auto" dir={isAr ? "rtl" : "ltr"}>
      {/* WhatsApp header */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          AI
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium">{content.botName}</div>
          <div className="text-[#8696a0] text-xs">{content.status}</div>
        </div>
        <div className="h-2 w-2 rounded-full bg-green-400"></div>
      </div>

      {/* Chat body */}
      <div className="px-3 py-4 space-y-3 min-h-[260px] bg-[#0b141a]">
        <div className="flex justify-end">
          <div className="bg-[#005c4b] text-white text-sm rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%] leading-relaxed">
            {content.customerMsg1}
            <div className="text-[#8696a0] text-[10px] mt-1 text-left">10:24 ✓✓</div>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="bg-[#202c33] text-[#e9edef] text-sm rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] leading-relaxed">
            <div className="text-green-400 text-xs font-medium mb-1">{content.botLabel}</div>
            {content.botMsg1}
            <div className="text-[#8696a0] text-[10px] mt-1 text-left">10:24 ✓✓</div>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="bg-[#005c4b] text-white text-sm rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%] leading-relaxed">
            {content.customerMsg2}
            <div className="text-[#8696a0] text-[10px] mt-1 text-left">10:25 ✓✓</div>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="bg-[#202c33] text-[#e9edef] text-sm rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] leading-relaxed">
            <div className="text-green-400 text-xs font-medium mb-1">{content.botLabel}</div>
            {content.botMsg2}
            <div className="text-[#8696a0] text-[10px] mt-1 text-left">10:25 ✓✓</div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
        <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-[#8696a0] text-xs">{content.inputPlaceholder}</div>
        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function UnifiedInboxMockup() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const data = isAr ? {
    header: "صندوق الوارد الموحد",
    count: "12 محادثة",
    tabs: ["الكل", "جديد", "مفتوح", "منتهي"],
    conversations: [
      { name: "أحمد السيد", msg: "أريد معرفة تفاصيل الباقة", time: "الآن", badge: "جديد", color: "bg-blue-500" },
      { name: "سارة محمد", msg: "متى يمكن تجربة النظام؟", time: "5د", badge: null, color: "bg-purple-500" },
      { name: "خالد العمري", msg: "شكراً على المساعدة! ✓", time: "12د", badge: null, color: "bg-green-500" },
      { name: "نورة الزهراني", msg: "هل يدعم واتساب وانستغرام؟", time: "1س", badge: "2", color: "bg-orange-500" },
      { name: "محمد ناصر", msg: "تم إرسال العرض للمراجعة", time: "2س", badge: null, color: "bg-teal-500" },
    ],
    badgeNew: "جديد",
  } : {
    header: "Unified Inbox",
    count: "12 chats",
    tabs: ["All", "New", "Open", "Resolved"],
    conversations: [
      { name: "Ahmed S.", msg: "I'd like to know about plans", time: "Now", badge: "New", color: "bg-blue-500" },
      { name: "Sarah M.", msg: "When can I try the system?", time: "5m", badge: null, color: "bg-purple-500" },
      { name: "Khaled A.", msg: "Thanks for your help! ✓", time: "12m", badge: null, color: "bg-green-500" },
      { name: "Noura Z.", msg: "Does it support WhatsApp & Instagram?", time: "1h", badge: "2", color: "bg-orange-500" },
      { name: "Mohamed N.", msg: "Proposal sent for review", time: "2h", badge: null, color: "bg-teal-500" },
    ],
    badgeNew: "New",
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-auto border border-gray-100" dir={isAr ? "rtl" : "ltr"}>
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="text-white font-semibold text-sm">{data.header}</div>
        <div className="bg-white/20 rounded-full px-2 py-0.5 text-white text-xs">{data.count}</div>
      </div>

      <div className="flex border-b border-gray-100 bg-gray-50 px-2 pt-1">
        {data.tabs.map((tab, i) => (
          <button key={tab} className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${i === 0 ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="divide-y divide-gray-50">
        {data.conversations.map((conv, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer ${i === 0 ? "bg-indigo-50/50" : ""}`}>
            <div className={`h-9 w-9 rounded-full ${conv.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {conv.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 truncate">{conv.name}</span>
                <span className="text-[10px] text-gray-400 shrink-0 mx-1">{conv.time}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">{conv.msg}</div>
            </div>
            {conv.badge && (
              <div className={`shrink-0 ${conv.badge === data.badgeNew ? "bg-green-500" : "bg-indigo-500"} text-white text-[10px] rounded-full px-1.5 py-0.5 font-medium`}>
                {conv.badge}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CRMPipelineMockup() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const data = isAr ? {
    header: "خط مبيعات CRM",
    columns: [
      {
        title: "ليدز جديدة",
        color: "bg-blue-500",
        cards: [
          { name: "شركة النيل", value: "25,000", tag: "عقارات" },
          { name: "مجموعة الخليج", value: "18,000", tag: "تجارة" },
        ],
      },
      {
        title: "قيد المتابعة",
        color: "bg-yellow-500",
        cards: [
          { name: "تك العرب", value: "42,000", tag: "تقنية" },
          { name: "رواد الأعمال", value: "15,000", tag: "تعليم" },
        ],
      },
      {
        title: "صفقات مغلقة",
        color: "bg-green-500",
        cards: [
          { name: "الأفق العقاري", value: "89,000", tag: "عقارات" },
        ],
      },
    ],
  } : {
    header: "CRM Sales Pipeline",
    columns: [
      {
        title: "New Leads",
        color: "bg-blue-500",
        cards: [
          { name: "Nile Co.", value: "25,000", tag: "Real Estate" },
          { name: "Gulf Group", value: "18,000", tag: "Commerce" },
        ],
      },
      {
        title: "Following Up",
        color: "bg-yellow-500",
        cards: [
          { name: "ArabTech", value: "42,000", tag: "Technology" },
          { name: "Entrepreneurs", value: "15,000", tag: "Education" },
        ],
      },
      {
        title: "Closed Deals",
        color: "bg-green-500",
        cards: [
          { name: "Horizon RE", value: "89,000", tag: "Real Estate" },
        ],
      },
    ],
  };

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden shadow-2xl w-full mx-auto border border-gray-200" dir={isAr ? "rtl" : "ltr"}>
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="text-white font-semibold text-sm">{data.header}</div>
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-green-400"></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3">
        {data.columns.map((col) => (
          <div key={col.title} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${col.color}`}></div>
              <span className="text-[10px] font-semibold text-gray-600 truncate">{col.title}</span>
            </div>
            {col.cards.map((card, i) => (
              <div key={i} className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 space-y-1">
                <div className="text-[10px] font-semibold text-gray-800 truncate">{card.name}</div>
                <div className="text-[10px] font-bold text-green-600">${card.value}</div>
                <div className="bg-blue-50 text-blue-600 text-[9px] rounded px-1.5 py-0.5 w-fit">{card.tag}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FloatingBadge({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute bg-white rounded-xl shadow-xl border border-gray-100 px-3 py-2 text-xs font-semibold text-gray-800 flex items-center gap-2 animate-bounce ${className}`}
      style={{ animationDuration: "3s", ...style }}
    >
      {children}
    </div>
  );
}

export function GradientText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}
