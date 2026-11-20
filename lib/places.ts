import type { Lang } from "./i18n/index";

/** ISO 3166-1 codes for the English country names used in lib/cities.ts. */
export const COUNTRY_CODES: Record<string, string> = {
  Pakistan: "PK", India: "IN", Bangladesh: "BD", "Sri Lanka": "LK", Nepal: "NP",
  "United Arab Emirates": "AE", "Saudi Arabia": "SA", Qatar: "QA", Kuwait: "KW", Oman: "OM", Bahrain: "BH",
  Iraq: "IQ", Iran: "IR", Yemen: "YE", Jordan: "JO", Türkiye: "TR", Egypt: "EG", Sudan: "SD",
  Nigeria: "NG", Ghana: "GH", Senegal: "SN", Mali: "ML", Niger: "NE", "Burkina Faso": "BF", Chad: "TD",
  "DR Congo": "CD", Angola: "AO", Kenya: "KE", Tanzania: "TZ", Ethiopia: "ET", Djibouti: "DJ",
  Mozambique: "MZ", "South Africa": "ZA", Morocco: "MA",
  Thailand: "TH", Vietnam: "VN", Philippines: "PH", Indonesia: "ID", Singapore: "SG", Malaysia: "MY",
  Myanmar: "MM", Cambodia: "KH", China: "CN", Taiwan: "TW", Japan: "JP", "South Korea": "KR",
  "United States": "US", Mexico: "MX", Cuba: "CU", Panama: "PA", Colombia: "CO", Ecuador: "EC",
  Brazil: "BR", Paraguay: "PY", Argentina: "AR",
  Spain: "ES", Italy: "IT", Greece: "GR", France: "FR", Australia: "AU", "Papua New Guinea": "PG",
};

const displayNames = new Map<Lang, Intl.DisplayNames | null>();

/** A country name in the reader's language (via Intl), or the English name if there is no code or Intl fails. */
export function countryName(name: string, lang: Lang): string {
  if (lang === "en" || !name) return name;
  const code = COUNTRY_CODES[name];
  if (!code) return name;
  if (!displayNames.has(lang)) {
    try {
      displayNames.set(lang, new Intl.DisplayNames([lang], { type: "region" }));
    } catch {
      displayNames.set(lang, null);
    }
  }
  try {
    return displayNames.get(lang)?.of(code) ?? name;
  } catch {
    return name;
  }
}

type Local = Partial<Record<"ur" | "ar" | "hi" | "ja" | "es", string>>;
/** [Urdu, Arabic, Hindi, Japanese, Spanish if different from English]. */
const N = (ur: string, ar: string, hi: string, ja: string, es?: string): Local => ({ ur, ar, hi, ja, ...(es ? { es } : {}) });

