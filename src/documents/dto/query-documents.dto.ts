import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ExpenseCategory } from '../model/document.entity';

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
}
