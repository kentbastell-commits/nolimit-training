// The 备案 lines — legally required at the foot of every page served on the
// filed domain. ICP approved 2026-07-27 (Guangdong bureau), 公安备案 approved
// 2026-08-12 (越秀区网安大队), both under 广州跃燃体育信息咨询有限公司; the
// numbers are official identifiers and render identically in both languages.
import "./IcpBadge.css";

export const ICP_NUMBER = "粤ICP备2026103091号";
export const PSB_NUMBER = "粤公网安备44010402003808号";
const PSB_CODE = "44010402003808";

export default function IcpBadge() {
  return (
    <span className="icpBadgeRow">
      <a
        className="icpBadge"
        href="https://beian.miit.gov.cn"
        target="_blank"
        rel="noreferrer"
      >
        {ICP_NUMBER}
      </a>
      <a
        className="icpBadge"
        href={`https://beian.mps.gov.cn/#/query/webSearch?code=${PSB_CODE}`}
        target="_blank"
        rel="noreferrer"
      >
        {PSB_NUMBER}
      </a>
    </span>
  );
}
