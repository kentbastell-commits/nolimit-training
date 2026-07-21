// Post-intake welcome / program-loading overlay. Extracted from App.tsx.
import "./PortalWelcome.css";
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function PortalWelcome({
  selectedClient,
  toasts,
  useChineseClientText,
  portalAutoLoading,
  portalLoadedProgram,
  portalPaymentPending,
  retryPendingPayment,
  setPortalPostIntake,
  copyToClipboard,
  setClientTab,
}: { [key: string]: any }) {
  const iZh = useChineseClientText;
  const portalLink = `${window.location.origin}/?portal=client&client=${encodeURIComponent(selectedClient.clientCode || selectedClient.id)}`;
  return (
    <div className="clientPortalShell portalWelcomeShell">
      <div className="toastStack">
        {toasts.map((toast: any) => (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
      <section className="portalWelcome">
        <div className="portalWelcomeBrand">
          <img src="/nl_monogram_white.png" alt="NL" className="portalWelcomeMonogram" />
        </div>

        {portalAutoLoading ? (
          <>
            <h1>{iZh ? "正在加载您的训练计划..." : "Loading your program..."}</h1>
            <p className="portalWelcomeSubtitle">
              {iZh ? "请稍候，您的训练日历正在生成。" : "Please wait while your training calendar is being built."}
            </p>
            <div
              className="portalWelcomeSpinner"
              role="status"
              aria-label={iZh ? "正在载入训练计划" : "Loading your training plan"}
            />
          </>
        ) : portalPaymentPending ? (
          <>
            <div className="portalWelcomeCheck portalWelcomePending">…</div>
            <h1>{iZh ? "付款核对中" : "Payment verification in progress"}</h1>
            <p className="portalWelcomeSubtitle">
              {iZh
                ? "问卷已保存。教练会根据付款备注核对微信付款，确认后训练计划才会加载。"
                : "Your intake is saved. Your coach will verify the WeChat payment reference before the training program is loaded."}
            </p>
            <div className="portalWelcomeSteps">
              <div className="portalWelcomeStep">
                <span>1</span>
                <p>{iZh ? "核对微信付款备注" : "We verify the WeChat payment reference"}</p>
              </div>
              <div className="portalWelcomeStep">
                <span>2</span>
                <p>{iZh ? "按你选择的日期安排计划" : "We schedule the plan from your chosen date"}</p>
              </div>
              <div className="portalWelcomeStep">
                <span>3</span>
                <p>{iZh ? "训练日历自动解锁" : "Your training calendar unlocks"}</p>
              </div>
            </div>
            <div className="portalWelcomeActions">
              <button className="goldButton" onClick={retryPendingPayment}>
                {iZh ? "重新检查付款状态" : "Check payment status again"}
              </button>
              <button
                className="outlineButton"
                onClick={() => void copyToClipboard(portalLink, "Portal link")}
              >
                {iZh ? "保存我的客户端链接" : "Save My Portal Link"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="portalWelcomeCheck">✓</div>
            <h1>
              {iZh
                ? `欢迎，${selectedClient.name.split(" ")[0]}！`
                : `You're all set, ${selectedClient.name.split(" ")[0]}!`}
            </h1>
            {portalLoadedProgram && (
              <p className="portalWelcomeProgramName">
                {iZh ? `课程：${portalLoadedProgram}` : portalLoadedProgram}
              </p>
            )}
            <p className="portalWelcomeSubtitle">
              {iZh
                ? "您的训练计划已加载到日历中。打开训练门户查看您的日程安排。"
                : "Your training program has been added to your calendar. Open your portal to see your schedule."}
            </p>
            <div className="portalWelcomeSteps">
              <div className="portalWelcomeStep">
                <span>1</span>
                <p>{iZh ? "保存您的个人门户链接" : "Save your personal portal link"}</p>
              </div>
              <div className="portalWelcomeStep">
                <span>2</span>
                <p>{iZh ? "查看您的训练日历" : "Check your training calendar"}</p>
              </div>
              <div className="portalWelcomeStep">
                <span>3</span>
                <p>{iZh ? "每次训练后记录您的成绩" : "Log your results after each session"}</p>
              </div>
            </div>
            <div className="portalWelcomeActions">
              <button
                className="goldButton"
                onClick={() => {
                  setPortalPostIntake(false);
                  setClientTab("Training");
                }}
              >
                {iZh ? "查看我的训练计划 →" : "Open My Training Calendar →"}
              </button>
              <button
                className="outlineButton"
                onClick={() => void copyToClipboard(portalLink, "Portal link")}
              >
                {iZh ? "复制门户链接" : "Copy My Portal Link"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
