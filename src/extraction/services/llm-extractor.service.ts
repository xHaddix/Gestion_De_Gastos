import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ExtractionResult } from '../types/extraction-result.types';
import { parseExtractionJson } from '../utils/parse-extraction';

const SYSTEM_PROMPT = `Eres un asistente que extrae información estructurada de documentos de gasto (facturas, recibos, tickets).

Devuelve ÚNICAMENTE un objeto JSON con las siguientes claves:
- "provider": nombre del proveedor o establecimiento (string o null). Busca el nombre de la empresa impreso en el encabezado.
- "invoiceNumber": número de factura o documento (string o null)
- "nit": NIT o identificación fiscal del proveedor (por ejemplo "830.088.587-0") (string o null)
- "date": fecha de EMISIÓN del documento en formato YYYY-MM-DD (string o null)
- "subtotal": subtotal sin impuestos (número o null)
- "taxes": valor total de impuestos/IVA (número o null)
- "total": total a pagar (número o null)
- "currency": siempre "COP" (pesos colombianos)
- "category": una de: "alimentacion", "transporte", "tecnologia", "servicios", "otros"

Reglas:
- "date" debe ser la FECHA DE EMISIÓN de la factura (la fecha en que se emitió el documento, a menudo escrita a mano en el cuerpo del documento).
- Ignora por completo las fechas de resolución, autorización o vigencia de la DIAN u organismos fiscales (por ejemplo "FORMULARIO DIAN No. ... - FECHA: 2018/11/08" o "RESOLUCIÓN DIAN ... FECHA: ..."). Esas NO son la fecha de la factura.
- Los valores monetarios están en pesos colombianos (COP). El separador de miles es el punto (.) y el decimal la coma (,). Convierte "1.234.567" o "1.234.567,89" a números sin separadores.
- Si la fecha de emisión no es legible (escrita a mano o ilegible en el OCR), devuelve null para "date".
- Usa null cuando no encuentres un campo.
- No inventes valores.
- Responde solo con JSON válido, sin texto adicional.`;

@Injectable()
export class LlmExtractorService implements OnModuleInit {
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

  onModuleInit(): void {
    if (this.client) {
      this.logger.log(`Extracción con LLM habilitada (modelo: ${this.model})`);
    } else {
      this.logger.warn(
        'Extracción con LLM deshabilitada (LLM_API_KEY no definido). Se usarán solo reglas.',
      );
    }
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
      return parseExtractionJson(content, 'llm');
    } catch (error) {
      this.logger.warn(
        `Extracción con LLM falló (${(error as Error).message}). Se usarán solo reglas.`,
      );
      return {};
    }
  }
}
