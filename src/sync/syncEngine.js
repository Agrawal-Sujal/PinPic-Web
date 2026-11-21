import db, { getSyncMetadata, setSyncMetadata } from '../db/appDatabase';
import { syncApi } from '../api/syncApi';
import { photoApi } from '../api/photoApi';
import { userApi } from '../api/userApi';
import { deviceService } from '../services/deviceService';
import { notifyRepositoryChanged, revokeBlobUrl } from '../data/localPhotoRepository';
import { selectNextPendingOperation } from './syncOperationOrder';

let isSyncRunning = false;
let isSyncCancelled = false;

/**
 * Helper to download an image binary Blob from a URL (e.g. presigned S3 URL)
 */
export const downloadImageBlob = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[SyncEngine] HTTP ${res.status} when fetching image from ${url}`);
      return null;
    }
    const blob = await res.blob();
    return blob && blob.size > 0 ? blob : null;
  } catch (err) {
    console.warn('[SyncEngine] Error downloading image blob:', err);
    return null;
  }
};

export const syncEngine = {
  /**
   * Cancel any in-progress sync execution (e.g. on user logout)
   */
  cancelSync: () => {
    console.log('[SyncEngine] Cancelling in-progress sync...');
    isSyncCancelled = true;
    isSyncRunning = false;
  },

  /**
   * Main sync workflow: Push pending local changes, then Pull cloud updates
   */
  executeSync: async (userId = null) => {
    if (isSyncRunning) {
      console.log('[SyncEngine] Sync already in progress. Skipping.');
      return false;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[SyncEngine] Browser is offline. Sync deferred.');
      return false;
    }

    const token = localStorage.getItem('pinpic_jwt_token');
    if (!token) {
      console.log('[SyncEngine] User not authenticated. Sync deferred.');
      return false;
    }

    isSyncRunning = true;
    isSyncCancelled = false;
    try {
      console.log('[SyncEngine] Starting synchronization cycle...');
      const deviceId = await deviceService.getOrRegisterDeviceId(userId);
      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return false;

      // Optional initial bootstrap if local DB is completely empty
      await syncEngine.bootstrapIfEmpty(userId);
      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return false;

      // Phase 1: Push phase
      await syncEngine.pushLocalChanges(deviceId);
      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return false;

      // Phase 2: Pull phase
      await syncEngine.pullCloudChanges(deviceId, userId);
      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return false;

      // Phase 3: Reconciliation check for any unclustered or desynced photos
      await syncEngine.reconcileUnclusteredPhotos(userId);
      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return false;

      // Phase 4: Download and cache image binary Blobs into IndexedDB for any cloud photos
      await syncEngine.cachePendingPhotosBlobs();

      console.log('[SyncEngine] Synchronization cycle completed successfully.');
      return true;
    } catch (err) {
      if (isSyncCancelled) {
        console.log('[SyncEngine] Sync was cancelled.');
        return false;
      }
      console.error('[SyncEngine] Error during synchronization:', err);
      return false;
    } finally {
      isSyncRunning = false;
    }
  },

  /**
   * If database is brand new and empty, seed it from cloud user API
   */
  bootstrapIfEmpty: async (userId) => {
    if (!userId || isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return;
    try {
      const photoCount = await db.photos.count();
      const lastOpId = await getSyncMetadata('lastSyncedOperationId', 0);

      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return;

      if (photoCount === 0 && Number(lastOpId) === 0) {
        console.log('[SyncEngine] Local database empty. Bootstrapping user data from cloud...');
        const [cloudClusters, cloudPhotos] = await Promise.all([
          userApi.getUserClusters(userId).catch(() => []),
          userApi.getUserPhotos(userId).catch(() => []),
        ]);

        if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return;

        if (cloudClusters?.length > 0 || cloudPhotos?.length > 0) {
          await db.transaction('rw', [db.photos, db.clusters], async () => {
            const clusterMap = new Map(); // globalClusterId -> localClusterId
            const photoToClusterGlobalMap = new Map(); // globalPhotoId -> globalClusterId
            const clusterLocationMap = new Map();

            // 1. Insert clusters
            for (const c of cloudClusters || []) {
              const globalCId = c.clusterId || c.globalClusterId;
              if (globalCId && c.location) clusterLocationMap.set(globalCId, c.location);

              const localCId = await db.clusters.add({
                globalClusterId: globalCId,
                location: c.location,
                photoCount: c.photoCount || (c.photos ? c.photos.length : 0),
                visibility: c.visibility || 'PUBLIC',
                publicPhotoCount: c.publicPhotoCount || 0,
                privatePhotoCount: c.privatePhotoCount || 0,
                friendPhotoCount: c.friendPhotoCount || 0,
              });
              if (globalCId) {
                clusterMap.set(globalCId, localCId);
              }

              // Index photos contained directly inside this cluster
              if (Array.isArray(c.photos)) {
                for (const cp of c.photos) {
                  const pid = cp.photoId || cp.id;
                  if (pid && globalCId) {
                    photoToClusterGlobalMap.set(pid, globalCId);
                  }
                }
              }
            }

            // 2. Insert photos with proper cluster resolution
            const processedPhotoIds = new Set();
            const insertedClusterThumbnails = new Map(); // localCId -> first inserted localPhotoId

            for (const p of cloudPhotos || []) {
              const pid = p.photoId || p.id;
              if (!pid) continue;
              processedPhotoIds.add(pid);

              const globalCId = p.clusterId || photoToClusterGlobalMap.get(pid) || null;
              let clusterLocalId = globalCId ? clusterMap.get(globalCId) || null : null;

              if (globalCId && !clusterLocalId) {
                clusterLocalId = await db.clusters.add({
                  globalClusterId: globalCId,
                  location: p.location || clusterLocationMap.get(globalCId) || null,
                  photoCount: 1,
                  visibility: p.visibility || 'PRIVATE',
                });
                clusterMap.set(globalCId, clusterLocalId);
              }

              const localPhotoId = await db.photos.add({
                globalPhotoId: pid,
                clusterId: clusterLocalId,
                globalClusterId: globalCId,
                userId: userId,
                photoName: p.name || 'Photo',
                s3Key: p.s3Key || null,
                takenAt: p.takenAt || new Date().toISOString(),
                editedAt: p.editedAt || new Date().toISOString(),
                location: p.location || (globalCId ? clusterLocationMap.get(globalCId) : null) || null,
                visibility: p.visibility || 'PUBLIC',
                downloadUrl: p.downloadUrl || p.photoUrl || null,
              });

              if (clusterLocalId && !insertedClusterThumbnails.has(clusterLocalId)) {
                insertedClusterThumbnails.set(clusterLocalId, localPhotoId);
              }
            }

            // 3. Insert any photos from cloudClusters not already inserted
            for (const c of cloudClusters || []) {
              const globalCId = c.clusterId || c.globalClusterId;
              const localCId = globalCId ? clusterMap.get(globalCId) : null;
              if (Array.isArray(c.photos)) {
                for (const p of c.photos) {
                  const pid = p.photoId || p.id;
                  if (pid && !processedPhotoIds.has(pid)) {
                    processedPhotoIds.add(pid);
                    const localPhotoId = await db.photos.add({
                      globalPhotoId: pid,
                      clusterId: localCId,
                      globalClusterId: globalCId,
                      userId: userId,
                      photoName: p.name || 'Photo',
                      s3Key: p.s3Key || null,
                      takenAt: p.takenAt || new Date().toISOString(),
                      editedAt: p.editedAt || new Date().toISOString(),
                      location: p.location || c.location || null,
                      visibility: p.visibility || c.visibility || 'PUBLIC',
                      downloadUrl: p.downloadUrl || p.photoUrl || null,
                    });
                    if (localCId && !insertedClusterThumbnails.has(localCId)) {
                      insertedClusterThumbnails.set(localCId, localPhotoId);
                    }
                  }
                }
              }
            }

            // 4. Update cluster thumbnail IDs
            for (const [localCId, thumbPhotoId] of insertedClusterThumbnails.entries()) {
              await db.clusters.update(localCId, { thumbnailId: thumbPhotoId });
            }
          });

          console.log(
            `[SyncEngine] Bootstrapped ${cloudClusters?.length || 0} clusters and ${cloudPhotos?.length || 0} photos.`
          );
          notifyRepositoryChanged();

          // Background cache image blobs for bootstrapped photos into IndexedDB
          syncEngine.cachePendingPhotosBlobs().catch((err) => {
            console.warn('[SyncEngine] Background bootstrap blob caching error:', err);
          });
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Bootstrap warning:', err);
    }
  },

  /**
   * Phase 1: Push pending local operations to backend /api/sync/push
   * Uses sequential batchSize = 50 (matching Android SyncWorker) so that
   * CLUSTER operations complete and populate globalClusterId before dependent PHOTOS sync.
   */
  pushLocalChanges: async (deviceId) => {
    // Retry any previously failed operations
    await db.syncOperations
      .where('status')
      .equals('FAILED')
      .modify({ status: 'PENDING' })
      .catch(() => {});

    const batchSize = 50;

    while (true) {
      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) {
        console.log('[SyncEngine] Push cancelled due to logout/unauthorized.');
        break;
      }

      const allPendingOps = await db.syncOperations
        .where('status')
        .equals('PENDING')
        .toArray();

      const nextOp = await selectNextPendingOperation(allPendingOps, {
        getPhoto: (id) => db.photos.get(id),
        getCluster: (id) => db.clusters.get(id),
      });

      const pendingBatch = nextOp ? [nextOp].slice(0, batchSize) : [];

      if (pendingBatch.length === 0) {
        console.log('[SyncEngine] All pending push operations processed.');
        break;
      }

      console.log(`[SyncEngine] Processing pending operation ${pendingBatch[0].operationId} (${pendingBatch[0].entityType} ${pendingBatch[0].operation})...`);
      const clustersToSend = [];
      const photosToSend = [];

      for (const op of pendingBatch) {
        const localId = Number(op.entityId);

        if (op.entityType === 'CLUSTER') {
          if (op.operation === 'ADD' || op.operation === 'UPDATE') {
            const cluster = await db.clusters.get(localId);
            if (!cluster) {
              await db.syncOperations.update(op.operationId, { status: 'COMPLETED' });
              continue;
            }

            let thumbGlobalId = null;
            if (cluster.thumbnailId) {
              const thumbPhoto = await db.photos.get(cluster.thumbnailId);
              thumbGlobalId = thumbPhoto?.globalPhotoId || null;
            }

            clustersToSend.push({
              globalClusterId: cluster.globalClusterId || null,
              location: cluster.location
                ? {
                    latitude: cluster.location.latitude,
                    longitude: cluster.location.longitude,
                    locationName: cluster.location.locationName,
                  }
                : null,
              thumbnailPhotoGlobalId: thumbGlobalId,
              photoCount: cluster.photoCount || 0,
              visibility: cluster.visibility || 'PRIVATE',
              publicPhotoCount: cluster.publicPhotoCount || 0,
              privatePhotoCount: cluster.privatePhotoCount || 0,
              friendPhotoCount: cluster.friendPhotoCount || 0,
              isDeleted: false,
            });
          } else if (op.operation === 'DELETE') {
            const cluster = await db.clusters.get(localId);
            const globalClusterId = cluster?.globalClusterId;
            if (!globalClusterId) {
              if (cluster) await db.clusters.delete(localId);
              await db.syncOperations.update(op.operationId, { status: 'COMPLETED' });
              continue;
            }

            clustersToSend.push({
              globalClusterId,
              isDeleted: true,
            });
          }
        } else if (op.entityType === 'PHOTOS') {
          if (op.operation === 'ADD' || op.operation === 'UPDATE') {
            const photo = await db.photos.get(localId);
            if (!photo || photo.isDeleted) {
              await db.syncOperations.update(op.operationId, { status: 'COMPLETED' });
              continue;
            }

            let s3Key = photo.s3Key;
            let fileBlob = photo.fileBlob;

            if (!s3Key && !fileBlob && photo.previewUrl?.startsWith('blob:')) {
              try {
                const blobRes = await fetch(photo.previewUrl);
                fileBlob = await blobRes.blob();
              } catch (e) {
                console.warn('[SyncEngine] Could not recover blob from previewUrl:', e);
              }
            }

            if (!s3Key && fileBlob) {
              try {
                console.log(`[SyncEngine] Initiating presigned S3 upload for photo ${localId} (${photo.photoName})...`);
                const initRes = await photoApi.initiateUpload(photo.photoName || 'photo.jpg');
                if (!initRes?.presignedUrl || !initRes?.s3Key) {
                  throw new Error('Invalid presigned upload response from server');
                }

                await photoApi.uploadToS3(initRes.presignedUrl, fileBlob);
                s3Key = initRes.s3Key;

                await db.photos.update(localId, { s3Key });
                console.log(`[SyncEngine] S3 upload successful for photo ${localId}, s3Key: ${s3Key}`);
              } catch (err) {
                console.error(`[SyncEngine] S3 upload failed for photo ${localId}:`, err);
                break;
              }
            }

            let globalClusterId = photo.globalClusterId || null;
            if (photo.clusterId) {
              const cluster = await db.clusters.get(photo.clusterId);
              globalClusterId = cluster?.globalClusterId || globalClusterId;
            }

            photosToSend.push({
              globalPhotoId: photo.globalPhotoId || null,
              globalClusterId,
              name: photo.photoName,
              s3Key,
              takenAt: photo.takenAt,
              editedAt: photo.editedAt,
              location: photo.location
                ? {
                    latitude: photo.location.latitude,
                    longitude: photo.location.longitude,
                    locationName: photo.location.locationName,
                  }
                : null,
              visibility: photo.visibility || 'PRIVATE',
              size: fileBlob?.size || null,
              isDeleted: false,
            });
          } else if (op.operation === 'DELETE') {
            const photo = await db.photos.get(localId);
            const globalPhotoId = photo?.globalPhotoId;
            if (!globalPhotoId) {
              revokeBlobUrl(localId);
              if (photo) await db.photos.delete(localId);
              await db.syncOperations.update(op.operationId, { status: 'COMPLETED' });
              continue;
            }

            photosToSend.push({
              globalPhotoId,
              isDeleted: true,
            });
          }
        }
      }

      if (clustersToSend.length === 0 && photosToSend.length === 0) {
        const currentOp = await db.syncOperations.get(pendingBatch[0].operationId);
        if (currentOp?.status === 'COMPLETED') {
          continue;
        }
        break;
      }

      console.log(`[SyncEngine] Dispatching push mutations to /api/sync/push (${clustersToSend.length} clusters, ${photosToSend.length} photos)...`);
      await syncApi.pushMutations({
        deviceId,
        clusters: clustersToSend,
        photos: photosToSend,
      });

      for (const op of pendingBatch) {
        const localEntityId = Number(op.entityId);
        const isDelete = op.operation === 'DELETE';

        if (op.entityType === 'CLUSTER' && isDelete) {
          await db.clusters.delete(localEntityId);
        } else if (op.entityType === 'PHOTOS' && isDelete) {
          revokeBlobUrl(localEntityId);
          await db.photos.delete(localEntityId);
        }
        await db.syncOperations.update(op.operationId, { status: 'COMPLETED' });
      }
    }
  },

  /**
   * Phase 2: Pull cloud deltas via /api/sync/deltas with Echo Suppression (Strategy 2)
   */
  pullCloudChanges: async (deviceId, userId) => {
    const pullBatchSize = 100;
    let anyChangesApplied = false;

    while (true) {
      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) {
        console.log('[SyncEngine] Pull cancelled due to logout/unauthorized.');
        break;
      }

      let currentCursor = Number(await getSyncMetadata('sync_revision_cursor', 0));
      console.log(`[SyncEngine] Pulling cloud deltas since revision cursor: ${currentCursor}...`);

      let pullResponse;
      try {
        pullResponse = await syncApi.pullDeltas({
          cursor: currentCursor,
          limit: pullBatchSize,
          deviceId,
        });
      } catch (err) {
        console.error('[SyncEngine] Delta pull request failed:', err);
        break;
      }

      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) break;

      if (pullResponse?.resetRequired) {
        console.warn('[SyncEngine] Reset required by server. Clearing local database cache...');
        await clearLocalDatabase();
        break;
      }

      const clusters = pullResponse?.clusters || [];
      const photos = pullResponse?.photos || [];

      if (clusters.length === 0 && photos.length === 0) {
        console.log('[SyncEngine] No new cloud deltas to pull.');
        break;
      }

      console.log(`[SyncEngine] Received ${clusters.length} cluster deltas, ${photos.length} photo deltas.`);

      // Pre-download image blobs for non-echo, non-deleted photos
      const externalPhotosWithUrls = photos.filter(
        (p) => !p.isEcho && !p.isDeleted && p.downloadUrl
      );
      const downloadedBlobs = new Map();
      await Promise.all(
        externalPhotosWithUrls.map(async (p) => {
          const blob = await downloadImageBlob(p.downloadUrl);
          if (blob) downloadedBlobs.set(p.photoId, blob);
        })
      );

      // ATOMIC TRANSACTION: Commit all deltas & cursor in IndexedDB
      await db.transaction('rw', [db.photos, db.clusters, db.syncMetadata], async () => {
        // 1. Process Clusters
        for (const c of clusters) {
          const existing = await db.clusters.where('globalClusterId').equals(c.clusterId).first();

          if (c.isDeleted) {
            if (existing) {
              await db.clusters.delete(existing.localClusterId);
              await db.photos
                .where('clusterId')
                .equals(existing.localClusterId)
                .modify({ clusterId: null, globalClusterId: null });
              anyChangesApplied = true;
            }
          } else if (c.isEcho) {
            // ECHO: This device pushed this cluster. Only advance its revision!
            if (existing) {
              await db.clusters.update(existing.localClusterId, { revision: c.revision });
            }
          } else {
            // EXTERNAL CHANGE
            const clusterData = {
              globalClusterId: c.clusterId,
              location: c.location,
              photoCount: c.photoCount || 0,
              visibility: c.visibility || 'PRIVATE',
              publicPhotoCount: c.publicPhotoCount || 0,
              privatePhotoCount: c.privatePhotoCount || 0,
              friendPhotoCount: c.friendPhotoCount || 0,
              revision: c.revision,
            };

            let localClusterId;
            if (existing) {
              await db.clusters.update(existing.localClusterId, clusterData);
              localClusterId = existing.localClusterId;
            } else {
              localClusterId = await db.clusters.add(clusterData);
            }
            anyChangesApplied = true;

            // Link any local photos that match this globalClusterId
            await db.photos
              .where('globalClusterId')
              .equals(c.clusterId)
              .modify({ clusterId: localClusterId });
          }
        }

        // 2. Process Photos
        for (const p of photos) {
          const existing = await db.photos.where('globalPhotoId').equals(p.photoId).first();

          if (p.isDeleted) {
            if (existing) {
              revokeBlobUrl(existing.localPhotoId);
              revokeBlobUrl(existing.globalPhotoId);
              if (existing._createdBlobUrl) {
                try {
                  URL.revokeObjectURL(existing._createdBlobUrl);
                } catch (_) {}
              }
              await db.photos.delete(existing.localPhotoId);
              anyChangesApplied = true;
            }
          } else if (p.isEcho) {
            // ECHO: This device pushed this photo.
            // Do NOT overwrite local previewUrl or fileBlob! Only update revision:
            if (existing) {
              await db.photos.update(existing.localPhotoId, { revision: p.revision });
            }
          } else {
            // EXTERNAL CHANGE
            let clusterLocalId = null;
            if (p.clusterId) {
              const cluster = await db.clusters.where('globalClusterId').equals(p.clusterId).first();
              clusterLocalId = cluster ? cluster.localClusterId : null;
            }

            const blob = downloadedBlobs.get(p.photoId);

            if (existing) {
              const updates = {
                revision: p.revision,
              };
              if (p.name && existing.photoName !== p.name) updates.photoName = p.name;
              if (p.clusterId && existing.globalClusterId !== p.clusterId) {
                updates.globalClusterId = p.clusterId;
                updates.clusterId = clusterLocalId;
              }
              if (p.location) updates.location = p.location;
              if (p.visibility && existing.visibility !== p.visibility) updates.visibility = p.visibility;
              if (p.s3Key && existing.s3Key !== p.s3Key) updates.s3Key = p.s3Key;
              if (p.downloadUrl && existing.downloadUrl !== p.downloadUrl) updates.downloadUrl = p.downloadUrl;
              if (blob) {
                updates.fileBlob = blob;
                revokeBlobUrl(existing.localPhotoId);
                revokeBlobUrl(existing.globalPhotoId);
              }
              if (p.editedAt) updates.editedAt = p.editedAt;

              await db.photos.update(existing.localPhotoId, updates);
              anyChangesApplied = true;
            } else {
              await db.photos.add({
                globalPhotoId: p.photoId,
                clusterId: clusterLocalId,
                globalClusterId: p.clusterId || null,
                userId: userId || 'unknown',
                photoName: p.name || 'Photo',
                s3Key: p.s3Key || null,
                takenAt: p.takenAt || new Date().toISOString(),
                editedAt: p.editedAt || new Date().toISOString(),
                location: p.location || null,
                visibility: p.visibility || 'PRIVATE',
                downloadUrl: p.downloadUrl || null,
                fileBlob: blob || null,
                revision: p.revision,
              });
              anyChangesApplied = true;
            }
          }
        }

        // 3. Atomically update revision cursor in the SAME transaction
        const nextCursor = Number(pullResponse?.nextCursor || currentCursor);
        await setSyncMetadata('sync_revision_cursor', nextCursor);
      });

      if (!pullResponse?.hasMore) {
        break;
      }
    }

    if (anyChangesApplied) {
      notifyRepositoryChanged();
    }
  },

  /**
   * Phase 3: Self-healing reconciliation for any photos that currently lack a clusterId or globalClusterId
   */
  reconcileUnclusteredPhotos: async (userId) => {
    if (!userId || isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return;
    try {
      // Find active photos that have clusterId null OR globalClusterId null
      const unclustered = await db.photos
        .filter((p) => !p.isDeleted && (p.clusterId == null || !p.globalClusterId))
        .toArray();

      if (unclustered.length === 0) return;

      console.log(`[SyncEngine] Found ${unclustered.length} photos needing cluster reconciliation...`);

      // 1. First attempt local linking if globalClusterId or clusterId is already present
      let remaining = [];
      for (const p of unclustered) {
        if (p.globalClusterId && p.clusterId == null) {
          const cluster = await db.clusters.where('globalClusterId').equals(p.globalClusterId).first();
          if (cluster) {
            await db.photos.update(p.localPhotoId, { clusterId: cluster.localClusterId });
          } else {
            remaining.push(p);
          }
        } else if (p.clusterId != null && !p.globalClusterId) {
          const cluster = await db.clusters.get(p.clusterId);
          if (cluster?.globalClusterId) {
            await db.photos.update(p.localPhotoId, { globalClusterId: cluster.globalClusterId });
          } else {
            remaining.push(p);
          }
        } else {
          remaining.push(p);
        }
      }

      if (remaining.length === 0) {
        notifyRepositoryChanged();
        return;
      }

      // 2. Fetch fresh user cluster and photo state from cloud to reconcile remaining photos
      const [cloudClusters, cloudPhotos] = await Promise.all([
        userApi.getUserClusters(userId).catch(() => []),
        userApi.getUserPhotos(userId).catch(() => []),
      ]);

      const photoToClusterGlobalMap = new Map();
      const clusterLocationMap = new Map();

      for (const c of cloudClusters || []) {
        const cId = c.clusterId || c.globalClusterId;
        if (cId && c.location) clusterLocationMap.set(cId, c.location);
        if (Array.isArray(c.photos)) {
          for (const cp of c.photos) {
            const pid = cp.photoId || cp.id;
            if (pid && cId) photoToClusterGlobalMap.set(pid, cId);
          }
        }
      }

      for (const cp of cloudPhotos || []) {
        const pid = cp.photoId || cp.id;
        if (pid && cp.clusterId) {
          photoToClusterGlobalMap.set(pid, cp.clusterId);
        }
      }

      let reconciledCount = 0;
      for (const p of remaining) {
        const globalPhotoId = p.globalPhotoId;
        if (!globalPhotoId) continue;

        const globalCId = photoToClusterGlobalMap.get(globalPhotoId);
        if (globalCId) {
          let localCluster = await db.clusters.where('globalClusterId').equals(globalCId).first();
          let localCId;
          if (!localCluster) {
            localCId = await db.clusters.add({
              globalClusterId: globalCId,
              location: p.location || clusterLocationMap.get(globalCId) || null,
              photoCount: 1,
              visibility: p.visibility || 'PRIVATE',
            });
          } else {
            localCId = localCluster.localClusterId;
          }

          await db.photos.update(p.localPhotoId, {
            clusterId: localCId,
            globalClusterId: globalCId,
            location: p.location || clusterLocationMap.get(globalCId) || null,
          });
          reconciledCount++;
        }
      }

      if (reconciledCount > 0) {
        console.log(`[SyncEngine] Successfully reconciled ${reconciledCount} photos to their clusters.`);
        notifyRepositoryChanged();
      }
    } catch (err) {
      console.warn('[SyncEngine] Reconcile warning:', err);
    }
  },

  /**
   * Phase 4: Download and cache image binary Blobs into IndexedDB (db.photos)
   * for any photos that were synced from the cloud but don't have fileBlob stored locally yet.
   */
  cachePendingPhotosBlobs: async () => {
    if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) return;
    try {
      // Find active photos that have a downloadUrl but no local fileBlob
      const unCachedPhotos = await db.photos
        .filter((p) => !p.isDeleted && !p.fileBlob && Boolean(p.downloadUrl))
        .toArray();

      if (unCachedPhotos.length === 0) return;

      console.log(`[SyncEngine] Caching ${unCachedPhotos.length} image blob(s) into IndexedDB...`);

      const CONCURRENCY_LIMIT = 4;
      let cachedCount = 0;

      for (let i = 0; i < unCachedPhotos.length; i += CONCURRENCY_LIMIT) {
        if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) break;
        const chunk = unCachedPhotos.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(
          chunk.map(async (photo) => {
            if (!photo.downloadUrl) return;
            const blob = await downloadImageBlob(photo.downloadUrl);
            if (blob) {
              await db.photos.update(photo.localPhotoId, { fileBlob: blob });
              cachedCount++;
            }
          })
        );
      }

      if (cachedCount > 0) {
        console.log(`[SyncEngine] Successfully cached ${cachedCount} image blob(s) into IndexedDB.`);
        notifyRepositoryChanged();
      }
    } catch (err) {
      console.warn('[SyncEngine] Error during photo blob caching:', err);
    }
  },
};

export default syncEngine;
