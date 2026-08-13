import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SanitizeUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.sanitize(data)));
  }

  private sanitize(data: unknown): unknown {
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (data && typeof data === 'object') {
      const plain = { ...data };
      if ('password' in plain) {
        delete (plain as Record<string, unknown>).password;
      }
      return plain;
    }

    return data;
  }
}
