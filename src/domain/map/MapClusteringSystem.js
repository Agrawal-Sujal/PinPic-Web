import { GeoClusterIndex } from './GeoClusterIndex';

export const DEFAULT_CLUSTER_RADIUS = 40;
export const CLUSTER_RADIUS_POINTS = [10, 25, 40, 55, 70, 85, 100];
export const MIN_CLUSTER_RADIUS = CLUSTER_RADIUS_POINTS[0];
export const MAX_CLUSTER_RADIUS = CLUSTER_RADIUS_POINTS[CLUSTER_RADIUS_POINTS.length - 1];
export const CLUSTER_RADIUS_STEP = 15;

/**
 * Snaps an arbitrary numeric value to the closest allowed point among the 7 discrete radius stops.
 */
export const normalizeClusterRadius = (value) => {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_CLUSTER_RADIUS;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_CLUSTER_RADIUS;

  let closest = CLUSTER_RADIUS_POINTS[0];
  let bestDiff = Math.abs(num - closest);
  for (let i = 1; i < CLUSTER_RADIUS_POINTS.length; i++) {
    const diff = Math.abs(num - CLUSTER_RADIUS_POINTS[i]);
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = CLUSTER_RADIUS_POINTS[i];
    }
  }
  return closest;
};

/**
 * Extracts valid [latitude, longitude] coordinate pairs from cluster objects for fitting map bounds.
 */
export const extractClusterCoordinates = (clusters = []) => {
  return (clusters || [])
    .map((c) => {
      const lat = c?.location?.latitude ?? c?.lat;
      const lon = c?.location?.longitude ?? c?.lon ?? c?.lng;
      if (lat == null || lon == null) return null;
      const numLat = Number(lat);
      const numLon = Number(lon);
      if (!Number.isFinite(numLat) || !Number.isFinite(numLon)) return null;
      return [numLat, numLon];
    })
    .filter(Boolean);
};

let boundsFitCounter = 0;

/**
 * Builds an overview bounds-fit descriptor covering all cluster coordinates without over-zooming.
 */
export const createOverviewBoundsFit = (clusters = []) => {
  const points = extractClusterCoordinates(clusters);
  if (points.length === 0) return null;
  boundsFitCounter += 1;
  return {
    points,
    maxZoom: 8,
    singlePointZoom: 5,
    animate: false,
    key: boundsFitCounter,
  };
};

/**
 * System coordinating clustering index operations matching PinPic Android (MapClusteringSystem.kt).
 */
export class MapClusteringSystem {
  constructor() {
    this.index = null;
    this.rawClusters = [];
    this.radiusPixels = DEFAULT_CLUSTER_RADIUS;
  }

  build(clusters, radiusPixels = this.radiusPixels) {
    this.rawClusters = clusters || [];
    const parsed =
      radiusPixels === null || radiusPixels === undefined || radiusPixels === ''
        ? NaN
        : Number(radiusPixels);
    this.radiusPixels = Number.isFinite(parsed) ? parsed : DEFAULT_CLUSTER_RADIUS;
    this.index = GeoClusterIndex.build(
      this.rawClusters,
      0,   // minZoom
      21,  // maxZoom
      this.radiusPixels,
      512  // extent
    );
    return this.index;
  }

  rebuild(radiusPixels = this.radiusPixels) {
    return this.build(this.rawClusters, radiusPixels);
  }

  addClusters(newClusters) {
    if (!newClusters || newClusters.length === 0) return;
    this.rawClusters = [...this.rawClusters, ...newClusters];
    this.rebuild();
  }

  getClusters(bbox, zoom) {
    if (!this.index) return [];
    return this.index.getClusters(bbox, zoom);
  }

  getLeaves(clusterId) {
    if (!this.index) return [];
    return this.index.getLeaves(clusterId);
  }

  getChildren(clusterId) {
    if (!this.index) return [];
    return this.index.getChildren(clusterId);
  }
}

export default MapClusteringSystem;

