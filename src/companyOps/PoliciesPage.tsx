import {
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { EmptyState, TonePill } from "./components";
import { opsText } from "./copy";
import type { CompanyOpsLanguage, OpsPolicyItem } from "./types";
import { isExternalUrl } from "./utils";

export default function PoliciesPage({
  language,
  policies,
  busyPolicyId,
  onAcknowledge,
}: {
  language: CompanyOpsLanguage;
  policies: OpsPolicyItem[];
  busyPolicyId?: string;
  onAcknowledge: (policy: OpsPolicyItem) => void;
}) {
  return (
    <div className="fopsPage fopsPoliciesPage">
      <header className="fopsPageHeader">
        <div>
          <span className="fopsEyebrow">
            {opsText(language, "policiesAndGuides")}
          </span>
          <h1>{opsText(language, "policyLibraryTitle")}</h1>
          <p>{opsText(language, "policyLibraryIntro")}</p>
        </div>
      </header>

      <section className="fopsPolicyLibraryIntro">
        <span aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <p>{opsText(language, "policiesHint")}</p>
      </section>

      <div className="fopsPolicyLibrary">
        {policies.length ? (
          policies.map((policy) => (
            <article className="fopsPolicyLibraryCard" key={policy.id}>
              <span className="fopsPolicyLibraryIcon" aria-hidden="true">
                <BookOpenCheck size={22} />
              </span>
              <div>
                <div className="fopsPolicyLibraryPills">
                  {policy.required ? (
                    <TonePill tone="warning">
                      {opsText(language, "policyRequired")}
                    </TonePill>
                  ) : null}
                  {policy.acknowledged ? (
                    <TonePill tone="success">
                      <CheckCircle2 size={13} aria-hidden="true" />
                      {opsText(language, "acknowledged")}
                    </TonePill>
                  ) : null}
                </div>
                <h2>{policy.title}</h2>
                {policy.description ? <p>{policy.description}</p> : null}
              </div>
              <footer>
                <a
                  className="fopsButton fopsButton--ghost"
                  href={policy.url}
                  target={isExternalUrl(policy.url) ? "_blank" : undefined}
                  rel={
                    isExternalUrl(policy.url) ? "noreferrer" : undefined
                  }
                >
                  {opsText(language, "readPolicy")}
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
                {!policy.acknowledged ? (
                  <button
                    className="fopsButton fopsButton--primary"
                    type="button"
                    onClick={() => onAcknowledge(policy)}
                    disabled={Boolean(busyPolicyId)}
                  >
                    {busyPolicyId === policy.id
                      ? opsText(language, "saving")
                      : opsText(language, "acknowledge")}
                  </button>
                ) : null}
              </footer>
            </article>
          ))
        ) : (
          <EmptyState title={opsText(language, "noPolicies")} />
        )}
      </div>
    </div>
  );
}
