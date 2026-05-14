/**
 * Cloudflare Pages Function — proxy /api/* to the Cloud Worker
 *
 * This handles ALL HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS).
 * The _redirects proxy only supports GET, which caused 405 errors on POST.
 *
 * File path:  functions/api/[[path]].ts
 * Matches:    /api/* (any path, any method)
 * Forwards:   https://api.weldvision-x5.com/api/<path>
 */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const targetUrl = `https://api.weldvision-x5.com${url.pathname}${url.search}`;

  // Forward the request verbatim — same method, headers, and body
  return fetch(new Request(targetUrl, context.request));
};
