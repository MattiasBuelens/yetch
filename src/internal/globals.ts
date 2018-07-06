import {ReadableStream as ReadableStreamType, ReadableStreamConstructor} from './stream'

// The global ReadableStream class
// Can be polyfilled by defining the global ReadableStream, or injecting an import
export type GlobalReadableStream<R = Uint8Array> = ReadableStreamType<R>
export const GlobalReadableStream: ReadableStreamConstructor<GlobalReadableStream> = (typeof ReadableStream ===
'function'
  ? ReadableStream
  : undefined) as any
