// Server settings. One shared API serves every school; the school code picks
// the tenant at login (SOW 2, S-02 multi-tenant).
export const API_BASE_URL = 'https://school.digitalkarobar.shop';

// Pre-filled on the sign-in screens; the user can change it.
export const DEFAULT_SCHOOL_CODE = 'SBS';

export const REQUEST_TIMEOUT_MS = 20000;

// Files the server accepts for homework, diary and complaints (mobile/upload.js).
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
