/**
 * Client Device ID Generator & Storage
 * Uses crypto.getRandomValues (guaranteed to work on plain HTTP across LAN,
 * unlike crypto.randomUUID which is restricted to secure contexts/HTTPS).
 */
export function getOrCreateDeviceId() {
  const STORAGE_KEY = 'edusphere_device_id';
  try {
    let deviceId = localStorage.getItem(STORAGE_KEY);
    if (!deviceId || deviceId.trim().length < 8) {
      const bytes = new Uint8Array(16);
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(bytes);
        deviceId = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
      }
      localStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_fallback_' + Date.now().toString(36);
  }
}
