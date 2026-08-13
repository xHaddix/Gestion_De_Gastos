import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createCanvas,
  DOMMatrix,
  Image,
  ImageData,
  Path2D,
  loadImage,
} from '@napi-rs/canvas';
import * as os from 'os';
import * as path from 'path';
import { createWorker, setLogging, Worker } from 'tesseract.js';

const g = globalThis as Record<string, unknown>;
g.DOMMatrix = DOMMatrix;
g.Path2D = Path2D;
g.ImageData = ImageData;

const PDF_MIME_TYPE = 'application/pdf';
const RENDER_SCALE = 2;
const OCR_LANGUAGES = 'spa+eng';
const PREPROCESS_SCALE = 2;
const MIN_PREPROCESS_WIDTH = 1500;

@Injectable()
export class OcrService implements OnModuleDestroy {
  private readonly logger = new Logger(OcrService.name);
  private worker: Worker | null = null;

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  async recognize(buffer: Buffer, mimeType: string): Promise<string> {
    const images =
      mimeType === PDF_MIME_TYPE ? await this.pdfToImages(buffer) : [buffer];

    const worker = await this.getWorker();
    const texts: string[] = [];

    for (const image of images) {
      const preprocessed = await this.preprocessImage(image);
      const { data } = await worker.recognize(preprocessed);
      if (data.text) {
        texts.push(data.text);
      }
    }

    return texts.join('\n\n').trim();
  }

  private async preprocessImage(buffer: Buffer): Promise<Buffer> {
    try {
      const image: Image = await loadImage(buffer);

      const scale = image.width < MIN_PREPROCESS_WIDTH ? PREPROCESS_SCALE : 1;
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);

      const canvas = createCanvas(width, height);
      const context = canvas.getContext('2d');

      context.filter = 'grayscale(1)';
      context.drawImage(image, 0, 0, width, height);

      return canvas.toBuffer('image/png');
    } catch {
      return buffer;
    }
  }

  private async getWorker(): Promise<Worker> {
    if (!this.worker) {
      setLogging(false);
      this.logger.log(`Inicializando Tesseract (${OCR_LANGUAGES})...`);
      this.worker = await createWorker(OCR_LANGUAGES, 1, {
        cachePath: path.join(os.tmpdir(), 'tesseract-cache'),
      });
    }
    return this.worker;
  }

  private async pdfToImages(buffer: Buffer): Promise<Buffer[]> {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const fontsDir = `${path
      .join(
        path.dirname(require.resolve('pdfjs-dist/package.json')),
        'standard_fonts',
      )
      .replace(/\\/g, '/')}/`;

    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl: fontsDir,
      useSystemFonts: true,
    });
    const document = await loadingTask.promise;

    const images: Buffer[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = createCanvas(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height),
        );
        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          viewport,
        }).promise;
        images.push(canvas.toBuffer('image/png'));
      }
    } finally {
      await loadingTask.destroy();
    }

    return images;
  }
}
