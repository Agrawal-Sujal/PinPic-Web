import Dexie from 'dexie';
import { DEFAULT_CLUSTER_RADIUS, normalizeClusterRadius } from '../domain/map/MapClusteringSystem';

export const db = new Dexie('PinPicDatabase');

db.version(1).stores({
  photos: '++localPhotoId, globalPhotoId, clusterId, userId, visibility, takenAt',
  clusters: '++localClusterId, globalClusterId, visibility',
  syncOperations: 'operationId, entityType, entityId, operation, status, createdAt',
  syncMetadata: 'key',
});

db.version(2).stores({
  photos: '++localPhotoId, globalPhotoId, clusterId, userId, visibility, takenAt, isDeleted',
  clusters: '++localClusterId, globalClusterId, visibility, isDeleted',
});

db.version(3).stores({
  photos: '++localPhotoId, globalPhotoId, clusterId, globalClusterId, userId, visibility, takenAt, isDeleted',
  clusters: '++localClusterId, globalClusterId, visibility, isDeleted',
});

db.version(4).stores({
  settings: 'key',
});

export const CLUSTER_RADIUS_SETTING_KEY = 'clusterRadius';

/**
 * Metadata helpers
 */
export const getSyncMetadata = async (key, defaultValue = null) => {
  try {
    const record = await db.syncMetadata.get(key);
    return record ? record.value : defaultValue;
  } catch (err) {
    console.error(`Error reading sync metadata [${key}]:`, err);
    return defaultValue;
  }
};

export const setSyncMetadata = async (key, value) => {
  try {
    await db.syncMetadata.put({ key, value });
  } catch (err) {
    console.error(`Error writing sync metadata [${key}]:`, err);
  }
};

/**
 * Local application settings helpers
 */
export const getSetting = async (key, defaultValue = null) => {
  try {
    const record = await db.settings.get(key);
    return record ? record.value : defaultValue;
  } catch (err) {
    console.error(`Error reading setting [${key}]:`, err);
    return defaultValue;
  }
};

export const setSetting = async (key, value) => {
  try {
    await db.settings.put({ key, value });
  } catch (err) {
    console.error(`Error writing setting [${key}]:`, err);
  }
};

export const getClusterRadius = async () => {
  const saved = await getSetting(CLUSTER_RADIUS_SETTING_KEY, DEFAULT_CLUSTER_RADIUS);
  return normalizeClusterRadius(saved);
};

export const setClusterRadius = async (radius) => {
  const normalized = normalizeClusterRadius(radius);
  await setSetting(CLUSTER_RADIUS_SETTING_KEY, normalized);
  return normalized;
};

/**
 * Clears all user-specific data from local database (used on logout)
 */
export const clearLocalDatabase = async () => {
  try {
    if (!db.isOpen()) {
      await db.open().catch(() => {});
    }

    const tableList =
      db.tables?.length > 0
        ? db.tables
        : [db.photos, db.clusters, db.syncOperations, db.syncMetadata, db.settings].filter(Boolean);

    await Promise.all(
      tableList.map(async (table) => {
        try {
          await table.clear();
        } catch (err) {
          console.warn(`Failed to clear table ${table?.name}:`, err);
        }
      })
    );
    console.log('Local PinPic database cleared.');
  } catch (err) {
    console.error('Failed to clear local database:', err);
  }
};

export default db;
