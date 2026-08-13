import { ExpenseCategory } from '../../documents/model/document.entity';
import {
  ExtractionResult,
  FieldName,
  FieldSource,
} from '../types/extraction-result.types';
import { stripAccents } from './text.utils';

const CATEGORY_KEYS: Record<string, ExpenseCategory> = {
  alimentacion: ExpenseCategory.Alimentacion,
  transporte: ExpenseCategory.Transporte,
  tecnologia: ExpenseCategory.Tecnologia,
  servicios: ExpenseCategory.Servicios,
  otros: ExpenseCategory.Otros,
};

const JSON_TO_FIELD: [string, FieldName][] = [
  ['provider', 'provider'],
  ['invoiceNumber', 'invoiceNumber'],
  ['nit', 'nit'],
  ['date', 'issueDate'],
  ['subtotal', 'subtotal'],
  ['taxes', 'taxes'],
  ['total', 'total'],
  ['currency', 'currency'],
  ['category', 'category'],
];

function extractJson(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function parseExtractionJson(
  content: string,
  source: FieldSource,
): Partial<ExtractionResult> {
  const json = extractJson(content);
  if (!json) {
    return {};
  }

  const result: Partial<ExtractionResult> = {};

  for (const [jsonKey, field] of JSON_TO_FIELD) {
    const value = json[jsonKey];
    if (value === null || value === undefined || value === '') {
      continue;
    }

    if (field === 'category') {
      if (typeof value !== 'string' && typeof value !== 'number') {
        continue;
      }
      const normalized =
        CATEGORY_KEYS[stripAccents(String(value).toLowerCase())];
      if (!normalized) {
        continue;
      }
      result[field] = { value: normalized, confidence: 0.9, source };
      continue;
    }

    result[field] = {
      value: value as string | number,
      confidence: 0.9,
      source,
    };
  }

  return result;
}
