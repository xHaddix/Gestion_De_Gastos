import { Global, Module } from '@nestjs/common';
import { OcrService } from './services/ocr.service';

@Global()
@Module({
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
