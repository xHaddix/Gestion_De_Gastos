import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ExtractionService } from '../../extraction/services/extraction.service';
import {
  ExtractionResult,
  FIELD_NAMES,
} from '../../extraction/types/extraction-result.types';
import { OcrService } from '../../ocr/ocr.service';
import { StorageService } from '../../storage/storage.service';
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
    });

    const saved = await this.documentsRepository.save(document);

    try {
      const rawText = await this.ocrService.recognize(
        file.buffer,
        file.mimetype,
      );
      saved.rawText = rawText;

      if (rawText) {
        const { result, needsReview } =
          await this.extractionService.extract(rawText);
        this.applyExtraction(saved, result, needsReview);
      } else {
        saved.status = DocumentStatus.NeedsReview;
        saved.needsReview = true;
      }
    } catch {
      saved.status = DocumentStatus.Failed;
      saved.errorMessage = 'No se pudo procesar el documento mediante OCR';
    }

    return this.attachDownloadUrl(await this.documentsRepository.save(saved));
  }

  async findAll(): Promise<Document[]> {
    const documents = await this.documentsRepository.find({
      order: { createdAt: 'DESC' },
    });

    return Promise.all(documents.map((doc) => this.attachDownloadUrl(doc)));
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentsRepository.findOneBy({ id });

    if (!document) {
      throw new NotFoundException(`Documento con id ${id} no encontrado`);
    }

    return this.attachDownloadUrl(document);
  }

  async remove(id: string): Promise<void> {
    const document = await this.documentsRepository.findOneBy({ id });

    if (!document) {
      throw new NotFoundException(`Documento con id ${id} no encontrado`);
    }

    await this.storageService.remove(document.storageKey);
    await this.documentsRepository.remove(document);
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
    document.issueDate = result.issueDate.value as string | null;
    document.subtotal = result.subtotal.value as number | null;
    document.taxes = result.taxes.value as number | null;
    document.total = result.total.value as number | null;
    document.currency = result.currency.value as string | null;
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
