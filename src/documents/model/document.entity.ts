import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/db/numeric.transformer';

export enum DocumentStatus {
  Pending = 'pending',
  Processing = 'processing',
  NeedsReview = 'needs_review',
  Ready = 'ready',
  Failed = 'failed',
}

export enum ExpenseCategory {
  Alimentacion = 'alimentacion',
  Transporte = 'transporte',
  Tecnologia = 'tecnologia',
  Servicios = 'servicios',
  Otros = 'otros',
}

@Entity('documents')
export class Document {
  @ApiProperty({
    example: '3f2c1e9a-8b5d-4c1a-9f3e-2a1b4c5d6e7f',
    description: 'Identificador único del documento',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'factura-1234.jpg',
    description: 'Nombre original del archivo subido',
  })
  @Column()
  originalName: string;

  @ApiProperty({
    example: 'documents/2026-08-13/factura-1234.jpg',
    description: 'Clave del objeto en el almacenamiento (S3/MinIO)',
  })
  @Column()
  storageKey: string;

  @ApiProperty({ example: 'image/jpeg', description: 'Tipo MIME del archivo' })
  @Column()
  mimeType: string;

  @ApiProperty({ example: 245760, description: 'Tamaño del archivo en bytes' })
  @Column({ type: 'bigint' })
  sizeBytes: number;

  @ApiProperty({
    enum: DocumentStatus,
    example: DocumentStatus.Pending,
    description: 'Estado actual del procesamiento del documento',
  })
  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.Pending,
  })
  status: DocumentStatus;

  @ApiPropertyOptional({
    example: 'FACTURA ELECTRONICA\nProveedor XYZ...',
    description: 'Texto crudo obtenido mediante OCR',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  rawText: string | null;

  @ApiPropertyOptional({
    example: 'Proveedor XYZ',
    description: 'Proveedor o establecimiento detectado',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @ApiPropertyOptional({
    example: 'A-12345',
    description: 'Número de factura o documento',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  invoiceNumber: string | null;

  @ApiPropertyOptional({
    example: '2026-08-13',
    description: 'Fecha del documento (formato YYYY-MM-DD)',
    nullable: true,
  })
  @Column({ type: 'date', nullable: true })
  issueDate: string | null;

  @ApiPropertyOptional({
    example: 100.5,
    description: 'Subtotal del documento',
    nullable: true,
  })
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  subtotal: number | null;

  @ApiPropertyOptional({
    example: 21.0,
    description: 'Impuestos del documento',
    nullable: true,
  })
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  taxes: number | null;

  @ApiPropertyOptional({
    example: 121.5,
    description: 'Total del documento',
    nullable: true,
  })
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  total: number | null;

  @ApiPropertyOptional({
    example: 'EUR',
    description: 'Moneda del documento (código ISO 4217)',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string | null;

  @ApiPropertyOptional({
    enum: ExpenseCategory,
    example: ExpenseCategory.Otros,
    description: 'Categoría asignada al gasto',
    nullable: true,
  })
  @Column({ type: 'enum', enum: ExpenseCategory, nullable: true })
  category: ExpenseCategory | null;

  @ApiPropertyOptional({
    example: { provider: 0.9, total: 0.98 },
    description:
      'Nivel de confianza (0-1) por campo, obtenido durante la extracción',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  confidence: Record<string, number> | null;

  @ApiPropertyOptional({
    example: { provider: { value: 'XYZ', source: 'regex' } },
    description: 'Resultado crudo de la extracción (con fuentes por campo)',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  extractionRaw: Record<string, unknown> | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el documento requiere revisión humana',
  })
  @Column({ default: false })
  needsReview: boolean;

  @ApiPropertyOptional({
    example: 'No se pudo leer el archivo',
    description: 'Mensaje de error del procesamiento, si aplica',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  errorMessage: string | null;

  @ApiProperty({
    example: '2026-08-13T10:00:00.000Z',
    description: 'Fecha y hora de creación del registro',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2026-08-13T10:00:00.000Z',
    description: 'Fecha y hora de la última actualización',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiPropertyOptional({
    example: 'http://localhost:9000/documentos/...',
    description: 'URL de descarga firmada (no persistida)',
    nullable: true,
  })
  downloadUrl?: string;
}
