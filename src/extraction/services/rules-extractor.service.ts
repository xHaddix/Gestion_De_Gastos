import { Injectable } from '@nestjs/common';
import { ExpenseCategory } from '../../documents/model/document.entity';
import {
  emptyField,
  ExtractedField,
  ExtractionResult,
} from '../types/extraction-result.types';
import {
  findAllAmounts,
  normalizeDate,
  parseAmount,
} from '../utils/text.utils';

const LABELED_CONFIDENCE = 0.9;
const FALLBACK_CONFIDENCE = 0.5;

const SUBTOTAL_PATTERNS = [
  /\b(?:subtotal|base\s+imponible|importe\s+sin\s+iva|total\s+sin\s+impuestos)\b\s*[:#]?\s*([-+]?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
];

const TAXES_PATTERNS = [
  /\b(?:iva|impuestos?|tax|igv|itbms|vat)\b\s*[:#]?\s*([-+]?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
];

const TOTAL_PATTERNS = [
  /\b(?:importe\s+total|total(?:\s+(?:a\s+pagar|factura|final|general|neto))?|a\s+pagar|monto\s+total|gran\s+total)\b\s*[:#]?\s*([-+]?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
];

const INVOICE_PATTERNS = [
  /(?:factura|ticket|recibo|invoice)\s*(?:n[oº°]\.?|n[uú]mero|number|no\.?|#)?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-/.]*\d[A-Za-z0-9\-/.]*)/i,
  /(?:n[oº°]\.?\s*(?:de\s+)?factura|no\.?\s*(?:de\s+)?factura)\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-/.]*\d[A-Za-z0-9\-/.]*)/i,
];

const DATE_PATTERNS = [
  /(?:fecha|date)\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
];

const CURRENCY_CODES = /(?:EUR|USD|MXN|COP|ARS|CLP|PEN|GBP|CHF|BRL|CAD|AUD)\b/i;

const STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'sin',
  'con',
  'por',
  'para',
  'y',
  'o',
  'en',
  'a',
  'que',
  'se',
  'su',
  'al',
  'es',
  'son',
  'texto',
  'datos',
  'relevante',
  'relevantes',
  'documento',
  'ejemplo',
  'prueba',
  'informacion',
  'información',
]);

const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  [ExpenseCategory.Alimentacion]: [
    'restaurante',
    'comida',
    'supermercado',
    'mercado',
    'cafe',
    'cafeteria',
    'panaderia',
    'pizzeria',
    'food',
    'lunch',
    'dinner',
    'burger',
    'sushi',
  ],
  [ExpenseCategory.Transporte]: [
    'uber',
    'taxi',
    'cabify',
    'didi',
    'gasolinera',
    'combustible',
    'peaje',
    'autobus',
    'tren',
    'metro',
    'vuelo',
    'aerolinea',
    'transporte',
    'parking',
    'estacionamiento',
  ],
  [ExpenseCategory.Tecnologia]: [
    'amazon',
    'apple',
    'microsoft',
    'software',
    'hardware',
    'electronica',
    'ordenador',
    'computadora',
    'laptop',
    'hosting',
    'dominio',
    'google',
    'mercadolibre',
  ],
  [ExpenseCategory.Servicios]: [
    'electricidad',
    'agua',
    'luz',
    'gas natural',
    'internet',
    'telefonia',
    'seguro',
    'renta',
    'alquiler',
    'banco',
    'suscripcion',
    'netflix',
    'spotify',
    'telefonica',
    'movistar',
    'fibra',
  ],
  [ExpenseCategory.Otros]: [],
};

