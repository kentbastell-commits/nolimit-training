// The ICP 备案号 line — legally required at the foot of every page served on
// the filed domain, linked to the MIIT query portal. Approved 2026-07-27
// (Guangdong bureau) under 广州跃燃体育信息咨询有限公司; the number is an
// official identifier and renders identically in both languages.
//
// When 公安备案 completes (due ≤30 days after going live on the filed
// domain), its number + link get added here — one component, every footer.
import "./IcpBadge.css";

export const ICP_NUMBER = "粤ICP备2026103091号";

export default function IcpBadge() {
  return (
    <a
      className="icpBadge"
      href="https://beian.miit.gov.cn"
      target="_blank"
      rel="noreferrer"
    >
      {ICP_NUMBER}
    </a>
  );
}
