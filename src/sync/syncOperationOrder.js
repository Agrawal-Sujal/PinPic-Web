/**
 * Priority and dependency ordering helpers for pending offline sync operations.
 * Ensures parent clusters sync before dependent photos and photos delete before parent clusters.
 */

function getOperationRank(op) {
  const entityType = op?.entityType?.toUpperCase();
  const operation = op?.operation?.toUpperCase();

  if (entityType === 'CLUSTER' && (operation === 'ADD' || operation === 'UPDATE')) return 0;
  if (entityType === 'PHOTOS' && (operation === 'ADD' || operation === 'UPDATE')) return 1;
  if (entityType === 'PHOTOS' && operation === 'DELETE') return 2;
  if (entityType === 'CLUSTER' && operation === 'DELETE') return 3;
  return 4;
}

/**
 * Compares two pending sync operations deterministically by creation time and dependency rank.
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
export function compareSyncOperations(a, b) {
  const timeA = Number(a?.createdAt) || 0;
  const timeB = Number(b?.createdAt) || 0;
  if (timeA !== timeB) {
    return timeA - timeB;
  }

  const rankDiff = getOperationRank(a) - getOperationRank(b);
  if (rankDiff !== 0) {
    return rankDiff;
  }

  const idA = Number(a?.entityId);
  const idB = Number(b?.entityId);
  if (!Number.isNaN(idA) && !Number.isNaN(idB) && idA !== idB) {
    return idA - idB;
  }

  return String(a?.operationId || '').localeCompare(String(b?.operationId || ''));
}

/**
 * Returns a new array of pending sync operations ordered chronologically and by entity dependency rank.
 * @param {Array<object>} pendingOps
 * @returns {Array<object>}
 */
export function sortPendingOperations(pendingOps) {
  if (!Array.isArray(pendingOps) || pendingOps.length === 0) return [];
  return [...pendingOps].sort(compareSyncOperations);
}

/**
 * Selects the next pending operation to execute, resolving cluster-photo dependencies even when
 * operation timestamps are slightly out of order.
 * @param {Array<object>} pendingOps
 * @param {{ getPhoto: (localPhotoId: number) => Promise<object|undefined>, getCluster: (localClusterId: number) => Promise<object|undefined> }} store
 * @returns {Promise<object|null>}
 */
export async function selectNextPendingOperation(pendingOps, { getPhoto, getCluster }) {
  const sorted = sortPendingOperations(pendingOps);
  if (sorted.length === 0) return null;

  const candidate = sorted[0];
  const entityType = candidate.entityType?.toUpperCase();
  const operation = candidate.operation?.toUpperCase();

  if (entityType === 'PHOTOS' && (operation === 'ADD' || operation === 'UPDATE')) {
    const photo = await getPhoto(Number(candidate.entityId));
    if (photo && !photo.isDeleted && photo.clusterId != null) {
      const targetClusterId = Number(photo.clusterId);
      const cluster = await getCluster(targetClusterId);
      const pendingClusterOp = sorted.find(
        (op) =>
          op.entityType?.toUpperCase() === 'CLUSTER' &&
          Number(op.entityId) === targetClusterId &&
          (op.operation?.toUpperCase() === 'ADD' || op.operation?.toUpperCase() === 'UPDATE')
      );

      if (pendingClusterOp && (!cluster?.globalClusterId || pendingClusterOp.operation?.toUpperCase() === 'ADD')) {
        return pendingClusterOp;
      }
    }
  } else if (entityType === 'CLUSTER' && operation === 'DELETE') {
    const targetClusterId = Number(candidate.entityId);
    for (const op of sorted) {
      if (op.entityType?.toUpperCase() !== 'PHOTOS') continue;
      const photo = await getPhoto(Number(op.entityId));
      if (photo && Number(photo.clusterId) === targetClusterId) {
        return op;
      }
    }
  }

  return candidate;
}
