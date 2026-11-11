import { KDTree } from './KDTree';

/**
 * ClusterNode representing either a single leaf cluster or a merged hierarchical cluster.
 */
export class ClusterNode {
  constructor({
    id,
    lat,
    lon,
    count,
    zoom,
    pointId = null,
    childIds = null,
    thumbnailUrl = null,
    originalCluster = null,
  }) {
    this.id = id;
    this.lat = lat;
    this.lon = lon;
    this.count = count;
    this.zoom = zoom;
    this.pointId = pointId;
    this.childIds = childIds;
    this.thumbnailUrl = thumbnailUrl;
    this.originalCluster = originalCluster;
  }

  get isCluster() {
    return this.pointId == null || this.count > 1;
  }
}

export class BBox {
  constructor(minLon, minLat, maxLon, maxLat) {
    this.minLon = minLon;
    this.minLat = minLat;
    this.maxLon = maxLon;
    this.maxLat = maxLat;
  }
}

/**
 * Precomputed hierarchical clustering directly ported from PinPic Android (GeoClusterIndex.kt).
 *
 * Clusters are built hierarchically from maxZoom (21) down to minZoom (0) using normalized
 * Spherical Mercator coordinates and a 2D KD-Tree radius search.
 *
 * Querying at runtime is an O(log N) bounding-box search directly into the current zoom layer.
 */
export class GeoClusterIndex {
  constructor(layers, nodesById, minZoom, maxZoom, nextIdCounter) {
    this.layers = layers; // Map<zoom, { nodes: ClusterNode[], tree: KDTree }>
    this.nodesById = nodesById; // Map<id, ClusterNode>
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.nextIdCounter = nextIdCounter;
  }

  /**
   * Everything visible in bbox at zoom.
   */
  getClusters(bbox, zoom) {
    const z = Math.max(this.minZoom, Math.min(this.maxZoom, Math.floor(zoom)));
    const layer = this.layers.get(z);
    if (!layer) return [];

    const indices = layer.tree.rangeBBox(bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat);
    return indices.map((idx) => layer.nodes[idx]);
  }

  /**
   * Direct children of a cluster (one zoom level finer).
   */
  getChildren(clusterId) {
    const node = this.nodesById.get(clusterId);
    if (!node || !node.childIds) return [];
    return node.childIds.map((id) => this.nodesById.get(id)).filter(Boolean);
  }

  /**
   * Fully expands a cluster down to all leaf clusters/points.
   */
  getLeaves(clusterId) {
    const result = [];
    const expand = (id) => {
      const node = this.nodesById.get(id);
      if (!node) return;
      if (!node.childIds || node.childIds.length === 0) {
        result.push(node);
      } else {
        node.childIds.forEach((childId) => expand(childId));
      }
    };
    expand(clusterId);
    return result;
  }

  /**
   * Inserts a new cluster point incrementally into all zoom layers using KDTree.insert.
   */
  addPoint(point) {
    const id = this.nextIdCounter++;
    const count =
      point.photoCount > 0 ? point.photoCount : point.photos?.length > 0 ? point.photos.length : 1;

    const lat = point.location?.latitude ?? point.lat ?? 0;
    const lon = point.location?.longitude ?? point.lon ?? point.lng ?? 0;
    const thumb =
      point.thumbnail?.photoUrl ||
      point.thumbnailUrl ||
      point.photos?.[0]?.downloadUrl ||
      point.photos?.[0]?.url ||
      null;

    const leaf = new ClusterNode({
      id,
      lat,
      lon,
      count,
      zoom: this.maxZoom + 1,
      pointId: String(point.localClusterId || point.clusterId || id),
      childIds: null,
      thumbnailUrl: thumb,
      originalCluster: point,
    });

    this.nodesById.set(id, leaf);

    for (let z = this.minZoom; z <= this.maxZoom; z++) {
      const layer = this.layers.get(z);
      if (!layer) continue;
      const newIndex = layer.nodes.length;
      layer.nodes.push(leaf);
      layer.tree.insert(newIndex, lon, lat);
    }
  }

  // --- Spherical Mercator projections matching standard tile scheme ---
  static lngX(lng) {
    return lng / 360.0 + 0.5;
  }

  static latY(lat) {
    const sin = Math.sin((lat * Math.PI) / 180.0);
    const clampedSin = Math.max(-0.9999, Math.min(0.9999, sin));
    const y = 0.5 - (0.25 * Math.log((1 + clampedSin) / (1 - clampedSin))) / Math.PI;
    return Math.max(0.0, Math.min(1.0, y));
  }

  static xLng(x) {
    return (x - 0.5) * 360.0;
  }

  static yLat(y) {
    const y2 = ((180 - y * 360) * Math.PI) / 180;
    return (360.0 * Math.atan(Math.exp(y2))) / Math.PI - 90.0;
  }

