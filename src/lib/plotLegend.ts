export interface LegendPlan {
  orientation: 'h' | 'v';
  columns: number;
  rows: number;
  position: { x: number; y: number; xanchor: 'left' | 'center' | 'right'; yanchor: 'top' | 'middle' | 'bottom' };
  entrywidth?: number;
  margin: { r: number; t: number; b: number };
}

export interface LegendPlanInput {
  entryCount: number;
  longestLabelChars: number;
  viewportWidth: number;
  mobile: boolean;
}

const LONG_LABEL_THRESHOLD = 14;
const DESKTOP_VERTICAL_THRESHOLD = 4;

/** Estimate right margin (px) for a vertical legend from the longest label. */
export function verticalLegendRightMargin(longestLabelChars: number, fontSize = 13): number {
  return Math.min(220, Math.max(72, Math.ceil(longestLabelChars * fontSize * 0.58) + 24));
}

export function legendPlan(input: LegendPlanInput): LegendPlan {
  const { entryCount, longestLabelChars, viewportWidth, mobile } = input;
  if (entryCount <= 1) {
    return {
      orientation: 'h',
      columns: 1,
      rows: 0,
      position: { x: 0, y: -0.2, xanchor: 'left', yanchor: 'top' },
      margin: { r: mobile ? 14 : 18, t: mobile ? 10 : 14, b: 50 },
    };
  }

  if (mobile) {
    const columns = viewportWidth < 340 && longestLabelChars > LONG_LABEL_THRESHOLD ? 1 : 2;
    const rows = Math.ceil(entryCount / columns);
    return {
      orientation: 'h',
      columns,
      rows,
      position: { x: 0, y: 1.07, xanchor: 'left', yanchor: 'bottom' },
      entrywidth: 1 / columns,
      margin: { r: 14, t: 28 + rows * 20, b: 48 },
    };
  }

  const useVertical = entryCount > DESKTOP_VERTICAL_THRESHOLD
    || longestLabelChars > LONG_LABEL_THRESHOLD;
  if (useVertical) {
    const right = verticalLegendRightMargin(longestLabelChars);
    return {
      orientation: 'v',
      columns: 1,
      rows: entryCount,
      position: { x: 1.02, y: 1, xanchor: 'left', yanchor: 'top' },
      margin: { r: right, t: 14, b: 50 },
    };
  }

  return {
    orientation: 'h',
    columns: entryCount,
    rows: 1,
    position: { x: 0, y: -0.2, xanchor: 'left', yanchor: 'top' },
    margin: { r: 18, t: 14, b: 56 },
  };
}
