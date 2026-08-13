import { ExtractionService } from './extraction.service';
import { LlmExtractorService } from './llm-extractor.service';
import { RulesExtractorService } from './rules-extractor.service';

describe('ExtractionService', () => {
  let service: ExtractionService;
  let rules: RulesExtractorService;
  let llm: Pick<LlmExtractorService, 'isEnabled' | 'extract'>;

  beforeEach(() => {
    rules = new RulesExtractorService();
    llm = {
      isEnabled: jest.fn().mockReturnValue(false),
      extract: jest.fn(),
    };
    service = new ExtractionService(rules, llm as LlmExtractorService);
  });

  it('marca needsReview cuando falta un campo crítico (total)', async () => {
    const { result, needsReview } = await service.extract(
      'Proveedor: ACME\nSin importes',
    );

    expect(result.total.value).toBeNull();
    expect(needsReview).toBe(true);
  });

  it('no requiere revisión cuando los campos son completos y confiables', async () => {
    const text = [
      'Proveedor: ACME Supermercado',
      'Total: 121.00 EUR',
      'Fecha: 13/08/2026',
    ].join('\n');

    const { result, needsReview } = await service.extract(text);

    expect(result.provider.value).toBe('ACME Supermercado');
    expect(result.total.value).toBe(121);
    expect(needsReview).toBe(false);
  });

  it('marca needsReview cuando un campo tiene baja confianza', async () => {
    const { needsReview } = await service.extract('Compra en tienda\n45.50');

    expect(needsReview).toBe(true);
  });
});
