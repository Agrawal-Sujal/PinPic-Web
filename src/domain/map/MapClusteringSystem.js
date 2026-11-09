import { GeoClusterIndex, BBox } from './GeoClusterIndex';

/**
 * System coordinating clustering index operations matching PinPic Android (MapClusteringSystem.kt).
 */
export class MapClusteringSystem {
  constructor() {
    this.index = null;
    this.rawClusters = [];
  }

  build(clusters, radiusPixels = 40.0) {
    this.rawClusters = clusters || [];
    this.index = GeoClusterIndex.build(
      this.rawClusters,
      0,   // minZoom
      21,  // maxZoom
      radiusPixels,
      512  // extent
    );
    return this.index;
  }

  rebuild() {
    return this.build(this.rawClusters);
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

