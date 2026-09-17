export const REVIEW_PAGE_SIZE = 18;
export function reviewPageNumber(page: number, total: number) {
  return Math.min(Math.max(0, page), Math.max(0, Math.ceil(total / REVIEW_PAGE_SIZE) - 1));
}
export default function ReviewPager({ label, total, page, onPage }: { label: string; total: number; page: number; onPage: (page: number) => void }) {
  const current = reviewPageNumber(page, total);
  if (total <= REVIEW_PAGE_SIZE) return null;
  return <nav className="rvPagination" aria-label={`${label} pages`}>
    <button className="rvGhostBtn" disabled={current === 0} onClick={() => onPage(current - 1)}>Previous</button>
    <span role="status">{current * REVIEW_PAGE_SIZE + 1}–{Math.min((current + 1) * REVIEW_PAGE_SIZE, total)} of {total}</span>
    <button className="rvGhostBtn" disabled={(current + 1) * REVIEW_PAGE_SIZE >= total} onClick={() => onPage(current + 1)}>Next</button>
  </nav>;
}
