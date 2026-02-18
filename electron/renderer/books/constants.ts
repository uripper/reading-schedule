// Keep in sync with src/reading_plan/builders_shared.py::WORDS_PER_PAGE.
// tests/test_constants_sync.py enforces this at test time.
export const WORDS_PER_PAGE = 300;

export const COVER_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560"><rect width="420" height="560" fill="#1f2a3d"/><rect x="54" y="78" width="312" height="404" rx="14" fill="#27374f"/><path d="M112 194h196M112 248h196M112 302h148" stroke="#8aa2c4" stroke-width="18" stroke-linecap="round"/></svg>',
)}`;
