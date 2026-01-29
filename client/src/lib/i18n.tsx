import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "ar" | "en";

const translations = {
  ar: {
    appName: "HomeAdvisor CRM",
    version: "الإصدار 1.0",
    signOut: "تسجيل الخروج",
    dashboard: "لوحة التحكم",
    dashboardSubtitle: "نظرة عامة على أداء المبيعات وتوزيع العملاء",
    totalLeads: "إجمالي العملاء",
    allLeadsInSystem: "جميع العملاء في النظام",
    activeStates: "الحالات النشطة",
    leadStatusCategories: "فئات حالة العملاء",
    assignedReps: "مندوبي المبيعات",
    salesRepresentatives: "مندوبي المبيعات المعينين",
    conversionRate: "معدل التحويل",
    doneDealsPercentage: "نسبة الصفقات المنجزة",
    leadStatusDistribution: "توزيع حالة العملاء",
    performanceChart: "مخطط الأداء",
    noDataToDisplay: "لا توجد بيانات للعرض",
    leadsBySalesRep: "العملاء حسب مندوب المبيعات",
    noAssignedLeadsYet: "لا يوجد عملاء معينين بعد",
    leads: "عميل",
    sales: "المبيعات",
    allLeads: "جميع العملاء المحتملين",
    leadsAdmin: "إدارة العملاء",
    addNewLead: "إضافة عميل جديد",
    uploadLeads: "رفع العملاء",
    duplicatedLeads: "العملاء المكررين",
    withdrawnLeads: "العملاء المنسحبين",
    actionsLog: "سجل الإجراءات",
    inventory: "المخزون",
    developers: "المطورين",
    projects: "المشاريع",
    units: "الوحدات",
    clients: "العملاء",
    allClients: "جميع العملاء",
    settings: "الإعدادات",
    statesManagement: "إدارة الحالات",
    savedFilters: "الفلاتر المحفوظة",
    users: "المستخدمين",
    teams: "الفرق",
    login: "تسجيل الدخول",
    createAccount: "إنشاء حساب",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    firstName: "الاسم الأول",
    lastName: "الاسم الأخير",
    email: "البريد الإلكتروني",
    welcomeToCRM: "مرحباً بك في HomeAdvisor CRM",
    crmDescription: "نظام متكامل لإدارة العملاء والعقارات والمبيعات. تتبع العملاء المحتملين، وإدارة المشاريع، وتحليل الأداء.",
    customerManagementSystem: "نظام إدارة العملاء والمبيعات",
    passwordsMismatch: "كلمات المرور غير متطابقة",
    passwordMinLength: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    quickLoginDev: "دخول سريع (للتطوير)",
    switchLanguage: "English",
    newLeads: "عملاء جدد",
    followUp: "متابعة",
    meeting: "اجتماع",
    doneDeal: "صفقة منجزة",
    canceled: "ملغي",
    notInterested: "غير مهتم",
    reserved: "محجوز",
  },
  en: {
    appName: "HomeAdvisor CRM",
    version: "Version 1.0",
    signOut: "Sign Out",
    dashboard: "Dashboard",
    dashboardSubtitle: "Overview of your sales performance and lead distribution",
    totalLeads: "Total Leads",
    allLeadsInSystem: "All leads in the system",
    activeStates: "Active States",
    leadStatusCategories: "Lead status categories",
    assignedReps: "Assigned Reps",
    salesRepresentatives: "Sales representatives",
    conversionRate: "Conversion Rate",
    doneDealsPercentage: "Done deals percentage",
    leadStatusDistribution: "Lead Status Distribution",
    performanceChart: "Performance Chart",
    noDataToDisplay: "No data to display",
    leadsBySalesRep: "Leads by Sales Rep",
    noAssignedLeadsYet: "No assigned leads yet",
    leads: "leads",
    sales: "Sales",
    allLeads: "All Leads",
    leadsAdmin: "Leads Administration",
    addNewLead: "Add New Lead",
    uploadLeads: "Upload Leads",
    duplicatedLeads: "Duplicated Leads",
    withdrawnLeads: "Withdrawn Leads",
    actionsLog: "Actions Log",
    inventory: "Inventory",
    developers: "Developers",
    projects: "Projects",
    units: "Units",
    clients: "Clients",
    allClients: "All Clients",
    settings: "Settings",
    statesManagement: "States Management",
    savedFilters: "Saved Filters",
    users: "Users",
    teams: "Teams",
    login: "Sign In",
    createAccount: "Create Account",
    username: "Username",
    password: "Password",
    confirmPassword: "Confirm Password",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    welcomeToCRM: "Welcome to HomeAdvisor CRM",
    crmDescription: "A comprehensive system for managing clients, properties, and sales. Track potential customers, manage projects, and analyze performance.",
    customerManagementSystem: "Customer & Sales Management System",
    passwordsMismatch: "Passwords do not match",
    passwordMinLength: "Password must be at least 6 characters",
    quickLoginDev: "Quick Login (Dev)",
    switchLanguage: "العربية",
    newLeads: "New Leads",
    followUp: "Follow Up",
    meeting: "Meeting",
    doneDeal: "Done Deal",
    canceled: "Canceled",
    notInterested: "Not Interested",
    reserved: "Reserved",
  },
};

type Translations = typeof translations.ar;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("crm-language") as Language) || "ar";
    }
    return "ar";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("crm-language", lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language],
    isRTL: language === "ar",
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
