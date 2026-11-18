"use client";

import { createContext, useContext, useEffect, useState } from "react";

const en = {
  // Navigation
  monitor: "Monitor",
  protect: "Protect",
  intelligence: "Learn",
  dashboard: "Dashboard",
  trends: "Trends",
  riskAssessment: "Risk Assessment",
  safetyAdvisor: "Safety Advisor",
  healthAdvisor: "Health Advisor",
  workerSafety: "Worker Safety",
  firstAid: "First Aid",
  caseStudies: "Case Studies",
  alerts: "Alerts",
  about: "About",
  tagline: "Heat, air and UV warnings",
  menu: "Menu",
  language: "Language",
  // Measures
  compoundRisk: "Compound Risk Score",
  heatStress: "Heat Stress",
  airQuality: "Air Quality",
  temperature: "Temperature",
  humidity: "Humidity",
  wind: "Wind",
  uvIndex: "UV Index",
  // Levels
  low: "Low",
  moderate: "Moderate",
  high: "High",
  extreme: "Extreme",
  critical: "Critical",
  emergency: "Emergency",
  // Actions
  generateAlert: "Generate Alert",
  downloadReport: "Download Report",
  addCity: "Add City",
  searchCity: "Search for a city…",
  details: "Details",
  viewDetails: "View Details",
  compare: "Compare with…",
  dismiss: "Dismiss",
  startOver: "Start over",
  notifyOn: "Critical-risk notifications on",
  notifyOff: "Notify me of critical risk",
  // Dashboard
  isItSafe: "Is it safe to be outside?",
  citiesMonitored: "Cities monitored",
  atCritical: "At Critical+ risk",
  highestWbgt: "Worst heat stress today",
  worstAqi: "Worst air now",
  risingRisks: "Rising risks",
  upcomingRisks: "Upcoming risks",
  globalRankings: "Global risk rankings",
  map: "Map",
  monitoredCities: "Monitored cities",
  // Banner
  bannerHigh: "{city} is forecast to reach High risk in {hours} hours, with the combined score rising to {score}",
  bannerCritical: "Critical: {city} is expected to reach dangerous levels in {hours} hours. Take precautions now",
  moreWarnings: "+{n} more",
} as const;

export type Key = keyof typeof en;
type Dict = Partial<Record<Key, string>>;

const ur: Dict = {
  monitor: "نگرانی",
  protect: "تحفظ",
  intelligence: "معلومات",
  dashboard: "ڈیش بورڈ",
  trends: "رجحانات",
  riskAssessment: "خطرے کا جائزہ",
  safetyAdvisor: "حفاظتی مشیر",
  healthAdvisor: "صحت کا مشیر",
  workerSafety: "مزدوروں کی حفاظت",
  firstAid: "ابتدائی طبی امداد",
  caseStudies: "کیس اسٹڈیز",
  alerts: "الرٹس",
  about: "ہمارے بارے میں",
  tagline: "ماحولیاتی صحت کی معلومات",
  menu: "مینو",
  language: "زبان",
  compoundRisk: "مجموعی خطرے کا اسکور",
  heatStress: "گرمی کا دباؤ",
  airQuality: "ہوا کا معیار",
  temperature: "درجہ حرارت",
  humidity: "نمی",
  wind: "ہوا",
  uvIndex: "یو وی انڈیکس",
  low: "کم",
  moderate: "معتدل",
  high: "زیادہ",
  extreme: "انتہائی",
  critical: "نازک",
  emergency: "ایمرجنسی",
  generateAlert: "الرٹ بنائیں",
  downloadReport: "رپورٹ ڈاؤن لوڈ کریں",
  addCity: "شہر شامل کریں",
  searchCity: "شہر تلاش کریں…",
  details: "تفصیلات",
  viewDetails: "تفصیلات دیکھیں",
  compare: "موازنہ کریں…",
  dismiss: "بند کریں",
  startOver: "دوبارہ شروع کریں",
  notifyOn: "نازک خطرے کی اطلاعات آن ہیں",
  notifyOff: "نازک خطرے پر مطلع کریں",
  isItSafe: "کیا باہر جانا محفوظ ہے؟",
  citiesMonitored: "زیرِ نگرانی شہر",
  atCritical: "نازک یا زیادہ خطرہ",
  highestWbgt: "آج کا سب سے زیادہ WBGT",
  worstAqi: "اس وقت بدترین ہوا",
  risingRisks: "بڑھتے ہوئے خطرات",
  upcomingRisks: "آنے والے خطرات",
  globalRankings: "عالمی درجہ بندی",
  map: "نقشہ",
  monitoredCities: "زیرِ نگرانی شہر",
  bannerHigh: "{city} میں {hours} گھنٹوں میں ماحولیاتی خطرہ زیادہ ہونے کی پیش گوئی ہے، اسکور {score} تک",
  bannerCritical: "نازک: {city} میں {hours} گھنٹوں میں خطرناک سطح متوقع ہے، ابھی احتیاط کریں",
  moreWarnings: "+{n} مزید",
};

