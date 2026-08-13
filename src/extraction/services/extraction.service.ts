import { Injectable } from '@nestjs/common';
import {
  emptyField,
  ExtractionResult,
  FIELD_NAMES,
  FieldName,
} from '../types/extraction-result.types';
import { normalizeDate } from '../utils/text.utils';
import { LlmExtractorService } from './llm-extractor.service';
import { RulesExtractorService } from './rules-extractor.service';

const REVIEW_THRESHOLD = 0.7;
const CRITICAL_FIELDS: FieldName[] = ['provider', 'total'];

export interface ExtractionOutcome {
  result: ExtractionResult;
  needsReview: boolean;
}

@Injectable()
export class ExtractionService {
  constructor(
    private readonly rulesExtractor: RulesExtractorService,
    private readonly llmExtractor: LlmExtractorService,
  ) {}

  async extract(rawText: string): Promise<ExtractionOutcome> {
    const rules = this.rulesExtractor.extract(rawText);
    const llm = this.llmExtractor.isEnabled()
      ? await this.llmExtractor.extract(rawText)
      : {};

    const result = this.merge(rules, llm);
    const needsReview = this.computeNeedsReview(result);

    return { result, needsReview };
  }

  private merge(
    rules: ExtractionResult,
    llm: Partial<ExtractionResult>,
  ): ExtractionResult {
    const result = {} as ExtractionResult;

    for (const field of FIELD_NAMES) {
      const ruleField = rules[field];
      const llmField = llm[field];
      const ruleValue = ruleField?.value ?? null;
      const llmValue = llmField?.value ?? null;
      const ruleConfidence = ruleField?.confidence ?? 0;
      const llmConfidence = llmField?.confidence ?? 0;

      if (ruleValue !== null && llmValue !== null) {
        result[field] = this.sameValue(ruleValue, llmValue)
          ? {
              value: llmValue,
              confidence: Math.max(0.95, ruleConfidence),
              source: 'merged',
            }
          : {
              value: ruleConfidence >= llmConfidence ? ruleValue : llmValue,
              confidence: 0.4,
              source: 'merged',
            };
      } else if (llmValue !== null) {
        result[field] = { value: llmValue, confidence: 0.7, source: 'llm' };
      } else if (ruleValue !== null) {
        result[field] = {
          value: ruleValue,
          confidence: ruleConfidence,
          source: ruleField.source,
        };
      } else {
        result[field] = emptyField();
      }
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
