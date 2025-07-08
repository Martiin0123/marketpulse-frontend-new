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
