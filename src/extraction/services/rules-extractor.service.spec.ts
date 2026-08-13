import { ExpenseCategory } from '../../documents/model/document.entity';
import { RulesExtractorService } from './rules-extractor.service';

describe('RulesExtractorService', () => {
  let service: RulesExtractorService;

  beforeEach(() => {
    service = new RulesExtractorService();
  });

  const invoice = [
    'FACTURA ELECTRONICA',
    'Proveedor: ACME Supermercado S.A.',
    'Factura Nº: F-2026-00123',
    'Fecha: 13/08/2026',
    'Subtotal: 100.00',
    'IVA: 21.00',
    'Total: 121.00 EUR',
  ].join('\n');

  it('extrae proveedor, número, fecha, subtotal, impuestos y total', () => {
    const result = service.extract(invoice);

    expect(result.provider.value).toBe('ACME Supermercado S.A.');
    expect(result.invoiceNumber.value).toBe('F-2026-00123');
    expect(result.issueDate.value).toBe('2026-08-13');
    expect(result.subtotal.value).toBe(100);
    expect(result.taxes.value).toBe(21);
    expect(result.total.value).toBe(121);
  });

  it('detecta la moneda EUR con alta confianza', () => {
    const result = service.extract(invoice);

    expect(result.currency.value).toBe('EUR');
    expect(result.currency.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('asigna la categoría por palabra clave', () => {
    const result = service.extract(invoice);

    expect(result.category.value).toBe(ExpenseCategory.Alimentacion);
    expect(result.category.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('usa el importe máximo como total cuando no hay etiqueta', () => {
    const result = service.extract('Compra en tienda\n45.50\n12.30');

    expect(result.total.value).toBe(45.5);
    expect(result.total.confidence).toBeLessThan(0.9);
  });

  it('interpreta separadores de millares y decimales', () => {
    const result = service.extract(
      ['Factura', 'Total: 1.234,56 EUR'].join('\n'),
    );

    expect(result.total.value).toBe(1234.56);
  });

  it('detecta categoría tecnología con tildes y palabras de producto', () => {
    const result = service.extract(
      [
        'TECNOLOGÍA PORTÁTILES',
        'Venta de portátiles Lenovo Acer',
        'Total: 2.500.000 COP',
      ].join('\n'),
    );

    expect(result.category.value).toBe(ExpenseCategory.Tecnologia);
  });

  it('ignora la fecha de la resolución DIAN y usa la fecha de la factura', () => {
    const result = service.extract(
      [
        'FORMULARIO DIAN No. 1876201184101 - FECHA: 2018/11/08',
        'FACTURA DE VENTA',
        'FECHA: 15/08/2026',
        'Total: 100.00',
      ].join('\n'),
    );

    expect(result.issueDate.value).toBe('2026-08-15');
  });

  it('devuelve campos nulos cuando no hay información', () => {
    const result = service.extract('Texto sin datos relevantes');

    expect(result.provider.value).toBeNull();
    expect(result.invoiceNumber.value).toBeNull();
    expect(result.total.value).toBeNull();
  });
});
