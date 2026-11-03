/**
 * COLIN Local Profile Photo Storage (IndexedDB with LocalStorage Fallback)
 * Stores local high-resolution student avatars securely without quota overflows.
 */

const DB_NAME = 'colin_student_db';
const STORE_NAME = 'profile_photos';
const DB_VERSION = 1;
const PHOTO_KEY = 'student_avatar';
const LOCAL_STORAGE_FALLBACK_KEY = 'colin_student_avatar_fallback';

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Validates selected file for type and size constraints
 */
export function validateProfilePhotoFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPEG, PNG, or WebP).',
    };
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image size (${sizeMb} MB) exceeds maximum allowed limit of 5 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Converts File object to base64 DataURL
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
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
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves profile photo to IndexedDB with localStorage fallback
 */
export async function saveProfilePhoto(dataUrl: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrl, PHOTO_KEY);

      req.onsuccess = () => {
        // Also keep sync flag
        localStorage.setItem('colin_has_custom_avatar', 'true');
        resolve(true);
      };
      req.onerror = () => {
        try {
          localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, dataUrl);
          resolve(true);
        } catch {
          resolve(false);
        }
      };
    });
  } catch {
    try {
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, dataUrl);
      localStorage.setItem('colin_has_custom_avatar', 'true');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Retrieves the stored profile photo
 */
export async function getProfilePhoto(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(PHOTO_KEY);

      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as string);
        } else {
          resolve(localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY));
        }
      };
      req.onerror = () => {
        resolve(localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY));
      };
    });
  } catch {
    return localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
  }
}

/**
 * Removes custom profile photo from storage
 */
export async function deleteProfilePhoto(): Promise<boolean> {
  localStorage.removeItem(LOCAL_STORAGE_FALLBACK_KEY);
  localStorage.removeItem('colin_has_custom_avatar');

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(PHOTO_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(true);
    });
  } catch {
    return true;
  }
}
