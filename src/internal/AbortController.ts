import {
  AbortController as AbortControllerImpl,
  AbortSignal as AbortSignalImpl
} from 'abortcontroller-polyfill/dist/abortcontroller'

type AbortControllerPolyfill = AbortController
const AbortControllerPolyfill: typeof AbortController = AbortControllerImpl

type AbortSignalPolyfill = AbortSignal
const AbortSignalPolyfill: typeof AbortSignal = AbortSignalImpl

export {
  AbortControllerPolyfill as AbortController,
  AbortSignalPolyfill as AbortSignal
}
