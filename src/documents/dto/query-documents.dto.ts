import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { DocumentStatus, ExpenseCategory } from '../model/document.entity';

export class QueryDocumentsDto {
  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Fecha inicial del documento (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: 'Fecha final del documento (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    enum: ExpenseCategory,
    description: 'Filtrar por categoría del gasto',
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional({
    enum: DocumentStatus,
    description: 'Filtrar por estado del documento',
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({
    example: true,
    description:
      'Filtrar documentos que requieren revisión (campos incompletos o de baja confianza)',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  needsReview?: boolean;
}
