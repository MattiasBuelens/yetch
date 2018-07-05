import {xhrFetch} from './xhr'
import {nativeFetch, nativeFetchSupported} from './native'
import {Request, RequestInit} from './Request'
import {Response} from './Response'

export type Fetch = (input: Request | string, init?: RequestInit) => Promise<Response>
export const fetch: Fetch = nativeFetchSupported() ? nativeFetch : xhrFetch
;(fetch as any).polyfill = true
