/** Name of the HttpOnly session cookie */
export const COOKIE_NAME = "clipper_session";

/** Cookie max-age: 7 days in seconds */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/** Cookie used to preserve the original admin session during impersonation */
export const IMPERSONATOR_COOKIE_NAME = "clipper_impersonator";
