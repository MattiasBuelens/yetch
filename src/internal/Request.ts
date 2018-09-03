import {Headers, HeadersInit} from './Headers'
import {Body, BodyInit, cloneBody, InternalBodyInit} from './Body'
import {AbortController, AbortSignal} from './AbortController'

export type ProgressCallback = (loaded: number, total?: number) => void

export interface RequestInit {
  body?: BodyInit
  credentials?: RequestCredentials
  headers?: HeadersInit
  method?: string
  mode?: RequestMode
  referrer?: string
  referrerPolicy?: ReferrerPolicy
  signal?: AbortSignal
  onprogress?: ProgressCallback
}

// HTTP methods whose capitalization should be normalized
const methods: string[] = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

function normalizeMethod(method: string): string {
  const upcased = method.toUpperCase()
  return methods.indexOf(upcased) > -1 ? upcased : method
}

function createDefaultAbortSignal(): AbortSignal {
  return new AbortController().signal
}

export class Request extends Body {
  credentials: RequestCredentials
  headers: Headers
  method: string
  mode: RequestMode
  referrer: string
  referrerPolicy: ReferrerPolicy
  signal: AbortSignal
  url: string
  onprogress: ProgressCallback | null

  // https://fetch.spec.whatwg.org/#dom-request
  constructor(input: Request | string, options?: RequestInit) {
    options = options || {}
    let url: string
    let body: InternalBodyInit = options.body || null
    let credentials: RequestCredentials | undefined
    let headers: Headers | undefined
    let method: string
    let mode: RequestMode
    let referrer: string
    let referrerPolicy: ReferrerPolicy
    let signal: AbortSignal | null
    let onprogress: ProgressCallback | null

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already used')
      }
      url = input.url
      credentials = input.credentials
      if (!options.headers) {
        headers = new Headers(input.headers)
      }
      method = input.method
      mode = input.mode
      referrer = input.referrer
      referrerPolicy = input.referrerPolicy
      signal = input.signal
      onprogress = input.onprogress
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      url = String(input)
      credentials = 'same-origin'
      method = 'GET'
      mode = 'cors'
      referrer = 'about:client'
      referrerPolicy = ''
      signal = null
      onprogress = null
    }

    if (options.headers || !headers) {
      headers = new Headers(options.headers)
    }

    // 14. If init is not empty, then:
    // 14.4. Set request's referrer to "client"
    // 14.5. Set request's referrer policy to the empty string.
    if (options) {
      referrer = 'about:client'
      referrerPolicy = ''
    }

    super(body, headers)
    this.url = url
    this.headers = headers
    this.credentials = options.credentials || credentials
    this.method = normalizeMethod(options.method || method)
    this.mode = options.mode || mode
    this.signal = options.signal || signal || createDefaultAbortSignal()
    this.referrer = options.referrer !== undefined ? options.referrer : referrer
    this.referrerPolicy = options.referrerPolicy !== undefined ? options.referrerPolicy : referrerPolicy
    this.onprogress = options.onprogress || onprogress

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
  }

  clone() {
    return new Request(this, {
      body: cloneBody(this) as BodyInit
    })
  }
}
