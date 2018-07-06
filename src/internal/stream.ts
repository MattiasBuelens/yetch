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

/** @internal */
export function convertStream<R, T extends ReadableStream<R>>(
  ctor: ReadableStreamConstructor<T>,
  stream: ReadableStream<R>
): T & ReadableStream<R> {
  if (stream.constructor === ctor) {
    return stream as any
  }
  return new ctor(new ReaderSource(stream.getReader()), {highWaterMark: 0})
}

/** @internal */
export function transferStream<R, T extends ReadableStream<R>>(
  ctor: ReadableStreamConstructor<T>,
  stream: ReadableStream<R>,
  onDisturbed: () => void
): T & ReadableStream<R> {
  return new ctor(new ReaderSource(stream.getReader(), onDisturbed), {highWaterMark: 0})
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
