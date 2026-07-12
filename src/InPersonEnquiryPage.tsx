// Extracted from App.tsx (monolith split) — JSX verbatim, props threaded.
import "./InPersonEnquiryPage.css";
import { useState } from "react";
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function InPersonEnquiryPage({
  enquiryForm,
  enquirySubmitted,
  inviteLang,
  setEnquiryForm,
  setInviteLang,
  submitEnquiry,
  submittingEnquiry,
  toasts,
}: { [key: string]: any }) {
  const iZh = inviteLang === "zh";
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [crossBorderAccepted, setCrossBorderAccepted] = useState(false);
  return (
    <div className="invitePage">
      <div className="toastStack">
        {toasts.map((toast: any) => (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>

      <main className="inviteShell">
        <div className="inviteBrand">
          <div>
            <div className="brandWordmark brandLogoLockup">
              <img
                src="/nl_wordmark_black.png"
                alt="NO LIMIT"
                className="brandWordmarkImage"
              />
            </div>
            <div className="brandTagline">BUILT FOR TRAINING.</div>
          </div>
          <div className="inviteBrandRight">
            <span>{iZh ? "线下合作咨询" : "In-Person Enquiry"}</span>
            <button
              className="outlineButton inviteLangToggle"
              onClick={() => setInviteLang(iZh ? "en" : "zh")}
            >
              {iZh ? "English" : "中文"}
            </button>
          </div>
        </div>

        {enquirySubmitted ? (
          <section className="inviteSuccess">
            <h1>{iZh ? "已收到" : "Enquiry sent"}</h1>
            <p>
              {iZh
                ? "感谢你的咨询。我们会尽快与你联系，讨论线下训练或咨询合作。视档期而定。"
                : "Thanks for reaching out. We'll be in touch to discuss in-person training or consulting. Subject to availability."}
            </p>
          </section>
        ) : (
          <section className="inviteCard">
            <div className="inviteIntro">
              <h1>{iZh ? "线下训练与咨询" : "In-Person Training & Consulting"}</h1>
              <p>
                {iZh
                  ? "面向国家队、省队、俱乐部、学校或个人——线下训练运动员，或提供讲座、表现规划与康复等咨询服务。填写下方表单，或扫码加微信。"
                  : "For national and provincial programs, clubs, schools, or individuals — in-person athlete training, or consulting like presentations, performance roadmapping and rehabilitation. Send the form below, or scan to reach us on WeChat."}
              </p>
            </div>

            <div className="inviteFormGrid">
              <label>
                <span>{iZh ? "联系人" : "Contact Person"}</span>
                <input
                  value={enquiryForm.contactPerson}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, contactPerson: e.target.value })
                  }
                  placeholder={iZh ? "你的姓名" : "Your name"}
                />
              </label>
              <label>
                <span>{iZh ? "微信 / 邮箱" : "WeChat / Email"}</span>
                <input
                  value={enquiryForm.contact}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, contact: e.target.value })
                  }
                  placeholder={iZh ? "最佳联系方式" : "Best way to reach you"}
                />
              </label>
              <label>
                <span>{iZh ? "团队 / 机构" : "Team / Organization"}</span>
                <input
                  value={enquiryForm.organization}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, organization: e.target.value })
                  }
                  placeholder={iZh ? "国家队、俱乐部、学校..." : "National team, club, school..."}
                />
              </label>
              <label>
                <span>{iZh ? "训练人数" : "How many athletes"}</span>
                <input
                  value={enquiryForm.athletes}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, athletes: e.target.value })
                  }
                  placeholder={iZh ? "例如 12" : "e.g. 12"}
                />
              </label>
              <label>
                <span>{iZh ? "合作时长" : "Contract duration"}</span>
                <input
                  value={enquiryForm.duration}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, duration: e.target.value })
                  }
                  placeholder={iZh ? "例如 8 周 / 一个赛季" : "e.g. 8 weeks / one season"}
                />
              </label>
              <label className="inviteWideField">
                <span>{iZh ? "特别说明" : "Special notes"}</span>
                <textarea
                  value={enquiryForm.notes}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, notes: e.target.value })
                  }
                  placeholder={
                    iZh
                      ? "运动项目、目标、地点、是否需要咨询（讲座 / 规划 / 康复）..."
                      : "Sport, goals, location, or consulting needs (presentations / roadmapping / rehab)..."
                  }
                />
              </label>
            </div>

            <div className="inviteConsentGroup">
              <label>
                <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} />
                <span>
                  {iZh ? "我已阅读并同意" : "I have read and agree to the"}{" "}
                  <a href="/terms" target="_blank" rel="noreferrer">{iZh ? "服务条款" : "Terms"}</a>
                  {iZh ? "和" : " and "}<a href="/privacy" target="_blank" rel="noreferrer">{iZh ? "隐私政策" : "Privacy Policy"}</a>。
                </span>
              </label>
              <label>
                <input type="checkbox" checked={crossBorderAccepted} onChange={(e) => setCrossBorderAccepted(e.target.checked)} />
                <span>{iZh ? "我单独同意：在完成中国内地迁移前，为回复本次咨询所必需的信息可能在中国内地与香港之间处理。" : "I separately consent to necessary processing between mainland China and Hong Kong until the mainland migration is complete."}</span>
              </label>
            </div>

            <div className="enquiryQrRow">
              <img
                src="https://i.ibb.co/Y4nXVG4g/Weixin-Image-20260611202846-56-2.jpg"
                alt="WeChat QR"
              />
              <span>{iZh ? "或扫码加微信咨询" : "Or scan to ask on WeChat"}</span>
            </div>

            <div className="inviteActions">
              <button
                className="goldButton"
                onClick={() => void submitEnquiry({ privacyAccepted, crossBorderAccepted, consentVersion: "2026-07-12" })}
                disabled={submittingEnquiry || !privacyAccepted || !crossBorderAccepted}
              >
                {submittingEnquiry
                  ? iZh ? "提交中..." : "Sending..."
                  : iZh ? "提交咨询" : "Send Enquiry"}
              </button>
            </div>
            <p className="enquiryFootnote">
              {iZh ? "线下合作视档期而定。" : "In-person work is subject to availability."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
