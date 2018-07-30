import {xhrFetch} from './xhr'
import {nativeFetch, nativeFetchSupported, nativeFetchSupportsUrl} from './native'
import {Request, RequestInit} from './Request'
import {Response} from './Response'

const supportsNativeFetch = nativeFetchSupported()

export function fetch(input: Request | string, init?: RequestInit): Promise<Response> {
  return new Promise<Response>(resolve => {
    const request = new Request(input, init)
    const impl = supportsNativeFetch && nativeFetchSupportsUrl(request.url) ? nativeFetch : xhrFetch
    resolve(impl(request))
  })
}

;(fetch as any).polyfill = true
