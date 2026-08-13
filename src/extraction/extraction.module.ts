import { Global, Module } from '@nestjs/common';
import { ExtractionService } from './services/extraction.service';
import { LlmExtractorService } from './services/llm-extractor.service';
import { RulesExtractorService } from './services/rules-extractor.service';

@Global()
@Module({
  providers: [RulesExtractorService, LlmExtractorService, ExtractionService],
  exports: [ExtractionService],
})
export class ExtractionModule {}
