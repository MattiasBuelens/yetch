import { Headers, HeadersInit } from './Headers'
import { Body, BodyInit } from './Body'

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
  return (methods.indexOf(upcased) > -1) ? upcased : method
}

class Request extends Body {

  credentials: RequestCredentials
  headers: Headers
  method: string
  mode: RequestMode
  referrer: string
  signal: AbortSignal | null
  url: string

  constructor(input: Request | string, options?: RequestInit) {
    super()
    options = options || {}
    let body: BodyInit = options.body || null
    let credentials: RequestCredentials | undefined
    let headers: Headers | undefined
    let method: string
    let mode: RequestMode
    let signal: AbortSignal | null

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
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
      this.url = String(input)
      credentials = 'same-origin'
      method = 'GET'
      mode = 'cors'
      signal = null
    }

    this.credentials = options.credentials || credentials
    if (options.headers || !headers) {
      headers = new Headers(options.headers)
    }
    this.headers = headers
    this.method = normalizeMethod(options.method || method)
    this.mode = options.mode || mode
    this.signal = options.signal || signal
    this.referrer = ''

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  clone() {
    return new Request(this, { body: this._bodyInit })
  }

}

export { Request }
