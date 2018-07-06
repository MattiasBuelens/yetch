import {ReadableStream as ReadableStreamType, ReadableStreamConstructor} from './stream'

export type GlobalReadableStream<R = Uint8Array> = ReadableStreamType<R>
export const GlobalReadableStream: ReadableStreamConstructor<GlobalReadableStream> = (typeof ReadableStream ===
'function'
  ? ReadableStream
  : undefined) as any
