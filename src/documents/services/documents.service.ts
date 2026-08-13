import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ExtractionService } from '../../extraction/services/extraction.service';
import {
  ExtractionResult,
  FIELD_NAMES,
} from '../../extraction/types/extraction-result.types';
import { OcrService } from '../../ocr/services/ocr.service';
import { StorageService } from '../../storage/services/storage.service';
import { QueryDocumentsDto } from '../dto/query-documents.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import {
  Document,
  DocumentStatus,
  ExpenseCategory,
} from '../model/document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    private readonly storageService: StorageService,
    private readonly ocrService: OcrService,
    private readonly extractionService: ExtractionService,
  ) {}

  async create(file: Express.Multer.File): Promise<Document> {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `documents/${randomUUID()}_${safeName}`;

    await this.storageService.upload(storageKey, file.buffer, file.mimetype);

    const document = this.documentsRepository.create({
      originalName: file.originalname,
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      status: DocumentStatus.Processing,
    });

    const saved = await this.documentsRepository.save(document);

    // Procesamiento en segundo plano (OCR + extracción) para no bloquear la subida.
    void this.processDocument(saved.id, file.buffer, file.mimetype);

    return this.attachDownloadUrl(saved);
  }

  private async processDocument(
    id: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    const document = await this.documentsRepository.findOneBy({ id });
    if (!document) {
      return;
    }

    try {
      const rawText = await this.ocrService.recognize(buffer, mimeType);
      document.rawText = rawText;

      const { result, needsReview } = await this.extractionService.extract({
        rawText: rawText ?? '',
        image: { buffer, mimeType },
      });
      this.applyExtraction(document, result, needsReview);
    } catch (error) {
      document.status = DocumentStatus.Failed;
      document.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo procesar el documento';
    }

    await this.documentsRepository.save(document);
  }

  async findAll(query: QueryDocumentsDto = {}): Promise<Document[]> {
    const builder = this.documentsRepository
      .createQueryBuilder('document')
      .orderBy('document.createdAt', 'DESC');

    if (query.from) {
      builder.andWhere('document.issueDate >= :from', { from: query.from });
    }
    if (query.to) {
      builder.andWhere('document.issueDate <= :to', { to: query.to });
    }
    if (query.category) {
      builder.andWhere('document.category = :category', {
        category: query.category,
      });
    }
    if (query.status) {
      builder.andWhere('document.status = :status', {
        status: query.status,
      });
    }
    if (query.needsReview !== undefined) {
      builder.andWhere('document.needsReview = :needsReview', {
        needsReview: query.needsReview,
      });
    }

    const documents = await builder.getMany();
    return Promise.all(documents.map((doc) => this.attachDownloadUrl(doc)));
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.findEntity(id);
    return this.attachDownloadUrl(document);
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findEntity(id);
    const confidence = { ...(document.confidence ?? {}) };

    if (dto.provider !== undefined) {
      document.provider = dto.provider;
      confidence.provider = 1;
    }
    if (dto.invoiceNumber !== undefined) {
      document.invoiceNumber = dto.invoiceNumber;
      confidence.invoiceNumber = 1;
    }
    if (dto.nit !== undefined) {
      document.nit = dto.nit;
      confidence.nit = 1;
    }
    if (dto.issueDate !== undefined) {
      document.issueDate = dto.issueDate;
      confidence.issueDate = 1;
    }
    if (dto.subtotal !== undefined) {
      document.subtotal = dto.subtotal;
      confidence.subtotal = 1;
    }
    if (dto.taxes !== undefined) {
      document.taxes = dto.taxes;
      confidence.taxes = 1;
    }
    if (dto.total !== undefined) {
      document.total = dto.total;
      confidence.total = 1;
    }
    if (dto.currency !== undefined) {
      document.currency = dto.currency;
      confidence.currency = 1;
    }
    if (dto.category !== undefined) {
      document.category = dto.category;
      confidence.category = 1;
    }

    document.confidence = confidence;
    document.needsReview = false;
    document.status = DocumentStatus.Ready;
    document.errorMessage = null;

    return this.attachDownloadUrl(
      await this.documentsRepository.save(document),
    );
  }

  async remove(id: string): Promise<void> {
    const document = await this.findEntity(id);

    await this.storageService.remove(document.storageKey);
    await this.documentsRepository.remove(document);
  }

  private async findEntity(id: string): Promise<Document> {
    const document = await this.documentsRepository.findOneBy({ id });

    if (!document) {
      throw new NotFoundException(`Documento con id ${id} no encontrado`);
    }

    return document;
  }

  private async attachDownloadUrl(document: Document): Promise<Document> {
    document.downloadUrl = await this.storageService.getDownloadUrl(
      document.storageKey,
    );
    return document;
  }

  private applyExtraction(
    document: Document,
    result: ExtractionResult,
    needsReview: boolean,
  ): void {
    document.provider = result.provider.value as string | null;
    document.invoiceNumber = result.invoiceNumber.value as string | null;
    document.nit = result.nit.value as string | null;
    document.issueDate = result.issueDate.value as string | null;
    document.subtotal = result.subtotal.value as number | null;
    document.taxes = result.taxes.value as number | null;
    document.total = result.total.value as number | null;
    document.currency = (result.currency.value as string | null) ?? 'COP';
    document.category = this.toCategory(result.category.value);
    document.confidence = this.toConfidenceMap(result);
    document.extractionRaw = this.toRaw(result);
    document.needsReview = needsReview;
    document.status = needsReview
      ? DocumentStatus.NeedsReview
      : DocumentStatus.Ready;
  }

  private toCategory(value: string | number | null): ExpenseCategory | null {
    if (typeof value !== 'string') {
      return null;
    }
    const categories = Object.values(ExpenseCategory) as string[];
    return categories.includes(value) ? (value as ExpenseCategory) : null;
  }

  private toConfidenceMap(result: ExtractionResult): Record<string, number> {
    const map: Record<string, number> = {};
    for (const field of FIELD_NAMES) {
      map[field] = result[field].confidence;
    }
    return map;
  }

  private toRaw(result: ExtractionResult): Record<string, unknown> {
    const raw: Record<string, unknown> = {};
    for (const field of FIELD_NAMES) {
      raw[field] = result[field];
    }
    return raw;
  }
}
