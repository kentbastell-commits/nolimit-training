import {
  absoluteUrl,
  normalizeSiteUrl,
  organizationJsonLd,
  resolveSeoPage,
  type SeoLanguage,
} from "./seoConfig";

const SITE_URL = normalizeSiteUrl(import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin);
const SOCIAL_IMAGE = import.meta.env.VITE_SOCIAL_IMAGE_URL || "/icon-512.png";

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

export function applyPageMetadata(language?: SeoLanguage) {
  const preferred = language || (localStorage.getItem("nl_public_lang") === "zh" ? "zh" : "en");
  const page = resolveSeoPage(window.location.href, preferred);
  const canonical = absoluteUrl(SITE_URL, page.canonicalPath);
  const image = absoluteUrl(SITE_URL, SOCIAL_IMAGE);

  document.documentElement.lang = preferred === "zh" ? "zh-CN" : "en";
  document.title = page.title;
  setMeta('meta[name="description"]', "name", "description", page.description);
  setMeta('meta[name="robots"]', "name", "robots", page.robots);
  setMeta('meta[property="og:title"]', "property", "og:title", page.title);
  setMeta('meta[property="og:description"]', "property", "og:description", page.description);
  setMeta('meta[property="og:type"]', "property", "og:type", page.type);
  setMeta('meta[property="og:url"]', "property", "og:url", canonical);
  setMeta('meta[property="og:image"]', "property", "og:image", image);
  setMeta('meta[property="og:site_name"]', "property", "og:site_name", "NoLimit Training");
  setMeta('meta[property="og:locale"]', "property", "og:locale", page.locale);
  setMeta('meta[property="og:locale:alternate"]', "property", "og:locale:alternate", page.alternateLocale);
  setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary");
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", page.title);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", page.description);
  setMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
  setLink("canonical", canonical);

  let structured = document.head.querySelector<HTMLScriptElement>('script[data-nolimit-seo="organization"]');
  if (!structured) {
    structured = document.createElement("script");
    structured.type = "application/ld+json";
    structured.dataset.nolimitSeo = "organization";
    document.head.appendChild(structured);
  }
  structured.textContent = JSON.stringify(organizationJsonLd(SITE_URL));
}
