import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';
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
      const { data } = await worker.recognize(image);
      if (data.text) {
        texts.push(data.text);
      }
    }

    return texts.join('\n\n').trim();
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
