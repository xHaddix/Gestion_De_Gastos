import { ExtractionService } from './extraction.service';
import { LlmExtractorService } from './llm-extractor.service';
import { RulesExtractorService } from './rules-extractor.service';
import { VisionExtractorService } from './vision-extractor.service';

describe('ExtractionService', () => {
  let service: ExtractionService;
  let rules: RulesExtractorService;
  let llm: Pick<LlmExtractorService, 'isEnabled' | 'extract'>;
  let vision: Pick<VisionExtractorService, 'isEnabled' | 'extract'>;

  beforeEach(() => {
    rules = new RulesExtractorService();
    llm = {
      isEnabled: jest.fn().mockReturnValue(false),
      extract: jest.fn(),
    };
    vision = {
      isEnabled: jest.fn().mockReturnValue(false),
      extract: jest.fn(),
    };
    service = new ExtractionService(
      rules,
      llm as LlmExtractorService,
      vision as VisionExtractorService,
    );
  });

  it('marca needsReview cuando falta un campo crítico (total)', async () => {
    const { result, needsReview } = await service.extract({
      rawText: 'Proveedor: ACME\nSin importes',
    });

    expect(result.total.value).toBeNull();
    expect(needsReview).toBe(true);
  });

  it('no requiere revisión cuando los campos son completos y confiables', async () => {
    const { result, needsReview } = await service.extract({
      rawText: [
        'Proveedor: ACME Supermercado',
        'Total: 121.00 EUR',
        'Fecha: 13/08/2026',
      ].join('\n'),
    });

    expect(result.provider.value).toBe('ACME Supermercado');
    expect(result.total.value).toBe(121);
    expect(needsReview).toBe(false);
  });

  it('marca needsReview cuando un campo tiene baja confianza', async () => {
    const { needsReview } = await service.extract({
      rawText: 'Compra en tienda\n45.50',
    });

    expect(needsReview).toBe(true);
  });

  it('usa el resultado de visión cuando el OCR no detecta la fecha', async () => {
    (vision.isEnabled as jest.Mock).mockReturnValue(true);
    (vision.extract as jest.Mock).mockResolvedValue({
      issueDate: { value: '2020-02-13', confidence: 0.9, source: 'vision' },
    });

    const { result } = await service.extract({
      rawText: 'FECHA: |S oo LOO\nTotal: 100.00',
      image: { buffer: Buffer.from('x'), mimeType: 'image/jpeg' },
    });

    expect(result.issueDate.value).toBe('2020-02-13');
  });
});
