declare module 'abortcontroller-polyfill/dist/cjs-ponyfill' {
  const AbortControllerPolyfill: typeof AbortController
  const AbortSignalPolyfill: typeof AbortSignal

  export {
    AbortControllerPolyfill as AbortController,
    AbortSignalPolyfill as AbortSignal
  }
}
