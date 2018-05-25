import { support } from './support'
import { Headers } from './Headers'
import { concatUint8Array, TypedArray } from './util'
import { ReadableStreamConstructor } from './stream'

export type BodyInit
  = Blob
  | TypedArray
  | DataView
  | ArrayBuffer
  | FormData
  | URLSearchParams
  | string
  | null;

const viewClasses = [
  '[object Int8Array]',
  '[object Uint8Array]',
  '[object Uint8ClampedArray]',
  '[object Int16Array]',
  '[object Uint16Array]',
  '[object Int32Array]',
  '[object Uint32Array]',
  '[object Float32Array]',
  '[object Float64Array]'
]

const isBlob = function(obj: any): obj is Blob {
  return obj && Blob.prototype.isPrototypeOf(obj)
}

const isFormData = function(obj: any): obj is FormData {
  return obj && FormData.prototype.isPrototypeOf(obj)
}

const isURLSearchParams = function(obj: any): obj is URLSearchParams {
  return obj && URLSearchParams.prototype.isPrototypeOf(obj)
}

const isArrayBuffer = function(obj: any): obj is ArrayBuffer {
  return obj && ArrayBuffer.prototype.isPrototypeOf(obj)
}

const isDataView = function(obj: any): obj is DataView {
  return obj && DataView.prototype.isPrototypeOf(obj)
}

const isArrayBufferView: typeof ArrayBuffer.isView = ArrayBuffer.isView || function(obj) {
  return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
}

const isReadableStream = function(obj: any): obj is ReadableStream {
  return obj && ReadableStream.prototype.isPrototypeOf(obj)
}

function consumed(body: Body): Promise<never> | undefined {
  if (body.bodyUsed) {
    return Promise.reject(new TypeError('Already read'))
  }
  body.bodyUsed = true
}

function fileReaderReady<T>(reader: FileReader): Promise<T> {
  return new Promise(function(resolve, reject) {
    reader.onload = () => {
      resolve(reader.result)
    }
    reader.onerror = () => {
      reject(reader.error)
    }
  })
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const reader = new FileReader()
  const promise = fileReaderReady<ArrayBuffer>(reader)
  reader.readAsArrayBuffer(blob)
  return promise
}

function readBlobAsText(blob: Blob): Promise<string> {
  const reader = new FileReader()
  const promise = fileReaderReady<string>(reader)
  reader.readAsText(blob)
  return promise
}

function readArrayBufferAsText(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf)
  const chars = new Array(view.length)

  for (let i = 0; i < view.length; i++) {
    chars[i] = String.fromCharCode(view[i])
  }
  return chars.join('')
}

function readAllChunks(readable: ReadableStream): Promise<Array<Uint8Array>> {
  const reader = readable.getReader()
  const chunks: Uint8Array[] = []
  const pump = ({ done, value }: IteratorResult<Uint8Array>): Promise<Array<Uint8Array>> => {
    if (done) {
      return Promise.resolve(chunks)
    } else {
      chunks.push(value)
      return reader.read().then(pump)
    }
  }
  return reader.read().then(pump)
}

function readStreamAsBlob(readable: ReadableStream): Promise<Blob> {
  return readAllChunks(readable).then((chunks) => new Blob(chunks))
}

function readStreamAsArrayBuffer(readable: ReadableStream): Promise<ArrayBuffer> {
  return readAllChunks(readable).then((chunks) => concatUint8Array(chunks).buffer)
}

function readStreamAsText(readable: ReadableStream): Promise<string> {
  return readStreamAsArrayBuffer(readable).then(readArrayBufferAsText)
}

function createStream(fn: () => Promise<ArrayBuffer>): ReadableStream {
  return new (ReadableStream as ReadableStreamConstructor)({
    pull(c) {
      return fn()
        .then(chunk => {
          c.enqueue(new Uint8Array(chunk))
          c.close()
        })
    }
    // TODO cancel must abort ongoing fetch
  }, {
    highWaterMark: 0 // do not pull immediately
  })
}

function bufferClone(buf: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (isArrayBuffer(buf)) {
    return arrayBufferClone(buf)
  } else {
    return arrayBufferViewClone(buf)
  }
}

function arrayBufferClone(buf: ArrayBuffer): ArrayBuffer {
  if (buf.slice) {
    return buf.slice(0)
  } else {
    return arrayBufferViewClone(new Uint8Array(buf))
  }
}

function arrayBufferViewClone(buf: ArrayBufferView): ArrayBuffer {
  if ((buf as TypedArray).slice) {
    return (buf as TypedArray).slice(0).buffer
  } else {
    const view = new Uint8Array(buf.byteLength)
    view.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength))
    return view.buffer
  }
}

