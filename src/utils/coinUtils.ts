export const fixTitleWithYear = (title: string, year: string | number): string => {
  if (!year) return title;
  const yearStr = String(year).trim();
  if (!yearStr) return title;
  const rangeRegex = /\b\d{3,4}\s*-\s*\d{2,4}\b/g;
  if (rangeRegex.test(title)) return title.replace(rangeRegex, yearStr);
  return title;
};
