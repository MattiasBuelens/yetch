var root = require('./internal/root').root
var fetch = require('./internal/fetch').fetch
var Headers = require('./internal/Headers').Headers
var Request = require('./internal/Request').Request
var Response = require('./internal/Response').Response
var AbortController = require('abortcontroller-polyfill/dist/cjs-ponyfill').AbortController
var AbortSignal = require('abortcontroller-polyfill/dist/cjs-ponyfill').AbortSignal

function nativeFetchSupportsAbort() {
  return !!root.AbortController && !!root.Request && 'signal' in root.Request.prototype
}

if (!root.fetch || !nativeFetchSupportsAbort()) {
  root.fetch = fetch
  root.Headers = Headers
  root.Request = Request
  root.Response = Response
  root.AbortController = AbortController;
  root.AbortSignal = AbortSignal
}
