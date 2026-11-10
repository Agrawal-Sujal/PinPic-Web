import db, { getSyncMetadata, setSyncMetadata } from '../db/appDatabase';
import { syncApi } from '../api/syncApi';
import { photoApi } from '../api/photoApi';
import { userApi } from '../api/userApi';
import { deviceService } from '../services/deviceService';
import { notifyRepositoryChanged } from '../data/localPhotoRepository';

let isSyncRunning = false;
let isSyncCancelled = false;

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

            // Insert clusters
            for (const c of cloudClusters || []) {
              const localCId = await db.clusters.add({
                globalClusterId: c.clusterId || c.globalClusterId,
                location: c.location,
                photoCount: c.photoCount || (c.photos ? c.photos.length : 0),
                visibility: c.visibility || 'PUBLIC',
                publicPhotoCount: c.publicPhotoCount || 0,
                privatePhotoCount: c.privatePhotoCount || 0,
                friendPhotoCount: c.friendPhotoCount || 0,
              });
              if (c.clusterId) clusterMap.set(c.clusterId, localCId);
            }

            // Insert photos
            for (const p of cloudPhotos || []) {
              const clusterLocalId = p.clusterId ? clusterMap.get(p.clusterId) || null : null;
              await db.photos.add({
                globalPhotoId: p.photoId || p.id,
                clusterId: clusterLocalId,
                userId: userId,
                photoName: p.name || 'Photo',
                s3Key: p.s3Key || null,
                takenAt: p.takenAt || new Date().toISOString(),
                editedAt: p.editedAt || new Date().toISOString(),
                location: p.location,
                visibility: p.visibility || 'PUBLIC',
                downloadUrl: p.downloadUrl || p.photoUrl || null,
              });
            }
          });

          console.log(
            `[SyncEngine] Bootstrapped ${cloudClusters?.length || 0} clusters and ${cloudPhotos?.length || 0} photos.`
          );
          notifyRepositoryChanged();
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Bootstrap warning:', err);
    }
  },

  /**
   * Phase 1: Push pending local operations to backend /api/sync/batch
   * Uses sequential batchSize = 1 (matching Android SyncWorker) so that
   * CLUSTER operations complete and populate globalClusterId before dependent PHOTOS sync.
   */
  pushLocalChanges: async (deviceId) => {
    // Retry any previously failed operations
    await db.syncOperations
      .where('status')
      .equals('FAILED')
      .modify({ status: 'PENDING' })
      .catch(() => {});

    const batchSize = 1;

    while (true) {
      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) {
        console.log('[SyncEngine] Push cancelled due to logout/unauthorized.');
        break;
      }

      const pendingBatch = await db.syncOperations
        .where('status')
        .equals('PENDING')
        .limit(batchSize)
        .toArray();

      if (pendingBatch.length === 0) {
        console.log('[SyncEngine] All pending push operations processed.');
        break;
      }

      console.log(`[SyncEngine] Processing pending operation ${pendingBatch[0].operationId} (${pendingBatch[0].entityType} ${pendingBatch[0].operation})...`);
      const itemsToSend = [];

      for (const op of pendingBatch) {
        const localId = Number(op.entityId);

        if (op.entityType === 'CLUSTER') {
          if (op.operation === 'ADD' || op.operation === 'UPDATE') {
            const cluster = await db.clusters.get(localId);
            if (!cluster) {
              // Cluster deleted locally before sync
              await db.syncOperations.update(op.operationId, { status: 'COMPLETED' });
              continue;
            }

            // Resolve thumbnail global ID
            let thumbGlobalId = null;
            if (cluster.thumbnailId) {
              const thumbPhoto = await db.photos.get(cluster.thumbnailId);
              thumbGlobalId = thumbPhoto?.globalPhotoId || null;
            }

            itemsToSend.push({
              operationId: op.operationId,
              entityType: 'CLUSTER',
              operation: op.operation,
              localEntityId: op.entityId,
              cluster: {
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
              },
            });
          } else if (op.operation === 'DELETE') {
            const cluster = await db.clusters.get(localId);
            const globalClusterId = cluster?.globalClusterId;
            if (!globalClusterId) {
              // Never synced to cloud, permanently purge from local DB
              if (cluster) await db.clusters.delete(localId);
              await db.syncOperations.update(op.operationId, { status: 'COMPLETED' });
              continue;
            }

            itemsToSend.push({
              operationId: op.operationId,
              entityType: 'CLUSTER',
              operation: 'DELETE',
              localEntityId: op.entityId,
              cluster: {
                globalClusterId,
              },
            });
          }
        } else if (op.entityType === 'PHOTOS') {
          if (op.operation === 'ADD' || op.operation === 'UPDATE') {
            const photo = await db.photos.get(localId);
            if (!photo || photo.isDeleted) {
              await db.syncOperations.update(op.operationId, { status: 'COMPLETED' });
              continue;
            }

            // 1. Ensure file is uploaded to S3 if not uploaded yet
            let s3Key = photo.s3Key;
            let fileBlob = photo.fileBlob;

            // Fallback: if fileBlob is missing, try retrieving from previewUrl if it's a blob URL
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
                // Keep operation pending to retry later
                break;
              }
            }

            // 2. Resolve cluster global ID
            let globalClusterId = null;
            if (photo.clusterId) {
              const cluster = await db.clusters.get(photo.clusterId);
              globalClusterId = cluster?.globalClusterId || null;
            }

            itemsToSend.push({
              operationId: op.operationId,
              entityType: 'PHOTOS',
              operation: op.operation,
              localEntityId: op.entityId,
              photo: {
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
              },
            });
          } else if (op.operation === 'DELETE') {
            const photo = await db.photos.get(localId);
            const globalPhotoId = photo?.globalPhotoId;
            if (!globalPhotoId) {
              // Never synced to cloud, permanently purge from local DB
              if (photo) await db.photos.delete(localId);
              await db.syncOperations.update(op.operationId, { status: 'COMPLETED' });
              continue;
            }

            itemsToSend.push({
              operationId: op.operationId,
              entityType: 'PHOTOS',
              operation: 'DELETE',
              localEntityId: op.entityId,
              photo: {
                globalPhotoId,
              },
            });
          }
        }
      }

      if (itemsToSend.length === 0) {
        break;
      }

      // Dispatch batch to backend
      console.log(`[SyncEngine] Dispatching batch of ${itemsToSend.length} items to /api/sync/batch...`);
      const syncResponse = await syncApi.syncBatch({
        deviceId,
        operations: itemsToSend,
      });

      const results = syncResponse?.results || [];
      console.log(`[SyncEngine] Received sync results:`, results);

      for (const res of results) {
        const localEntityId = Number(res.localEntityId);
        if (res.status === 'SUCCESS') {
          const entityType = res.entityType?.toUpperCase();
          const matchedOp = pendingBatch.find((o) => o.operationId === res.operationId);
          const isDelete = matchedOp?.operation === 'DELETE';

          if (entityType === 'CLUSTER') {
            if (isDelete) {
              // Now that cloud deletion is confirmed, permanently remove from local DB
              await db.clusters.delete(localEntityId);
            } else if (res.globalId) {
              await db.clusters.update(localEntityId, { globalClusterId: res.globalId });
            }
          } else if (entityType === 'PHOTOS') {
            if (isDelete) {
              // Now that cloud deletion is confirmed, permanently remove from local DB
              await db.photos.delete(localEntityId);
            } else if (res.globalId) {
              await db.photos.update(localEntityId, { globalPhotoId: res.globalId });
            }
          }
          await db.syncOperations.update(res.operationId, { status: 'COMPLETED' });
        } else {
          console.warn(`[SyncEngine] Server reported failure for op ${res.operationId}:`, res.errorMessage);
          await db.syncOperations.update(res.operationId, { status: 'FAILED' });
        }
      }
    }
  },

  /**
   * Phase 2: Pull cloud changes via /api/sync/pull
   */
  pullCloudChanges: async (deviceId, userId) => {
    const pullBatchSize = 50;
    let anyChangesApplied = false;

    while (true) {
      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) {
        console.log('[SyncEngine] Pull cancelled due to logout/unauthorized.');
        break;
      }

      let currentLastOpId = Number(await getSyncMetadata('lastSyncedOperationId', 0));
      console.log(`[SyncEngine] Pulling cloud changes since opId: ${currentLastOpId}...`);

      const pullResponse = await syncApi.pullOperations({
        lastOperationId: currentLastOpId,
        batchSize: pullBatchSize,
        deviceId,
      });

      if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) {
        console.log('[SyncEngine] Pull cancelled before applying operations.');
        break;
      }

      const operations = pullResponse?.operations || [];
      if (operations.length === 0) {
        console.log('[SyncEngine] No new cloud changes to pull.');
        break;
      }

      console.log(`[SyncEngine] Applying ${operations.length} pulled operations locally...`);
      let latestOpId = currentLastOpId;

      for (const op of operations) {
        if (isSyncCancelled || !localStorage.getItem('pinpic_jwt_token')) {
          console.log('[SyncEngine] Aborting pulled operations loop due to cancellation.');
          break;
        }
        try {
          const entityType = op.entityType?.toUpperCase();
          const operation = op.operation?.toUpperCase();

          if (entityType === 'PHOTOS') {
            if (operation === 'ADD') {
              const globalPhotoId = op.entityId;
              const existing = await db.photos.where('globalPhotoId').equals(globalPhotoId).first();

              if (!existing) {
                // Resolve cluster
                let clusterLocalId = null;
                const globalClusterId = op.photo?.globalClusterId;
                if (globalClusterId) {
                  let localCluster = await db.clusters.where('globalClusterId').equals(globalClusterId).first();
                  if (!localCluster) {
                    clusterLocalId = await db.clusters.add({
                      globalClusterId,
                      location: op.photo.location,
                      photoCount: 1,
                      visibility: op.photo.visibility || 'PRIVATE',
                    });
                  } else {
                    clusterLocalId = localCluster.localClusterId;
                  }
                }

                await db.photos.add({
                  globalPhotoId,
                  clusterId: clusterLocalId,
                  userId: userId || 'unknown',
                  photoName: op.photo?.name || 'Photo',
                  s3Key: op.photo?.s3Key || null,
                  takenAt: op.photo?.takenAt || new Date().toISOString(),
                  editedAt: op.photo?.editedAt || new Date().toISOString(),
                  location: op.photo?.location || null,
                  visibility: op.photo?.visibility || 'PRIVATE',
                  downloadUrl: op.downloadUrl || null,
                });
                anyChangesApplied = true;
              }
            } else if (operation === 'DELETE') {
              const globalPhotoId = op.entityId;
              const photo = await db.photos.where('globalPhotoId').equals(globalPhotoId).first();
              if (photo) {
                await db.photos.delete(photo.localPhotoId);
                anyChangesApplied = true;
              }
            } else if (operation === 'UPDATE') {
              const globalPhotoId = op.entityId;
              const photo = await db.photos.where('globalPhotoId').equals(globalPhotoId).first();
              if (photo) {
                await db.photos.update(photo.localPhotoId, {
                  photoName: op.photo?.name || photo.photoName,
                  editedAt: op.photo?.editedAt || photo.editedAt,
                  location: op.photo?.location || photo.location,
                  visibility: op.photo?.visibility || photo.visibility,
                });
                anyChangesApplied = true;
              }
            }
          } else if (entityType === 'CLUSTER') {
            if (operation === 'ADD' || operation === 'UPDATE') {
              const globalClusterId = op.entityId;
              const existing = await db.clusters.where('globalClusterId').equals(globalClusterId).first();

              const clusterData = {
                globalClusterId,
                location: op.cluster?.location,
                photoCount: op.cluster?.photoCount || 0,
                visibility: op.cluster?.visibility || 'PRIVATE',
                publicPhotoCount: op.cluster?.publicPhotoCount || 0,
                privatePhotoCount: op.cluster?.privatePhotoCount || 0,
                friendPhotoCount: op.cluster?.friendPhotoCount || 0,
              };

              if (existing) {
                await db.clusters.update(existing.localClusterId, clusterData);
              } else {
                await db.clusters.add(clusterData);
              }
              anyChangesApplied = true;
            } else if (operation === 'DELETE') {
              const globalClusterId = op.entityId;
              const cluster = await db.clusters.where('globalClusterId').equals(globalClusterId).first();
              if (cluster) {
                await db.clusters.delete(cluster.localClusterId);
                anyChangesApplied = true;
              }
            }
          }

          latestOpId = Math.max(latestOpId, Number(op.operationId));
          await setSyncMetadata('lastSyncedOperationId', latestOpId);
        } catch (opErr) {
          console.error(`[SyncEngine] Error applying pulled operation ${op.operationId}:`, opErr);
        }
      }

      if (!pullResponse.hasMore && operations.length < pullBatchSize) {
        break;
      }
    }

    if (anyChangesApplied) {
      notifyRepositoryChanged();
    }
  },
};

export default syncEngine;
