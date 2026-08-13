import { ExpenseCategory } from '../../documents/model/document.entity';

export type FieldSource = 'rules' | 'llm' | 'merged' | 'none';

export interface ExtractedField {
  value: string | number | null;
  confidence: number;
  source: FieldSource;
}

export interface ExtractionResult {
  provider: ExtractedField;
  invoiceNumber: ExtractedField;
  issueDate: ExtractedField;
  subtotal: ExtractedField;
  taxes: ExtractedField;
  total: ExtractedField;
  currency: ExtractedField;
  category: ExtractedField;
}

export const FIELD_NAMES = [
  'provider',
  'invoiceNumber',
  'issueDate',
  'subtotal',
  'taxes',
  'total',
  'currency',
  'category',
] as const;

export type FieldName = (typeof FIELD_NAMES)[number];

export type CategoryValue = ExpenseCategory;

export function emptyField(source: FieldSource = 'none'): ExtractedField {
  return { value: null, confidence: 0, source };
}
