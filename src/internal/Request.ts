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

type NormalizedMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT'

// HTTP methods whose capitalization should be normalized
var methods: NormalizedMethod[] = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

function normalizeMethod(method: string): string {
  var upcased = method.toUpperCase()
  return (methods.indexOf(upcased) > -1) ? upcased : method
}

class Request extends Body {

  credentials: RequestCredentials
  headers: Headers
  method: string
  mode: RequestMode
  referrer: string | null
  signal: AbortSignal | null
  url: string

  constructor(input?: Request | string, options?: RequestInit) {
    super()
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      this.signal = input.signal
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.signal = options.signal || this.signal
    this.referrer = null

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
