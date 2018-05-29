import { root } from './root'
import { createBlob } from './blob'

export const support = {
  searchParams: 'URLSearchParams' in root,
  iterable: 'Symbol' in root && 'iterator' in Symbol,
  blob: 'FileReader' in root && !!createBlob,
  formData: 'FormData' in root,
  arrayBuffer: 'ArrayBuffer' in root,
  stream: 'ReadableStream' in root && (function() {
    try {
      // Edge does not support developer-constructed streams
      new ReadableStream()
      return true
    } catch (e) {
      return false
    }
  })()
}
