import { useState, useRef, useCallback } from 'react';
import { getClusterRadius, setClusterRadius as persistClusterRadius } from '../db/appDatabase';
import { DEFAULT_CLUSTER_RADIUS, normalizeClusterRadius } from '../domain/map/MapClusteringSystem';

/**
 * Manages the map clustering radius state, race-free initial hydration from local IndexedDB,
 * and persistence whenever the user changes the radius.
 */
export function useClusterRadius() {
  const [clusterRadius, setClusterRadius] = useState(DEFAULT_CLUSTER_RADIUS);
  const clusterRadiusRef = useRef(DEFAULT_CLUSTER_RADIUS);
  const hasLoadedRef = useRef(false);
  const loadPromiseRef = useRef(null);

  const ensureLoadedRadius = useCallback(async () => {
    if (hasLoadedRef.current) {
      return clusterRadiusRef.current;
    }
    if (!loadPromiseRef.current) {
      loadPromiseRef.current = getClusterRadius()
        .then((stored) => {
          if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            const normalized = normalizeClusterRadius(stored);
            clusterRadiusRef.current = normalized;
            setClusterRadius(normalized);
          }
          return clusterRadiusRef.current;
        })
        .finally(() => {
          loadPromiseRef.current = null;
        });
    }
    return loadPromiseRef.current;
  }, []);

  const changeClusterRadius = useCallback((nextValue, onRadiusChange) => {
    const nextRadius = normalizeClusterRadius(nextValue);
    hasLoadedRef.current = true;

    if (nextRadius === clusterRadiusRef.current) {
      return false;
    }

    clusterRadiusRef.current = nextRadius;
    setClusterRadius(nextRadius);
    if (onRadiusChange) {
      onRadiusChange(nextRadius);
    }
    persistClusterRadius(nextRadius);
    return true;
  }, []);

  return {
    clusterRadius,
    clusterRadiusRef,
    ensureLoadedRadius,
    changeClusterRadius,
  };
}

export default useClusterRadius;
