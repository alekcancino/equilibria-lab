interface PlotToolbarProps {
  onResetZoom: () => void;
  onExport: () => void;
  onExportCSV?: () => void;
}

/** Floating chart controls (GeoGebra-style). */
export default function PlotToolbar({ onResetZoom, onExport, onExportCSV }: PlotToolbarProps) {
  return (
    <div className="plot-toolbar" role="toolbar" aria-label="Controles de gráfica">
      <button
        type="button"
        className="plot-toolbar-btn"
        onClick={onResetZoom}
        title="Restablecer zoom (doble clic en la gráfica)"
        aria-label="Restablecer zoom"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 12a9 9 0 1 0 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        className="plot-toolbar-btn"
        onClick={onExport}
        title="Exportar PNG"
        aria-label="Exportar PNG"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3v12M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {onExportCSV && (
        <button
          type="button"
          className="plot-toolbar-btn"
          onClick={onExportCSV}
          title="Exportar datos CSV"
          aria-label="Exportar datos CSV"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M3 9h18M3 15h18M9 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
      <span className="plot-toolbar-hint" title="Pinch o scroll para zoom">
        ⓘ
      </span>
    </div>
  );
}
