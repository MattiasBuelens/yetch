import { root } from './internal/root'
import { fetch } from './internal/fetch'
import { Headers } from './internal/Headers'
import { Request } from './internal/Request'
import { Response } from './internal/Response'
import { AbortController, AbortSignal } from 'abortcontroller-polyfill/dist/cjs-ponyfill'

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
