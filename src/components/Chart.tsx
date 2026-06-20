import { lazy, Suspense } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';

const PlotChart = lazy(() => import('./PlotChart'));

export interface ChartProps {
  data: Data[];
  xTitle: string;
  yTitle: string;
  xRange?: [number, number];
  yRange?: [number, number];
  shapes?: Partial<Shape>[];
  annotations?: Partial<Annotations>[];
  showLegend?: boolean;
  /** Nombre de archivo al exportar PNG (botón de cámara del modebar) */
  exportName?: string;
}

/** Gráfica interactiva con estilo unificado (zoom, pan y hover tipo GeoGebra). */
export default function Chart(props: ChartProps) {
  return (
    <Suspense fallback={<div className="chart-loading">Cargando gráfica…</div>}>
      <PlotChart {...props} />
    </Suspense>
  );
}
