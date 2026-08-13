import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ExpenseCategory } from '../model/document.entity';

export class UpdateDocumentDto {
  @ApiPropertyOptional({
    example: 'ACME Supermercado S.A.',
    description: 'Proveedor o establecimiento',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  provider?: string | null;

  @ApiPropertyOptional({
    example: 'F-2026-00123',
    description: 'Número de factura o documento',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string | null;

  @ApiPropertyOptional({
    example: '830.088.587-0',
    description: 'NIT o identificación fiscal del proveedor',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  nit?: string | null;

  @ApiPropertyOptional({
    example: '2026-08-13',
    description: 'Fecha del documento (YYYY-MM-DD)',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  issueDate?: string | null;

  @ApiPropertyOptional({
    example: 100,
    description: 'Subtotal',
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  subtotal?: number | null;

  @ApiPropertyOptional({
    example: 21,
    description: 'Impuestos',
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  taxes?: number | null;

  @ApiPropertyOptional({ example: 121, description: 'Total', nullable: true })
  @IsOptional()
  @IsNumber()
  total?: number | null;

  @ApiPropertyOptional({
    example: 'COP',
    description: 'Moneda (por defecto COP)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  currency?: string | null;

  @ApiPropertyOptional({
    enum: ExpenseCategory,
    example: ExpenseCategory.Alimentacion,
    description: 'Categoría del gasto',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory | null;
}
