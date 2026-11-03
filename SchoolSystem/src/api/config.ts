// Server settings. One shared API serves every school; the school code picks
// the tenant at login (SOW 2, S-02 multi-tenant).
export const API_BASE_URL = 'https://school.digitalkarobar.shop';

// No school code is built in: the user types their school's code once and the
// app remembers it (and the school's name and logo) on the phone.
export const DEFAULT_SCHOOL_CODE = '';

export const REQUEST_TIMEOUT_MS = 20000;

// Files the server accepts for homework, diary and complaints (mobile/upload.js).
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
