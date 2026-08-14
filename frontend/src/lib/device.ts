// $lib/device.ts

export interface DeviceProfile {
  id: string | null;
  os: string;
  browser: string;
  label: string; 
}

export function getDeviceProfile(): DeviceProfile {
  const ua = navigator.userAgent;

  // Detect Operating System
  let os = 'Unknown OS';
  if (/Win/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Detect Browser and Major Version
  let browser = 'Unknown Browser';
  const browserMatch = ua.match(/(firefox|msie|trident|chrome|safari|edg)\/?\s*(\d+(\.\d+)*)/i);
  
  if (browserMatch) {
    let name = browserMatch[1].toLowerCase();
    const version = browserMatch[2].split('.')[0]; // Grab just the major version for a cleaner label

    // Normalize browser names
    if (name === 'trident' || name === 'msie') name = 'IE';
    if (name === 'edg') name = 'Edge';

    // Disambiguate Chrome vs Safari vs Edge
    if (ua.includes('Edg/')) name = 'Edge';
    else if (ua.includes('Chrome') && name === 'safari') name = 'Chrome';

    browser = `${name.charAt(0).toUpperCase() + name.slice(1)} ${version}`;
  }

  // Handle UUID in Local Storage
  const STORAGE_KEY = 'gnagplus_device_id';
  let deviceId: string | null = crypto.randomUUID(); // Fallback in case localStorage is unavailable

  try {
    deviceId = localStorage.getItem(STORAGE_KEY);
    if (!deviceId) {
      deviceId = os + '-' + browser + '-' + crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, deviceId);
    }
  } catch (err) {
    console.warn('LocalStorage is blocked or unavailable:', err);
  }

  return {
    id: deviceId,
    os,
    browser,
    label: `${os} - ${browser}`
  };
}

export function getDeviceId(): string {
  const profile = getDeviceProfile();
  return profile.id || 'unknown-device';
}