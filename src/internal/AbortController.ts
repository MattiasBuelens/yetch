import {
  AbortController as AbortControllerImpl,
  AbortSignal as AbortSignalImpl
} from 'abortcontroller-polyfill/dist/abortcontroller'

type AbortControllerPolyfill = AbortController
const AbortControllerPolyfill: typeof AbortController = AbortControllerImpl

type AbortSignalPolyfill = AbortSignal
const AbortSignalPolyfill: typeof AbortSignal = AbortSignalImpl

export {AbortControllerPolyfill as AbortController, AbortSignalPolyfill as AbortSignal}

// https://dom.spec.whatwg.org/#abortsignal-follow
export function followAbortSignal(followingController: AbortController, parentSignal: AbortSignal): void {
  // 1. If followingSignal's aborted flag is set, then return.
  if (followingController.signal.aborted) {
    return
  }
  // 2. If parentSignal's aborted flag is set, then signal abort on followingSignal.
  if (parentSignal.aborted) {
    followingController.abort()
  }
  // 3. Otherwise, add the following abort steps to parentSignal:
  else {
    const listener = () => {
      parentSignal.removeEventListener('abort', listener)
      followingController.signal.removeEventListener('abort', listener)
      // 1. Signal abort on followingSignal.
      followingController.abort()
    }
    parentSignal.addEventListener('abort', listener)
    followingController.signal.addEventListener('abort', listener)
  }
}
