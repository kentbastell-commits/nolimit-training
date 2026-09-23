import { useTranslation } from "react-i18next";
export const librarySections = ["Exercises", "Programs", "Sessions", "Forms", "Tests"] as const;
export type LibrarySection = typeof librarySections[number];
export default function CoachLibraryNavigation({ selected, select }: { selected: LibrarySection; select: (section: LibrarySection) => void }) {
  const { i18n } = useTranslation(); const labels = i18n.language.startsWith("zh") ? ["动作", "训练计划", "单次训练", "表单", "测试"] : librarySections;
  return <nav className="coachLibraryNavigation" aria-label={i18n.language.startsWith("zh") ? "资料库" : "Library sections"}>{librarySections.map((section, i) => <button type="button" key={section} aria-current={selected === section ? "page" : undefined} onClick={() => select(section)}>{labels[i]}</button>)}</nav>;
}
