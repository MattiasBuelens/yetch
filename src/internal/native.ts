import { root } from './root'
import { Request as RequestPolyfill, RequestInit as RequestInitPolyfill } from './Request'
import { Response as ResponsePolyfill } from './Response'
import { Headers as HeadersPolyfill, HeadersInit as HeadersInitPolyfill } from './Headers'
import { followAbortSignal } from './AbortController'

const fetch = root.fetch!
const Request = root.Request!
const AbortController = root.AbortController!
const AbortSignal = root.AbortSignal!

export function nativeFetchSupported() {
  return !!fetch && nativeFetchSupportsAbort()
}

function nativeFetchSupportsAbort() {
  return !!AbortController && !!Request && 'signal' in Request.prototype
}

function collectHeaders(headersInit?: HeadersInit | HeadersInitPolyfill): Array<[string, string]> {
  const headers = (headersInit instanceof HeadersPolyfill)
    ? headersInit
    : new HeadersPolyfill(headersInit as HeadersInitPolyfill)

  const list: Array<[string, string]> = []
  headers.forEach((value, key) => list.push([key, value]))
  return list
}

function toNativeAbortSignal(signal?: AbortSignal): AbortSignal | undefined {
  if (!signal || signal instanceof AbortSignal) {
    return signal
  }
  const controller = new AbortController()
  followAbortSignal(controller, signal)
  return controller.signal
}

function toNativeRequest(request: RequestPolyfill): Request {
  return new Request(request.url, {
    body: request._bodyInit as BodyInit,
    credentials: request.credentials,
    headers: collectHeaders(request.headers),
    method: request.method,
    mode: request.mode,
    referrer: request.referrer,
    signal: toNativeAbortSignal(request.signal)
  })
}

function toNativeRequestInit(init?: RequestInitPolyfill): RequestInit {
  if (!init) {
    return {}
  }
  return {
    body: init.body as BodyInit,
    credentials: init.credentials,
    headers: collectHeaders(init.headers),
    method: init.method,
    mode: init.mode,
    referrer: init.referrer,
    signal: toNativeAbortSignal(init.signal)
  }
}

export function nativeFetch(input: RequestPolyfill | string, init?: RequestInitPolyfill): Promise<ResponsePolyfill> {
    let nativeInput: Request | string = (input instanceof RequestPolyfill) ? toNativeRequest(input) : input
    let nativeInit: RequestInit = toNativeRequestInit(init)
    return fetch(nativeInput, nativeInit)
      .then((response) => {
        // TODO Use ReadableStream as body init
        return response.arrayBuffer().then(arrayBuffer => {
          return new ResponsePolyfill(arrayBuffer, response)
        })
      })
}
