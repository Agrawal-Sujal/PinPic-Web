import { syncEngine } from './syncEngine';

const syncEventTarget = new EventTarget();
const SYNC_STATUS_EVENT = 'pinpic_sync_status';

let isSyncing = false;
let isSyncQueued = false;
let periodicIntervalId = null;
let debounceTimeoutId = null;
let activeUserId = null;
let listenersAttached = false;

const getFallbackUserId = () => {
  if (activeUserId) return activeUserId;
  try {
    const saved = localStorage.getItem('pinpic_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.userId || parsed.id || null;
    }
  } catch (_) {}
  return null;
};

const setSyncStatus = (status) => {
  if (isSyncing !== status) {
    isSyncing = status;
    syncEventTarget.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: { isSyncing } }));
  }
};

const handleOnlineEvent = () => {
  console.log('[SyncScheduler] Browser came online. Triggering sync...');
  syncScheduler.scheduleSync(getFallbackUserId());
};

const handleVisibilityChangeEvent = () => {
  if (document.visibilityState === 'visible') {
    console.log('[SyncScheduler] App tab became visible. Triggering sync...');
    syncScheduler.scheduleSync(getFallbackUserId());
  }
};

export const syncScheduler = {
  /**
   * Check if sync is actively executing
   */
  getIsSyncing: () => isSyncing,

  /**
   * Subscribe to sync state changes (true when pushing/pulling, false when idle)
   */
  subscribeSyncStatus: (callback) => {
    const handler = (e) => callback(e.detail.isSyncing);
    syncEventTarget.addEventListener(SYNC_STATUS_EVENT, handler);
    return () => syncEventTarget.removeEventListener(SYNC_STATUS_EVENT, handler);
  },

  /**
   * Schedule immediate sync (debounced slightly to coalesce rapid mutations)
   */
  scheduleSync: (userId = null) => {
    if (userId) activeUserId = userId;
    const resolvedUid = userId || getFallbackUserId();

    if (isSyncing) {
      isSyncQueued = true;
      return;
    }

    if (debounceTimeoutId) {
      clearTimeout(debounceTimeoutId);
    }

    debounceTimeoutId = setTimeout(async () => {
      setSyncStatus(true);
      try {
        await syncEngine.executeSync(resolvedUid);
      } finally {
        setSyncStatus(false);
        if (isSyncQueued) {
          isSyncQueued = false;
          syncScheduler.scheduleSync(getFallbackUserId());
        }
      }
    }, 300);
  },

  /**
   * Start periodic background sync and window/network listeners
   */
  startPeriodicSync: (userId = null) => {
    if (userId) activeUserId = userId;
    const resolvedUid = activeUserId || getFallbackUserId();

    // Attach online and tab visibility listeners once
    if (!listenersAttached && typeof window !== 'undefined') {
      window.addEventListener('online', handleOnlineEvent);
      document.addEventListener('visibilitychange', handleVisibilityChangeEvent);
      listenersAttached = true;
    }

    // Run immediate sync on start
    syncScheduler.scheduleSync(resolvedUid);

    // Set recurring sync heartbeat (every 15 seconds)
    if (!periodicIntervalId && typeof window !== 'undefined') {
      periodicIntervalId = setInterval(() => {
        if (!isSyncing && navigator.onLine) {
          syncScheduler.scheduleSync(getFallbackUserId());
        }
      }, 15000);
    }
  },

  /**
   * Stop periodic sync (e.g. on user logout)
   */
  stopPeriodicSync: () => {
    if (periodicIntervalId) {
      clearInterval(periodicIntervalId);
      periodicIntervalId = null;
    }
    if (debounceTimeoutId) {
      clearTimeout(debounceTimeoutId);
      debounceTimeoutId = null;
    }
    if (listenersAttached && typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnlineEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChangeEvent);
      listenersAttached = false;
    }
    activeUserId = null;
    setSyncStatus(false);
    syncEngine.cancelSync();
  },
};

export default syncScheduler;
