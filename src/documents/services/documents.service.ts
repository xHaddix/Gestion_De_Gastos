import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { OcrService } from '../../ocr/ocr.service';
import { StorageService } from '../../storage/storage.service';
import { Document, DocumentStatus } from '../model/document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    private readonly storageService: StorageService,
    private readonly ocrService: OcrService,
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
      saved.status = DocumentStatus.Ready;
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
}
