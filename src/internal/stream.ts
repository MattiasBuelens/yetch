import {
  ReadableStream as WhatWGReadableStream,
  ReadableStreamDefaultController,
  ReadableStreamDefaultReader,
  ReadableStreamSource
} from 'whatwg-streams'
import {root} from './root'

export type ReadableStream<R = Uint8Array> = WhatWGReadableStream<R>
export const ReadableStream: typeof WhatWGReadableStream = root.ReadableStream! as any

class ReaderSource<R> implements ReadableStreamSource<R> {
  private readonly _reader: ReadableStreamDefaultReader<R>

  constructor(reader: ReadableStreamDefaultReader<R>) {
    this._reader = reader
  }

  pull(c: ReadableStreamDefaultController<R>) {
    return this._reader.read().then(({done, value}) => {
      if (done) {
        c.close()
      } else {
        c.enqueue(value)
      }
    })
  }

  cancel(reason: any) {
    return this._reader.cancel(reason)
  }
}

export function convertStream<R>(stream: ReadableStream<R>, clazz: typeof ReadableStream): ReadableStream<R> {
  if (stream && stream.constructor === clazz) {
    return stream
  }
  return new clazz(new ReaderSource(stream.getReader()))
}
