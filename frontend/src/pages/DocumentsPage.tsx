import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  formatDate,
  formatMoney,
} from '../constants';
import type { Document } from '../types/document';

interface Filters {
  from: string;
  to: string;
  category: string;
  status: string;
}

const EMPTY_FILTERS: Filters = {
  from: '',
  to: '',
  category: '',
  status: '',
};

export function DocumentsPage() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [pendingDelete, setPendingDelete] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.category) params.set('category', filters.category);
      if (filters.status) params.set('status', filters.status);

      const query = params.toString();
      const { data } = await api.get<Document[]>(
        `/documents${query ? `?${query}` : ''}`,
      );
      setDocuments(data);
    } catch (error) {
      notify('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters, notify]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    try {
      const { message } = await api.delete(`/documents/${pendingDelete.id}`);
      notify('success', message);
      setPendingDelete(null);
      void loadDocuments();
    } catch (error) {
      notify('error', (error as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  const hasFilters =
    filters.from || filters.to || filters.category || filters.status;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Documentos</h1>
          <p className="page__subtitle">
            Consulta, filtra y revisa los documentos de gasto registrados.
          </p>
        </div>
        <Link to="/upload" className="btn btn--primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Subir documento
        </Link>
      </div>

      <div className="filters card">
        <div className="filters__header">
          <span className="filters__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h18M6 5v4M18 5v4M3 12h18M6 12v7M18 12v7" />
            </svg>
            Filtros
          </span>
          {hasFilters && (
            <button className="btn btn--ghost btn--small" onClick={clearFilters}>
              Limpiar
            </button>
          )}
        </div>

        <div className="filters__body">
          <div className="field field--daterange">
            <span className="field__label">Rango de fechas</span>
            <div className="daterange">
              <div className="daterange__input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                />
              </div>
              <span className="daterange__sep">—</span>
              <div className="daterange__input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                />
              </div>
            </div>
          </div>

          <label className="field">
            <span className="field__label">Categoría</span>
            <select
              className="input"
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
            >
              <option value="">Todas</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Estado</span>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="ready">Completos (listos)</option>
              <option value="needs_review">Requieren revisión</option>
              <option value="processing">Procesando</option>
              <option value="failed">Fallidos</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="loader">Cargando documentos…</div>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" />
              <path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
          </div>
          <h2 className="empty-state__title">No se encontraron documentos</h2>
          <p className="empty-state__text">
            {hasFilters
              ? 'Prueba a limpiar los filtros para ver todos los documentos, incluidos los que requieren revisión.'
              : 'Sube tu primer documento para empezar a gestionar tus gastos.'}
          </p>
          {hasFilters && (
            <button className="btn btn--ghost" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="doc-grid">
          {documents.map((document) => (
            <article key={document.id} className="doc-card">
              <div className="doc-card__top">
                <span
                  className={`badge badge--${
                    CATEGORY_COLORS[document.category ?? 'otros']
                  }`}
                >
                  {document.category
                    ? CATEGORY_LABELS[document.category]
                    : 'Sin categoría'}
                </span>
                {document.needsReview && (
                  <span className="badge badge--review">⚠ Revisar</span>
                )}
              </div>

              <h3 className="doc-card__provider">
                {document.provider || 'Proveedor sin detectar'}
              </h3>

              <div className="doc-card__meta">
                <div className="doc-card__meta-item">
                  <span className="doc-card__meta-label">Fecha</span>
                  <span>{formatDate(document.issueDate)}</span>
                </div>
                <div className="doc-card__meta-item">
                  <span className="doc-card__meta-label">Total</span>
                  <span className="doc-card__total">
                    {formatMoney(document.total, document.currency)}
                  </span>
                </div>
              </div>

              <div className="doc-card__footer">
                <span className={`status status--${document.status}`}>
                  {STATUS_LABELS[document.status] ?? document.status}
                </span>
                <div className="doc-card__actions">
                  <button
                    className="btn btn--small"
                    onClick={() => navigate(`/documents/${document.id}`)}
                  >
                    Revisar
                  </button>
                  <button
                    className="btn btn--small btn--danger-ghost"
                    onClick={() => setPendingDelete(document)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={pendingDelete !== null}
        title="Eliminar documento"
        onClose={() => setPendingDelete(null)}
      >
        <p className="modal__text">
          ¿Seguro que deseas eliminar{' '}
          <strong>{pendingDelete?.provider || pendingDelete?.originalName}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="modal__actions">
          <button
            className="btn btn--ghost"
            onClick={() => setPendingDelete(null)}
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
