import type { Locale } from "./config";

const fr = {
  "common.loading":"Chargement…","common.save":"Enregistrer","common.install":"Installer MaliLink","common.later":"Plus tard",
  "language.title":"Langue et région","language.description":"Choisissez la langue de votre interface MaliLink.","language.saved":"Langue enregistrée.",
  "pwa.title":"Installez MaliLink sur cet appareil","pwa.description":"Accédez plus rapidement à MaliLink depuis votre écran d’accueil, sans contourner la connexion.",
  "pwa.installed":"MaliLink est installé sur cet appareil.","pwa.notInstalled":"MaliLink n’est pas encore installé.",
  "pwa.ios":"Dans Safari, touchez Partager, puis Ajouter à l’écran d’accueil et confirmez Ajouter.",
  "pharmacy.title":"Pharmacie","pharmacy.dashboard":"Tableau de bord","pharmacy.medicines":"Médicaments","pharmacy.lots":"Lots & péremptions","pharmacy.patients":"Patients","pharmacy.prescriptions":"Ordonnances","pharmacy.pos":"POS Pharmacie","pharmacy.settings":"Paramètres",
  "network.title":"Réseau & Infrastructure","network.dashboard":"Tableau de bord","network.devices":"Équipements","network.sites":"Sites","network.incidents":"Incidents","network.maintenance":"Maintenance","network.conflicts":"Conflits IP",
};
export type TranslationKey = keyof typeof fr;
type Dictionary = Record<TranslationKey, string>;

const en: Dictionary = {
  "common.loading":"Loading…","common.save":"Save","common.install":"Install MaliLink","common.later":"Later",
  "language.title":"Language and region","language.description":"Choose the language of your MaliLink interface.","language.saved":"Language saved.",
  "pwa.title":"Install MaliLink on this device","pwa.description":"Open MaliLink faster from your home screen without bypassing sign-in.",
  "pwa.installed":"MaliLink is installed on this device.","pwa.notInstalled":"MaliLink is not installed yet.",
  "pwa.ios":"In Safari, tap Share, then Add to Home Screen and confirm Add.",
  "pharmacy.title":"Pharmacy","pharmacy.dashboard":"Dashboard","pharmacy.medicines":"Medicines","pharmacy.lots":"Batches & expiry","pharmacy.patients":"Patients","pharmacy.prescriptions":"Prescriptions","pharmacy.pos":"Pharmacy POS","pharmacy.settings":"Settings",
  "network.title":"Network & Infrastructure","network.dashboard":"Dashboard","network.devices":"Devices","network.sites":"Sites","network.incidents":"Incidents","network.maintenance":"Maintenance","network.conflicts":"IP conflicts",
};
const ar: Dictionary = {
  "common.loading":"جارٍ التحميل…","common.save":"حفظ","common.install":"تثبيت MaliLink","common.later":"لاحقًا",
  "language.title":"اللغة والمنطقة","language.description":"اختر لغة واجهة MaliLink.","language.saved":"تم حفظ اللغة.",
  "pwa.title":"ثبّت MaliLink على هذا الجهاز","pwa.description":"افتح MaliLink بسرعة من الشاشة الرئيسية دون تجاوز تسجيل الدخول.",
  "pwa.installed":"تم تثبيت MaliLink على هذا الجهاز.","pwa.notInstalled":"لم يتم تثبيت MaliLink بعد.",
  "pwa.ios":"في Safari اضغط مشاركة، ثم إضافة إلى الشاشة الرئيسية، ثم أكد الإضافة.",
  "pharmacy.title":"الصيدلية","pharmacy.dashboard":"لوحة التحكم","pharmacy.medicines":"الأدوية","pharmacy.lots":"الدفعات وانتهاء الصلاحية","pharmacy.patients":"المرضى","pharmacy.prescriptions":"الوصفات","pharmacy.pos":"نقطة بيع الصيدلية","pharmacy.settings":"الإعدادات",
  "network.title":"الشبكة والبنية التحتية","network.dashboard":"لوحة التحكم","network.devices":"الأجهزة","network.sites":"المواقع","network.incidents":"الأعطال","network.maintenance":"الصيانة","network.conflicts":"تعارضات IP",
};
const zh: Dictionary = {
  "common.loading":"加载中…","common.save":"保存","common.install":"安装 MaliLink","common.later":"稍后",
  "language.title":"语言和地区","language.description":"选择 MaliLink 界面语言。","language.saved":"语言已保存。",
  "pwa.title":"在此设备上安装 MaliLink","pwa.description":"从主屏幕更快访问 MaliLink，且不会绕过登录。",
  "pwa.installed":"MaliLink 已安装在此设备上。","pwa.notInstalled":"MaliLink 尚未安装。",
  "pwa.ios":"在 Safari 中点击“分享”，选择“添加到主屏幕”，然后确认添加。",
  "pharmacy.title":"药房","pharmacy.dashboard":"仪表板","pharmacy.medicines":"药品","pharmacy.lots":"批次与有效期","pharmacy.patients":"患者","pharmacy.prescriptions":"处方","pharmacy.pos":"药房收银台","pharmacy.settings":"设置",
  "network.title":"网络与基础设施","network.dashboard":"仪表板","network.devices":"设备","network.sites":"站点","network.incidents":"事件","network.maintenance":"维护","network.conflicts":"IP 冲突",
};

export const dictionaries: Record<Locale, Dictionary> = { fr, en, ar, "zh-CN": zh };
