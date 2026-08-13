import type { ExpenseCategory } from './types/document';

export const CATEGORIES: ExpenseCategory[] = [
  'alimentacion',
  'transporte',
  'tecnologia',
  'servicios',
  'otros',
];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  alimentacion: 'Alimentación',
  transporte: 'Transporte',
  tecnologia: 'Tecnología',
  servicios: 'Servicios',
  otros: 'Otros',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  alimentacion: 'emerald',
  transporte: 'sky',
  tecnologia: 'violet',
  servicios: 'amber',
  otros: 'slate',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  needs_review: 'Requiere revisión',
  ready: 'Listo',
  failed: 'Falló',
};

export function formatMoney(value: number | null, currency?: string | null): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
