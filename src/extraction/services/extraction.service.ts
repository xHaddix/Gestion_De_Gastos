import { Injectable } from '@nestjs/common';
import {
  emptyField,
  ExtractedField,
  ExtractionResult,
  FIELD_NAMES,
  FieldName,
} from '../types/extraction-result.types';
import { normalizeDate } from '../utils/text.utils';
import { LlmExtractorService } from './llm-extractor.service';
import { RulesExtractorService } from './rules-extractor.service';
import { VisionExtractorService } from './vision-extractor.service';

const REVIEW_THRESHOLD = 0.7;
const CRITICAL_FIELDS: FieldName[] = ['provider', 'total'];

export interface ExtractionInput {
  rawText: string;
  image?: { buffer: Buffer; mimeType: string };
}

export interface ExtractionOutcome {
  result: ExtractionResult;
  needsReview: boolean;
}

@Injectable()
export class ExtractionService {
  constructor(
    private readonly rulesExtractor: RulesExtractorService,
    private readonly llmExtractor: LlmExtractorService,
    private readonly visionExtractor: VisionExtractorService,
  ) {}

  async extract(input: ExtractionInput): Promise<ExtractionOutcome> {
    const rules = this.rulesExtractor.extract(input.rawText);
    const llm = this.llmExtractor.isEnabled()
      ? await this.llmExtractor.extract(input.rawText)
      : {};
    const vision =
      this.visionExtractor.isEnabled() && input.image
        ? await this.visionExtractor.extract(
            input.image.buffer,
            input.image.mimeType,
          )
        : {};

    const result = this.merge([rules, llm, vision]);
    const needsReview = this.computeNeedsReview(result);

    return { result, needsReview };
  }

  private merge(sources: Partial<ExtractionResult>[]): ExtractionResult {
    const result = {} as ExtractionResult;

    for (const field of FIELD_NAMES) {
      const fields = sources
        .map((source) => source[field])
        .filter(
          (f): f is ExtractedField & { value: string | number } =>
            f !== undefined && f.value !== null && f.value !== undefined,
        );

      if (fields.length === 0) {
        result[field] = emptyField();
        continue;
      }

      if (fields.length === 1) {
        result[field] = { ...fields[0] };
        continue;
      }

      const reference = fields[0];
      const allAgree = fields.every((f) =>
        this.sameValue(f.value, reference.value),
      );

      result[field] = allAgree
        ? {
            value: reference.value,
            confidence: Math.max(0.95, ...fields.map((f) => f.confidence)),
            source: 'merged',
          }
        : {
            value: fields.reduce((best, f) =>
              f.confidence >= best.confidence ? f : best,
            ).value,
            confidence: 0.4,
            source: 'merged',
          };
    }

    return result;
  }

  private sameValue(a: string | number, b: string | number): boolean {
    return this.normalize(a) === this.normalize(b);
  }

  private normalize(value: string | number): string {
    if (typeof value === 'number') {
      return `num:${Math.round(value * 100) / 100}`;
    }

    const date = normalizeDate(String(value));
    if (date) {
      return `date:${date}`;
    }

    return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private computeNeedsReview(result: ExtractionResult): boolean {
    for (const field of CRITICAL_FIELDS) {
      if (result[field].value === null) {
        return true;
      }
    }

    for (const field of FIELD_NAMES) {
      const extracted = result[field];
      if (extracted.value !== null && extracted.confidence < REVIEW_THRESHOLD) {
        return true;
      }
    }

    return false;
  }
}
