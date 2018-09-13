import {
  QueuingStrategy,
  ReadableStream as WhatWGReadableStream,
  ReadableStreamDefaultController,
  ReadableStreamDefaultReader,
  ReadableStreamSource
} from 'whatwg-streams'

declare module 'whatwg-streams' {
  // TODO Move to upstream
  interface ReadableStream<R = ArrayBufferView> {
    cancel(reason?: any): Promise<void>
  }
  interface ReadableStreamDefaultReader<R = ArrayBufferView> {
    cancel(reason?: any): Promise<void>
  }
  interface ReadableStreamBYOBReader<R = ArrayBufferView> {
    cancel(reason?: any): Promise<void>
  }
  interface WritableStream<W = ArrayBufferView> {
    abort(reason?: any): Promise<void>
  }
  interface WritableStreamDefaultWriter<W = ArrayBufferView> {
    abort(reason?: any): Promise<void>
  }
}

export type ReadableStream<R = Uint8Array> = WhatWGReadableStream<R>

export interface ReadableStreamConstructor<T extends ReadableStream<any> = ReadableStream<any>> {
  new <R>(underlyingSource?: ReadableStreamSource<R>, strategy?: QueuingStrategy<R>): T & ReadableStream<R>
}

/** @internal */
export function isReadableStream<T = Uint8Array>(stream: any): stream is ReadableStream<T> {
  return stream && typeof (stream as ReadableStream).getReader === 'function'
}

/** @internal */
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

/** @internal */
export type ReadProgressCallback = (result: IteratorResult<Uint8Array>) => void

class ReaderSource implements ReadableStreamSource<Uint8Array> {
  private readonly _reader: ReadableStreamDefaultReader<Uint8Array>
  private _onRead?: ReadProgressCallback

  constructor(reader: ReadableStreamDefaultReader<Uint8Array>, onRead?: ReadProgressCallback) {
    this._reader = reader
    this._onRead = onRead
  }

  pull(c: ReadableStreamDefaultController<Uint8Array>) {
    return this._reader.read().then(result => {
      if (this._onRead) {
        this._onRead(result)
      }
      if (result.done) {
        c.close()
      } else {
        c.enqueue(result.value)
      }
    })
  }

  cancel(reason: any) {
    return this._reader.cancel(reason)
  }
}

/** @internal */
export function convertStream<T extends ReadableStream>(
  ctor: ReadableStreamConstructor<T>,
  stream: ReadableStream
): T & ReadableStream {
  if (stream.constructor === ctor) {
    return stream as any
  }
  return new ctor(new ReaderSource(stream.getReader()), {highWaterMark: 0})
}

/** @internal */
export function monitorStream<T extends ReadableStream>(
  ctor: ReadableStreamConstructor<T>,
  stream: ReadableStream,
  onProgress: ReadProgressCallback
): T & ReadableStream {
  return new ctor(new ReaderSource(stream.getReader(), onProgress), {highWaterMark: 0})
}

class ArrayBufferSource implements ReadableStreamSource<Uint8Array> {
  private readonly _pull: () => Promise<ArrayBuffer>
  private readonly _cancel?: (reason: any) => void

  constructor(pull: () => Promise<ArrayBuffer>, cancel?: (reason: any) => void) {
    this._pull = pull
    this._cancel = cancel
  }

  pull(c: ReadableStreamDefaultController<Uint8Array>) {
    return this._pull().then(chunk => {
      c.enqueue(new Uint8Array(chunk))
      c.close()
    })
  }

  cancel(reason: any) {
    if (this._cancel) {
      this._cancel(reason)
    }
  }
}

/** @internal */
export function readArrayBufferAsStream<T extends ReadableStream>(
  ctor: ReadableStreamConstructor<T>,
  pull: () => Promise<ArrayBuffer>,
  cancel?: (reason: any) => void
): T & ReadableStream {
  return new ctor(new ArrayBufferSource(pull, cancel), {
    highWaterMark: 0 // do not pull immediately
  })
}
