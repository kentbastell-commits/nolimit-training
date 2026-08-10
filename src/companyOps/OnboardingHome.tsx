import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  HelpCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import type { CSSProperties } from "react";
import { EmptyState, SectionHeading, TonePill } from "./components";
import { opsText } from "./copy";
import type {
  CompanyOpsLanguage,
  OpsOnboardingDashboard,
  OpsOnboardingTask,
  OpsPolicyItem,
} from "./types";
import {
  formatOpsDate,
  isExternalUrl,
  onboardingPhaseLabelKey,
} from "./utils";

const onboardingPhases: OpsOnboardingTask["phase"][] = [
  "before_start",
  "week_one",
  "day_30",
  "day_60",
  "day_90",
];

function TaskRow({
  task,
  language,
  busyTaskId,
  onComplete,
}: {
  task: OpsOnboardingTask;
  language: CompanyOpsLanguage;
  busyTaskId?: string;
  onComplete: (task: OpsOnboardingTask) => void;
}) {
  const body = (
    <>
      <span
        className={`fopsTaskCheck${task.completed ? " fopsTaskCheck--done" : ""}`}
        aria-hidden="true"
      >
        {task.completed ? <Check size={16} /> : <Circle size={15} />}
      </span>
      <span className="fopsOnboardingTaskBody">
        <strong>{task.title}</strong>
        {task.description ? <p>{task.description}</p> : null}
        <span className="fopsTaskMeta">
          {task.dueAt ? formatOpsDate(task.dueAt, language) : null}
          {task.ownerName ? task.ownerName : null}
        </span>
      </span>
    </>
  );

  return (
    <article
      className={`fopsOnboardingTask${task.completed ? " fopsOnboardingTask--done" : ""}`}
    >
      {task.href ? (
        <a
          className="fopsOnboardingTaskLink"
          href={task.href}
          target={isExternalUrl(task.href) ? "_blank" : undefined}
          rel={isExternalUrl(task.href) ? "noreferrer" : undefined}
        >
          {body}
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      ) : (
        <div className="fopsOnboardingTaskLink">{body}</div>
      )}
      {!task.completed && !task.locked ? (
        <button
          type="button"
          className="fopsButton fopsButton--compact"
          onClick={() => onComplete(task)}
          disabled={Boolean(busyTaskId)}
        >
          <Check size={15} aria-hidden="true" />
          {busyTaskId === task.id
            ? opsText(language, "saving")
            : opsText(language, "markComplete")}
        </button>
      ) : task.completed ? (
        <TonePill tone="success">{opsText(language, "completed")}</TonePill>
      ) : null}
    </article>
  );
}

function PolicyRow({
  policy,
  language,
  busyPolicyId,
  onAcknowledge,
}: {
  policy: OpsPolicyItem;
  language: CompanyOpsLanguage;
  busyPolicyId?: string;
  onAcknowledge: (policy: OpsPolicyItem) => void;
}) {
  return (
    <article className="fopsPolicyRow">
      <span className="fopsPolicyIcon" aria-hidden="true">
        <BookOpenCheck size={18} />
      </span>
      <div>
        <strong>{policy.title}</strong>
        {policy.description ? <p>{policy.description}</p> : null}
        {policy.required ? (
          <TonePill tone="warning">
            {opsText(language, "policyRequired")}
          </TonePill>
        ) : null}
      </div>
      <div className="fopsPolicyActions">
        <a
          className="fopsButton fopsButton--ghost fopsButton--compact"
          href={policy.url}
          target={isExternalUrl(policy.url) ? "_blank" : undefined}
          rel={isExternalUrl(policy.url) ? "noreferrer" : undefined}
        >
          {opsText(language, "readPolicy")}
          <ExternalLink size={14} aria-hidden="true" />
        </a>
        {policy.acknowledged ? (
          <TonePill tone="success">
            <CheckCircle2 size={13} aria-hidden="true" />
            {opsText(language, "acknowledged")}
          </TonePill>
        ) : (
          <button
            type="button"
            className="fopsButton fopsButton--primary fopsButton--compact"
            onClick={() => onAcknowledge(policy)}
            disabled={Boolean(busyPolicyId)}
          >
            {busyPolicyId === policy.id
              ? opsText(language, "saving")
              : opsText(language, "acknowledge")}
          </button>
        )}
      </div>
    </article>
  );
}

