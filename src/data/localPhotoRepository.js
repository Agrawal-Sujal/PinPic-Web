import db from '../db/appDatabase';
import syncScheduler from '../sync/syncScheduler';

// Custom event target for notifying UI when local data changes
const eventTarget = new EventTarget();
const REPOSITORY_CHANGE_EVENT = 'pinpic_repo_changed';

export const notifyRepositoryChanged = () => {
  eventTarget.dispatchEvent(new Event(REPOSITORY_CHANGE_EVENT));
};

/**
 * Helper to resolve photo display URL:
 * Prefers downloadUrl (from cloud) -> fileBlob ObjectURL -> previewUrl
 */
export const resolvePhotoUrl = (photo) => {
  if (!photo) return null;
  if (photo.downloadUrl) return photo.downloadUrl;
  if (photo.fileBlob) {
    if (!photo._createdBlobUrl) {
      photo._createdBlobUrl = URL.createObjectURL(photo.fileBlob);
    }
    return photo._createdBlobUrl;
  }
  return photo.previewUrl || null;
};

export const localPhotoRepository = {
  /**
   * Subscribe to database changes (emitted after local mutations or background sync updates)
   */
  subscribe: (callback) => {
    const handler = () => callback();
    eventTarget.addEventListener(REPOSITORY_CHANGE_EVENT, handler);
    return () => eventTarget.removeEventListener(REPOSITORY_CHANGE_EVENT, handler);
  },

  /**
   * Retrieve all photos for current user, sorted newest first
   */
  getAllPhotos: async (userId = null) => {
    let photos = await db.photos.toArray();
    photos = photos.filter((p) => !p.isDeleted);
    if (userId) {
      photos = photos.filter((p) => p.userId === userId);
    }
    photos.sort((a, b) => new Date(b.takenAt || 0) - new Date(a.takenAt || 0));
    return photos.map((p) => ({
      ...p,
      photoId: p.globalPhotoId || String(p.localPhotoId),
      photoUrl: resolvePhotoUrl(p),
      downloadUrl: resolvePhotoUrl(p),
    }));
  },

  /**
   * Retrieve a single photo by localPhotoId
   */
  getPhotoById: async (localPhotoId) => {
    const photo = await db.photos.get(Number(localPhotoId));
    if (!photo || photo.isDeleted) return null;
    return {
      ...photo,
      photoId: photo.globalPhotoId || String(photo.localPhotoId),
      photoUrl: resolvePhotoUrl(photo),
      downloadUrl: resolvePhotoUrl(photo),
    };
  },

  /**
   * Retrieve all photos belonging to a specific cluster
   */
  getPhotosOfCluster: async (clusterId) => {
    const all = await db.photos.where('clusterId').equals(Number(clusterId)).toArray();
    const photos = all.filter((p) => !p.isDeleted);
    return photos.map((p) => ({
      ...p,
      photoId: p.globalPhotoId || String(p.localPhotoId),
      photoUrl: resolvePhotoUrl(p),
      downloadUrl: resolvePhotoUrl(p),
    }));
  },

  /**
   * Retrieve clusters with thumbnail photo resolved, matching Android getUnMergedCluster()
   */
  getUnMergedClusters: async () => {
    const allClusters = await db.clusters.toArray();
    const clusters = allClusters.filter((c) => !c.isDeleted);
    if (clusters.length === 0) return [];

    const activeClusters = await Promise.all(
      clusters.map(async (c) => {
        const allClusterPhotos = await db.photos.where('clusterId').equals(c.localClusterId).toArray();
        const clusterPhotos = allClusterPhotos.filter((p) => !p.isDeleted);

        // Do not render empty clusters (all photos deleted)
        if (clusterPhotos.length === 0) return null;

        let thumbPhoto = c.thumbnailId
          ? clusterPhotos.find((p) => p.localPhotoId === c.thumbnailId)
          : null;
        if (!thumbPhoto) {
          thumbPhoto = clusterPhotos[0];
        }

        const thumbUrl = resolvePhotoUrl(thumbPhoto);
        const formattedPhotos = clusterPhotos.map((p) => ({
          ...p,
          photoId: p.globalPhotoId || String(p.localPhotoId),
          downloadUrl: resolvePhotoUrl(p),
          photoUrl: resolvePhotoUrl(p),
        }));

        return {
          ...c,
          clusterId: c.globalClusterId || String(c.localClusterId),
          thumbnail: thumbPhoto
            ? {
                ...thumbPhoto,
                photoId: thumbPhoto.globalPhotoId || String(thumbPhoto.localPhotoId),
                photoUrl: thumbUrl,
                downloadUrl: thumbUrl,
              }
            : null,
          thumbnailUrl: thumbUrl,
          photos: formattedPhotos,
          photoCount: formattedPhotos.length,
        };
      })
    );

    return activeClusters.filter(Boolean);
  },

  /**
   * Save a single photo and queue an ADD sync operation
   */
  savePhoto: async (photoData) => {
    const now = new Date().toISOString();
    let localId;

    await db.transaction('rw', [db.photos, db.syncOperations], async () => {
      localId = await db.photos.add({
        ...photoData,
        visibility: photoData.visibility || 'PRIVATE',
        takenAt: photoData.takenAt || now,
        editedAt: photoData.editedAt || now,
      });

      await db.syncOperations.add({
        operationId: crypto.randomUUID(),
        entityType: 'PHOTOS',
        entityId: String(localId),
        operation: 'ADD',
        status: 'PENDING',
        createdAt: now,
      });
    });

    notifyRepositoryChanged();
    syncScheduler.scheduleSync();
    return localId;
  },

  /**
   * Save a cluster and queue an ADD sync operation
   */
  saveCluster: async (clusterData) => {
    const now = new Date().toISOString();
    let localId;

    await db.transaction('rw', [db.clusters, db.syncOperations], async () => {
      localId = await db.clusters.add({
        location: clusterData.location || null,
        thumbnailId: clusterData.thumbnailId || null,
        photoCount: clusterData.photoCount || 0,
        visibility: clusterData.visibility || 'PRIVATE',
        publicPhotoCount: clusterData.publicPhotoCount || 0,
        privatePhotoCount: clusterData.privatePhotoCount || 0,
        friendPhotoCount: clusterData.friendPhotoCount || 0,
      });

      await db.syncOperations.add({
        operationId: crypto.randomUUID(),
        entityType: 'CLUSTER',
        entityId: String(localId),
        operation: 'ADD',
        status: 'PENDING',
        createdAt: now,
      });
    });

    notifyRepositoryChanged();
    syncScheduler.scheduleSync();
    return localId;
  },

  /**
   * Save multiple photos into a cluster, updating cluster thumbnail and counts
   */
  savePhotosWithCluster: async ({ photos, location, dateStr, userId, visibility = 'PRIVATE' }) => {
    const now = new Date().toISOString();
    let clusterLocalId;
    const insertedPhotoIds = [];

    await db.transaction('rw', [db.photos, db.clusters, db.syncOperations], async () => {
      // 1. Create cluster
      const isPublic = visibility === 'PUBLIC';
      const isFriends = visibility === 'FRIENDS';
      const isPrivate = visibility === 'PRIVATE';

      clusterLocalId = await db.clusters.add({
        location,
        photoCount: photos.length,
        visibility,
        publicPhotoCount: isPublic ? photos.length : 0,
        friendPhotoCount: isFriends ? photos.length : 0,
        privatePhotoCount: isPrivate ? photos.length : 0,
      });

      await db.syncOperations.add({
        operationId: crypto.randomUUID(),
        entityType: 'CLUSTER',
        entityId: String(clusterLocalId),
        operation: 'ADD',
        status: 'PENDING',
        createdAt: now,
      });

      // 2. Insert photos linked to cluster
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const photoLocalId = await db.photos.add({
          photoName: p.name || p.file?.name || `Photo ${i + 1}`,
          clusterId: clusterLocalId,
          userId: userId || 'unknown',
          takenAt: p.takenAt || dateStr || now,
          editedAt: now,
          location,
          visibility,
          fileBlob: p.file || null,
          previewUrl: p.previewUrl || null,
        });

        insertedPhotoIds.push(photoLocalId);

        await db.syncOperations.add({
          operationId: crypto.randomUUID(),
          entityType: 'PHOTOS',
          entityId: String(photoLocalId),
          operation: 'ADD',
          status: 'PENDING',
          createdAt: now,
        });
      }

      // 3. Set cluster thumbnail to first photo
      if (insertedPhotoIds.length > 0) {
        await db.clusters.update(clusterLocalId, {
          thumbnailId: insertedPhotoIds[0],
        });
      }
    });

    notifyRepositoryChanged();
    syncScheduler.scheduleSync();
    return { clusterId: clusterLocalId, photoIds: insertedPhotoIds };
  },

  /**
   * Update visibility for multiple photos and recalculate affected cluster stats
   */
  updatePhotosVisibility: async (photoIds, newVisibility) => {
    if (!photoIds || photoIds.length === 0) return true;
    const now = new Date().toISOString();

    await db.transaction('rw', [db.photos, db.clusters, db.syncOperations], async () => {
      // Find all matching local photos
      const numIds = photoIds.map(Number).filter((n) => !isNaN(n));
      const photos = await db.photos.where('localPhotoId').anyOf(numIds).toArray();
      const stringIdPhotos = await db.photos.where('globalPhotoId').anyOf(photoIds).toArray();
      const allPhotos = [...photos, ...stringIdPhotos].filter(
        (v, i, a) => a.findIndex((t) => t.localPhotoId === v.localPhotoId) === i
      );

      const affectedClusterIds = new Set();

      for (const photo of allPhotos) {
        await db.photos.update(photo.localPhotoId, {
          visibility: newVisibility,
          editedAt: now,
        });

        if (photo.clusterId) affectedClusterIds.add(photo.clusterId);

        await db.syncOperations.add({
          operationId: crypto.randomUUID(),
          entityType: 'PHOTOS',
          entityId: String(photo.localPhotoId),
          operation: 'UPDATE',
          status: 'PENDING',
          createdAt: now,
        });
      }

      // Recalculate cluster visibility and counts for all affected clusters
      for (const clusterId of affectedClusterIds) {
        const cluster = await db.clusters.get(clusterId);
        if (!cluster || cluster.isDeleted) continue;

        const allClusterPhotos = await db.photos.where('clusterId').equals(clusterId).toArray();
        const clusterPhotos = allClusterPhotos.filter((p) => !p.isDeleted);
        const publicCount = clusterPhotos.filter((p) => p.visibility === 'PUBLIC').length;
        const friendCount = clusterPhotos.filter((p) => p.visibility === 'FRIENDS').length;
        const privateCount = clusterPhotos.filter((p) => p.visibility === 'PRIVATE').length;

        const calculatedVisibility =
          publicCount > 0 ? 'PUBLIC' : friendCount > 0 ? 'FRIENDS' : 'PRIVATE';

        await db.clusters.update(clusterId, {
          visibility: calculatedVisibility,
          photoCount: clusterPhotos.length,
          publicPhotoCount: publicCount,
          friendPhotoCount: friendCount,
          privatePhotoCount: privateCount,
        });

        await db.syncOperations.add({
          operationId: crypto.randomUUID(),
          entityType: 'CLUSTER',
          entityId: String(clusterId),
          operation: 'UPDATE',
          status: 'PENDING',
          createdAt: now,
        });
      }
    });

    notifyRepositoryChanged();
    syncScheduler.scheduleSync();
    return true;
  },

  /**
   * Delete photos and clean up associated clusters
   * Uses soft-delete (isDeleted: true) locally so syncEngine can retrieve globalPhotoId
   * and push the DELETE operation to the backend before the record is permanently purged.
   */
  deletePhotos: async (photoIds) => {
    if (!photoIds || photoIds.length === 0) return true;
    const now = new Date().toISOString();

    await db.transaction('rw', [db.photos, db.clusters, db.syncOperations], async () => {
      const numIds = photoIds.map(Number).filter((n) => !isNaN(n));
      const photos = await db.photos.where('localPhotoId').anyOf(numIds).toArray();
      const stringIdPhotos = await db.photos.where('globalPhotoId').anyOf(photoIds).toArray();
      const allPhotos = [...photos, ...stringIdPhotos].filter(
        (v, i, a) => a.findIndex((t) => t.localPhotoId === v.localPhotoId) === i
      );

      const affectedClusterIds = new Set();

      for (const photo of allPhotos) {
        if (photo.clusterId) affectedClusterIds.add(photo.clusterId);

        // Queue DELETE operation
        await db.syncOperations.add({
          operationId: crypto.randomUUID(),
          entityType: 'PHOTOS',
          entityId: String(photo.localPhotoId),
          operation: 'DELETE',
          status: 'PENDING',
          createdAt: now,
        });

        // Revoke any temporary object URL
        if (photo._createdBlobUrl) {
          URL.revokeObjectURL(photo._createdBlobUrl);
        }

        // Soft delete photo locally (preserves record until synced to backend)
        await db.photos.update(photo.localPhotoId, { isDeleted: true });
      }

      // Cleanup affected clusters
      for (const clusterId of affectedClusterIds) {
        const allPhotosInCluster = await db.photos.where('clusterId').equals(clusterId).toArray();
        const remainingPhotos = allPhotosInCluster.filter((p) => !p.isDeleted);

        if (remainingPhotos.length === 0) {
          const cluster = await db.clusters.get(clusterId);
          if (cluster?.globalClusterId) {
            // Queue DELETE for cluster and mark as soft-deleted
            await db.syncOperations.add({
              operationId: crypto.randomUUID(),
              entityType: 'CLUSTER',
              entityId: String(clusterId),
              operation: 'DELETE',
              status: 'PENDING',
              createdAt: now,
            });
            await db.clusters.update(clusterId, { isDeleted: true });
          } else {
            // Never synced to cloud, safe to remove immediately
            await db.clusters.delete(clusterId);
          }
        } else {
          // Recalculate cluster stats with remaining active photos
          const publicCount = remainingPhotos.filter((p) => p.visibility === 'PUBLIC').length;
          const friendCount = remainingPhotos.filter((p) => p.visibility === 'FRIENDS').length;
          const privateCount = remainingPhotos.filter((p) => p.visibility === 'PRIVATE').length;
          const calculatedVisibility =
            publicCount > 0 ? 'PUBLIC' : friendCount > 0 ? 'FRIENDS' : 'PRIVATE';

          await db.clusters.update(clusterId, {
            photoCount: remainingPhotos.length,
            publicPhotoCount: publicCount,
            friendPhotoCount: friendCount,
            privatePhotoCount: privateCount,
            visibility: calculatedVisibility,
            thumbnailId: remainingPhotos[0].localPhotoId,
          });

          await db.syncOperations.add({
            operationId: crypto.randomUUID(),
            entityType: 'CLUSTER',
            entityId: String(clusterId),
            operation: 'UPDATE',
            status: 'PENDING',
            createdAt: now,
          });
        }
      }
    });

    notifyRepositoryChanged();
    syncScheduler.scheduleSync();
    return true;
  },
};

export default localPhotoRepository;
