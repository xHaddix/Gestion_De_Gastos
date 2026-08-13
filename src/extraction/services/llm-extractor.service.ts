import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ExpenseCategory } from '../../documents/model/document.entity';
import { ExtractionResult, FieldName } from '../types/extraction-result.types';
import { stripAccents } from '../utils/text.utils';

const SYSTEM_PROMPT = `Eres un asistente que extrae información estructurada de documentos de gasto (facturas, recibos, tickets).

Devuelve ÚNICAMENTE un objeto JSON con las siguientes claves:
- "provider": proveedor o establecimiento (string o null)
- "invoiceNumber": número de factura o documento (string o null)
- "date": fecha del documento en formato YYYY-MM-DD (string o null)
- "subtotal": subtotal sin impuestos (número o null)
- "taxes": total de impuestos (número o null)
- "total": total a pagar (número o null)
- "currency": código ISO 4217 de la moneda, por ejemplo "EUR", "USD" (string o null)
- "category": una de: "alimentacion", "transporte", "tecnologia", "servicios", "otros"

Reglas:
- Usa null cuando no encuentres un campo.
- No inventes valores.
- Responde solo con JSON válido, sin texto adicional.`;

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
  ['date', 'issueDate'],
  ['subtotal', 'subtotal'],
  ['taxes', 'taxes'],
  ['total', 'total'],
  ['currency', 'currency'],
  ['category', 'category'],
];

@Injectable()
export class LlmExtractorService {
  private readonly logger = new Logger(LlmExtractorService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const baseURL = this.configService.get<string>('LLM_BASE_URL');

    this.model = this.configService.get<string>('LLM_MODEL', 'gpt-4o-mini');
    this.client = apiKey
      ? new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
      : null;
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async extract(rawText: string): Promise<Partial<ExtractionResult>> {
    if (!this.client) {
      return {};
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: rawText.slice(0, 6000) },
        ],
      });

      const content = response.choices[0]?.message?.content ?? '';
      return this.parse(content);
    } catch (error) {
      this.logger.warn(
        `Extracción con LLM falló (${(error as Error).message}). Se usarán solo reglas.`,
      );
      return {};
    }
  }

  private parse(content: string): Partial<ExtractionResult> {
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(content) as Record<string, unknown>;
    } catch {
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
        result[field] = { value: normalized, confidence: 0.9, source: 'llm' };
        continue;
      }

      result[field] = {
        value: value as string | number,
        confidence: 0.9,
        source: 'llm',
      };
    }

    return result;
  }
}
