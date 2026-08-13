import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { CATEGORY_LABELS, formatDate, formatMoney } from '../constants';
import type { Document } from '../types/document';

const ACCEPTED = 'image/jpeg,image/png,application/pdf';

export function UploadPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Document | null>(null);

  const handleFile = (next: File | undefined) => {
    if (!next) {
      return;
    }
    setFile(next);
    setResult(null);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.upload<Document>('/documents', formData);

      if (data.status === 'processing') {
        notify('info', 'Documento subido. Procesando OCR y extracción…');
        await waitForProcessing(data.id);
      } else {
        setResult(data);
        notify('success', 'Documento subido y procesado correctamente');
      }
    } catch (error) {
      notify('error', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const waitForProcessing = async (id: string) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const { data } = await api.get<Document>(`/documents/${id}`);
        if (data.status !== 'processing' && data.status !== 'pending') {
          setResult(data);
          if (data.status === 'failed') {
            notify(
              'error',
              data.errorMessage || 'No se pudo procesar el documento',
            );
          } else if (data.needsReview) {
            notify('success', 'Documento procesado. Revisa los campos detectados.');
          } else {
            notify('success', 'Documento procesado correctamente');
          }
          return;
        }
      } catch {
        // reintentar
      }
    }
    notify('error', 'El procesamiento está tardando demasiado. Revisa la lista.');
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Subir documento</h1>
          <p className="page__subtitle">
            Carga una factura, recibo o ticket (JPG, PNG o PDF). El sistema hará
            OCR y extraerá la información automáticamente.
          </p>
        </div>
      </div>

      <div
        className={`dropzone ${dragging ? 'dropzone--active' : ''} ${
          file ? 'dropzone--has-file' : ''
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          hidden
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        {file ? (
          <div className="dropzone__file">
            <div className="dropzone__file-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
                <path d="M14 3v6h6" />
              </svg>
            </div>
            <p className="dropzone__filename">{file.name}</p>
            <p className="dropzone__filesize">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="dropzone__empty">
            <div className="dropzone__upload-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 16V4M7 9l5-5 5 5" />
                <path d="M4 20h16" />
              </svg>
            </div>
            <p className="dropzone__title">Arrastra tu documento aquí</p>
            <p className="dropzone__hint">o haz clic para seleccionar un archivo</p>
          </div>
        )}
      </div>

      <div className="upload-actions">
        {file && (
          <button
            className="btn btn--ghost"
            onClick={() => {
              setFile(null);
              setResult(null);
            }}
            disabled={uploading}
          >
            Quitar archivo
          </button>
        )}
        <button
          className="btn btn--primary"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Procesando…' : 'Subir y procesar'}
        </button>
      </div>

      {uploading && (
        <div className="loader">
          Procesando documento (OCR + extracción)… puede tardar unos segundos.
        </div>
      )}

      {result && (
        <div className="result card">
          <div className="result__header">
            <h2 className="result__title">Resultado del procesamiento</h2>
            <span className={`status status--${result.status}`}>
              {result.needsReview ? 'Requiere revisión' : 'Procesado'}
            </span>
          </div>

          <div className="result__grid">
            <div className="result__item">
              <span className="result__label">Proveedor</span>
              <span>{result.provider || '—'}</span>
            </div>
            <div className="result__item">
              <span className="result__label">Nº documento</span>
              <span>{result.invoiceNumber || '—'}</span>
            </div>
            <div className="result__item">
              <span className="result__label">Fecha</span>
              <span>{formatDate(result.issueDate)}</span>
            </div>
            <div className="result__item">
              <span className="result__label">Subtotal</span>
              <span>{formatMoney(result.subtotal, result.currency)}</span>
            </div>
            <div className="result__item">
              <span className="result__label">Impuestos</span>
              <span>{formatMoney(result.taxes, result.currency)}</span>
            </div>
            <div className="result__item">
              <span className="result__label">Total</span>
              <span className="doc-card__total">
                {formatMoney(result.total, result.currency)}
              </span>
            </div>
            <div className="result__item">
              <span className="result__label">NIT</span>
              <span>{result.nit || '—'}</span>
            </div>
            <div className="result__item">
              <span className="result__label">Categoría</span>
              <span>
                {result.category ? CATEGORY_LABELS[result.category] : '—'}
              </span>
            </div>
          </div>

          <div className="result__actions">
            <button
              className="btn btn--primary"
              onClick={() => navigate(`/documents/${result.id}`)}
            >
              Revisar / corregir
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setFile(null);
                setResult(null);
              }}
            >
              Subir otro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
