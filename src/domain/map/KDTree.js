/**
 * 2D KD-Tree implementation directly ported from PinPic Android (KDTree.kt).
 * Over parallel coordinate arrays (xs, ys) storing original indices.
 *
 * Used for:
 * 1. Spherical Mercator radius clustering during GeoClusterIndex construction.
 * 2. Rapid O(log N) bounding-box queries (minLon, minLat, maxLon, maxLat) on camera-idle events.
 */
class KDNode {
  constructor(index, x, y, left = null, right = null) {
    this.index = index;
    this.x = x;
    this.y = y;
    this.left = left;
    this.right = right;
  }
}

export class KDTree {
  constructor(root = null) {
    this.root = root;
  }

  /**
   * Closed bounding-box search: all indices whose (x, y) falls inside [minX, maxX] x [minY, maxY].
   */
  rangeBBox(minX, minY, maxX, maxY) {
    const result = [];

    const search = (node, depth) => {
      if (!node) return;

      if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
        result.push(node.index);
      }

      const axisIsX = depth % 2 === 0;
      const nodeAxis = axisIsX ? node.x : node.y;
      const minAxis = axisIsX ? minX : minY;
      const maxAxis = axisIsX ? maxX : maxY;

      if (minAxis <= nodeAxis) search(node.left, depth + 1);
      if (maxAxis >= nodeAxis) search(node.right, depth + 1);
    };

    search(this.root, 0);
    return result;
  }

  /**
   * Euclidean radius search: all indices within radius of (qx, qy).
   */
  rangeRadius(qx, qy, radius) {
    const r2 = radius * radius;
    const result = [];

    const search = (node, depth) => {
      if (!node) return;

      const dx = node.x - qx;
      const dy = node.y - qy;
      if (dx * dx + dy * dy <= r2) {
        result.push(node.index);
      }

      const axisIsX = depth % 2 === 0;
      const nodeAxis = axisIsX ? node.x : node.y;
      const queryAxis = axisIsX ? qx : qy;
      const axisDiff = nodeAxis - queryAxis;

      if (queryAxis < nodeAxis) {
        search(node.left, depth + 1);
        if (axisDiff * axisDiff <= r2) search(node.right, depth + 1);
      } else {
        search(node.right, depth + 1);
        if (axisDiff * axisDiff <= r2) search(node.left, depth + 1);
      }
    };

    search(this.root, 0);
    return result;
  }

  /**
   * Dynamic O(depth) insertion of a new point without rebuilding the whole tree.
   */
  insert(index, x, y) {
    const newNode = new KDNode(index, x, y);
    if (!this.root) {
      this.root = newNode;
      return;
    }

    let node = this.root;
    let depth = 0;

    while (true) {
      const axisIsX = depth % 2 === 0;
      const goLeft = axisIsX ? x <= node.x : y <= node.y;

      if (goLeft) {
        if (!node.left) {
          node.left = newNode;
          return;
        }
        node = node.left;
      } else {
        if (!node.right) {
          node.right = newNode;
          return;
        }
        node = node.right;
      }
      depth++;
    }
  }

  /**
   * Builds a balanced 2D KD-Tree via recursive median split.
   */
  static build(xs, ys) {
    const indices = Array.from({ length: xs.length }, (_, i) => i);

    const buildNode = (idxList, depth) => {
      if (!idxList || idxList.length === 0) return null;

      const axisIsX = depth % 2 === 0;
      idxList.sort((a, b) => (axisIsX ? xs[a] - xs[b] : ys[a] - ys[b]));

      const mid = Math.floor(idxList.length / 2);
      const medianIdx = idxList[mid];

      return new KDNode(
        medianIdx,
        xs[medianIdx],
        ys[medianIdx],
        buildNode(idxList.slice(0, mid), depth + 1),
        buildNode(idxList.slice(mid + 1), depth + 1)
      );
    };

    return new KDTree(buildNode(indices, 0));
  }
}

export default KDTree;

