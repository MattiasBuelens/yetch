import {root} from './root'
import {createBlob} from './blob'
import {GlobalReadableStream} from './globals'
import {isReadableStreamConstructor} from './stream'

export const support = {
  searchParams: 'URLSearchParams' in root,
  iterable: 'Symbol' in root && 'iterator' in Symbol,
  blob: 'FileReader' in root && !!createBlob,
  formData: 'FormData' in root,
  arrayBuffer: 'ArrayBuffer' in root,
  stream: isReadableStreamConstructor(GlobalReadableStream)
}
