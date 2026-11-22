import db from '../db/appDatabase';
import { resolvePhotoUrl, localPhotoRepository } from './localPhotoRepository';
import { format } from 'date-fns';

const eventTarget = new EventTarget();
const COLLECTION_CHANGE_EVENT = 'pinpic_collection_changed';

export const notifyCollectionChanged = () => {
  eventTarget.dispatchEvent(new Event(COLLECTION_CHANGE_EVENT));
};

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates
 */
export function haversineDistance(c1, c2) {
  if (!c1 || !c2) return Infinity;
  const lat1 = c1.lat ?? c1.latitude;
  const lon1 = c1.lng ?? c1.lon ?? c1.longitude;
  const lat2 = c2.lat ?? c2.latitude;
  const lon2 = c2.lng ?? c2.lon ?? c2.longitude;

  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes geographic centroid of a list of photos
 */
export function calculateCentroid(photos = []) {
  const geo = photos.filter(
    (p) => p.location?.latitude != null && p.location?.longitude != null
  );
  if (geo.length === 0) return null;
  const latSum = geo.reduce((sum, p) => sum + p.location.latitude, 0);
  const lngSum = geo.reduce((sum, p) => sum + p.location.longitude, 0);
  return { lat: latSum / geo.length, lng: lngSum / geo.length };
}

/**
 * Groups photos into Time of Day buckets for Event collection:
 * - Morning: 05:00 - 11:59
 * - Afternoon / Ceremony: 12:00 - 16:59
 * - Evening: 17:00 - 20:59
 * - Night / Party: 21:00 - 04:59
 */
export function groupPhotosByTimeOfDay(photos = [], customLabels = {}) {
  const buckets = [
    {
      id: 'morning',
      defaultLabel: 'Morning',
      icon: '🌅',
      timeRange: '5:00 AM – 11:59 AM',
      photos: [],
    },
    {
      id: 'afternoon',
      defaultLabel: 'Afternoon / Ceremony',
      icon: '☀️',
      timeRange: '12:00 PM – 4:59 PM',
      photos: [],
    },
    {
      id: 'evening',
      defaultLabel: 'Evening / Reception',
      icon: '🌆',
      timeRange: '5:00 PM – 8:59 PM',
      photos: [],
    },
    {
      id: 'night',
      defaultLabel: 'Late Night / Party',
      icon: '🌙',
      timeRange: '9:00 PM – 4:59 AM',
      photos: [],
    },
  ];

  for (const p of photos) {
    const d = p.takenAt ? new Date(p.takenAt) : new Date();
    const hour = !isNaN(d.getTime()) ? d.getHours() : 12;

    if (hour >= 5 && hour < 12) {
      buckets[0].photos.push(p);
    } else if (hour >= 12 && hour < 17) {
      buckets[1].photos.push(p);
    } else if (hour >= 17 && hour < 21) {
      buckets[2].photos.push(p);
    } else {
      buckets[3].photos.push(p);
    }
  }

  // Filter to only non-empty buckets and apply custom labels if user renamed them
  return buckets
    .filter((b) => b.photos.length > 0)
    .map((b) => ({
      ...b,
      label: customLabels[b.id] || b.defaultLabel,
    }));
}

/**
 * Groups photos into stops for Day Out collection
 * Based on temporal gap (> 45 mins) or spatial gap (> 400m)
 */
export function groupPhotosIntoStops(photos = [], customNames = {}) {
  if (!photos || photos.length === 0) return [];

  const sorted = [...photos].sort(
    (a, b) => new Date(a.takenAt || 0) - new Date(b.takenAt || 0)
  );
  const rawStops = [];
  let currentGroup = [];

  for (let i = 0; i < sorted.length; i++) {
    const photo = sorted[i];
    if (currentGroup.length === 0) {
      currentGroup.push(photo);
      continue;
    }

    const prev = currentGroup[currentGroup.length - 1];
    const prevTime = prev.takenAt ? new Date(prev.takenAt).getTime() : 0;
    const currTime = photo.takenAt ? new Date(photo.takenAt).getTime() : 0;
    const timeDiffMins = (currTime - prevTime) / (1000 * 60);

    let distanceMeters = 0;
    if (
      prev.location?.latitude != null &&
      prev.location?.longitude != null &&
      photo.location?.latitude != null &&
      photo.location?.longitude != null
    ) {
      distanceMeters = haversineDistance(prev.location, photo.location) * 1000;
    }

    // Split into new stop if gap > 45 mins or distance > 400m
    if (timeDiffMins > 45 || distanceMeters > 400) {
      rawStops.push(currentGroup);
      currentGroup = [photo];
    } else {
      currentGroup.push(photo);
    }
  }
  if (currentGroup.length > 0) rawStops.push(currentGroup);

  return rawStops.map((group, idx) => {
    const first = group[0];
    const d = first.takenAt ? new Date(first.takenAt) : null;
    const timeStr = d && !isNaN(d.getTime()) ? format(d, 'h:mm a') : '';
    const defaultPlace =
      first.location?.locationName || `Stop ${idx + 1}`;
    const name = customNames[String(idx)] || defaultPlace;

    return {
      stopIndex: idx,
      time: timeStr,
      placeName: name,
      defaultPlaceName: defaultPlace,
      location: first.location || null,
      photos: group,
    };
  });
}

export const localCollectionRepository = {
  subscribe: (callback) => {
    const handler = () => callback();
    eventTarget.addEventListener(COLLECTION_CHANGE_EVENT, handler);
    return () => eventTarget.removeEventListener(COLLECTION_CHANGE_EVENT, handler);
  },

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
   * Create a new collection (trip, visit, event, day_out, custom)
   */
  createCollection: async ({
    type = 'trip',
    title,
    description = '',
    coverPhotoId = null,
    photoIds = [],
    dayNotes = {},
    whoWasThere = '',
    eventDate = null,
    timeBucketLabels = {},
    stopNames = {},
    sortOrder = 'newest',
  }) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const stringPhotoIds = photoIds.map(String);

    // Compute geographic centroid for location-centric types (visit, trip, event)
    const memberPhotos = await localCollectionRepository.getPhotosForIds(stringPhotoIds);
    const centroid = calculateCentroid(memberPhotos);

    const collection = {
      id,
      type: type || 'trip',
      title: title?.trim() || 'Untitled Collection',
      description: description?.trim() || '',
      coverPhotoId: coverPhotoId ? String(coverPhotoId) : (stringPhotoIds[0] || null),
      photoIds: stringPhotoIds,
      dayNotes: dayNotes || {},
      whoWasThere: whoWasThere?.trim() || '',
      centroid: centroid || null,
      eventDate: eventDate || null,
      timeBucketLabels: timeBucketLabels || {},
      stopNames: stopNames || {},
      sortOrder: sortOrder || 'newest',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    await db.collections.put(collection);
    notifyCollectionChanged();
    return collection;
  },

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
   * Find earlier visits within 5 km of the given centroid
   */
  findEarlierVisits: async (currentCollectionId, centroid, currentTimestamp) => {
    if (!centroid) return [];
    try {
      const all = await localCollectionRepository.getAllCollections();
      const earlierVisits = all.filter((c) => {
        if (c.id === currentCollectionId || c.type !== 'visit' || c.isDeleted) return false;
        if (!c.centroid) return false;

        const dist = haversineDistance(centroid, c.centroid);
        if (dist > 5.0) return false; // Within 5 km

        // Must be earlier than the current visit
        const cTime = new Date(c.startDate || c.createdAt).getTime();
        const curTime = new Date(currentTimestamp || Date.now()).getTime();
        return cTime < curTime;
      });

      return earlierVisits;
    } catch (err) {
      console.error('Error in findEarlierVisits:', err);
      return [];
    }
  },

  getCollectionById: async (id) => {
    try {
      if (!id) return null;
      const collection = await db.collections.get(id);
      if (!collection || collection.isDeleted) return null;

      // Fetch member photos
      let photos = await localCollectionRepository.getPhotosForIds(collection.photoIds);

      // Sort photos chronologically by default
      if (collection.sortOrder === 'oldest') {
        photos.sort((a, b) => new Date(a.takenAt || 0) - new Date(b.takenAt || 0));
      } else if (collection.sortOrder === 'newest') {
        photos.sort((a, b) => new Date(b.takenAt || 0) - new Date(a.takenAt || 0));
      } else {
        // Default chronological order for trip, visit, event, day_out
        photos.sort((a, b) => new Date(a.takenAt || 0) - new Date(b.takenAt || 0));
      }

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

      const timestamps = photos
        .map((p) => (p.takenAt ? new Date(p.takenAt).getTime() : null))
        .filter((t) => t != null && !isNaN(t))
        .sort((a, b) => a - b);

      const startDate = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : collection.createdAt;
      const endDate = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : collection.createdAt;

      // Calculate centroid if missing
      const centroid = collection.centroid || calculateCentroid(photos);

      // 1. Trip Day grouping
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

      // 2. Visit: Query earlier visits within 5km
      let earlierVisits = [];
      if (collection.type === 'visit' && centroid) {
        earlierVisits = await localCollectionRepository.findEarlierVisits(
          collection.id,
          centroid,
          startDate
        );
      }

      // 3. Event: Group by Time of Day
      const timeBuckets =
        collection.type === 'event'
          ? groupPhotosByTimeOfDay(photos, collection.timeBucketLabels || {})
          : [];

      // 4. Day Out: Group into stops
      const stops =
        collection.type === 'day_out'
          ? groupPhotosIntoStops(photos, collection.stopNames || {})
          : [];

      return {
        ...collection,
        photos,
        coverPhoto,
        days,
        earlierVisits,
        timeBuckets,
        stops,
        centroid,
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

  addPhotosToCollection: async (collectionId, newPhotoIds = []) => {
    const collection = await db.collections.get(collectionId);
    if (!collection) return;

    const currentSet = new Set((collection.photoIds || []).map(String));
    newPhotoIds.forEach((id) => currentSet.add(String(id)));

    const updatedPhotoIds = Array.from(currentSet);
    const memberPhotos = await localCollectionRepository.getPhotosForIds(updatedPhotoIds);
    const centroid = calculateCentroid(memberPhotos);

    await db.collections.update(collectionId, {
      photoIds: updatedPhotoIds,
      centroid: centroid || collection.centroid || null,
      updatedAt: new Date().toISOString(),
    });
    notifyCollectionChanged();
  },

  updateCollectionMetadata: async (collectionId, updates = {}) => {
    await db.collections.update(collectionId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    notifyCollectionChanged();
  },

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

  updateCollection: async (collectionId, updates) => {
    await db.collections.update(collectionId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    notifyCollectionChanged();
  },
};

export default localCollectionRepository;