const ar: Dict = {
  monitor: "الرصد",
  protect: "الحماية",
  intelligence: "المعلومات",
  dashboard: "لوحة المعلومات",
  trends: "الاتجاهات",
  riskAssessment: "تقييم المخاطر",
  safetyAdvisor: "مستشار السلامة",
  healthAdvisor: "المستشار الصحي",
  workerSafety: "سلامة العمال",
  firstAid: "الإسعافات الأولية",
  caseStudies: "دراسات حالة",
  alerts: "التنبيهات",
  about: "حول",
  tagline: "معلومات الصحة البيئية",
  menu: "القائمة",
  language: "اللغة",
  compoundRisk: "درجة المخاطر المركبة",
  heatStress: "الإجهاد الحراري",
  airQuality: "جودة الهواء",
  temperature: "درجة الحرارة",
  humidity: "الرطوبة",
  wind: "الرياح",
  uvIndex: "مؤشر الأشعة فوق البنفسجية",
  low: "منخفض",
  moderate: "معتدل",
  high: "مرتفع",
  extreme: "شديد",
  critical: "حرج",
  emergency: "طوارئ",
  generateAlert: "إنشاء تنبيه",
  downloadReport: "تحميل التقرير",
  addCity: "إضافة مدينة",
  searchCity: "ابحث عن مدينة…",
  details: "التفاصيل",
  viewDetails: "عرض التفاصيل",
  compare: "قارن مع…",
  dismiss: "إغلاق",
  startOver: "ابدأ من جديد",
  notifyOn: "إشعارات المخاطر الحرجة مفعّلة",
  notifyOff: "نبّهني عند الخطر الحرج",
  isItSafe: "هل من الآمن الخروج؟",
  citiesMonitored: "المدن المرصودة",
  atCritical: "في خطر حرج أو أعلى",
  highestWbgt: "أعلى WBGT اليوم",
  worstAqi: "أسوأ هواء الآن",
  risingRisks: "مخاطر متصاعدة",
  upcomingRisks: "مخاطر قادمة",
  globalRankings: "التصنيف العالمي للمخاطر",
  map: "الخريطة",
  monitoredCities: "المدن المرصودة",
  bannerHigh: "من المتوقع أن تصل {city} إلى خطر بيئي مرتفع خلال {hours} ساعة، الدرجة ترتفع إلى {score}",
  bannerCritical: "حرج: من المتوقع أن تصل {city} إلى مستويات خطرة خلال {hours} ساعة، اتخذ الاحتياطات الآن",
  moreWarnings: "+{n} أخرى",
};

const ja: Dict = {
  monitor: "監視",
  protect: "保護",
  intelligence: "情報",
  dashboard: "ダッシュボード",
  trends: "傾向",
  riskAssessment: "リスク評価",
  safetyAdvisor: "安全アドバイザー",
  healthAdvisor: "健康アドバイザー",
  workerSafety: "作業者の安全",
  firstAid: "応急処置",
  caseStudies: "事例研究",
  alerts: "警報",
  about: "概要",
  tagline: "環境健康インテリジェンス",
  language: "言語",
  compoundRisk: "複合リスクスコア",
  heatStress: "熱ストレス",
  airQuality: "大気質",
  temperature: "気温",
  humidity: "湿度",
  wind: "風",
  uvIndex: "UV指数",
  low: "低",
  moderate: "中",
  high: "高",
  extreme: "極度",
  critical: "危機的",
  emergency: "緊急",
  generateAlert: "警報を作成",
  downloadReport: "レポートをダウンロード",
  addCity: "都市を追加",
  isItSafe: "外に出ても安全？",
  citiesMonitored: "監視中の都市",
};

