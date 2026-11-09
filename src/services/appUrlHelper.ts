/**
 * Centralized live URL and link generator for PharmaCore.
 * Prioritizes the active origin (ais-dev or custom domain) to prevent 404 errors before public sharing.
 */

export const DEV_APP_URL = 'https://ais-dev-nwggp5cnnuj4qxbshu7aot-295091845892.europe-west2.run.app';
export const SHARED_APP_URL = 'https://ais-pre-nwggp5cnnuj4qxbshu7aot-295091845892.europe-west2.run.app';

export function getPublicAppOrigin(): string {
  if (typeof window === 'undefined') {
    return DEV_APP_URL;
  }

  const origin = window.location.origin;
  const hostname = window.location.hostname;

  // If running locally, fallback to the live dev Cloud Run URL
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  ) {
    return DEV_APP_URL;
  }

  // Use the active live origin directly so it never 404s
  if (origin && origin.startsWith('http')) {
    return origin;
  }

  return DEV_APP_URL;
}

export function getPharmacyClientUrl(subdomain: string): string {
  const cleanSub = (subdomain || 'demo')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '');
  const base = getPublicAppOrigin();
  return `${base}?pharmacy=${encodeURIComponent(cleanSub)}`;
}

/**
 * Universal clipboard copy helper with legacy fallback for mobile webviews & non-HTTPS contexts
 */
export async function copyTextSafely(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.warn('Clipboard copy error:', err);
    return false;
  }
}
