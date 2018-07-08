import {root} from './root'
import {support} from './support'
import {Request as RequestPolyfill} from './Request'
import {InternalResponse, Response as ResponsePolyfill} from './Response'
import {Headers as HeadersPolyfill, HeadersInit as HeadersInitPolyfill} from './Headers'
import {InternalBodyInit} from './Body'
import {followAbortSignal} from './AbortController'
import {
  convertStream,
  isReadableStreamConstructor,
  ReadableStream,
  ReadableStreamConstructor,
  readArrayBufferAsStream
} from './stream'
import {GlobalReadableStream} from './globals'

// Capture native implementations *before* we install any polyfill
const fetch = root.fetch!
const Request = root.Request!
const Response = root.Response!
const AbortController = root.AbortController!

export function nativeFetchSupported() {
  return typeof fetch === 'function' && support.abort && support.streamResponse
}

// The ReadableStream class used by native's Request.body
// May differ from the global ReadableStream class
function getNativeRequestReadableStreamConstructor(): ReadableStreamConstructor | undefined {
  try {
    if (support.streamRequest) {
      const requestBody = new Request('about:blank', {body: '', method: 'POST'}).body
      if (requestBody && isReadableStreamConstructor(requestBody.constructor)) {
        return requestBody.constructor
      }
    }
  } catch {
    // ignore
  }
  return undefined
}
const NativeRequestReadableStream: ReadableStreamConstructor | undefined = getNativeRequestReadableStreamConstructor()

function collectHeaders(headersInit?: HeadersInit | HeadersInitPolyfill): Array<[string, string]> {
  const headers =
    headersInit instanceof HeadersPolyfill ? headersInit : new HeadersPolyfill(headersInit as HeadersInitPolyfill)

  const list: Array<[string, string]> = []
  headers.forEach((value, key) => list.push([key, value]))
  return list
}

function toNativeRequest(request: RequestPolyfill, controller: AbortController): Promise<Request> {
  let bodyPromise: Promise<BodyInit>
  if (request._bodyReadableStream) {
    if (support.streamRequest && NativeRequestReadableStream) {
      // Body is a stream, and native supports uploading a stream
      bodyPromise = Promise.resolve(convertStream(NativeRequestReadableStream, request._bodyReadableStream))
    } else {
      // Body is a stream, but native doesn't support uploading a stream
      // Upload as array buffer instead
      bodyPromise = request.arrayBuffer!()
    }
  } else {
    // Body is not a stream, so upload as-is
    bodyPromise = Promise.resolve(request._bodyInit)
  }

  if (request.signal) {
    followAbortSignal(controller, request.signal)
  }

  return bodyPromise.then(bodyInit => {
    return new Request(request.url, {
      body: bodyInit,
      credentials: request.credentials,
      headers: collectHeaders(request.headers),
      method: request.method,
      mode: request.mode,
      referrer: request.referrer,
      signal: controller.signal
    })
  })
}

function toPolyfillBodyInit(response: Response, controller: AbortController): InternalBodyInit {
  if (support.stream) {
    // Return a streaming response
    let bodyInit: ReadableStream | null
    if (support.streamResponse) {
      // Read response as stream
      // TODO abort request when body is cancelled, in case AbortSignal is not natively supported
      const nativeBody = (response.body as any) as ReadableStream | null
      bodyInit = nativeBody && convertStream(GlobalReadableStream, nativeBody)
    } else {
      // Cannot read response as a stream
      // Construct a stream that reads the entire response as a single array buffer instead
      bodyInit = readArrayBufferAsStream(
        GlobalReadableStream,
        () => response.arrayBuffer(),
        () => {
          // abort ongoing fetch when response body is cancelled
          controller.abort()
        }
      )
    }
    return bodyInit
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

function toPolyfillResponse(response: Response, controller: AbortController): ResponsePolyfill {
  const bodyInit = toPolyfillBodyInit(response, controller)
  return new (ResponsePolyfill as InternalResponse)(bodyInit, response)
}

export function nativeFetch(request: RequestPolyfill): Promise<ResponsePolyfill> {
  const controller = new AbortController()
  return toNativeRequest(request, controller)
    .then(fetch)
    .then(response => toPolyfillResponse(response, controller))
}
