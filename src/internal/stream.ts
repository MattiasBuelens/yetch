import {
  QueuingStrategy,
  ReadableStream as WhatWGReadableStream,
  ReadableStreamDefaultController,
  ReadableStreamDefaultReader,
  ReadableStreamSource
} from 'whatwg-streams'

export type ReadableStream<R = Uint8Array> = WhatWGReadableStream<R>

export interface ReadableStreamConstructor<T extends ReadableStream<any> = ReadableStream<any>> {
  new <R>(underlyingSource?: ReadableStreamSource<R>, strategy?: QueuingStrategy<R>): T & ReadableStream<R>
}

export function isReadableStream<T = Uint8Array>(stream: any): stream is ReadableStream<T> {
  return stream && typeof (stream as ReadableStream).getReader === 'function'
}

export function isReadableStreamConstructor(ctor: any): ctor is ReadableStreamConstructor {
  if (typeof ctor !== 'function') {
    return false
  }
  try {
    // Check if constructor calls start() on the underlying source
    let startCalled = false
    const stream = new ctor({
      start() {
        startCalled = true
      }
    })
    if (!startCalled) {
      return false
    }
    // Check if constructed stream is actually a ReadableStream (and not a WritableStream or TransformStream)
    return isReadableStream(stream)
  } catch (e) {
    return false
  }
}

class ReaderSource<R> implements ReadableStreamSource<R> {
  private readonly _reader: ReadableStreamDefaultReader<R>
  private _disturbed: boolean = false
  private _onDisturbed?: () => void

  constructor(reader: ReadableStreamDefaultReader<R>, onDisturbed?: () => void) {
    this._reader = reader
    this._onDisturbed = onDisturbed
  }

  pull(c: ReadableStreamDefaultController<R>) {
    this._setDisturbed()
    return this._reader.read().then(({done, value}) => {
      if (done) {
        c.close()
      } else {
        c.enqueue(value)
      }
    })
  }

  cancel(reason: any) {
    this._setDisturbed()
    return this._reader.cancel(reason)
  }

  private _setDisturbed() {
    if (this._disturbed) {
      return
    }
    this._disturbed = true
    if (this._onDisturbed) {
      this._onDisturbed()
      this._onDisturbed = undefined!
    }
  }
}

export function convertStream<R, T extends ReadableStream<R>>(
  stream: ReadableStream<R>,
  clazz: ReadableStreamConstructor<T>
): T & ReadableStream<R> {
  if (stream.constructor === clazz) {
    return stream as any
  }
  return new clazz(new ReaderSource(stream.getReader()), {highWaterMark: 0})
}

export function transferStream<R, T extends ReadableStream<R>>(
  stream: ReadableStream<R>,
  clazz: ReadableStreamConstructor<T>,
  onDisturbed: () => void
): T & ReadableStream<R> {
  return new clazz(new ReaderSource(stream.getReader(), onDisturbed), {highWaterMark: 0})
}
