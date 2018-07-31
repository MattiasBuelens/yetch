/** @internal */
declare global {
  interface Window {
    fetch: typeof fetch
    Headers?: typeof Headers
    Request?: typeof Request
    Response?: typeof Response

    AbortController?: typeof AbortController
    AbortSignal?: typeof AbortSignal
    DOMException?: typeof DOMException

    ReadableStream?: typeof ReadableStream

    BlobBuilder?: typeof MSBlobBuilder
    MozBlobBuilder?: typeof MSBlobBuilder
    MSBlobBuilder?: typeof MSBlobBuilder
    WebKitBlobBuilder?: typeof MSBlobBuilder
  }

  interface Request {
    body: ReadableStream | null
  }
}

/** @internal */
export const root: typeof window =
  typeof window === 'object'
    ? window
    : typeof self === 'object'
      ? self
      : typeof global === 'object'
        ? (global as any)
        : null!
