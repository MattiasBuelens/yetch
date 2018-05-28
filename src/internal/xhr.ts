import { support } from './support'
import { DOMException } from './DOMException'
import { Headers } from './Headers'
import { Request } from './Request'
import { Response, ResponseInit } from './Response'
import { BodyInit } from './Body'

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

interface XhrOptions {
  body: BodyInit
  headers: Headers
  method: string
  responseType: XMLHttpRequestResponseType
  url: string
  signal: AbortSignal
  withCredentials: boolean
}

abstract class Xhr {

  protected readonly _request: Request
  protected readonly _xhr: XMLHttpRequest
  private _promise: Promise<Response>
  protected _resolve!: (response: Response) => void
  protected _reject!: (reason: any) => void

  protected constructor(request: Request) {
    this._request = request
    this._xhr = new XMLHttpRequest()
    this._promise = new Promise<Response>((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
  }

  send(): Promise<Response> {
    return Promise.resolve(this._getXhrOptions())
      .then((options) => {
        this._send(options)
        return this._promise
      })
  }

  protected _getXhrOptions(): XhrOptions | Promise<XhrOptions> {
    const responseType: XMLHttpRequestResponseType = support.blob ? 'blob' : ''
    const withCredentials = this._request.credentials === 'include'
    return {
      body: this._request._bodyInit,
      headers: this._request.headers,
      method: this._request.method,
      responseType: responseType,
      url: this._request.url,
      signal: this._request.signal,
      withCredentials: withCredentials
    }
  }

  protected abstract _onHeadersReceived(init: ResponseInit): void;

  protected abstract _onLoad(): void;

  protected _onProgress(): void {
    return
  }

  protected _onError(): void {
    this._reject(new TypeError('Network request failed'))
  }

  protected _onTimeout(): void {
    this._reject(new TypeError('Network request failed'))
  }

  protected _onAbort(): void {
    this._reject(new DOMException('Aborted', 'AbortError'))
  }

  private _send(options: XhrOptions) {
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

    xhr.open(options.method, options.url, true)

    xhr.withCredentials = options.withCredentials

    if ('responseType' in xhr && options.responseType) {
      xhr.responseType = options.responseType
    }

    options.headers.forEach((value, name) => {
      xhr.setRequestHeader(name, value)
    })

    options.signal.addEventListener('abort', abortXhr)

    xhr.onloadend = () => {
      options.signal.removeEventListener('abort', abortXhr)
    }

    xhr.send(options.body || null)
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

  protected _onHeadersReceived(init: ResponseInit): void {
    this._responseInit = init
  }

  protected _onLoad(): void {
    const body = this._xhr.response || this._xhr.responseText
    this._resolve(new Response(body, this._responseInit!))
  }

}

export function xhrFetch(request: Request): Promise<Response> {
  return new FetchXhr(request).send()
}
