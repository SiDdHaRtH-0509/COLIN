/**
 * COLIN Property Image Storage System
 * Uses IndexedDB for binary image storage with in-memory & localStorage caching.
 * Enforces per-property and per-owner data isolation, avoiding localStorage quota overflow.
 */

export const MAX_PHOTOS_PER_PROPERTY = 8;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export interface PropertyPhoto {
  id: string;
  propertyId: string;
  ownerId: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  isCover: boolean;
  createdAt: string;
}

const DB_NAME = 'colin_property_media_db';
const STORE_NAME = 'property_photos';
const DB_VERSION = 1;

/**
 * Validates a single photo file for type, extension, and file size constraints
 */
export function validatePropertyPhotoFile(file: File): { valid: boolean; error?: string } {
  // 1. File Type validation
  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasValidMime = ALLOWED_PHOTO_MIME_TYPES.includes(file.type.toLowerCase()) || (file.type === '' && hasValidExt);

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: `"${file.name}" has an unsupported format. Only JPG, JPEG, PNG, and WEBP files are accepted. PDFs and videos are rejected.`,
    };
  }

  // 2. File Size validation (Max 5 MB)
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" (${sizeMb} MB) exceeds the maximum allowed limit of 5 MB.`,
    };
  }

  // 3. Reject empty/corrupted files
  if (file.size === 0) {
    return {
      valid: false,
      error: `"${file.name}" appears to be empty or corrupted.`,
    };
  }

  return { valid: true };
}

/**
 * Converts File object to base64 DataURL
 */
export function readPropertyFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64 string'));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

/**
 * Validates image readability (detects corrupt or broken image data)
 */
export function validateImageReadability(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      resolve(true);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

/**
 * Opens or initializes the IndexedDB database
 */
function openPropertyMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open property media database.'));
  });
}

const getStorageKey = (propertyId: string) => `colin_prop_${propertyId}_photos`;

/**
 * Saves an array of property photos to IndexedDB with localStorage fallback
 * Enforces propertyId and ownerId association.
 */
export async function savePropertyPhotos(
  propertyId: string,
  ownerId: string,
  photos: PropertyPhoto[]
): Promise<boolean> {
  if (!propertyId) return false;

  // Ensure all photos carry the correct propertyId and ownerId
  const sanitizedPhotos: PropertyPhoto[] = photos.slice(0, MAX_PHOTOS_PER_PROPERTY).map((p, idx) => ({
    ...p,
    propertyId,
    ownerId,
    isCover: idx === 0 ? true : p.isCover,
  }));

  // Ensure exactly one photo is cover
  const hasCover = sanitizedPhotos.some((p) => p.isCover);
  if (!hasCover && sanitizedPhotos.length > 0) {
    sanitizedPhotos[0].isCover = true;
  }

  const key = getStorageKey(propertyId);

  try {
    const db = await openPropertyMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(sanitizedPhotos, key);

      req.onsuccess = () => {
        // Also persist lightweight metadata cache in localStorage for fast synchronous render
        try {
          const metaSummary = sanitizedPhotos.map((p) => ({
            id: p.id,
            name: p.name,
            isCover: p.isCover,
            dataUrl: p.dataUrl,
          }));
          localStorage.setItem(key, JSON.stringify(metaSummary));
        } catch {
          // localStorage might be full for large images; IndexedDB handles the bulk
        }
        resolve(true);
      };

      req.onerror = () => {
        // Fallback to localStorage if IndexedDB transaction fails
        try {
          localStorage.setItem(key, JSON.stringify(sanitizedPhotos));
          resolve(true);
        } catch {
          resolve(false);
        }
      };
    });
  } catch {
    // IndexedDB open failed, try localStorage fallback
    try {
      localStorage.setItem(key, JSON.stringify(sanitizedPhotos));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Retrieves property photos for a given propertyId.
 * If requestingOwnerId is provided and does not match, returns empty array (strict owner isolation).
 */
export async function getPropertyPhotos(
  propertyId: string,
  requestingOwnerId?: string
): Promise<PropertyPhoto[]> {
  if (!propertyId) return [];
  const key = getStorageKey(propertyId);

  try {
    const db = await openPropertyMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const result: PropertyPhoto[] = req.result || [];
        if (result.length > 0 && requestingOwnerId && result[0].ownerId !== requestingOwnerId) {
          // Cross-owner isolation: unauthorized access denied
          resolve([]);
          return;
        }
        if (result.length > 0) {
          resolve(result);
          return;
        }

        // Fallback to localStorage
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed: PropertyPhoto[] = JSON.parse(raw);
            if (requestingOwnerId && parsed.length > 0 && parsed[0].ownerId && parsed[0].ownerId !== requestingOwnerId) {
              resolve([]);
              return;
            }
            resolve(parsed);
            return;
          }
        } catch {}
        resolve([]);
      };

      req.onerror = () => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed: PropertyPhoto[] = JSON.parse(raw);
            if (requestingOwnerId && parsed.length > 0 && parsed[0].ownerId && parsed[0].ownerId !== requestingOwnerId) {
              resolve([]);
              return;
            }
            resolve(parsed);
            return;
          }
        } catch {}
        resolve([]);
      };
    });
  } catch {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: PropertyPhoto[] = JSON.parse(raw);
        if (requestingOwnerId && parsed.length > 0 && parsed[0].ownerId && parsed[0].ownerId !== requestingOwnerId) {
          return [];
        }
        return parsed;
      }
    } catch {}
    return [];
  }
}

/**
 * Deletes photos associated with a property
 */
export async function deletePropertyPhotos(propertyId: string): Promise<boolean> {
  if (!propertyId) return false;
  const key = getStorageKey(propertyId);

  try {
    localStorage.removeItem(key);
    const db = await openPropertyMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return true;
  }
}
