import type { CSSProperties } from 'react';

/**
 * Shared constants for all recharts-based dashboard components.
 * Single source of truth — avoids duplicating colors, tooltip styles, etc.
 */

// ─── Status Colors ─────────────────────────────────────────────────────────────

export const STATUS_COLORS = {
  present: '#10b981',
  late: '#f59e0b',
  absent: '#ef4444',
  onLeave: '#8b5cf6',
  restDay: '#94a3b8',
  holiday: '#3b82f6',
} as const;

// ─── Recharts Shared Props ─────────────────────────────────────────────────────

export const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  fontSize: '13px',
  backdropFilter: 'blur(8px)',
};

export const LEGEND_PROPS = {
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: { fontSize: '13px', paddingTop: '12px' },
};

export const CHART_HEIGHT = 300;

// ─── Shared Axis Props ─────────────────────────────────────────────────────────

export const AXIS_PROPS = {
  className: 'text-xs',
  axisLine: false,
  tickLine: false,
} as const;

// ─── Grid Props ────────────────────────────────────────────────────────────────

export const GRID_PROPS = {
  strokeDasharray: '3 3',
  className: 'stroke-muted/50',
  vertical: false,
} as const;
