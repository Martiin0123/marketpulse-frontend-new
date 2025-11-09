import type { Tables } from '@/types_db';

type Price = Tables<'prices'>;

export const getURL = (path: string = '') => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // In browser, use the current origin
    const url = window.location.origin;
    // Ensure path starts without a slash to avoid double slashes in the final URL.
    const cleanPath = path.replace(/^\/+/, '');
    return cleanPath ? `${url}/${cleanPath}` : url;
  }

  // Server-side environment variable handling
  let url = 'http://localhost:3000'; // Default fallback

  // Check if NEXT_PUBLIC_SITE_URL is set and non-empty
  if (process?.env?.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim() !== '') {
    url = process.env.NEXT_PUBLIC_SITE_URL;
  } else if (process?.env?.NEXT_PUBLIC_VERCEL_URL && process.env.NEXT_PUBLIC_VERCEL_URL.trim() !== '') {
    // If not set, check for NEXT_PUBLIC_VERCEL_URL, which is automatically set by Vercel
    url = process.env.NEXT_PUBLIC_VERCEL_URL;
  }

  // Trim the URL and remove trailing slash if exists.
  url = url.replace(/\/+$/, '');
  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`;
  // Ensure path starts without a slash to avoid double slashes in the final URL.
  const cleanPath = path.replace(/^\/+/, '');

  // Concatenate the URL and the path.
  return cleanPath ? `${url}/${cleanPath}` : url;
};

export const toDateTime = (secs: number) => {
  var t = new Date(+0); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

const toastKeyMap: { [key: string]: string[] } = {
  status: ['status', 'status_description'],
  error: ['error', 'error_description']
};

const getToastRedirect = (
  path: string,
  toastType: string,
  toastName: string,
  toastDescription: string = '',
  disableButton: boolean = false,
  arbitraryParams: string = ''
): string => {
  const [nameKey, descriptionKey] = toastKeyMap[toastType];

  let redirectPath = `${path}?${nameKey}=${encodeURIComponent(toastName)}`;

  if (toastDescription) {
    redirectPath += `&${descriptionKey}=${encodeURIComponent(toastDescription)}`;
  }

  if (disableButton) {
    redirectPath += `&disable_button=true`;
  }

  if (arbitraryParams) {
    redirectPath += `&${arbitraryParams}`;
  }

  return redirectPath;
};

export const getStatusRedirect = (
  path: string,
  statusName: string,
  statusDescription: string = '',
  disableButton: boolean = false,
  arbitraryParams: string = ''
) =>
  getToastRedirect(
    path,
    'status',
    statusName,
    statusDescription,
    disableButton,
    arbitraryParams
  );

export const getErrorRedirect = (
  path: string,
  errorName: string,
  errorDescription: string = '',
  disableButton: boolean = false,
  arbitraryParams: string = ''
) =>
  getToastRedirect(
    path,
    'error',
    errorName,
    errorDescription,
    disableButton,
    arbitraryParams
  );

export const calculateTrialEndUnixTimestamp = (trialPeriodDays: number | null) => {
  if (!trialPeriodDays) {
    return undefined;
  }
  
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + trialPeriodDays);
  return Math.floor(trialEnd.getTime() / 1000);
};

/**
 * Extracts a clean symbol name from contract symbols
 * Examples:
 * - "CON.F.US.MNQ.Z25" -> "MNQ"
 * - "CON.F.US.ES.Z25" -> "ES"
 * - "MNQ" -> "MNQ"
 * - "BTCUSDT" -> "BTCUSDT"
 */
export function getCleanSymbol(symbol: string | null | undefined): string {
  if (!symbol) return '';
  
  // If it's already a clean symbol (no dots), return as is
  if (!symbol.includes('.')) {
    return symbol;
  }
  
  // Split by dots and find the instrument name
  // Pattern: CON.F.US.MNQ.Z25 or similar
  const parts = symbol.split('.');
  
  // Common futures instrument prefixes to skip
  const skipPrefixes = ['CON', 'F', 'US', 'C', 'M'];
  
  // Look for parts that are all uppercase letters (the instrument)
  // Skip common prefixes like CON, F, US, etc.
  for (const part of parts) {
    // Check if it's all uppercase letters (2-4 chars typically)
    // and not in the skip list
    if (/^[A-Z]{2,4}$/.test(part) && !skipPrefixes.includes(part)) {
      return part;
    }
  }
  
  // Fallback: try to extract from common patterns
  // CON.F.US.MNQ.Z25 -> MNQ (look for pattern after US)
  const match = symbol.match(/\.US\.([A-Z]{2,4})\./);
  if (match && match[1]) {
    return match[1];
  }
  
  // Another fallback: get the longest uppercase part that's not a prefix
  let longestPart = '';
  for (const part of parts) {
    if (/^[A-Z]{2,4}$/.test(part) && !skipPrefixes.includes(part) && part.length > longestPart.length) {
      longestPart = part;
    }
  }
  if (longestPart) {
    return longestPart;
  }
  
  // If no pattern matches, return the original
  return symbol;
}
