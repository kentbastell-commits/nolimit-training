import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { opsText } from "./copy";
import type {
  CompanyOpsLanguage,
  OpsMetric,
  OpsQueueItem,
  Tone,
} from "./types";
import { formatOpsDate, isExternalUrl } from "./utils";

export function SectionHeading({
  eyebrow,
  title,
  hint,
  action,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="fopsSectionHeading">
      <div>
        {eyebrow ? <span className="fopsEyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {hint ? <p>{hint}</p> : null}
      </div>
      {action ? <div className="fopsSectionAction">{action}</div> : null}
    </div>
  );
}
export function TonePill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`fopsPill fopsPill--${tone}`}>{children}</span>;
}

export function MetricGrid({ metrics }: { metrics: OpsMetric[] }) {
  if (!metrics.length) return null;
  return (
    <div className="fopsMetricGrid">
      {metrics.map((metric) => (
        <article className="fopsMetric" key={metric.id}>
          <span className={`fopsMetricDot fopsTone--${metric.tone || "gold"}`} />
          <span className="fopsMetricLabel">{metric.label}</span>
          <strong>{metric.value}</strong>
          {metric.trend ? <em>{metric.trend}</em> : null}
          {metric.helper ? <small>{metric.helper}</small> : null}
        </article>
      ))}
    </div>
  );
}

function urgencyLabel(
  urgency: OpsQueueItem["urgency"],
  language: CompanyOpsLanguage,
) {
  if (urgency === "overdue") return opsText(language, "overdue");
  if (urgency === "today") return opsText(language, "dueToday");
  if (urgency === "soon") return opsText(language, "dueSoon");
  return "";
}

export function QueueCard({
  item,
  language,
  onOpen,
}: {
  item: OpsQueueItem;
  language: CompanyOpsLanguage;
  onOpen?: (item: OpsQueueItem) => void;
}) {
  const urgency = urgencyLabel(item.urgency, language);
  const inner = (
    <>
      <span className={`fopsQueueBar fopsTone--${item.tone || "gold"}`} />
      <div className="fopsQueueMain">
        <div className="fopsQueueTopline">
          {urgency ? (
            <TonePill tone={item.urgency === "overdue" ? "danger" : "warning"}>
              {item.urgency === "overdue" ? (
                <CircleAlert size={13} aria-hidden="true" />
              ) : (
                <CalendarClock size={13} aria-hidden="true" />
              )}
              {urgency}
            </TonePill>
          ) : null}
          {item.status ? <TonePill tone={item.tone}>{item.status}</TonePill> : null}
        </div>
        <strong>{item.title}</strong>
        {item.description ? <p>{item.description}</p> : null}
        <div className="fopsQueueMeta">
          {item.dueAt ? (
            <span>
              <CalendarClock size={14} aria-hidden="true" />
              {formatOpsDate(item.dueAt, language, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : null}
          {item.ownerName ? (
            <span>
              <UserRound size={14} aria-hidden="true" />
              {item.ownerName}
            </span>
          ) : null}
          {item.meta?.map((value) => <span key={value}>{value}</span>)}
        </div>
      </div>
      <span className="fopsQueueCta">
        {item.actionLabel || opsText(language, "openItem")}
        <ChevronRight size={17} aria-hidden="true" />
      </span>
    </>
  );

  if (item.href) {
    const external = isExternalUrl(item.href);
    return (
      <a
        className="fopsQueueCard"
        href={item.href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      className="fopsQueueCard"
      type="button"
      onClick={() => onOpen?.(item)}
      disabled={!onOpen}
    >
      {inner}
    </button>
  );
}

export function EmptyState({
  title,
  body,
  icon = <CheckCircle2 size={24} aria-hidden="true" />,
  action,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="fopsEmpty">
      <span className="fopsEmptyIcon">{icon}</span>
      <div>
        <strong>{title}</strong>
        {body ? <p>{body}</p> : null}
      </div>
      {action ? <div className="fopsEmptyAction">{action}</div> : null}
    </div>
  );
}

export function ResourceLink({
  href,
  title,
  description,
  restricted = false,
}: {
  href: string;
  title: string;
  description?: string;
  restricted?: boolean;
}) {
  const external = isExternalUrl(href);
  return (
    <a
      className="fopsResourceLink"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      <span className="fopsResourceIcon">
        {restricted ? (
          <LockKeyhole size={18} aria-hidden="true" />
        ) : (
          <ArrowRight size={18} aria-hidden="true" />
        )}
      </span>
      <span>
        <strong>{title}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <ExternalLink size={15} aria-hidden="true" />
    </a>
  );
}

export function SkeletonPage() {
  return (
    <div className="fopsSkeleton" aria-hidden="true">
      <div className="fopsSkeletonLine fopsSkeletonLine--short" />
      <div className="fopsSkeletonLine fopsSkeletonLine--title" />
      <div className="fopsSkeletonHero" />
      <div className="fopsSkeletonGrid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="fopsSkeletonCard" key={index} />
        ))}
      </div>
      <div className="fopsSkeletonPanel" />
    </div>
  );
}

export function FieldError({
  language,
}: {
  language: CompanyOpsLanguage;
}) {
  return (
    <span className="fopsFieldError" role="alert">
      {opsText(language, "requiredField")}
    </span>
  );
}
