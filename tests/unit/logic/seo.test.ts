import { describe, expect, it } from "vitest";
import {
  normalizeSiteUrl,
  organizationJsonLd,
  resolveSeoPage,
} from "../../../src/seoConfig.ts";
import { injectSeo } from "../../../server/seo.ts";

describe("SEO metadata", () => {
  it("maps public routes to distinct canonical metadata", () => {
    expect(resolveSeoPage("/store", "en").title).toBe(
      "Training Programs | NoLimit Training"
    );
    expect(resolveSeoPage("/?invite=client", "zh").canonicalPath).toBe(
      "/coaching"
    );
    expect(resolveSeoPage("/in-person", "en").canonicalPath).toBe("/in-person");
    expect(resolveSeoPage("/business", "zh").description).toContain(
      "广州跃燃体育信息咨询有限公司"
    );
  });

  it("keeps coach and athlete views out of search indexes", () => {
    expect(resolveSeoPage("/?portal=client&client=CL-1").robots).toContain(
      "noindex"
    );
    expect(resolveSeoPage("/?view=coach&page=Clients").robots).toContain(
      "noindex"
    );
  });

  it("normalizes a future mainland domain from one configuration value", () => {
    expect(normalizeSiteUrl("https://train.example.cn/path/")).toBe(
      "https://train.example.cn"
    );
  });

  it("publishes the registered operator in structured data", () => {
    const data = organizationJsonLd("https://train.example.cn");
    const organization = data["@graph"][0];
    expect(organization.legalName).toBe("广州跃燃体育信息咨询有限公司");
    expect(organization.identifier.value).toBe("91440104MAKEAJP20G");
    expect(organization.url).toBe("https://train.example.cn");
  });

  it("server-renders route metadata without requiring crawler JavaScript", () => {
    const template = "<head><!-- SEO:START --><title>old</title><!-- SEO:END --></head>";
    const html = injectSeo(
      template,
      "/store",
      "https://train.example.cn",
      "/share-card.png",
    );
    expect(html).toContain("Training Programs | NoLimit Training");
    expect(html).toContain('href="https://train.example.cn/store"');
    expect(html).toContain('content="https://train.example.cn/share-card.png"');
    expect(html).toContain('data-nolimit-seo="organization"');
  });
});
