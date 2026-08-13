import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractionResult } from '../types/extraction-result.types';
import { parseExtractionJson } from '../utils/parse-extraction';

const VISION_PROMPT = `Eres un asistente que extrae información estructurada de documentos de gasto (facturas, recibos, tickets) a partir de una IMAGEN.

Devuelve ÚNICAMENTE un objeto JSON con las siguientes claves:
- "provider": proveedor o establecimiento (string o null)
- "invoiceNumber": número de factura o documento (string o null)
- "date": fecha de EMISIÓN del documento en formato YYYY-MM-DD (string o null)
- "subtotal": subtotal sin impuestos (número o null)
- "taxes": total de impuestos (número o null)
- "total": total a pagar (número o null)
- "currency": código ISO 4217 de la moneda, por ejemplo "EUR", "USD" (string o null)
- "category": una de: "alimentacion", "transporte", "tecnologia", "servicios", "otros"

Reglas:
- "date" debe ser la FECHA DE EMISIÓN de la factura. Puede estar escrita A MANO en el documento; léela con cuidado desde la imagen.
- Ignora por completo las fechas de resolución, autorización o vigencia de la DIAN u organismos fiscales (por ejemplo "FORMULARIO DIAN No. ... - FECHA: 2018/11/08"). Esas NO son la fecha de la factura.
- Si no puedes leer la fecha de emisión, devuelve null para "date".
- No inventes valores. Usa null si no encuentras un campo.
- Responde solo con JSON válido, sin texto adicional.`;

@Injectable()
export class VisionExtractorService implements OnModuleInit {
  private readonly logger = new Logger(VisionExtractorService.name);
  private readonly model: GenerativeModel | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const modelName = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-2.5-flash',
    );

    this.model = apiKey
      ? new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: modelName })
      : null;
  }

  onModuleInit(): void {
    if (this.model) {
      this.logger.log('Extracción por visión (Gemini) habilitada');
    } else {
      this.logger.warn(
        'Extracción por visión deshabilitada (GEMINI_API_KEY no definido).',
      );
    }
  }

  isEnabled(): boolean {
    return this.model !== null;
  }

  async extract(
    image: Buffer,
    mimeType: string,
  ): Promise<Partial<ExtractionResult>> {
    if (!this.model) {
      return {};
    }

    try {
      const result = await this.model.generateContent([
        { text: VISION_PROMPT },
        { inlineData: { mimeType, data: image.toString('base64') } },
      ]);

      return parseExtractionJson(result.response.text(), 'vision');
    } catch (error) {
      this.logger.warn(
        `Extracción por visión falló (${(error as Error).message}). Se usará el OCR y las reglas.`,
      );
      return {};
    }
  }
}
