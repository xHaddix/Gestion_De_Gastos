import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { CATEGORIES, CATEGORY_LABELS, STATUS_LABELS } from '../constants';
import type {
  Document,
  UpdateDocumentInput,
} from '../types/document';

interface FormState {
  provider: string;
  invoiceNumber: string;
  nit: string;
  issueDate: string;
  subtotal: string;
  taxes: string;
  total: string;
  category: string;
}

function toForm(document: Document): FormState {
  return {
    provider: document.provider ?? '',
    invoiceNumber: document.invoiceNumber ?? '',
    nit: document.nit ?? '',
    issueDate: document.issueDate ?? '',
    subtotal: document.subtotal?.toString() ?? '',
    taxes: document.taxes?.toString() ?? '',
    total: document.total?.toString() ?? '',
    category: document.category ?? '',
  };
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [document, setDocument] = useState<Document | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    api
      .get<Document>(`/documents/${id}`)
      .then(({ data }) => {
        setDocument(data);
        setForm(toForm(data));
      })
      .catch((error) => {
        notify('error', (error as Error).message);
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, notify]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = async () => {
    if (!form || !id) {
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateDocumentInput = {
        provider: form.provider || null,
        invoiceNumber: form.invoiceNumber || null,
        nit: form.nit || null,
        issueDate: form.issueDate || null,
        subtotal: parseNumber(form.subtotal),
        taxes: parseNumber(form.taxes),
        total: parseNumber(form.total),
        category: (form.category || null) as UpdateDocumentInput['category'],
      };
      const { data, message } = await api.patch<Document>(
        `/documents/${id}`,
        payload,
      );
      setDocument(data);
      setForm(toForm(data));
      notify('success', message);
    } catch (error) {
      notify('error', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      return;
    }
    setDeleting(true);
    try {
      const { message } = await api.delete(`/documents/${id}`);
      notify('success', message);
      navigate('/');
    } catch (error) {
      notify('error', (error as Error).message);
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="loader">Cargando documento…</div>;
  }

  if (!document || !form) {
    return null;
  }

  const confidence = document.confidence ?? {};

  return (
    <div className="page">
      <button className="btn btn--ghost btn--back" onClick={() => navigate('/')}>
        ← Volver a documentos
      </button>

      <div className="page__header">
        <div>
          <h1 className="page__title">
            {document.provider || 'Documento'}
          </h1>
          <p className="page__subtitle">{document.originalName}</p>
        </div>
        <span className={`status status--${document.status}`}>
          {STATUS_LABELS[document.status] ?? document.status}
        </span>
      </div>

      <div className="review-layout">
        <div className="card review-preview">
          <h2 className="card__title">Documento original</h2>
          {document.downloadUrl ? (
            document.mimeType === 'application/pdf' ? (
              <a
                className="btn btn--ghost"
                href={document.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir PDF
              </a>
            ) : (
              <img
                className="review-preview__img"
                src={document.downloadUrl}
                alt={document.originalName}
              />
            )
          ) : (
            <p className="review-preview__placeholder">Sin vista previa</p>
          )}
        </div>

        <form
          className="card review-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <h2 className="card__title">Información detectada</h2>
          <p className="card__hint">
            Corrige o completa los campos y guarda los cambios.
          </p>

          <div className="form-grid">
            <label className="field field--full">
              <span className="field__label">
                Proveedor{' '}
                {confidence.provider !== undefined && (
                  <ConfidenceBadge value={confidence.provider} />
                )}
              </span>
              <input
                className="input"
                value={form.provider}
                onChange={(e) => updateField('provider', e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Nº documento</span>
              <input
                className="input"
                value={form.invoiceNumber}
                onChange={(e) => updateField('invoiceNumber', e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">NIT</span>
              <input
                className="input"
                placeholder="830.088.587-0"
                value={form.nit}
                onChange={(e) => updateField('nit', e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">
                Fecha{' '}
                {confidence.issueDate !== undefined && (
                  <ConfidenceBadge value={confidence.issueDate} />
                )}
              </span>
              <input
                type="date"
                className="input"
                value={form.issueDate}
                onChange={(e) => updateField('issueDate', e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Subtotal</span>
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.subtotal}
                onChange={(e) => updateField('subtotal', e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Impuestos</span>
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.taxes}
                onChange={(e) => updateField('taxes', e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">
                Total{' '}
                {confidence.total !== undefined && (
                  <ConfidenceBadge value={confidence.total} />
                )}
              </span>
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.total}
                onChange={(e) => updateField('total', e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Categoría</span>
              <select
                className="input"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
              >
                <option value="">Sin categoría</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="review-form__actions">
            <button
              type="button"
              className="btn btn--danger-ghost"
              onClick={() => setConfirmDelete(true)}
            >
              Eliminar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      <Modal
        open={confirmDelete}
        title="Eliminar documento"
        onClose={() => setConfirmDelete(false)}
      >
        <p className="modal__text">
          ¿Seguro que deseas eliminar este documento? Esta acción no se puede
          deshacer.
        </p>
        <div className="modal__actions">
          <button
            className="btn btn--ghost"
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
          >
            Cancelar
          </button>
          <button
            className="btn btn--danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const tone =
    value >= 0.85 ? 'high' : value >= 0.7 ? 'medium' : 'low';
  return (
    <span className={`confidence confidence--${tone}`} title={`Confianza ${percent}%`}>
      {percent}%
    </span>
  );
}
