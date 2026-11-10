import { useState, useEffect } from 'react';
import syncScheduler from '../sync/syncScheduler';

export const useSyncStatus = () => {
  const [isSyncing, setIsSyncing] = useState(() => syncScheduler.getIsSyncing());

  useEffect(() => {
    return syncScheduler.subscribeSyncStatus((syncing) => {
      setIsSyncing(syncing);
    });
  }, []);

  const triggerSync = (userId = null) => {
    syncScheduler.scheduleSync(userId);
  };

  return { isSyncing, triggerSync };
};

export default useSyncStatus;
