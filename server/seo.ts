import {
  absoluteUrl,
  normalizeSiteUrl,
  organizationJsonLd,
  resolveSeoPage,
} from "../src/seoConfig.ts";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderSeoHead(requestUrl: string, siteUrlValue?: string, socialImageValue?: string) {
  const siteUrl = normalizeSiteUrl(siteUrlValue);
  const page = resolveSeoPage(requestUrl, "bilingual");
  const canonical = absoluteUrl(siteUrl, page.canonicalPath);
  const socialImage = absoluteUrl(
    siteUrl,
    socialImageValue || process.env.VITE_SOCIAL_IMAGE_URL || "/icon-512.png",
  );
  const jsonLd = JSON.stringify(organizationJsonLd(siteUrl)).replace(/</g, "\\u003c");
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);

  return `<!-- SEO:START -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${escapeHtml(page.robots)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:image" content="${escapeHtml(socialImage)}" />
    <meta property="og:site_name" content="NX LIMIT Training" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:locale:alternate" content="zh_CN" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(socialImage)}" />
    <script type="application/ld+json" data-nolimit-seo="organization">${jsonLd}</script>
    <!-- SEO:END -->`;
}

export function injectSeo(html: string, requestUrl: string, siteUrl?: string, socialImage?: string) {
  return html.replace(
    /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/,
    renderSeoHead(requestUrl, siteUrl, socialImage),
  );
}
