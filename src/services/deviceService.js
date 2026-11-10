import { deviceApi } from '../api/deviceApi';
import { getSyncMetadata, setSyncMetadata } from '../db/appDatabase';

const DEVICE_ID_KEY = 'pinpic_device_id';

export const deviceService = {
  getOrRegisterDeviceId: async (userId = null) => {
    // 1. Check local storage / DB cache
    let cachedId = await getSyncMetadata('deviceId');
    if (!cachedId) {
      cachedId = localStorage.getItem(DEVICE_ID_KEY);
    }
    if (cachedId) {
      return cachedId;
    }

    // 2. Build human-readable browser / device descriptor
    const browserInfo = (() => {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return 'Chrome Web';
      if (ua.includes('Firefox')) return 'Firefox Web';
      if (ua.includes('Safari')) return 'Safari Web';
      if (ua.includes('Edge')) return 'Edge Web';
      return 'Web Browser';
    })();
    const platform = navigator.platform || 'Desktop';
    const deviceName = `${browserInfo} (${platform})`.slice(0, 60);

    try {
      const res = await deviceApi.registerDevice({
        device: deviceName,
        userId: userId || undefined,
      });

      const newDeviceId = res?.deviceId;
      if (newDeviceId) {
        await setSyncMetadata('deviceId', newDeviceId);
        localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
        return newDeviceId;
      }
    } catch (err) {
      console.warn('Failed to register device with backend:', err);
    }

    // Fallback: generate a client UUID if backend fails, so sync queue can still operate
    let fallbackId = localStorage.getItem(DEVICE_ID_KEY);
    if (!fallbackId) {
      fallbackId = `web-${crypto.randomUUID()}`;
      localStorage.setItem(DEVICE_ID_KEY, fallbackId);
      await setSyncMetadata('deviceId', fallbackId);
    }
    return fallbackId;
  },

  getCurrentDeviceId: () => {
    return localStorage.getItem(DEVICE_ID_KEY) || null;
  },
};

export default deviceService;