function decode(body: string): FormData {
  const form = new FormData()
  body.trim().split('&').forEach(function(bytes) {
    if (bytes) {
      const split = bytes.split('=')
      const name = split.shift()!.replace(/\+/g, ' ')
      const value = split.join('=').replace(/\+/g, ' ')
      form.append(decodeURIComponent(name), decodeURIComponent(value))
    }
  })
  return form
}

abstract class Body {

  bodyUsed: boolean = false
  abstract headers: Headers

  /** @internal */
  _bodyInit!: BodyInit
  /** @internal */
  _bodyText?: string
  /** @internal */
  _bodyBlob?: Blob
  /** @internal */
  _bodyFormData?: FormData
  /** @internal */
  _bodyArrayBuffer?: ArrayBuffer
  /** @internal */
  _bodyReadableStream?: ReadableStream

  /** @internal */
  _initBody(body?: BodyInit) {
    this._bodyInit = body || null
    if (!body) {
      this._bodyText = ''
    } else if (typeof body === 'string') {
      this._bodyText = body
    } else if (support.blob && isBlob(body)) {
      this._bodyBlob = body
    } else if (support.formData && isFormData(body)) {
      this._bodyFormData = body
    } else if (support.searchParams && isURLSearchParams(body)) {
      this._bodyText = body.toString()
    } else if (support.arrayBuffer && support.blob && isDataView(body)) {
      this._bodyArrayBuffer = bufferClone(body.buffer)
      // IE 10-11 can't handle a DataView body.
      this._bodyInit = new Blob([this._bodyArrayBuffer])
    } else if (support.arrayBuffer && (isArrayBuffer(body) || isArrayBufferView(body))) {
      this._bodyArrayBuffer = bufferClone(body)
    } else if (support.stream && isReadableStream(body)) {
      // TODO transfer stream
      // TODO set bodyUsed to true when stream becomes disturbed (read or canceled)
      this._bodyReadableStream = body
    } else {
      throw new Error('unsupported BodyInit type')
    }

    if (!this.headers.get('content-type')) {
      if (typeof body === 'string') {
        this.headers.set('content-type', 'text/plain;charset=UTF-8')
      } else if (this._bodyBlob && this._bodyBlob.type) {
        this.headers.set('content-type', this._bodyBlob.type)
      } else if (support.searchParams && isURLSearchParams(body)) {
        this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
      }
    }
  }

  text(): Promise<string> {
    const rejected = consumed(this)
    if (rejected) {
      return rejected
    }

    if (this._bodyBlob) {
      return readBlobAsText(this._bodyBlob)
    } else if (this._bodyArrayBuffer) {
      return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
    } else if (this._bodyReadableStream) {
      return readStreamAsText(this._bodyReadableStream)
    } else if (this._bodyFormData) {
      throw new Error('could not read FormData body as text')
    } else {
      return Promise.resolve(this._bodyText!)
    }
  }

  json(): Promise<any> {
    return this.text().then(JSON.parse)
  }

  blob?: () => Promise<Blob>
  arrayBuffer?: () => Promise<ArrayBuffer>
  formData?: () => Promise<FormData>

  readonly body?: ReadableStream | null

}

if (support.blob) {
  Body.prototype.blob = function(): Promise<Blob> {
    const rejected = consumed(this)
    if (rejected) {
      return rejected
    }

    if (this._bodyBlob) {
      return Promise.resolve(this._bodyBlob)
    } else if (this._bodyArrayBuffer) {
      return Promise.resolve(new Blob([this._bodyArrayBuffer]))
    } else if (this._bodyReadableStream) {
      return readStreamAsBlob(this._bodyReadableStream)
    } else if (this._bodyFormData) {
      throw new Error('could not read FormData body as blob')
    } else {
      return Promise.resolve(new Blob([this._bodyText]))
    }
  }

  Body.prototype.arrayBuffer = function(): Promise<ArrayBuffer> {
    if (this._bodyArrayBuffer) {
      return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
    } else {
      return this.blob!().then(readBlobAsArrayBuffer)
    }
  }
}

if (support.formData) {
  Body.prototype.formData = function(): Promise<FormData> {
    return this.text().then(decode)
  }
}

if (support.stream) {
  Object.defineProperty(Body.prototype, 'body', {
    get() {
      if (this._bodyReadableStream) {
        return this._bodyReadableStream
      } else {
        // TODO set bodyUsed to true when stream becomes disturbed (read or canceled)
        return createStream(() => this.arrayBuffer!())
      }
    }
  })
}

export { Body }
