import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { Document } from '../model/document.entity';

@Injectable()
export class DocumentSummaryInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<Document | Document[]> {
    return next.handle().pipe(
      map((data: Document | Document[]) => {
        if (Array.isArray(data)) {
          return data.map((document) => this.summarize(document));
        }
        return this.summarize(data);
      }),
    );
  }

  private summarize(document: Document): Document {
    const { rawText, extractionRaw, ...summary } = document;
    return summary as Document;
  }
}
