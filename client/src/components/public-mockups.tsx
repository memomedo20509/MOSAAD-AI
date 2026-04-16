
export function WAChatMockup() {
  return (
    <div className="bg-[#0b141a] rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-auto">
      {/* WhatsApp header */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          AI
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium">مساعد SalesBot</div>
          <div className="text-[#8696a0] text-xs">متصل الآن</div>
        </div>
        <div className="h-2 w-2 rounded-full bg-green-400"></div>
      </div>

      {/* Chat body */}
      <div className="px-3 py-4 space-y-3 min-h-[260px] bg-[#0b141a]">
        {/* Customer message */}
        <div className="flex justify-end">
          <div className="bg-[#005c4b] text-white text-sm rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%] leading-relaxed">
            أريد معرفة المزيد عن باقاتكم
            <div className="text-[#8696a0] text-[10px] mt-1 text-left">10:24 ✓✓</div>
          </div>
        </div>

        {/* Bot message */}
        <div className="flex justify-start">
          <div className="bg-[#202c33] text-[#e9edef] text-sm rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] leading-relaxed">
            <div className="text-green-400 text-xs font-medium mb-1">مساعد AI 🤖</div>
            أهلاً! يسعدني مساعدتك. لدينا 3 باقات مناسبة لكل نمو:
            <br />• أساسي: $49/شهر
            <br />• محترف: $149/شهر
            <br />• مؤسسي: $399/شهر
            <div className="text-[#8696a0] text-[10px] mt-1 text-left">10:24 ✓✓</div>
          </div>
        </div>

        {/* Customer message */}
        <div className="flex justify-end">
          <div className="bg-[#005c4b] text-white text-sm rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%] leading-relaxed">
            ما هي مميزات الباقة المحترفة؟
            <div className="text-[#8696a0] text-[10px] mt-1 text-left">10:25 ✓✓</div>
          </div>
        </div>

        {/* Bot reply */}
        <div className="flex justify-start">
          <div className="bg-[#202c33] text-[#e9edef] text-sm rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] leading-relaxed">
            <div className="text-green-400 text-xs font-medium mb-1">مساعد AI 🤖</div>
            الباقة المحترفة تشمل:
            ✅ 20 مستخدم
            ✅ 5000 رسالة/شهر
            ✅ تحليلات متقدمة
            ✅ حملات واتساب
            <div className="text-[#8696a0] text-[10px] mt-1 text-left">10:25 ✓✓</div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
        <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-[#8696a0] text-xs">اكتب رسالة...</div>
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
  const conversations = [
    { name: "أحمد السيد", msg: "أريد معرفة تفاصيل الباقة", time: "الآن", badge: "جديد", color: "bg-blue-500", status: "new" },
    { name: "سارة محمد", msg: "متى يمكن تجربة النظام؟", time: "5د", badge: null, color: "bg-purple-500", status: "open" },
    { name: "خالد العمري", msg: "شكراً على المساعدة! ✓", time: "12د", badge: null, color: "bg-green-500", status: "resolved" },
    { name: "نورة الزهراني", msg: "هل يدعم واتساب وانستغرام؟", time: "1س", badge: "2", color: "bg-orange-500", status: "open" },
    { name: "محمد ناصر", msg: "تم إرسال العرض للمراجعة", time: "2س", badge: null, color: "bg-teal-500", status: "pending" },
  ];

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-auto border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="text-white font-semibold text-sm">صندوق الوارد الموحد</div>
        <div className="bg-white/20 rounded-full px-2 py-0.5 text-white text-xs">12 محادثة</div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50 px-2 pt-1">
        {["الكل", "جديد", "مفتوح", "منتهي"].map((tab, i) => (
          <button key={tab} className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${i === 0 ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Conversations list */}
      <div className="divide-y divide-gray-50">
        {conversations.map((conv, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer ${i === 0 ? "bg-indigo-50/50" : ""}`}>
            <div className={`h-9 w-9 rounded-full ${conv.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {conv.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 truncate">{conv.name}</span>
                <span className="text-[10px] text-gray-400 shrink-0 mr-1">{conv.time}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">{conv.msg}</div>
            </div>
            {conv.badge && (
              <div className={`shrink-0 ${conv.badge === "جديد" ? "bg-green-500" : "bg-indigo-500"} text-white text-[10px] rounded-full px-1.5 py-0.5 font-medium`}>
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
  const columns = [
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
  ];

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden shadow-2xl w-full mx-auto border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="text-white font-semibold text-sm">خط مبيعات CRM</div>
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-green-400"></div>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {columns.map((col) => (
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
