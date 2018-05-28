import { root } from './root'
import { support } from './support'
import { Request as RequestPolyfill, RequestInit as RequestInitPolyfill } from './Request'
import { Response as ResponsePolyfill } from './Response'
import { Headers as HeadersPolyfill, HeadersInit as HeadersInitPolyfill } from './Headers'
import { BodyInit as BodyInitPolyfill, readArrayBufferAsStream } from './Body'
import { followAbortSignal } from './AbortController'

const fetch = root.fetch!
const Request = root.Request!
const Response = root.Response!
const AbortController = root.AbortController!
const AbortSignal = root.AbortSignal!
const ReadableStream = root.ReadableStream!

export function nativeFetchSupported() {
  return !!fetch && nativeFetchSupportsAbort() && nativeResponseSupportsStream()
}

function nativeFetchSupportsAbort() {
  return !!AbortController && !!Request && 'signal' in Request.prototype
}

function nativeRequestSupportsStream() {
  return !!Request && 'body' in Request.prototype
}

function nativeResponseSupportsStream() {
  return !!Response && 'body' in Response.prototype
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

function toNativeRequest(request: RequestPolyfill): Promise<Request> {
  let bodyPromise: Promise<BodyInit>
  if (request._bodyReadableStream) {
    if (nativeRequestSupportsStream()) {
      // Body is a stream, and native supports uploading a stream
      bodyPromise = Promise.resolve(request._bodyReadableStream)
    } else {
      // Body is a stream, but native doesn't support uploading a stream
      // Upload as array buffer instead
      bodyPromise = request.arrayBuffer!()
    }
  } else {
    // Body is not a stream, so upload as-is
    bodyPromise = Promise.resolve(request._bodyInit)
  }

  return bodyPromise.then((bodyInit) => {
    return new Request(request.url, {
      body: bodyInit,
      credentials: request.credentials,
      headers: collectHeaders(request.headers),
      method: request.method,
      mode: request.mode,
      referrer: request.referrer,
      signal: toNativeAbortSignal(request.signal)
    })
  })
}

function toPolyfillBodyInit(response: Response): Promise<BodyInit> {
  let bodyInit: BodyInitPolyfill
  if (support.stream) {
    // Create response from stream
    if (nativeResponseSupportsStream()) {
      bodyInit = response.body
    } else {
      // Cannot read response as a stream
      // Construct a stream that reads the entire response as a single array buffer instead
      bodyInit = readArrayBufferAsStream(() => response.arrayBuffer())
    }
    return Promise.resolve(bodyInit)
  } else {
    // Streams are not supported
    // Return a promise that reads the entire response
    if (support.blob) {
      return response.blob()
    } else if (support.arrayBuffer) {
      return response.arrayBuffer()
    } else {
      return response.text()
    }
  }
}

function toPolyfillResponse(response: Response): Promise<ResponsePolyfill> {
  // TODO Construct Response from Promise<BodyInit>?
  return toPolyfillBodyInit(response).then((bodyInit) => {
    return new ResponsePolyfill(bodyInit, response)
  })
}

export function nativeFetch(input: RequestPolyfill | string, init?: RequestInitPolyfill): Promise<ResponsePolyfill> {
  return new Promise<ResponsePolyfill>(resolve => {
  const request = new RequestPolyfill(input, init)
  const promise = toNativeRequest(request)
    .then(fetch)
    .then(toPolyfillResponse)
  resolve(promise)
  })
}
