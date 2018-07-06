import {Headers, HeadersInit} from './Headers'
import {Body, BodyInit, cloneBody} from './Body'
import {AbortController, AbortSignal} from './AbortController'

export interface RequestInit {
  body?: BodyInit
  credentials?: RequestCredentials
  headers?: HeadersInit
  method?: string
  mode?: RequestMode
  referrer?: string
  signal?: AbortSignal
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
  signal: AbortSignal
  url: string

  constructor(input: Request | string, options?: RequestInit) {
    options = options || {}
    let url: string
    let body: BodyInit = options.body || null
    let credentials: RequestCredentials | undefined
    let headers: Headers | undefined
    let method: string
    let mode: RequestMode
    let signal: AbortSignal | null

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
      signal = input.signal
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      url = String(input)
      credentials = 'same-origin'
      method = 'GET'
      mode = 'cors'
      signal = null
    }

    if (options.headers || !headers) {
      headers = new Headers(options.headers)
    }
    super(body, headers)
    this.url = url
    this.headers = headers
    this.credentials = options.credentials || credentials
    this.method = normalizeMethod(options.method || method)
    this.mode = options.mode || mode
    this.signal = options.signal || signal || createDefaultAbortSignal()
    this.referrer = ''

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
  }

  clone() {
    return new Request(this, {
      body: cloneBody(this)
    })
  }
}
