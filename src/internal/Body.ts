import {support} from './support'
import {Headers} from './Headers'
import {concatUint8Array, noOp, TypedArray} from './util'
import {isReadableStream, monitorStream, ReadableStream, readArrayBufferAsStream} from './stream'
import {BlobPart, createBlob} from './blob'
import {GlobalReadableStream} from './globals'

export type BodyInit =
  | Blob
  | TypedArray
  | DataView
  | ArrayBuffer
  | FormData
  | URLSearchParams
  | ReadableStream
  | string
  | null

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

function isBlob(obj: any): obj is Blob {
  return obj && Blob.prototype.isPrototypeOf(obj)
}

function isFormData(obj: any): obj is FormData {
  return obj && FormData.prototype.isPrototypeOf(obj)
}

function isURLSearchParams(obj: any): obj is URLSearchParams {
  return obj && URLSearchParams.prototype.isPrototypeOf(obj)
}

function isArrayBuffer(obj: any): obj is ArrayBuffer {
  return obj && ArrayBuffer.prototype.isPrototypeOf(obj)
}

function isDataView(obj: any): obj is DataView {
  return obj && DataView.prototype.isPrototypeOf(obj)
}

const isArrayBufferView: typeof ArrayBuffer.isView =
  ArrayBuffer.isView ||
  function(obj) {
    return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
  }

function isPromiseLike<T>(obj: any): obj is PromiseLike<T> {
  return obj && typeof obj.then === 'function'
}

function consumed(body: Body): Promise<never> | undefined {
  if (body.bodyUsed) {
    return Promise.reject(new TypeError('Already used'))
  }
  body.bodyUsed = true
}

