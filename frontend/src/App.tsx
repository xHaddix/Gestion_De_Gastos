import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReviewPage } from './pages/ReviewPage';
import { UploadPage } from './pages/UploadPage';

export function App() {
  const [collapsed, setCollapsed] = useState(
    () => window.matchMedia('(max-width: 768px)').matches,
  );

  const closeOnMobile = () => {
    if (window.innerWidth <= 768) {
      setCollapsed(true);
    }
  };

  return (
    <div className="app">
      <Sidebar collapsed={collapsed} onNavigate={closeOnMobile} />

      <div
        className={`overlay ${collapsed ? 'overlay--hidden' : ''}`}
        onClick={closeOnMobile}
        aria-hidden
      />

      <div className={`main ${collapsed ? 'main--expanded' : ''}`}>
        <header className="topbar">
          <button
            className="hamburger"
            onClick={() => setCollapsed((value) => !value)}
            aria-label="Abrir menú"
          >
            <span />
            <span />
            <span />
          </button>
          <h1 className="topbar__title">Gestión de Gastos</h1>
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<DocumentsPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/documents/:id" element={<ReviewPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
