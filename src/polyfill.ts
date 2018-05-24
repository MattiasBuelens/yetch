import { root } from './internal/root'
import { AbortController, AbortSignal, fetch, Headers, Request, Response } from './index'
import { nativeFetchSupported } from './internal/native'

export * from './index'

if (!nativeFetchSupported()) {
  root.fetch = fetch as any
  root.Headers = Headers as any
  root.Request = Request as any
  root.Response = Response as any
  root.AbortController = AbortController
  root.AbortSignal = AbortSignal
}