function fileReaderReady<T extends string | ArrayBuffer>(reader: FileReader): Promise<T> {
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      resolve(reader.result! as T)
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

function createBlobWithType(blobParts: BlobPart[], contentType?: string | null | undefined): Blob {
  return createBlob(blobParts, {type: contentType || ''})
}

function readArrayBufferAsText(buf: ArrayBuffer): Promise<string> {
  return readBlobAsText(createBlobWithType([buf]))
}

function readAllChunks(readable: ReadableStream): Promise<Array<Uint8Array>> {
  const reader = readable.getReader()
  const chunks: Uint8Array[] = []
  const pump = ({done, value}: IteratorResult<Uint8Array>): Promise<Array<Uint8Array>> => {
    if (done) {
      return Promise.resolve(chunks)
    } else {
      chunks.push(value)
      return reader.read().then(pump)
    }
  }
  return reader.read().then(pump)
}

function readStreamAsBlob(readable: ReadableStream, contentType?: string | null | undefined): Promise<Blob> {
  return readAllChunks(readable).then(chunks => createBlobWithType(chunks, contentType))
}

function readStreamAsArrayBuffer(readable: ReadableStream): Promise<ArrayBuffer> {
  return readAllChunks(readable).then(chunks => concatUint8Array(chunks).buffer)
}

function readStreamAsText(readable: ReadableStream): Promise<string> {
  // TODO Use TransformStream and TextDecoder if supported
  return readStreamAsBlob(readable).then(readBlobAsText)
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
  body
    .trim()
    .split('&')
    .forEach(bytes => {
      if (bytes) {
        const split = bytes.split('=')
        const name = split.shift()!.replace(/\+/g, ' ')
        const value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
  return form
}

/** @internal */
export type InternalBodyInit = BodyInit | PromiseLike<BodyInit>

/** @internal */
export function cloneBody(body: Body): InternalBodyInit {
  if (body.bodyUsed) {
    throw new TypeError('Already used')
  }
  if (body._bodyReadableStream) {
    // https://fetch.spec.whatwg.org/#concept-body-clone
    if (!body._bodyReadableStream.tee) {
      throw new Error('could not clone ReadableStream body')
    }
    const [stream1, stream2] = body._bodyReadableStream.tee()
    body._bodyInit = stream1
    body._bodyReadableStream = stream1
    return stream2
  } else {
    return body._bodyInit as BodyInit
  }
}

export class Body {
  body?: ReadableStream | null
  bodyUsed: boolean = false

  /** @internal */
  _bodyMimeType: string
  /** @internal */
  _bodyInit!: InternalBodyInit
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
  _bodyPromise?: Promise<Body>

  /** @internal */
  protected constructor(body: InternalBodyInit, headers: Headers) {
    this._bodyInit = body || null

    if (!body) {
      this._bodyText = ''
    } else if (typeof body === 'string') {
      this._bodyText = body
    } else if (isPromiseLike<BodyInit>(body)) {
      this._bodyPromise = Promise.resolve(body).then(bodyInit => new Body(bodyInit, headers))
      this._bodyPromise.catch(noOp) // ignore unhandled rejections
    } else if (support.blob && isBlob(body)) {
      this._bodyBlob = body
    } else if (support.formData && isFormData(body)) {
      this._bodyFormData = body
    } else if (support.searchParams && isURLSearchParams(body)) {
      this._bodyText = body.toString()
    } else if (support.arrayBuffer && support.blob && isDataView(body)) {
      this._bodyArrayBuffer = bufferClone(body.buffer)
      // IE 10-11 can't handle a DataView body.
      this._bodyInit = createBlobWithType([this._bodyArrayBuffer])
    } else if (support.arrayBuffer && (isArrayBuffer(body) || isArrayBufferView(body))) {
      this._bodyArrayBuffer = bufferClone(body)
    } else if (support.stream && isReadableStream(body)) {
      // transfer stream and monitor when disturbed
      this._bodyReadableStream = monitorStream(GlobalReadableStream, body, () => {
        // set bodyUsed to true when stream becomes disturbed (read or canceled)
        this.bodyUsed = true
      })
    } else {
      throw new Error('unsupported BodyInit type')
    }

    this._bodyMimeType = ''
    if (headers.has('content-type')) {
      // https://fetch.spec.whatwg.org/#concept-header-extract-mime-type
      this._bodyMimeType = (headers.get('content-type') || '').toLowerCase()
    } else {
      // https://fetch.spec.whatwg.org/#concept-bodyinit-extract
      if (typeof body === 'string') {
        this._bodyMimeType = 'text/plain;charset=UTF-8'
      } else if (this._bodyBlob && this._bodyBlob.type) {
        this._bodyMimeType = this._bodyBlob.type
      } else if (support.searchParams && isURLSearchParams(body)) {
        this._bodyMimeType = 'application/x-www-form-urlencoded;charset=UTF-8'
      }
      if (this._bodyMimeType) {
        headers.set('content-type', this._bodyMimeType)
      }
    }

    if (support.stream) {
      if (body == null) {
        this.body = null
      } else if (this._bodyReadableStream) {
        this.body = this._bodyReadableStream
      } else {
        this.body = readArrayBufferAsStream(
          GlobalReadableStream,
          () => {
            return this.arrayBuffer!() // also sets bodyUsed to true
          },
          () => {
            this.bodyUsed = true
          }
        )
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
      return readArrayBufferAsText(this._bodyArrayBuffer)
    } else if (this._bodyReadableStream) {
      return readStreamAsText(this._bodyReadableStream)
    } else if (this._bodyPromise) {
      return this._bodyPromise.then(body => body.text())
    } else if (this._bodyFormData) {
      return Promise.reject(new Error('could not read FormData body as text'))
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
}

if (support.blob) {
  Body.prototype.blob = function(this: Body): Promise<Blob> {
    const rejected = consumed(this)
    if (rejected) {
      return rejected
    }

    if (this._bodyBlob) {
      return Promise.resolve(this._bodyBlob)
    } else if (this._bodyArrayBuffer) {
      return Promise.resolve(createBlobWithType([this._bodyArrayBuffer], this._bodyMimeType))
    } else if (this._bodyReadableStream) {
      return readStreamAsBlob(this._bodyReadableStream, this._bodyMimeType)
    } else if (this._bodyPromise) {
      return this._bodyPromise.then(body => body.blob!())
    } else if (this._bodyFormData) {
      return Promise.reject(new Error('could not read FormData body as Blob'))
    } else {
      return Promise.resolve(createBlobWithType([this._bodyText!], this._bodyMimeType))
    }
  }

  Body.prototype.arrayBuffer = function(this: Body): Promise<ArrayBuffer> {
    if (this._bodyArrayBuffer) {
      return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
    } else if (this._bodyReadableStream) {
      return readStreamAsArrayBuffer(this._bodyReadableStream)
    } else if (this._bodyPromise) {
      return consumed(this) || this._bodyPromise.then(body => body.arrayBuffer!())
    } else if (this._bodyFormData) {
      return Promise.reject(new Error('could not read FormData body as ArrayBuffer'))
    } else {
      return this.blob!().then(readBlobAsArrayBuffer)
    }
  }
}

if (support.formData) {
  Body.prototype.formData = function(this: Body): Promise<FormData> {
    return this.text().then(decode)
  }
}