  /**
   * Builds the precomputed multi-layer index from cluster points.
   *
   * @param {Array} points Array of cluster objects from backend/local state
   * @param {number} minZoom default 0
   * @param {number} maxZoom default 21
   * @param {number} radiusPixels cluster radius in screen pixels (default 40.0, matches Android)
   * @param {number} extent tile size in pixels (default 512)
   */
  static build(points = [], minZoom = 0, maxZoom = 21, radiusPixels = 40.0, extent = 512) {
    let nextIdCounter = 1;
    const nextId = () => nextIdCounter++;

    let current = points
      .map((p) => {
        const lat = p.location?.latitude ?? p.lat;
        const lon = p.location?.longitude ?? p.lon ?? p.lng;
        if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null;

        const count =
          p.photoCount > 0 ? p.photoCount : p.photos?.length > 0 ? p.photos.length : 1;
        const thumb =
          p.thumbnail?.photoUrl ||
          p.thumbnailUrl ||
          p.photos?.[0]?.downloadUrl ||
          p.photos?.[0]?.url ||
          null;

        return {
          id: nextId(),
          x: GeoClusterIndex.lngX(lon),
          y: GeoClusterIndex.latY(lat),
          count,
          pointId: String(p.localClusterId || p.clusterId || p.globalClusterId || Math.random()),
          childIds: null,
          zoom: maxZoom + 1,
          thumbnailUrl: thumb,
          originalCluster: p,
        };
      })
      .filter(Boolean);

    const layers = new Map();
    const nodesById = new Map();

    // Seed nodesById with leaves
    current.forEach((w) => {
      nodesById.set(
        w.id,
        new ClusterNode({
          id: w.id,
          lat: GeoClusterIndex.yLat(w.y),
          lon: GeoClusterIndex.xLng(w.x),
          count: w.count,
          zoom: w.zoom,
          pointId: w.pointId,
          childIds: w.childIds,
          thumbnailUrl: w.thumbnailUrl,
          originalCluster: w.originalCluster,
        })
      );
    });

    // Hierarchically cluster from maxZoom down to minZoom
    for (let z = maxZoom; z >= minZoom; z--) {
      const xs = new Float64Array(current.length);
      const ys = new Float64Array(current.length);
      for (let i = 0; i < current.length; i++) {
        xs[i] = current[i].x;
        ys[i] = current[i].y;
      }

      const tree = KDTree.build(xs, ys);
      const visited = new Uint8Array(current.length);
      const radius = radiusPixels / (extent * Math.pow(2.0, z));

      const next = [];

      for (let i = 0; i < current.length; i++) {
        if (visited[i]) continue;

        const neighborIndices = tree.rangeRadius(current[i].x, current[i].y, radius);
        const unvisitedNeighbors = neighborIndices.filter((idx) => !visited[idx]);
        unvisitedNeighbors.forEach((idx) => (visited[idx] = 1));

        if (unvisitedNeighbors.length === 1) {
          // No merge at this zoom — carry node forward
          next.push(current[i]);
        } else {
          // Merge neighbors into weighted centroid cluster
          let sumX = 0.0;
          let sumY = 0.0;
          let sumCount = 0;
          let bestThumb = null;

          for (const idx of unvisitedNeighbors) {
            const n = current[idx];
            sumX += n.x * n.count;
            sumY += n.y * n.count;
            sumCount += n.count;
            if (!bestThumb && n.thumbnailUrl) {
              bestThumb = n.thumbnailUrl;
            }
          }

          const cx = sumX / sumCount;
          const cy = sumY / sumCount;
          const mergedId = nextId();
          const childIds = unvisitedNeighbors.map((idx) => current[idx].id);

          const merged = {
            id: mergedId,
            x: cx,
            y: cy,
            count: sumCount,
            pointId: null,
            childIds,
            zoom: z,
            thumbnailUrl: bestThumb,
            originalCluster: null,
          };

          next.push(merged);
          nodesById.set(
            mergedId,
            new ClusterNode({
              id: mergedId,
              lat: GeoClusterIndex.yLat(cy),
              lon: GeoClusterIndex.xLng(cx),
              count: sumCount,
              zoom: z,
              pointId: null,
              childIds,
              thumbnailUrl: bestThumb,
              originalCluster: null,
            })
          );
        }
      }

      // Store layer indexed by (lon, lat)
      const layerNodes = next.map((w) => {
        return (
          nodesById.get(w.id) ||
          new ClusterNode({
            id: w.id,
            lat: GeoClusterIndex.yLat(w.y),
            lon: GeoClusterIndex.xLng(w.x),
            count: w.count,
            zoom: w.zoom,
            pointId: w.pointId,
            childIds: w.childIds,
            thumbnailUrl: w.thumbnailUrl,
            originalCluster: w.originalCluster,
          })
        );
      });

      const lonArr = new Float64Array(layerNodes.length);
      const latArr = new Float64Array(layerNodes.length);
      for (let i = 0; i < layerNodes.length; i++) {
        lonArr[i] = layerNodes[i].lon;
        latArr[i] = layerNodes[i].lat;
      }

      layers.set(z, {
        nodes: layerNodes,
        tree: KDTree.build(lonArr, latArr),
      });

      current = next;
    }

    return new GeoClusterIndex(layers, nodesById, minZoom, maxZoom, nextIdCounter);
  }
}

export default GeoClusterIndex;

