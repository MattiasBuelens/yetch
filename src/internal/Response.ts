import {Headers, HeadersInit} from './Headers'
import {Body, BodyInit, cloneBody, InternalBodyInit} from './Body'

const redirectStatuses = [301, 302, 303, 307, 308]

export interface ResponseInit {
  headers?: HeadersInit
  status?: number
  statusText?: string
  url?: string | null
}

export class Response extends Body {
  headers: Headers
  ok: boolean
  status: number
  statusText: string
  type: ResponseType
  url: string

  constructor(bodyInit?: BodyInit, options?: ResponseInit) {
    options = options || {}
    let headers = new Headers(options.headers)
    super(bodyInit || null, headers)
    this.type = 'default'
    this.status = options.status === undefined ? 200 : options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText !== undefined ? String(options.statusText) : 'OK'
    this.headers = headers
    this.url = options.url || ''
  }

  clone(): Response {
    return new Response(cloneBody(this) as BodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  static error(): Response {
    const response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  static redirect(url: string, status: number): Response {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }
}

/*
 * When streams are not supported, we still want to create a `Response` object as soon as the headers are received.
 * This means that we have to construct a `Response` with a `PromiseLike<BodyInit>` as body argument.
 *
 * While the underlying `Body` class does support it, we want to hide this from the generated type definitions.
 * Therefore, we use the following interface with the "real" constructor type and add a type cast where necessary.
 */
/** @internal */
export interface InternalResponse {
  new (bodyInit?: InternalBodyInit, options?: ResponseInit): Response
}
