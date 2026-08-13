import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorator/response-message.decorator';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const customMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        message: this.resolveMessage(context, data, customMessage),
        data,
      })),
    );
  }

  private resolveMessage(
    context: ExecutionContext,
    data: T,
    customMessage?: string,
  ): string {
    if (customMessage) {
      return customMessage;
    }

    if (Array.isArray(data)) {
      return data.length === 0
        ? 'No se encontraron resultados'
        : `Se encontraron ${data.length} resultado(s)`;
    }

    const method = context
      .switchToHttp()
      .getRequest<{ method: string }>().method;

    switch (method) {
      case 'POST':
        return 'Recurso creado correctamente';
      case 'PATCH':
      case 'PUT':
        return 'Recurso actualizado correctamente';
      case 'DELETE':
        return 'Recurso eliminado correctamente';
      default:
        return 'Operación realizada correctamente';
    }
  }
}
