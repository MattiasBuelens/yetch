import {root} from './root'
import {support} from './support'
import {ProgressCallback, Request as RequestPolyfill} from './Request'
import {InternalResponse, Response as ResponsePolyfill} from './Response'
import {Headers as HeadersPolyfill, HeadersInit as HeadersInitPolyfill} from './Headers'
import {InternalBodyInit} from './Body'
import {followAbortSignal} from './AbortController'
import {
  convertStream,
  isReadableStreamConstructor,
  monitorStream,
  ReadableStream,
  ReadableStreamConstructor,
  readArrayBufferAsStream,
  ReadProgressCallback
} from './stream'
import {GlobalReadableStream} from './globals'

// Capture native implementations *before* we install any polyfill
const fetch = root.fetch!
const Request = root.Request!
const Response = root.Response!
const AbortController = root.AbortController!

export function nativeFetchSupported() {
  return typeof fetch === 'function' && support.abort && support.stream && support.streamResponse && support.url
}

// https://fetch.spec.whatwg.org/#scheme-fetch
// We only use native fetch for HTTP(S) schemes, since there are still a lot of browser issues:
// * Chrome does not yet support file://
//   https://github.com/github/fetch/pull/92#issuecomment-140665932
//   https://bugs.chromium.org/p/chromium/issues/detail?id=810400
// * Some browsers do not yet support blob: or data:
//   https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API#Browser_compatibility
const nativeFetchProtocols = ['http:', 'https:']

export function nativeFetchSupportsUrl(url: string): boolean {
  try {
    return nativeFetchProtocols.indexOf(new root.URL(url, root.location.href).protocol) >= 0
  } catch {
    // invalid URL
    return false
  }
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
  return headers.asList()
}

function toNativeRequest(request: RequestPolyfill, controller: AbortController): Promise<Request> {
  let bodyPromise: Promise<BodyInit | null>
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
      referrerPolicy: request.referrerPolicy,
      signal: controller.signal
    })
  })
}

function toPolyfillResponse(
  response: Response,
  controller: AbortController,
  onprogress: ProgressCallback | null
): ResponsePolyfill {
  let bodyInit: InternalBodyInit
  if (support.stream) {
    // Return a streaming response
    let bodyStream: ReadableStream | null
    if (support.streamResponse) {
      // Read response as stream
      // TODO abort request when body is cancelled, in case AbortSignal is not natively supported
      const nativeBody = (response.body as any) as ReadableStream | null
      bodyStream = nativeBody && convertStream(GlobalReadableStream, nativeBody)
    } else {
      // Cannot read response as a stream
      // Construct a stream that reads the entire response as a single array buffer instead
      bodyStream = readArrayBufferAsStream(
        GlobalReadableStream,
        () => response.arrayBuffer(),
        () => {
          // abort ongoing fetch when response body is cancelled
          controller.abort()
        }
      )
    }
    if (bodyStream && onprogress) {
      bodyStream = monitorStreamProgress(bodyStream, onprogress, getContentLength(response.headers))
    }
    bodyInit = bodyStream
  } else {
    // Streams are not supported, return a promise that reads the entire response body instead
    let bodyBlob = response.blob()
    if (onprogress) {
      bodyBlob = monitorBlobProgress(bodyBlob, onprogress, getContentLength(response.headers))
    }
    bodyInit = bodyBlob
  }

  return new (ResponsePolyfill as InternalResponse)(bodyInit, response)
}

function getContentLength(headers: Headers): number | undefined {
  return headers.has('content-length') ? Number(headers.get('content-length')) : undefined
}

function monitorStreamProgress(stream: ReadableStream, onprogress: ProgressCallback, total?: number): ReadableStream {
  let loaded: number = 0
  const onRead: ReadProgressCallback = ({done, value}) => {
    if (done) {
      total = total === undefined ? loaded : total
    } else {
      loaded += value.byteLength
    }
    onprogress(loaded, total)
  }
  return monitorStream(GlobalReadableStream, stream, onRead)
}

function monitorBlobProgress(promise: PromiseLike<Blob>, onprogress: ProgressCallback, total?: number): Promise<Blob> {
  return Promise.resolve()
    .then(() => {
      onprogress(0, total)
      return promise
    })
    .then(data => {
      const loaded = data.size
      total = total === undefined ? loaded : total
      onprogress(loaded, total)
      return data
    })
}

export function nativeFetch(request: RequestPolyfill): Promise<ResponsePolyfill> {
  const controller = new AbortController()
  return toNativeRequest(request, controller)
    .then(fetch)
    .then(response => toPolyfillResponse(response, controller, request.onprogress))
}
