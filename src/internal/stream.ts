import {
  QueuingStrategy,
  ReadableStream as WhatWGReadableStream,
  ReadableStreamDefaultController,
  ReadableStreamDefaultReader,
  ReadableStreamSource
} from 'whatwg-streams'

export type ReadableStream<R = Uint8Array> = WhatWGReadableStream<R>

export interface ReadableStreamConstructor<T extends ReadableStream<any>> {
  new <R>(underlyingSource?: ReadableStreamSource<R>, strategy?: QueuingStrategy<R>): T & ReadableStream<R>
}

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

export function convertStream<R, T extends ReadableStream<R>>(
  stream: ReadableStream<R>,
  clazz: ReadableStreamConstructor<T>
): T & ReadableStream<R> {
  if (stream && stream.constructor === clazz) {
    return stream as any
  }
  return new clazz(new ReaderSource(stream.getReader()))
}
