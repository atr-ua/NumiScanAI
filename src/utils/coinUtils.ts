export const fixTitleWithYear = (title: string, year: string | number): string => {
  if (!year) return title;
  const yearStr = String(year).trim();
  if (!yearStr) return title;
  // Replace year range first (e.g. "1997-98"), then standalone 4-digit year
  if (/\b\d{3,4}\s*-\s*\d{2,4}\b/.test(title))
    return title.replace(/\b\d{3,4}\s*-\s*\d{2,4}\b/, yearStr);
  if (/\b\d{4}\b/.test(title))
    return title.replace(/\b\d{4}\b/, yearStr);
  return title;
};
