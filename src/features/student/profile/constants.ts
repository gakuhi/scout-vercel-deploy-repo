export function getGraduationYearOptions(now: Date = new Date()): number[] {
  const currentYear = now.getFullYear();
  const start = currentYear - 2;
  const end = currentYear + 6;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
