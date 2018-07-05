import { support } from './support'
import { Headers } from './Headers'
import { Request } from './Request'
import { Response, ResponseInit } from './Response'
import { BodyInit } from './Body'
import { createAbortError } from './AbortController'
import { ReadableStream } from './stream'
import { ReadableStreamDefaultController } from 'whatwg-streams'

function parseHeaders(rawHeaders: string): Headers {
  const headers = new Headers()
  // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
  // https://tools.ietf.org/html/rfc7230#section-3.2
  const preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ')
  preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
    const parts = line.split(':')
    const key = parts.shift()!.trim()
    if (key) {
      const value = parts.join(':').trim()
      headers.append(key, value)
    }
  })
  return headers
}

type XhrResponseType = XMLHttpRequestResponseType | 'moz-chunked-arraybuffer';
const mozChunkedArrayBufferType = 'moz-chunked-arraybuffer'

function supportsXhrResponseType(type: XhrResponseType): boolean {
  try {
    const xhr = new XMLHttpRequest()
    xhr.responseType = type as XMLHttpRequestResponseType
    return xhr.responseType === type
  } catch (e) {
    // Internet Explorer throws when setting invalid value
  }
  return false
}

abstract class XhrBase {

  protected readonly _request: Request
  protected readonly _xhr: XMLHttpRequest
  private _responsePromise: Promise<Response>
  protected _resolveResponse!: (response: Response) => void
  protected _rejectResponse!: (reason: any) => void

  protected constructor(request: Request) {
    this._request = request
    this._xhr = new XMLHttpRequest()
    this._responsePromise = new Promise<Response>((resolve, reject) => {
      this._resolveResponse = resolve
      this._rejectResponse = reject
    })
  }

  send(): Promise<Response> {
    return Promise.resolve(this._readBody()).then(body => {
      this._send(body, this._getResponseType())
      return this._responsePromise
    })
  }

  protected _readBody(): Promise<BodyInit> {
    const request = this._request
    if (request._bodyReadableStream) {
      // Body is a stream, upload as array buffer instead
      return request.arrayBuffer!()
    } else {
      // Body is not a stream, so upload as-is
      return Promise.resolve(request._bodyInit)
    }
  }

  protected abstract _getResponseType(): XhrResponseType;

  protected abstract _onHeadersReceived(init: ResponseInit): void;

  protected abstract _onLoad(): void;

  protected _onProgress(): void {
    return
  }

  protected _handleError(error: Error): void {
    this._rejectResponse(error)
  }

  protected _onError(): void {
    this._handleError(new TypeError('Network request failed'))
  }

  protected _onTimeout(): void {
    this._handleError(new TypeError('Network request failed'))
  }

  protected _onAbort(): void {
    this._handleError(createAbortError())
  }

  private _send(body: BodyInit, responseType: XhrResponseType) {
    const request = this._request
    const xhr = this._xhr
    const abortXhr = () => this._abort()

    xhr.onreadystatechange = () => {
      if (xhr.readyState === xhr.HEADERS_RECEIVED) {
        const headers = parseHeaders(xhr.getAllResponseHeaders() || '')
        const options: ResponseInit = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: headers,
          url: xhr.responseURL || headers.get('X-Request-URL')
        }
        this._onHeadersReceived(options)
      }
    }

    xhr.onload = () => this._onLoad()
    xhr.onerror = () => this._onError()
    xhr.ontimeout = () => this._onTimeout()
    xhr.onabort = () => this._onAbort()

    xhr.open(request.method, request.url, true)

    xhr.withCredentials = request.credentials === 'include'

    if ('responseType' in xhr && responseType) {
      xhr.responseType = responseType as XMLHttpRequestResponseType
    }

    request.headers.forEach((value, name) => {
      xhr.setRequestHeader(name, value)
    })

    request.signal.addEventListener('abort', abortXhr)

    xhr.onloadend = () => {
      request.signal.removeEventListener('abort', abortXhr)
    }

    xhr.send(body || null)
  }

  protected _abort() {
    this._xhr.abort()
  }

}

class Xhr extends XhrBase {

  private _responseInit?: ResponseInit = undefined

  constructor(request: Request) {
    super(request)
  }

  protected _getResponseType(): XhrResponseType {
    return support.blob ? 'blob' : ''
  }

  protected _onHeadersReceived(init: ResponseInit): void {
    this._responseInit = init
  }

  protected _onLoad(): void {
    const body = this._xhr.response || this._xhr.responseText
    this._resolveResponse(new Response(body, this._responseInit!))
  }

}

// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
class MozChunkedArrayBufferXhr extends XhrBase {

  private _responseStream?: ReadableStream = undefined
  private _responseController?: ReadableStreamDefaultController = undefined
  private _responseCancelled: boolean = false

  constructor(request: Request) {
    super(request)
  }

  protected _getResponseType(): XhrResponseType {
    return mozChunkedArrayBufferType
  }

  protected _onHeadersReceived(init: ResponseInit): void {
    // TODO use stream polyfill
    this._responseStream = new ReadableStream({
      start: (c) => {
        this._responseController = c
      },
      cancel: () => {
        this._responseCancelled = true
        this._abort()
      }
    })
    this._resolveResponse(new Response(this._responseStream, init))
  }

  protected _onProgress(): void {
    if (!this._responseCancelled) {
      this._responseController!.enqueue(new Uint8Array(this._xhr.response as ArrayBuffer))
    }
  }

  protected _onLoad(): void {
    this._responseController!.close()
  }

  protected _handleError(error: Error): void {
    super._handleError(error)
    if (this._responseController && !this._responseCancelled) {
      this._responseCancelled = true
      this._responseController.error(error)
    }
  }

}

export function xhrFetch(request: Request): Promise<Response> {
  let xhr: XhrBase
  if (support.stream && supportsXhrResponseType(mozChunkedArrayBufferType)) {
    xhr = new MozChunkedArrayBufferXhr(request)
  } else {
    xhr = new Xhr(request)
  }
  return xhr.send()
}
