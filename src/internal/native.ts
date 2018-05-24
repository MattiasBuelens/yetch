import { root } from './root'
import { Request as RequestPolyfill, RequestInit as RequestInitPolyfill } from './Request'
import { Response as ResponsePolyfill } from './Response'
import { Headers as HeadersPolyfill, HeadersInit as HeadersInitPolyfill } from './Headers'

const fetch = root.fetch!
const Request = root.Request!
const AbortController = root.AbortController!

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

function toNativeRequest(request: RequestPolyfill): Request {
  return new Request(request.url, {
    body: request._bodyInit as BodyInit,
    credentials: request.credentials,
    headers: collectHeaders(request.headers),
    method: request.method,
    mode: request.mode,
    referrer: request.referrer,
    signal: request.signal
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
    signal: init.signal
  }
}

function fromNativeResponse(response: Response): ResponsePolyfill {
  return new ResponsePolyfill(response.body, response)
}

export function nativeFetch(input: RequestPolyfill | string, init?: RequestInitPolyfill): Promise<ResponsePolyfill> {
  return new Promise<ResponsePolyfill>(function(resolve) {
    let nativeInput: Request | string = (input instanceof RequestPolyfill) ? toNativeRequest(input) : input
    let nativeInit: RequestInit = toNativeRequestInit(init)
    resolve(fetch(nativeInput, nativeInit).then(fromNativeResponse))
  })
}
