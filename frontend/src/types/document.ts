export type ExpenseCategory =
  | 'alimentacion'
  | 'transporte'
  | 'tecnologia'
  | 'servicios'
  | 'otros';

export type DocumentStatus =
  | 'pending'
  | 'processing'
  | 'needs_review'
  | 'ready'
  | 'failed';

export interface ExtractedField {
  value: string | number | null;
  confidence: number;
  source: string;
}

export interface Document {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  rawText: string | null;
  provider: string | null;
  invoiceNumber: string | null;
  nit: string | null;
  issueDate: string | null;
  subtotal: number | null;
  taxes: number | null;
  total: number | null;
  currency: string | null;
  category: ExpenseCategory | null;
  confidence: Record<string, number> | null;
  extractionRaw: Record<string, ExtractedField> | null;
  needsReview: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface UpdateDocumentInput {
  provider?: string | null;
  invoiceNumber?: string | null;
  nit?: string | null;
  issueDate?: string | null;
  subtotal?: number | null;
  taxes?: number | null;
  total?: number | null;
  currency?: string | null;
  category?: ExpenseCategory | null;
}
