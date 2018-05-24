import { xhrFetch } from './xhr'

export const fetch = xhrFetch;
(fetch as any).polyfill = true
