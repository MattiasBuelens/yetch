import { support } from './support'
import { Headers } from './Headers'
import { Request } from './Request'
import { Response, ResponseInit } from './Response'
import { BodyInit } from './Body'
import { createAbortError } from './AbortController'

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

abstract class Xhr {

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

  protected abstract _getResponseType(): XMLHttpRequestResponseType;

  protected abstract _onHeadersReceived(init: ResponseInit): void;

  protected abstract _onLoad(): void;

  protected _onProgress(): void {
    return
  }

  protected _onError(): void {
    this._rejectResponse(new TypeError('Network request failed'))
  }

  protected _onTimeout(): void {
    this._rejectResponse(new TypeError('Network request failed'))
  }

  protected _onAbort(): void {
    this._rejectResponse(createAbortError())
  }

  private _send(body: BodyInit, responseType: XMLHttpRequestResponseType) {
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
      xhr.responseType = responseType
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

class FetchXhr extends Xhr {

  private _responseInit?: ResponseInit = undefined

  constructor(request: Request) {
    super(request)
  }

  protected _getResponseType(): XMLHttpRequestResponseType {
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

export function xhrFetch(request: Request): Promise<Response> {
  return new FetchXhr(request).send()
}
