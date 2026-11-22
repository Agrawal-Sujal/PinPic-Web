import db from '../db/appDatabase';
import { resolvePhotoUrl, localPhotoRepository } from './localPhotoRepository';
import { format } from 'date-fns';

const eventTarget = new EventTarget();
const COLLECTION_CHANGE_EVENT = 'pinpic_collection_changed';

export const notifyCollectionChanged = () => {
  eventTarget.dispatchEvent(new Event(COLLECTION_CHANGE_EVENT));
};

export const localCollectionRepository = {
  /**
   * Subscribe to collection database mutations
   */
  subscribe: (callback) => {
    const handler = () => callback();
    eventTarget.addEventListener(COLLECTION_CHANGE_EVENT, handler);
    return () => eventTarget.removeEventListener(COLLECTION_CHANGE_EVENT, handler);
  },

  /**
   * Helper to retrieve photo entities by array of photo IDs (local or global)
   */
  getPhotosForIds: async (photoIds = []) => {
    if (!photoIds || photoIds.length === 0) return [];

    const numIds = photoIds.map(Number).filter((n) => !isNaN(n));
    const strIds = photoIds.map(String);

    const [byLocal, byGlobal] = await Promise.all([
      numIds.length > 0 ? db.photos.where('localPhotoId').anyOf(numIds).toArray() : [],
      strIds.length > 0 ? db.photos.where('globalPhotoId').anyOf(strIds).toArray() : [],
    ]);

    const combined = [...byLocal, ...byGlobal];
    const map = new Map();

    for (const p of combined) {
      if (p && !p.isDeleted) {
        const key = String(p.localPhotoId || p.globalPhotoId);
        if (!map.has(key)) {
          const resolvedUrl = resolvePhotoUrl(p);
          map.set(key, {
            ...p,
            name: p.photoName || p.name || 'Photo',
            photoId: p.globalPhotoId || String(p.localPhotoId),
            clusterId: p.globalClusterId || (p.clusterId ? String(p.clusterId) : null),
            photoUrl: resolvedUrl,
            downloadUrl: resolvedUrl,
          });
        }
      }
    }

    return Array.from(map.values());
  },

  /**
   * Helper to fetch a single photo by ID
   */
  getPhotoByIdHelper: async (photoId) => {
    if (!photoId) return null;
    const numId = Number(photoId);
    let p = null;
    if (!isNaN(numId)) {
      p = await db.photos.get(numId);
    }
    if (!p) {
      p = await db.photos.where('globalPhotoId').equals(String(photoId)).first();
    }
    if (!p || p.isDeleted) return null;

    const resolvedUrl = resolvePhotoUrl(p);
    return {
      ...p,
      name: p.photoName || p.name || 'Photo',
      photoId: p.globalPhotoId || String(p.localPhotoId),
      photoUrl: resolvedUrl,
      downloadUrl: resolvedUrl,
    };
  },

  /**
   * Create a new collection (e.g. trip)
   */
  createCollection: async ({
    type = 'trip',
    title,
    description = '',
    coverPhotoId = null,
    photoIds = [],
    dayNotes = {},
  }) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const stringPhotoIds = photoIds.map(String);

    const collection = {
      id,
      type: type || 'trip',
      title: title?.trim() || 'Untitled Trip',
      description: description?.trim() || '',
      coverPhotoId: coverPhotoId ? String(coverPhotoId) : (stringPhotoIds[0] || null),
      photoIds: stringPhotoIds,
      dayNotes: dayNotes || {},
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    await db.collections.put(collection);
    notifyCollectionChanged();
    return collection;
  },

  /**
   * Retrieve all active collections enriched with cover photo & summary info
   */
  getAllCollections: async () => {
    try {
      const raw = await db.collections.toArray();
      const active = raw.filter((c) => !c.isDeleted);

      const enriched = await Promise.all(
        active.map(async (c) => {
          let coverPhoto = null;
          if (c.coverPhotoId) {
            coverPhoto = await localCollectionRepository.getPhotoByIdHelper(c.coverPhotoId);
          }
          if (!coverPhoto && c.photoIds && c.photoIds.length > 0) {
            coverPhoto = await localCollectionRepository.getPhotoByIdHelper(c.photoIds[0]);
          }

          // Calculate date range from member photos
          const memberPhotos = await localCollectionRepository.getPhotosForIds(c.photoIds);
          const timestamps = memberPhotos
            .map((p) => (p.takenAt ? new Date(p.takenAt).getTime() : null))
            .filter((t) => t != null && !isNaN(t))
            .sort((a, b) => a - b);

          const startDate = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : c.createdAt;
          const endDate = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : c.createdAt;

          return {
            ...c,
            coverPhoto,
            photoCount: c.photoIds ? c.photoIds.length : 0,
            startDate,
            endDate,
          };
        })
      );

      enriched.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      return enriched;
    } catch (err) {
      console.error('Error in getAllCollections:', err);
      return [];
    }
  },

  /**
   * Retrieve single collection by ID with full chronological Day-by-Day grouping
   */
  getCollectionById: async (id) => {
    try {
      if (!id) return null;
      const collection = await db.collections.get(id);
      if (!collection || collection.isDeleted) return null;

      // Fetch member photos
      const photos = await localCollectionRepository.getPhotosForIds(collection.photoIds);

      // Sort photos chronologically in time order (ascending)
      photos.sort((a, b) => new Date(a.takenAt || 0) - new Date(b.takenAt || 0));

      // Resolve cover photo
      let coverPhoto = null;
      if (collection.coverPhotoId) {
        coverPhoto = photos.find(
          (p) =>
            String(p.localPhotoId) === String(collection.coverPhotoId) ||
            String(p.globalPhotoId) === String(collection.coverPhotoId)
        );
      }
      if (!coverPhoto && photos.length > 0) {
        coverPhoto = photos[0];
      }

      // Group photos into Day 1, Day 2, Day 3...
      const daysMap = new Map();
      for (const p of photos) {
        const dateObj = p.takenAt ? new Date(p.takenAt) : new Date(collection.createdAt);
        const dateKey = !isNaN(dateObj.getTime()) ? format(dateObj, 'yyyy-MM-dd') : 'day-1';

        if (!daysMap.has(dateKey)) {
          daysMap.set(dateKey, {
            dateKey,
            date: dateObj,
            photos: [],
          });
        }
        daysMap.get(dateKey).photos.push(p);
      }

      const sortedDateKeys = Array.from(daysMap.keys()).sort();
      const days = sortedDateKeys.map((key, idx) => {
        const dayData = daysMap.get(key);
        const dayNumber = idx + 1;
        const note =
          collection.dayNotes?.[key] ||
          collection.dayNotes?.[`day-${dayNumber}`] ||
          '';

        return {
          dayNumber,
          dateKey: key,
          date: dayData.date,
          formattedDate: !isNaN(dayData.date.getTime())
            ? format(dayData.date, 'EEEE, MMM d, yyyy')
            : `Day ${dayNumber}`,
          photos: dayData.photos,
          note,
        };
      });

      const timestamps = photos
        .map((p) => (p.takenAt ? new Date(p.takenAt).getTime() : null))
        .filter((t) => t != null && !isNaN(t))
        .sort((a, b) => a - b);

      const startDate = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : collection.createdAt;
      const endDate = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : collection.createdAt;

      return {
        ...collection,
        photos,
        coverPhoto,
        days,
        photoCount: photos.length,
        startDate,
        endDate,
        durationDays: Math.max(1, days.length),
      };
    } catch (err) {
      console.error(`Error in getCollectionById(${id}):`, err);
      return null;
    }
  },

  /**
   * Update or add a day note in a collection
   */
  updateDayNote: async (collectionId, dayKey, note) => {
    const collection = await db.collections.get(collectionId);
    if (!collection) return;

    const dayNotes = { ...(collection.dayNotes || {}), [dayKey]: note };
    await db.collections.update(collectionId, {
      dayNotes,
      updatedAt: new Date().toISOString(),
    });
    notifyCollectionChanged();
  },

  /**
   * Remove a photo from a collection without deleting the photo itself
   */
  removePhotoFromCollection: async (collectionId, photoId) => {
    const collection = await db.collections.get(collectionId);
    if (!collection) return;

    const strId = String(photoId);
    const newPhotoIds = (collection.photoIds || []).filter((id) => String(id) !== strId);

    const updates = {
      photoIds: newPhotoIds,
      updatedAt: new Date().toISOString(),
    };

    if (String(collection.coverPhotoId) === strId) {
      updates.coverPhotoId = newPhotoIds.length > 0 ? newPhotoIds[0] : null;
    }

    await db.collections.update(collectionId, updates);
    notifyCollectionChanged();
  },

  /**
   * Delete a collection.
   * If deletePhotos is true, deletes all photos in the collection from local db.
   * Otherwise (default), keeps photos in the database and only deletes the collection record.
   */
  deleteCollection: async (collectionId, deletePhotos = false) => {
    const collection = await db.collections.get(collectionId);
    if (!collection) return;

    if (deletePhotos && collection.photoIds && collection.photoIds.length > 0) {
      await localPhotoRepository.deletePhotos(collection.photoIds);
    }

    await db.collections.update(collectionId, {
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    });

    notifyCollectionChanged();
  },

  /**
   * Update collection metadata (title, description, coverPhotoId)
   */
  updateCollection: async (collectionId, updates) => {
    await db.collections.update(collectionId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    notifyCollectionChanged();
  },
};

export default localCollectionRepository;
