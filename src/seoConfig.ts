export type SeoLanguage = "en" | "zh" | "bilingual";

export type SeoPage = {
  title: string;
  description: string;
  canonicalPath: string;
  robots: string;
  locale: "en_US" | "zh_CN";
  alternateLocale: "en_US" | "zh_CN";
  type: "website";
};

const copy = {
  home: {
    en: [
      "NoLimit Training | Elite Strength & Performance Coaching",
      "Bilingual, periodised strength and performance coaching for climbing, HYROX, running and serious athletes.",
    ],
    zh: [
      "NoLimit Training｜专业体能训练与运动表现指导",
      "面向攀岩、HYROX、跑步及高水平运动员的双语周期化力量与运动表现训练。",
    ],
  },
  store: {
    en: [
      "Training Programs | NoLimit Training",
      "Explore bilingual, coach-built digital training programs with guided sessions, exercise videos and structured progression.",
    ],
    zh: [
      "双语数字训练计划｜NoLimit Training",
      "浏览由专业教练编排的双语数字训练计划，包含引导式训练、动作视频与系统化进阶安排。",
    ],
  },
  coaching: {
    en: [
      "1:1 Online Coaching | NoLimit Training",
      "Personalised programming, weekly check-ins, technique review and direct bilingual coaching for committed athletes.",
    ],
    zh: [
      "一对一线上训练指导｜NoLimit Training",
      "为认真训练的运动员提供个性化计划、每周复盘、动作点评与中英文直接指导。",
    ],
  },
  inperson: {
    en: [
      "In-Person Training & Consulting | NoLimit Training",
      "Enquire about in-person athlete training, team support, performance planning, workshops and consulting.",
    ],
    zh: [
      "线下训练与体育咨询｜NoLimit Training",
      "咨询运动员线下训练、团队支持、运动表现规划、讲座及体育咨询服务。",
    ],
  },
  privacy: {
    en: ["Privacy Policy | NoLimit Training", "How NoLimit Training collects, uses, stores and protects personal and training information."],
    zh: ["隐私政策｜NoLimit Training", "了解 NoLimit Training 如何收集、使用、存储和保护个人信息与训练信息。"],
  },
  terms: {
    en: ["Terms of Service | NoLimit Training", "Terms governing NoLimit Training digital programs, coaching services, payments and safe participation."],
    zh: ["服务条款｜NoLimit Training", "适用于 NoLimit Training 数字训练计划、教练服务、付款及安全参与的服务条款。"],
  },
  refund: {
    en: ["Refund Policy | NoLimit Training", "NoLimit Training cancellation, digital-program and one-to-one coaching refund policy."],
    zh: ["退款政策｜NoLimit Training", "NoLimit Training 关于取消、数字训练计划及一对一指导的退款政策。"],
  },
  business: {
    en: ["Business Information | NoLimit Training", "Registered operator and company information for NoLimit Training."],
    zh: ["经营者信息｜NoLimit Training", "NoLimit Training 运营主体广州跃燃体育信息咨询有限公司的登记信息。"],
  },
} as const;

type CopyKey = keyof typeof copy;

function pageCopy(key: CopyKey, language: SeoLanguage) {
  if (language === "zh") return copy[key].zh;
  if (language === "en") return copy[key].en;
  return [
    `${copy[key].en[0]} · ${copy[key].zh[0].replace("｜NoLimit Training", "")}`,
    `${copy[key].zh[1]} ${copy[key].en[1]}`,
  ] as const;
}

export function resolveSeoPage(
  requestUrl: string,
  language: SeoLanguage = "bilingual",
): SeoPage {
  const url = new URL(requestUrl, "https://trainnolimit.com");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const isPrivate = url.searchParams.get("portal") === "client" || url.searchParams.get("view") === "coach";

  let key: CopyKey = "home";
  let canonicalPath = path;
  if (path === "/store" || url.searchParams.get("page") === "store") key = "store";
  else if (path === "/coaching" || url.searchParams.get("invite") === "client") {
    key = "coaching";
    canonicalPath = "/coaching";
  } else if (path === "/in-person" || url.searchParams.get("enquiry") === "inperson") {
    key = "inperson";
    canonicalPath = "/in-person";
  } else if (path === "/privacy") key = "privacy";
  else if (path === "/terms") key = "terms";
  else if (path === "/refund") key = "refund";
  else if (path === "/business") key = "business";

  const [title, description] = pageCopy(key, language);
  return {
    title: isPrivate ? `Private Training Portal | NoLimit Training` : title,
    description,
    canonicalPath,
    robots: isPrivate ? "noindex, nofollow, noarchive" : "index, follow, max-image-preview:large",
    locale: language === "zh" ? "zh_CN" : "en_US",
    alternateLocale: language === "zh" ? "en_US" : "zh_CN",
    type: "website",
  };
}

export function normalizeSiteUrl(value?: string) {
  const candidate = (value || "https://trainnolimit.com").trim();
  try {
    const url = new URL(candidate);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://trainnolimit.com";
  }
}

export function absoluteUrl(siteUrl: string, pathname: string) {
  return new URL(pathname, `${normalizeSiteUrl(siteUrl)}/`).toString();
}

export function organizationJsonLd(siteUrl: string) {
  const base = normalizeSiteUrl(siteUrl);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "NoLimit Training",
        legalName: "广州跃燃体育信息咨询有限公司",
        alternateName: "Guangzhou Yueran Sports Information Consulting Co., Ltd.",
        identifier: {
          "@type": "PropertyValue",
          name: "Unified Social Credit Code",
          value: "91440104MAKEAJP20G",
        },
        url: base,
        logo: `${base}/icon-512.png`,
        foundingDate: "2026-06-05",
        address: {
          "@type": "PostalAddress",
          streetAddress: "广州市越秀区建设六马路48号第8层825D",
          addressLocality: "广州市",
          addressRegion: "广东省",
          addressCountry: "CN",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: "NoLimit Training",
        publisher: { "@id": `${base}/#organization` },
        inLanguage: ["en", "zh-CN"],
      },
    ],
  };
}
