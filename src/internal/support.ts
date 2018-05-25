import { root } from './root'

export const support = {
  searchParams: 'URLSearchParams' in root,
  iterable: 'Symbol' in root && 'iterator' in Symbol,
  blob: 'FileReader' in root && 'Blob' in root && (function() {
    try {
      new Blob()
      return true
    } catch (e) {
      return false
    }
  })(),
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
  })
}
