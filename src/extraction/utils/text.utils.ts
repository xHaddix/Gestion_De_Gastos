const pad = (part: string): string => part.padStart(2, '0');

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

  let match = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
  }

  match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${pad(match[2])}-${pad(match[1])}`;
  }

  return null;
}

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
