const LEGACY_CREATOR_DOCUMENT_NUMBER_SESSION_KEY = 'vid_download_creator_document_number';

interface DownloadArchiveIdentity {
  creatorDocumentNumber: string;
}

let pendingDownloadArchiveIdentity: DownloadArchiveIdentity = {
  creatorDocumentNumber: '',
};

export function setPendingDownloadArchiveIdentity(identity: DownloadArchiveIdentity): void {
  pendingDownloadArchiveIdentity = {
    creatorDocumentNumber: identity.creatorDocumentNumber.trim(),
  };
  clearLegacyDownloadArchiveIdentityStorage();
}

export function getPendingDownloadArchiveIdentity(): DownloadArchiveIdentity {
  return pendingDownloadArchiveIdentity;
}

export function clearPendingDownloadArchiveIdentity(): void {
  pendingDownloadArchiveIdentity = {
    creatorDocumentNumber: '',
  };
  clearLegacyDownloadArchiveIdentityStorage();
}

export function clearLegacyDownloadArchiveIdentityStorage(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(LEGACY_CREATOR_DOCUMENT_NUMBER_SESSION_KEY);
  window.localStorage.removeItem(LEGACY_CREATOR_DOCUMENT_NUMBER_SESSION_KEY);
}
