import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import PortalToApp from "./PortalToApp";
import "./AthletePreview.css";

export default function AthletePreview({ name, url, onClose }: {
  name: string; url: string; onClose: () => void;
}) {
  const { t } = useTranslation();
  const back = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const target = new URL(url, window.location.href);
  target.searchParams.set("preview", "coach");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    back.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <PortalToApp>
    <section className="athletePreview" role="dialog" aria-modal="true" aria-label={t("athletePreviewTitle", { name })}>
      <header>
        <button ref={back} type="button" onClick={onClose}><ArrowLeft size={18} />{t("backToCoaching")}</button>
        <div><strong>{name}</strong><span>{t("athletePreviewReadOnly")}</span></div>
      </header>
      <iframe title={t("athletePreviewTitle", { name })} src={`${target.pathname}${target.search}`} />
    </section>
  </PortalToApp>;
}
