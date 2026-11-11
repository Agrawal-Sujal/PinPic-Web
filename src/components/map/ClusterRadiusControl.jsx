import React, { useState } from 'react';
import { SlidersHorizontal, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  CLUSTER_RADIUS_POINTS,
  CLUSTER_RADIUS_STEP,
  DEFAULT_CLUSTER_RADIUS,
  MAX_CLUSTER_RADIUS,
  MIN_CLUSTER_RADIUS,
} from '../../domain/map/MapClusteringSystem';

/**
 * Floating map control allowing the user to adjust clustering radius across 7 discrete stops.
 */
export const ClusterRadiusControl = ({ radius = DEFAULT_CLUSTER_RADIUS, onChange, disabled = false }) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const progressPct =
    ((radius - MIN_CLUSTER_RADIUS) / (MAX_CLUSTER_RADIUS - MIN_CLUSTER_RADIUS)) * 100;
  const trackEmptyColor = isDark ? '#4A4136' : '#e5e7eb';
  const trackBg = `linear-gradient(to right, #f56a41 0%, #f56a41 ${progressPct}%, ${trackEmptyColor} ${progressPct}%, ${trackEmptyColor} 100%)`;

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        aria-label="Expand cluster radius slider"
        className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md bg-pinpic-surface-light/90 dark:bg-pinpic-surface-container-dark/90 border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-md hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-pinpic-coral" />
        <span className="text-[11px] font-bold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
          Radius:{' '}
          <span className="text-pinpic-coral tabular-nums">{radius}px</span>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark" />
      </button>
    );
  }

  return (
    <div
      onPointerDown={stopPropagation}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      className="pointer-events-auto w-64 max-w-[calc(100vw-5.5rem)] rounded-2xl backdrop-blur-md bg-pinpic-surface-light/90 dark:bg-pinpic-surface-container-dark/90 border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-md px-3.5 py-2.5 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-pinpic-coral shrink-0" />
          <span className="text-[11px] font-bold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
            Cluster Radius
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-extrabold text-pinpic-coral tabular-nums bg-pinpic-coral/10 px-2 py-0.5 rounded-full">
            {radius}px
          </span>
          {radius !== DEFAULT_CLUSTER_RADIUS && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(DEFAULT_CLUSTER_RADIUS)}
              title={`Reset to default (${DEFAULT_CLUSTER_RADIUS}px)`}
              aria-label={`Reset cluster radius to ${DEFAULT_CLUSTER_RADIUS}px`}
              className="p-1 rounded-full text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:text-pinpic-coral hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            title="Minimize cluster radius control"
            aria-label="Minimize cluster radius control"
            className="p-1 rounded-full text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sliding bar restricted to 7 discrete stops */}
      <input
        type="range"
        min={MIN_CLUSTER_RADIUS}
        max={MAX_CLUSTER_RADIUS}
        step={CLUSTER_RADIUS_STEP}
        value={radius}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Cluster radius"
        aria-valuemin={MIN_CLUSTER_RADIUS}
        aria-valuemax={MAX_CLUSTER_RADIUS}
        aria-valuenow={radius}
        className="pinpic-range-slider w-full block disabled:opacity-50"
        style={{ background: trackBg }}
      />

      {/* 7 selectable stop indicators aligned to slider thumb centers */}
      <div className="flex items-start justify-between mt-1.5">
        {CLUSTER_RADIUS_POINTS.map((point) => {
          const isActive = point === radius;
          const isPassed = point < radius;
          return (
            <button
              key={point}
              type="button"
              disabled={disabled}
              onClick={() => onChange(point)}
              aria-label={`Set cluster radius to ${point}px`}
              className="w-4 flex flex-col items-center gap-0.5 cursor-pointer group focus:outline-none disabled:cursor-not-allowed"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-pinpic-coral scale-125'
                    : isPassed
                    ? 'bg-pinpic-coral/60'
                    : 'bg-pinpic-border-light dark:bg-pinpic-outline-dark group-hover:bg-pinpic-coral/50'
                }`}
              />
              <span
                className={`text-[9px] leading-none tabular-nums transition-colors ${
                  isActive
                    ? 'font-extrabold text-pinpic-coral'
                    : 'font-medium text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark group-hover:text-pinpic-text-primary-light dark:group-hover:text-pinpic-text-primary-dark'
                }`}
              >
                {point}
              </span>
            </button>
          );
        })}
      </div>

      {/* Min / Default / Max limits footer */}
      <div className="flex items-center justify-between text-[9px] font-medium text-pinpic-text-secondary-light/80 dark:text-pinpic-text-secondary-dark/80 mt-1.5 pt-1 border-t border-pinpic-border-light/60 dark:border-pinpic-outline-dark/60">
        <span>Min {MIN_CLUSTER_RADIUS}</span>
        <span>Default {DEFAULT_CLUSTER_RADIUS}</span>
        <span>Max {MAX_CLUSTER_RADIUS}</span>
      </div>
    </div>
  );
};

export default ClusterRadiusControl;
