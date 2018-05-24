import { root } from './internal/root'
import { AbortController, AbortSignal, fetch, Headers, Request, Response } from './index'

export * from './index'

function nativeFetchSupportsAbort() {
  return !!root.AbortController && !!root.Request && 'signal' in root.Request.prototype
}

if (!root.fetch || !nativeFetchSupportsAbort()) {
  root.fetch = fetch as any
  root.Headers = Headers as any
  root.Request = Request as any
  root.Response = Response as any
  root.AbortController = AbortController
  root.AbortSignal = AbortSignal
}