/** Standard local spellings for every city in WORLD_CITIES. Cities added through search keep their returned name. */
export const CITY_NAMES: Record<string, Local> = {
  Karachi: N("کراچی", "كراتشي", "कराची", "カラチ"),
  Lahore: N("لاہور", "لاهور", "लाहौर", "ラホール"),
  Multan: N("ملتان", "ملتان", "मुल्तान", "ムルターン"),
  Peshawar: N("پشاور", "بيشاور", "पेशावर", "ペシャーワル"),
  Islamabad: N("اسلام آباد", "إسلام آباد", "इस्लामाबाद", "イスラマバード"),
  Jacobabad: N("جیکب آباد", "جاكوب آباد", "जैकबाबाद", "ジャコババード"),
  Delhi: N("دہلی", "دلهي", "दिल्ली", "デリー"),
  Mumbai: N("ممبئی", "مومباي", "मुंबई", "ムンバイ"),
  Kolkata: N("کولکاتا", "كولكاتا", "कोलकाता", "コルカタ", "Calcuta"),
  Chennai: N("چنئی", "تشيناي", "चेन्नई", "チェンナイ"),
  Hyderabad: N("حیدرآباد", "حيدر آباد", "हैदराबाद", "ハイデラバード"),
  Bengaluru: N("بنگلور", "بنغالور", "बेंगलुरु", "ベンガルール"),
  Ahmedabad: N("احمد آباد", "أحمد آباد", "अहमदाबाद", "アーメダバード"),
  Nagpur: N("ناگپور", "ناغبور", "नागपुर", "ナーグプル"),
  Dhaka: N("ڈھاکہ", "دكا", "ढाका", "ダッカ", "Daca"),
  Chittagong: N("چٹاگانگ", "شيتاغونغ", "चटगाँव", "チッタゴン"),
  Colombo: N("کولمبو", "كولومبو", "कोलंबो", "コロンボ"),
  Kathmandu: N("کھٹمنڈو", "كاتماندو", "काठमांडू", "カトマンズ", "Katmandú"),
  Dubai: N("دبئی", "دبي", "दुबई", "ドバイ", "Dubái"),
  "Abu Dhabi": N("ابوظہبی", "أبوظبي", "अबू धाबी", "アブダビ", "Abu Dabi"),
  Riyadh: N("ریاض", "الرياض", "रियाद", "リヤド", "Riad"),
  Jeddah: N("جدہ", "جدة", "जेद्दा", "ジッダ", "Yeda"),
  Mecca: N("مکہ", "مكة المكرمة", "मक्का", "メッカ", "La Meca"),
  Doha: N("دوحہ", "الدوحة", "दोहा", "ドーハ"),
  "Kuwait City": N("کویت سٹی", "مدينة الكويت", "कुवैत सिटी", "クウェート市", "Ciudad de Kuwait"),
  Muscat: N("مسقط", "مسقط", "मस्कट", "マスカット", "Mascate"),
  Manama: N("منامہ", "المنامة", "मनामा", "マナーマ"),
  Baghdad: N("بغداد", "بغداد", "बग़दाद", "バグダード", "Bagdad"),
  Basra: N("بصرہ", "البصرة", "बसरा", "バスラ", "Basora"),
  Tehran: N("تہران", "طهران", "तेहरान", "テヘラン", "Teherán"),
  Ahvaz: N("اہواز", "الأحواز", "अहवाज़", "アフヴァーズ"),
  Aden: N("عدن", "عدن", "अदन", "アデン", "Adén"),
  Amman: N("عمان", "عمّان", "अम्मान", "アンマン", "Amán"),
  Istanbul: N("استنبول", "إسطنبول", "इस्तांबुल", "イスタンブール", "Estambul"),
  Cairo: N("قاہرہ", "القاهرة", "काहिरा", "カイロ", "El Cairo"),
  Khartoum: N("خرطوم", "الخرطوم", "ख़ार्तूम", "ハルツーム", "Jartum"),
  Lagos: N("لاگوس", "لاغوس", "लागोस", "ラゴス"),
  Kano: N("کانو", "كانو", "कानो", "カノ"),
  Abuja: N("ابوجا", "أبوجا", "अबुजा", "アブジャ"),
  Accra: N("اکرا", "أكرا", "अक्रा", "アクラ"),
  Dakar: N("ڈاکار", "داكار", "डकार", "ダカール"),
  Bamako: N("باماکو", "باماكو", "बामाको", "バマコ"),
  Niamey: N("نیامی", "نيامي", "नियामे", "ニアメ"),
  Ouagadougou: N("واگادوگو", "واغادوغو", "वागाडूगू", "ワガドゥグー", "Uagadugú"),
  "N'Djamena": N("انجمینا", "انجامينا", "एन'जामेना", "ンジャメナ", "Yamena"),
  Kinshasa: N("کنشاسا", "كينشاسا", "किंशासा", "キンシャサ"),
  Luanda: N("لواندا", "لواندا", "लुआंडा", "ルアンダ"),
  Nairobi: N("نیروبی", "نيروبي", "नैरोबी", "ナイロビ"),
  Mombasa: N("ممباسا", "مومباسا", "मोम्बासा", "モンバサ"),
  "Dar es Salaam": N("دار السلام", "دار السلام", "दार एस सलाम", "ダルエスサラーム"),
  "Addis Ababa": N("ادیس ابابا", "أديس أبابا", "अदीस अबाबा", "アディスアベバ", "Adís Abeba"),
  Djibouti: N("جبوتی", "جيبوتي", "जिबूती", "ジブチ", "Yibuti"),
  Maputo: N("ماپوتو", "مابوتو", "मापुटो", "マプト"),
  Johannesburg: N("جوہانسبرگ", "جوهانسبرغ", "जोहान्सबर्ग", "ヨハネスブルグ", "Johannesburgo"),
  Marrakesh: N("مراکش", "مراكش", "मराकेश", "マラケシュ", "Marrakech"),
  Bangkok: N("بنکاک", "بانكوك", "बैंकॉक", "バンコク"),
  "Ho Chi Minh City": N("ہو چی منہ سٹی", "مدينة هو تشي منه", "हो ची मिन्ह सिटी", "ホーチミン市", "Ciudad Ho Chi Minh"),
  Hanoi: N("ہنوئی", "هانوي", "हनोई", "ハノイ"),
  Manila: N("منیلا", "مانيلا", "मनीला", "マニラ"),
  Jakarta: N("جکارتہ", "جاكرتا", "जकार्ता", "ジャカルタ", "Yakarta"),
  Surabaya: N("سورابایا", "سورابايا", "सुराबाया", "スラバヤ"),
  Singapore: N("سنگاپور", "سنغافورة", "सिंगापुर", "シンガポール", "Singapur"),
  "Kuala Lumpur": N("کوالالمپور", "كوالالمبور", "कुआलालंपुर", "クアラルンプール"),
  Yangon: N("ینگون", "يانغون", "यांगून", "ヤンゴン", "Rangún"),
  "Phnom Penh": N("نوم پنہ", "بنوم بنه", "नोम पेन्ह", "プノンペン", "Nom Pen"),
  "Hong Kong": N("ہانگ کانگ", "هونغ كونغ", "हांगकांग", "香港"),
  Guangzhou: N("گوانگژو", "قوانغتشو", "ग्वांगझोउ", "広州", "Cantón"),
  Shanghai: N("شنگھائی", "شانغهاي", "शंघाई", "上海", "Shanghái"),
  Chongqing: N("چونگ چنگ", "تشونغتشينغ", "चोंगक़िंग", "重慶"),
  Wuhan: N("ووہان", "ووهان", "वुहान", "武漢"),
  Taipei: N("تائی پے", "تايبيه", "ताइपे", "台北", "Taipéi"),
  Tokyo: N("ٹوکیو", "طوكيو", "टोक्यो", "東京", "Tokio"),
  Osaka: N("اوساکا", "أوساكا", "ओसाका", "大阪"),
  Seoul: N("سیول", "سول", "सियोल", "ソウル", "Seúl"),
  Phoenix: N("فینکس", "فينيكس", "फ़ीनिक्स", "フェニックス"),
  "Las Vegas": N("لاس ویگاس", "لاس فيغاس", "लास वेगास", "ラスベガス"),
  Houston: N("ہیوسٹن", "هيوستن", "ह्यूस्टन", "ヒューストン"),
  "New Orleans": N("نیو اورلینز", "نيو أورلينز", "न्यू ऑर्लियन्स", "ニューオーリンズ", "Nueva Orleans"),
  Miami: N("میامی", "ميامي", "मियामी", "マイアミ"),
  Monterrey: N("مونٹیری", "مونتيري", "मोंटेरे", "モンテレイ"),
  Mexicali: N("میکسیکالی", "مكسيكالي", "मेक्सिकाली", "メヒカリ"),
  Havana: N("ہوانا", "هافانا", "हवाना", "ハバナ", "La Habana"),
  "Panama City": N("پاناما سٹی", "مدينة بنما", "पनामा सिटी", "パナマ市", "Ciudad de Panamá"),
  Barranquilla: N("بارانکیا", "بارانكيا", "बारांकिया", "バランキージャ"),
  Guayaquil: N("گوایاکیل", "غواياكيل", "ग्वायाकिल", "グアヤキル"),
  Manaus: N("ماناؤس", "ماناوس", "मनौस", "マナウス"),
  Recife: N("ریسیفی", "ريسيفي", "रेसिफ़े", "レシフェ"),
  "Rio de Janeiro": N("ریو ڈی جنیرو", "ريو دي جانيرو", "रियो डी जनेरो", "リオデジャネイロ", "Río de Janeiro"),
  "São Paulo": N("ساؤ پاؤلو", "ساو باولو", "साओ पाउलो", "サンパウロ"),
  Asunción: N("اسونسیون", "أسونسيون", "असुन्सियोन", "アスンシオン"),
  "Buenos Aires": N("بیونس آئرس", "بوينس آيرس", "ब्यूनस आयर्स", "ブエノスアイレス"),
  Seville: N("اشبیلیہ", "إشبيلية", "सेविल", "セビリア", "Sevilla"),
  Madrid: N("میڈرڈ", "مدريد", "मैड्रिड", "マドリード"),
  Rome: N("روم", "روما", "रोम", "ローマ", "Roma"),
  Athens: N("ایتھنز", "أثينا", "एथेंस", "アテネ", "Atenas"),
  Paris: N("پیرس", "باريس", "पेरिस", "パリ", "París"),
  Darwin: N("ڈارون", "داروين", "डार्विन", "ダーウィン"),
  Brisbane: N("برسبین", "بريزبان", "ब्रिस्बेन", "ブリスベン"),
  Perth: N("پرتھ", "بيرث", "पर्थ", "パース"),
  Sydney: N("سڈنی", "سيدني", "सिडनी", "シドニー", "Sídney"),
  "Port Moresby": N("پورٹ مورسبی", "بورت مورسبي", "पोर्ट मोरेस्बी", "ポートモレスビー"),
};

/** A city name in the reader's language; English (or the name search returned) when there is none. */
export function cityName(name: string, lang: Lang): string {
  if (lang === "en") return name;
  return (CITY_NAMES[name] as Local | undefined)?.[lang] ?? name;
}

/** "City, Country" in the reader's language. */
export const placeName = (c: { name: string; country: string }, lang: Lang) =>
  c.country ? `${cityName(c.name, lang)}, ${countryName(c.country, lang)}` : cityName(c.name, lang);

/** Search matches the English name and the translated one. */
export const placeMatches = (c: { name: string; country: string }, query: string, lang: Lang) => {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  return [c.name, c.country, cityName(c.name, lang), countryName(c.country, lang)].some((s) => s.toLocaleLowerCase().includes(q));
};
