const DAY_MS = 86_400_000;

export function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Date invalide.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || formatDate(date) !== value) throw new Error("Date invalide.");
  return date;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return formatDate(new Date(parseDate(value).valueOf() + days * DAY_MS));
}

export function daysInclusive(start: string, end: string): number {
  const days = Math.round((parseDate(end).valueOf() - parseDate(start).valueOf()) / DAY_MS) + 1;
  if (days < 1) throw new Error("La date de fin doit être postérieure à la date de début.");
  return days;
}

export function listDays(start: string, end: string): string[] {
  const count = daysInclusive(start, end);
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function previousPeriod(start: string, end: string) {
  const count = daysInclusive(start, end);
  return { start: addDays(start, -count), end: addDays(start, -1) };
}

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const dayMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function formatPeriodLabel(start: string, end: string): string {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const sameMonth = startDate.getUTCFullYear() === endDate.getUTCFullYear()
    && startDate.getUTCMonth() === endDate.getUTCMonth();

  if (sameMonth) {
    const label = monthFormatter.format(startDate);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  return `Du ${shortDateFormatter.format(startDate)} au ${shortDateFormatter.format(endDate)}`;
}

export function formatDayMonth(value: string): string {
  return dayMonthFormatter.format(parseDate(value));
}

export function validateInsightsPeriod(start: string, end: string, today = formatDate(new Date())) {
  const count = daysInclusive(start, end);
  if (end > today) throw new Error("La période ne peut pas se terminer dans le futur.");
  if (count > 90) throw new Error("La période ne peut pas dépasser 90 jours.");
  const previous = previousPeriod(start, end);
  if (previous.start < addDays(today, -89)) {
    throw new Error("La période et sa comparaison doivent tenir dans les 90 jours conservés par Meta.");
  }
  return { count, previous };
}
