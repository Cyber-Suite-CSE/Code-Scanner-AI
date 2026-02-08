/**
 * Get the API base URL based on environment
 * In production with separate containers, uses NEXT_PUBLIC_API_URL
 * Otherwise, uses relative paths for same-origin requests
 */
export function getApiUrl(path: string): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // If NEXT_PUBLIC_API_URL is set, use it (for separate API container)
  if (apiBaseUrl) {
    return `${apiBaseUrl}${path}`;
  }
  
  // Otherwise use relative path (for monolithic deployment)
  return path;
}
