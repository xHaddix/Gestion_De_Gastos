const pad = (part: string): string => part.padStart(2, '0');

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  apr: 4,
  aug: 8,
  dec: 12,
};

function lookupMonth(name: string): number | null {
  const normalized = name.toLowerCase();
  return MONTHS[normalized] ?? null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  return (
    year >= 1900 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  );
}

export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[^0-9.,-]/g, '');
  if (!s) {
    return null;
  }

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    const decimals = s.slice(lastComma + 1);
    s = decimals.length === 3 ? s.replace(',', '') : s.replace(',', '.');
  }

  const value = Number.parseFloat(s);
  return Number.isFinite(value) ? value : null;
}

export function findAllAmounts(text: string): number[] {
  const amounts: number[] = [];
  const regex = /[-+]?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const value = parseAmount(match[0]);
    if (value !== null) {
      amounts.push(value);
    }
  }
  return amounts;
}

export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) {
    return null;
  }

  const yearFirst = s.match(
    /\b(\d{4})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{1,2})\b/,
  );
  if (yearFirst && isValidDate(+yearFirst[1], +yearFirst[2], +yearFirst[3])) {
    return `${yearFirst[1]}-${pad(yearFirst[2])}-${pad(yearFirst[3])}`;
  }

  const dayFirst = s.match(
    /\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2,4})\b/,
  );
  if (dayFirst) {
    const year = dayFirst[3].length === 2 ? 2000 + +dayFirst[3] : +dayFirst[3];
    if (isValidDate(year, +dayFirst[2], +dayFirst[1])) {
      return `${year}-${pad(dayFirst[2])}-${pad(dayFirst[1])}`;
    }
  }

  const dayMonthYear = s.match(
    /\b(\d{1,2})(?:\s+de)?\s+([a-záéíóúñ]{3,})(?:\s+de)?\s+(\d{2,4})\b/i,
  );
  if (dayMonthYear) {
    const month = lookupMonth(dayMonthYear[2]);
    const year =
      dayMonthYear[3].length === 2 ? 2000 + +dayMonthYear[3] : +dayMonthYear[3];
    if (month && isValidDate(year, month, +dayMonthYear[1])) {
      return `${year}-${pad(String(month))}-${pad(dayMonthYear[1])}`;
    }
  }

  const monthDayYear = s.match(
    /\b([a-záéíóúñ]{3,})\s+(\d{1,2}),?(?:\s+de)?\s+(\d{2,4})\b/i,
  );
  if (monthDayYear) {
    const month = lookupMonth(monthDayYear[1]);
    const year =
      monthDayYear[3].length === 2 ? 2000 + +monthDayYear[3] : +monthDayYear[3];
    if (month && isValidDate(year, month, +monthDayYear[2])) {
      return `${year}-${pad(String(month))}-${pad(monthDayYear[2])}`;
    }
  }

  return null;
}

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