const hi: Dict = {
  monitor: "निगरानी",
  protect: "सुरक्षा",
  intelligence: "जानकारी",
  dashboard: "डैशबोर्ड",
  trends: "रुझान",
  riskAssessment: "जोखिम आकलन",
  safetyAdvisor: "सुरक्षा सलाहकार",
  healthAdvisor: "स्वास्थ्य सलाहकार",
  workerSafety: "श्रमिक सुरक्षा",
  firstAid: "प्राथमिक चिकित्सा",
  caseStudies: "केस अध्ययन",
  alerts: "चेतावनियाँ",
  about: "परिचय",
  tagline: "पर्यावरणीय स्वास्थ्य जानकारी",
  language: "भाषा",
  compoundRisk: "संयुक्त जोखिम स्कोर",
  heatStress: "गर्मी का तनाव",
  airQuality: "वायु गुणवत्ता",
  temperature: "तापमान",
  humidity: "आर्द्रता",
  wind: "हवा",
  uvIndex: "यूवी सूचकांक",
  low: "कम",
  moderate: "मध्यम",
  high: "उच्च",
  extreme: "अत्यधिक",
  critical: "गंभीर",
  emergency: "आपातकाल",
  generateAlert: "चेतावनी बनाएँ",
  downloadReport: "रिपोर्ट डाउनलोड करें",
  addCity: "शहर जोड़ें",
  isItSafe: "क्या बाहर जाना सुरक्षित है?",
  citiesMonitored: "निगरानी वाले शहर",
};

const es: Dict = {
  monitor: "Monitoreo",
  protect: "Protección",
  intelligence: "Aprender",
  dashboard: "Panel",
  trends: "Tendencias",
  riskAssessment: "Evaluación de riesgo",
  safetyAdvisor: "Asesor de seguridad",
  healthAdvisor: "Asesor de salud",
  workerSafety: "Seguridad laboral",
  firstAid: "Primeros auxilios",
  caseStudies: "Casos de estudio",
  alerts: "Alertas",
  about: "Acerca de",
  tagline: "Inteligencia en salud ambiental",
  language: "Idioma",
  compoundRisk: "Puntuación de riesgo compuesto",
  heatStress: "Estrés térmico",
  airQuality: "Calidad del aire",
  temperature: "Temperatura",
  humidity: "Humedad",
  wind: "Viento",
  uvIndex: "Índice UV",
  low: "Bajo",
  moderate: "Moderado",
  high: "Alto",
  extreme: "Extremo",
  critical: "Crítico",
  emergency: "Emergencia",
  generateAlert: "Generar alerta",
  downloadReport: "Descargar informe",
  addCity: "Añadir ciudad",
  isItSafe: "¿Es seguro salir?",
  citiesMonitored: "Ciudades monitoreadas",
};

export const LANGUAGES = [
  { code: "en", label: "English", dict: en as Dict, rtl: false },
  { code: "ur", label: "اردو", dict: ur, rtl: true },
  { code: "ar", label: "العربية", dict: ar, rtl: true },
  { code: "ja", label: "日本語", dict: ja, rtl: false },
  { code: "hi", label: "हिन्दी", dict: hi, rtl: false },
  { code: "es", label: "Español", dict: es, rtl: false },
] as const;
export type Lang = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "heatsignal-lang";

type T = (key: Key, vars?: Record<string, string | number>) => string;
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: T }>({
  lang: "en",
  setLang: () => {},
  t: (k) => en[k],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && LANGUAGES.some((l) => l.code === saved)) setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const l = LANGUAGES.find((x) => x.code === lang)!;
    document.documentElement.lang = lang;
    document.documentElement.dir = l.rtl ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };

  const dict = LANGUAGES.find((l) => l.code === lang)!.dict;
  // Missing keys fall back to English.
  const t: T = (key, vars) =>
    (dict[key] ?? en[key]).replace(/\{(\w+)\}/g, (_, v) => String(vars?.[v] ?? ""));

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);

/** Translation key for a risk level name. */
export const levelKey = (level: string) => level.toLowerCase() as Key;
