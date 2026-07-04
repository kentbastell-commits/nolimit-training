// Extracted from App.tsx (monolith split) — JSX verbatim, props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ClientInvitePage({
  copyToClipboard,
  inviteClientId,
  inviteForm,
  inviteLang,
  inviteSubmitted,
  setInviteForm,
  setInviteLang,
  submitInviteForm,
  submittingInvite,
  toasts,
}: { [key: string]: any }) {
  const iZh = inviteLang === "zh";
  const invitePortalLink = inviteClientId
    ? `${window.location.origin}/?portal=client&client=${encodeURIComponent(inviteClientId)}`
    : "";

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
            <span>{iZh ? "客户信息表" : "Coaching Intake"}</span>
            <button
              className="outlineButton inviteLangToggle"
              onClick={() => setInviteLang(iZh ? "en" : "zh")}
            >
              {iZh ? "English" : "中文"}
            </button>
          </div>
        </div>

        {inviteSubmitted ? (
          <section className="inviteSuccess">
            <h1>{iZh ? "已提交" : "You're In"}</h1>
            <p>
              {iZh
                ? "您的信息已发送给 Kent。他会尽快审核并安排您的训练计划。"
                : "Your intake has been submitted. Kent will review your details and get your program set up."}
            </p>
            {invitePortalLink && (
              <div className="invitePortalPrompt">
                <p>
                  {iZh
                    ? "您的训练门户已准备好。保存此链接以便随时访问："
                    : "Your training portal is ready. Save this link to access it anytime:"}
                </p>
                <div className="inviteCopyRow">
                  <input value={invitePortalLink} readOnly />
                  <button
                    className="goldButton"
                    onClick={() =>
                      void copyToClipboard(
                        invitePortalLink,
                        iZh ? "门户链接" : "Portal link"
                      )
                    }
                  >
                    {iZh ? "复制链接" : "Copy Link"}
                  </button>
                </div>
                <a
                  className="goldButton invitePortalCta"
                  href={invitePortalLink}
                >
                  {iZh ? "进入我的训练门户" : "Open My Training Portal"}
                </a>
              </div>
            )}
          </section>
        ) : (
          <section className="inviteCard">
            <div className="inviteIntro">
              <h1>{iZh ? "客户信息表" : "Client Intake"}</h1>
              <p>
                {iZh
                  ? "请填写以下信息，以便教练在您第一次训练前为您制定合适的计划。"
                  : "Share a few details so your coach can build the right program before your first session."}
              </p>
            </div>

            {/* Contact + training format */}
            <div className="inviteFormGrid">
              <label>
                <span>{iZh ? "姓名" : "Full Name"}</span>
                <input
                  value={inviteForm.name}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, name: e.target.value })
                  }
                  placeholder={iZh ? "您的姓名" : "Your name"}
                />
              </label>

              <label>
                <span>{iZh ? "训练方式" : "Training Format"}</span>
                <select
                  value={inviteForm.trainingFormat}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      trainingFormat: e.target.value,
                    })
                  }
                >
                  <option value="Online Coaching">
                    {iZh ? "线上指导" : "Online Coaching"}
                  </option>
                  <option value="In-Person Training">
                    {iZh ? "线下私教" : "In-Person Training"}
                  </option>
                </select>
              </label>

              <label>
                <span>{iZh ? "电子邮件" : "Email"}</span>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </label>

              <label>
                <span>{iZh ? "电话 / 微信" : "Phone / WeChat"}</span>
                <input
                  value={inviteForm.phone}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, phone: e.target.value })
                  }
                  placeholder={iZh ? "最佳联系方式" : "Best contact"}
                />
              </label>
            </div>

            {/* About you */}
            <h2 className="inviteSectionTitle">
              {iZh ? "身体信息" : "About You"}
            </h2>
            <div className="inviteFormGrid">
              <label>
                <span>{iZh ? "出生日期" : "Date of Birth"}</span>
                <input
                  type="date"
                  value={inviteForm.dob}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, dob: e.target.value })
                  }
                />
              </label>

              <label>
                <span>{iZh ? "性别" : "Gender"}</span>
                <select
                  value={inviteForm.gender}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, gender: e.target.value })
                  }
                >
                  <option value="">{iZh ? "请选择" : "Select"}</option>
                  <option value="Male">{iZh ? "男" : "Male"}</option>
                  <option value="Female">{iZh ? "女" : "Female"}</option>
                  <option value="Other">
                    {iZh ? "其他 / 不愿透露" : "Other / Prefer not to say"}
                  </option>
                </select>
              </label>

              <label>
                <span>{iZh ? "身高" : "Height"}</span>
                <input
                  value={inviteForm.height}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, height: e.target.value })
                  }
                  placeholder={iZh ? "例如 175 cm" : "e.g. 175 cm"}
                />
              </label>

              <label>
                <span>{iZh ? "当前体重" : "Current Weight"}</span>
                <input
                  value={inviteForm.weight}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, weight: e.target.value })
                  }
                  placeholder={iZh ? "例如 70 kg" : "e.g. 70 kg"}
                />
              </label>
            </div>

            {/* Training background */}
            <h2 className="inviteSectionTitle">
              {iZh ? "训练背景" : "Training Background"}
            </h2>
            <div className="inviteFormGrid">
              <label>
                <span>{iZh ? "训练经验" : "Experience Level"}</span>
                <select
                  value={inviteForm.experience}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      experience: e.target.value,
                    })
                  }
                >
                  <option value="">{iZh ? "请选择" : "Select"}</option>
                  <option value="Beginner">
                    {iZh ? "初级（不足 1 年）" : "Beginner (under 1 yr)"}
                  </option>
                  <option value="Intermediate">
                    {iZh ? "中级（1–3 年）" : "Intermediate (1–3 yrs)"}
                  </option>
                  <option value="Advanced">
                    {iZh ? "高级（3 年以上）" : "Advanced (3+ yrs)"}
                  </option>
                </select>
              </label>

              <label>
                <span>{iZh ? "运动 / 专项" : "Sport / Focus"}</span>
                <input
                  value={inviteForm.sport}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, sport: e.target.value })
                  }
                  placeholder={
                    iZh ? "攀岩、力量、HYROX..." : "Climbing, strength, HYROX..."
                  }
                />
              </label>

              <label className="inviteWideField">
                <span>{iZh ? "目前的训练" : "Current Training"}</span>
                <textarea
                  value={inviteForm.currentTraining}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      currentTraining: e.target.value,
                    })
                  }
                  placeholder={
                    iZh
                      ? "您目前的训练内容和频率..."
                      : "What you currently do and how often..."
                  }
                />
              </label>
            </div>

            {/* Availability & equipment */}
            <h2 className="inviteSectionTitle">
              {iZh ? "时间与器械" : "Availability & Equipment"}
            </h2>
            <div className="inviteFormGrid">
              <label>
                <span>{iZh ? "每周训练天数" : "Days per Week"}</span>
                <select
                  value={inviteForm.daysPerWeek}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      daysPerWeek: e.target.value,
                    })
                  }
                >
                  <option value="">{iZh ? "请选择" : "Select"}</option>
                  {["1", "2", "3", "4", "5", "6", "7"].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{iZh ? "每次时长" : "Session Length"}</span>
                <input
                  value={inviteForm.sessionLength}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      sessionLength: e.target.value,
                    })
                  }
                  placeholder={iZh ? "例如 60 分钟" : "e.g. 60 min"}
                />
              </label>

              <label>
                <span>{iZh ? "器械条件" : "Equipment Access"}</span>
                <select
                  value={inviteForm.equipment}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, equipment: e.target.value })
                  }
                >
                  <option value="">{iZh ? "请选择" : "Select"}</option>
                  <option value="Full gym">
                    {iZh ? "全套健身房" : "Full gym"}
                  </option>
                  <option value="Home gym">
                    {iZh ? "家庭健身房" : "Home gym"}
                  </option>
                  <option value="Minimal equipment">
                    {iZh ? "少量器械" : "Minimal equipment"}
                  </option>
                  <option value="Bodyweight only">
                    {iZh ? "仅自重" : "Bodyweight only"}
                  </option>
                </select>
              </label>
            </div>

            {/* Goals */}
            <h2 className="inviteSectionTitle">{iZh ? "目标" : "Goals"}</h2>
            <div className="inviteFormGrid">
              <label className="inviteWideField">
                <span>{iZh ? "主要目标" : "Main Goal"}</span>
                <input
                  value={inviteForm.goals}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, goals: e.target.value })
                  }
                  placeholder={
                    iZh ? "增肌、减脂、耐力..." : "Strength, fat loss, endurance..."
                  }
                />
              </label>

              <label className="inviteWideField">
                <span>
                  {iZh
                    ? "其他信息（伤病、时间安排等）"
                    : "Anything else? (injuries, schedule, etc.)"}
                </span>
                <textarea
                  value={inviteForm.notes}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, notes: e.target.value })
                  }
                  placeholder={
                    iZh
                      ? "伤病史、时间限制、其他需要教练了解的信息..."
                      : "Injuries, time constraints, anything your coach should know..."
                  }
                />
              </label>
            </div>

            <div className="inviteActions">
              <button
                className="goldButton"
                onClick={() => void submitInviteForm()}
                disabled={submittingInvite}
              >
                {submittingInvite
                  ? iZh ? "提交中..." : "Submitting..."
                  : iZh ? "提交信息" : "Submit Intake"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