export default function OnboardingHome({
  onboarding,
  language,
  busyTaskId,
  busyPolicyId,
  onCompleteTask,
  onAcknowledgePolicy,
}: {
  onboarding?: OpsOnboardingDashboard;
  language: CompanyOpsLanguage;
  busyTaskId?: string;
  busyPolicyId?: string;
  onCompleteTask: (task: OpsOnboardingTask) => void;
  onAcknowledgePolicy: (policy: OpsPolicyItem) => void;
}) {
  const tasks = onboarding?.tasks || [];
  const policies = onboarding?.policies || [];
  const progress = Math.min(100, Math.max(0, onboarding?.progress || 0));

  return (
    <div className="fopsPage fopsOnboardingPage">
      <header className="fopsPageHeader">
        <div>
          <span className="fopsEyebrow">
            {opsText(language, "onboardingEyebrow")}
          </span>
          <h1>{opsText(language, "onboardingTitle")}</h1>
          <p>{opsText(language, "onboardingIntro")}</p>
        </div>
      </header>

      <section className="fopsOnboardingHero">
        <div className="fopsOnboardingHeroCopy">
          <span>{onboarding?.roleTitle || onboarding?.employeeName}</span>
          <strong>
            {opsText(language, "onboardingProgress", { count: progress })}
          </strong>
          {onboarding?.startDate ? (
            <small>{formatOpsDate(onboarding.startDate, language)}</small>
          ) : null}
        </div>
        <div
          className="fopsProgressRing"
          style={{ "--fops-progress": `${progress * 3.6}deg` } as CSSProperties}
          role="img"
          aria-label={opsText(language, "onboardingProgress", {
            count: progress,
          })}
        >
          <span>{progress}%</span>
        </div>
        <div className="fopsProgressTrack" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <div className="fopsOnboardingTopGrid">
        <section className="fopsSection fopsNextStepCard">
          <SectionHeading title={opsText(language, "nextOnboardingStep")} />
          {onboarding?.nextTask ? (
            <TaskRow
              task={onboarding.nextTask}
              language={language}
              busyTaskId={busyTaskId}
              onComplete={onCompleteTask}
            />
          ) : (
            <EmptyState
              title={opsText(language, "allOnboardingDone")}
              body={opsText(language, "allOnboardingDoneBody")}
            />
          )}
        </section>

        <section className="fopsSecureCard">
          <span className="fopsSecureIcon" aria-hidden="true">
            <LockKeyhole size={22} />
          </span>
          <div>
            <span className="fopsEyebrow">
              {opsText(language, "confidentialDetails")}
            </span>
            <h2>
              {onboarding?.confidentialDetailsComplete
                ? opsText(language, "confidentialComplete")
                : opsText(language, "confidentialIncomplete")}
            </h2>
            <p>{opsText(language, "confidentialBody")}</p>
          </div>
          <ShieldCheck size={20} className="fopsSecureShield" aria-hidden="true" />
          {!onboarding?.confidentialDetailsComplete &&
          onboarding?.confidentialFormUrl ? (
            <a
              href={onboarding.confidentialFormUrl}
              className="fopsButton fopsButton--light"
              target={
                isExternalUrl(onboarding.confidentialFormUrl)
                  ? "_blank"
                  : undefined
              }
              rel={
                isExternalUrl(onboarding.confidentialFormUrl)
                  ? "noreferrer"
                  : undefined
              }
            >
              {opsText(language, "openSecureForm")}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          ) : null}
        </section>
      </div>

      <section className="fopsSection">
        <SectionHeading title={opsText(language, "onboardingTimeline")} />
        <div className="fopsTimeline">
          {onboardingPhases.map((phase) => {
            const phaseTasks = tasks.filter((task) => task.phase === phase);
            if (!phaseTasks.length) return null;
            const completedCount = phaseTasks.filter(
              (task) => task.completed,
            ).length;
            return (
              <section className="fopsTimelinePhase" key={phase}>
                <header>
                  <span className="fopsTimelineDot" aria-hidden="true" />
                  <div>
                    <h3>
                      {opsText(language, onboardingPhaseLabelKey(phase))}
                    </h3>
                    <span>
                      {completedCount}/{phaseTasks.length}
                    </span>
                  </div>
                </header>
                <div className="fopsOnboardingTaskList">
                  {phaseTasks.map((task) => (
                    <TaskRow
                      task={task}
                      language={language}
                      busyTaskId={busyTaskId}
                      onComplete={onCompleteTask}
                      key={task.id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          {!tasks.length ? (
            <EmptyState
              title={opsText(language, "allOnboardingDone")}
              body={opsText(language, "allOnboardingDoneBody")}
            />
          ) : null}
        </div>
      </section>

      <section className="fopsSection">
        <SectionHeading title={opsText(language, "requiredPolicies")} />
        <div className="fopsPolicyList">
          {policies.length ? (
            policies.map((policy) => (
              <PolicyRow
                policy={policy}
                language={language}
                busyPolicyId={busyPolicyId}
                onAcknowledge={onAcknowledgePolicy}
                key={policy.id}
              />
            ))
          ) : (
            <EmptyState title={opsText(language, "noPolicies")} />
          )}
        </div>
      </section>

      {onboarding?.helperContact ? (
        <aside className="fopsHelpCard">
          <HelpCircle size={18} aria-hidden="true" />
          <span>
            {opsText(language, "helpContact", {
              name: onboarding.helperContact,
            })}
          </span>
        </aside>
      ) : null}
    </div>
  );
}
