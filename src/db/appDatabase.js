import Dexie from 'dexie';

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
 * Clears all user-specific data from local database (used on logout)
 */
export const clearLocalDatabase = async () => {
  try {
    await db.transaction('rw', [db.photos, db.clusters, db.syncOperations, db.syncMetadata], async () => {
      await db.photos.clear();
      await db.clusters.clear();
      await db.syncOperations.clear();
      await db.syncMetadata.clear();
    });
    console.log('Local PinPic database cleared.');
  } catch (err) {
    console.error('Failed to clear local database:', err);
  }
};

export default db;