@Injectable()
export class RulesExtractorService {
  extract(rawText: string): ExtractionResult {
    const text = rawText ?? '';
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      provider: this.extractProvider(lines),
      invoiceNumber: this.extractFirstMatch(text, INVOICE_PATTERNS),
      issueDate: this.extractDate(text),
      subtotal: this.extractAmountByLabel(text, SUBTOTAL_PATTERNS),
      taxes: this.extractAmountByLabel(text, TAXES_PATTERNS),
      total: this.extractTotal(text),
      currency: this.extractCurrency(text),
      category: this.extractCategory(text),
    };
  }

  private extractProvider(lines: string[]): ExtractedField {
    const labelPattern =
      /^(?:proveedor|raz[oó]n\s+social|emitido\s+por|vendedor|establecimiento|comercio)\s*[:#]?\s*(.+)$/i;

    for (const line of lines) {
      const match = line.match(labelPattern);
      if (match?.[1]?.trim()) {
        return {
          value: match[1].trim(),
          confidence: 0.85,
          source: 'rules',
        };
      }
    }

    for (const line of lines.slice(0, 3)) {
      if (this.looksLikeProvider(line)) {
        return { value: line, confidence: 0.4, source: 'rules' };
      }
    }

    return emptyField();
  }

  private looksLikeProvider(line: string): boolean {
    if (line.length < 3 || line.length > 60) {
      return false;
    }
    if (/\d/.test(line) || /[:#]/.test(line)) {
      return false;
    }
    if (
      /(total|fecha|factura|iva|subtotal|importe|cantidad|descripcion|n[oº°]|direccion|telefono|email|www|http)/i.test(
        line,
      )
    ) {
      return false;
    }
    if (line.split(/\s+/).some((word) => STOPWORDS.has(word.toLowerCase()))) {
      return false;
    }
    return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/.test(line);
  }

  private extractFirstMatch(text: string, patterns: RegExp[]): ExtractedField {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]?.trim()) {
        return {
          value: match[1].trim(),
          confidence: LABELED_CONFIDENCE,
          source: 'rules',
        };
      }
    }
    return emptyField();
  }

  private extractDate(text: string): ExtractedField {
    for (const pattern of DATE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const normalized = normalizeDate(match[1]);
        if (normalized) {
          return {
            value: normalized,
            confidence: 0.85,
            source: 'rules',
          };
        }
      }
    }

    const generic = text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
    if (generic) {
      const normalized = normalizeDate(generic[1]);
      if (normalized) {
        return { value: normalized, confidence: 0.5, source: 'rules' };
      }
    }

    const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso) {
      return { value: iso[1], confidence: 0.85, source: 'rules' };
    }

    return emptyField();
  }

  private extractAmountByLabel(
    text: string,
    patterns: RegExp[],
  ): ExtractedField {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseAmount(match[1] ?? match[0]);
        if (value !== null) {
          return {
            value,
            confidence: LABELED_CONFIDENCE,
            source: 'rules',
          };
        }
      }
    }
    return emptyField();
  }

  private extractTotal(text: string): ExtractedField {
    const labeled = this.extractAmountByLabel(text, TOTAL_PATTERNS);
    if (labeled.value !== null) {
      return labeled;
    }

    const amounts = findAllAmounts(text);
    if (amounts.length > 0) {
      return {
        value: Math.max(...amounts),
        confidence: FALLBACK_CONFIDENCE,
        source: 'rules',
      };
    }

    return emptyField();
  }

  private extractCurrency(text: string): ExtractedField {
    const code = text.match(CURRENCY_CODES);
    if (code) {
      return {
        value: code[0].toUpperCase(),
        confidence: LABELED_CONFIDENCE,
        source: 'rules',
      };
    }

    if (/€/.test(text)) {
      return { value: 'EUR', confidence: 0.7, source: 'rules' };
    }
    if (/\$/.test(text)) {
      return { value: 'USD', confidence: 0.4, source: 'rules' };
    }

    return emptyField();
  }

  private extractCategory(text: string): ExtractedField {
    const lower = text.toLowerCase();

    let best: ExpenseCategory | null = null;
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const score = keywords.reduce(
        (acc, keyword) => (lower.includes(keyword) ? acc + 1 : acc),
        0,
      );
      if (score > bestScore) {
        bestScore = score;
        best = category as ExpenseCategory;
      }
    }

    if (best && bestScore > 0) {
      return {
        value: best,
        confidence: Math.min(0.9, 0.6 + bestScore * 0.1),
        source: 'rules',
      };
    }

    return { value: ExpenseCategory.Otros, confidence: 0.3, source: 'rules' };
  }
}
