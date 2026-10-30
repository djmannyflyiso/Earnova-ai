export type GalleryVideo = {
  id: string;
  profileId: number;
  taskId: number;
  taskTitle: string;
  name: string;
  createdAt: string;
  durationSeconds: number;
  mime: string;
  size: number;
  blob: Blob;
  privacyProtected: boolean;
  publicSharingProhibited: boolean;
  exportedAt: string | null;
};

const DB_NAME = "earnova-local-video-gallery";
const DB_VERSION = 1;
const STORE_NAME = "videos";

function openGalleryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("The local video gallery could not be opened."));
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction?.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: "id" });
      if (store && !store.indexNames.contains("profileId")) store.createIndex("profileId", "profileId", { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("The local gallery could not be updated."));
    transaction.onabort = () => reject(transaction.error ?? new Error("The local gallery update was cancelled."));
  });
}

export async function listGalleryVideos(profileId: number): Promise<GalleryVideo[]> {
  const db = await openGalleryDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).index("profileId").getAll(profileId);
    const rows = await new Promise<GalleryVideo[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as GalleryVideo[]);
      request.onerror = () => reject(request.error ?? new Error("Videos could not be loaded."));
    });
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally {
    db.close();
  }
}

export async function saveGalleryVideo(input: Omit<GalleryVideo, "id" | "createdAt" | "exportedAt">): Promise<GalleryVideo> {
  const row: GalleryVideo = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    exportedAt: null,
  };
  const db = await openGalleryDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(row);
    await waitForTransaction(transaction);
    return row;
  } finally {
    db.close();
  }
}

async function updateGalleryVideo(id: string, update: (video: GalleryVideo) => GalleryVideo): Promise<GalleryVideo> {
  const db = await openGalleryDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    const row = await new Promise<GalleryVideo>((resolve, reject) => {
      request.onsuccess = () => request.result ? resolve(request.result as GalleryVideo) : reject(new Error("Video not found."));
      request.onerror = () => reject(request.error ?? new Error("Video could not be loaded."));
    });
    const next = update(row);
    store.put(next);
    await waitForTransaction(transaction);
    return next;
  } finally {
    db.close();
  }
}

export function renameGalleryVideo(id: string, name: string): Promise<GalleryVideo> {
  return updateGalleryVideo(id, (video) => ({ ...video, name: name.trim() }));
}

export function markGalleryVideoExported(id: string): Promise<GalleryVideo> {
  return updateGalleryVideo(id, (video) => ({ ...video, exportedAt: new Date().toISOString() }));
}

export function replaceGalleryVideoCopy(id: string, file: File, privacyProtected: boolean): Promise<GalleryVideo> {
  return updateGalleryVideo(id, (video) => ({ ...video, name: file.name.replace(/\.[^.]+$/, "") || video.name, mime: file.type, size: file.size, blob: file, privacyProtected, exportedAt: null }));
}

export async function deleteGalleryVideo(id: string): Promise<void> {
  const db = await openGalleryDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await waitForTransaction(transaction);
  } finally {
    db.close();
  }
}
