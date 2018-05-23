import { support } from './support'
import { Headers } from './Headers'

var viewClasses = [
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

var isDataView = function (obj: any): obj is DataView {
  return obj && DataView.prototype.isPrototypeOf(obj)
}

var isArrayBufferView: typeof ArrayBuffer.isView = ArrayBuffer.isView || function (obj) {
  return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
}

function consumed(body: Body): Promise<never> | undefined {
  if (body.bodyUsed) {
    return Promise.reject(new TypeError('Already read'))
  }
  body.bodyUsed = true
}

function fileReaderReady<T>(reader: FileReader): Promise<T> {
  return new Promise(function (resolve, reject) {
    reader.onload = function () {
      resolve(reader.result)
    }
    reader.onerror = function () {
      reject(reader.error)
    }
  })
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  var reader = new FileReader()
  var promise = fileReaderReady<ArrayBuffer>(reader)
  reader.readAsArrayBuffer(blob)
  return promise
}

function readBlobAsText(blob: Blob): Promise<string> {
  var reader = new FileReader()
  var promise = fileReaderReady<string>(reader)
  reader.readAsText(blob)
  return promise
}

function readArrayBufferAsText(buf: ArrayBuffer): string {
  var view = new Uint8Array(buf)
  var chars = new Array(view.length)

  for (var i = 0; i < view.length; i++) {
    chars[i] = String.fromCharCode(view[i])
  }
  return chars.join('')
}

function bufferClone(buf: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (buf.slice) {
    return buf.slice(0)
  } else {
    var view = new Uint8Array(buf.byteLength)
    view.set(new Uint8Array(buf))
    return view.buffer
  }
}

function decode(body: string): FormData {
  var form = new FormData()
  body.trim().split('&').forEach(function (bytes) {
    if (bytes) {
      var split = bytes.split('=')
      var name = split.shift()!.replace(/\+/g, ' ')
      var value = split.join('=').replace(/\+/g, ' ')
      form.append(decodeURIComponent(name), decodeURIComponent(value))
    }
  })
  return form
}

abstract class Body {

  bodyUsed: boolean = false
  abstract headers: Headers

  protected _bodyInit: BodyInit
  private _bodyText?: string
  private _bodyBlob?: Blob
  private _bodyFormData?: FormData
  private _bodyArrayBuffer?: ArrayBuffer

  _initBody(body: BodyInit) {
    this._bodyInit = body
    if (!body) {
      this._bodyText = ''
    } else if (typeof body === 'string') {
      this._bodyText = body
    } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
      this._bodyBlob = body
    } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
      this._bodyFormData = body
    } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
      this._bodyText = body.toString()
    } else if (support.arrayBuffer && support.blob && isDataView(body)) {
      this._bodyArrayBuffer = bufferClone(body.buffer)
      // IE 10-11 can't handle a DataView body.
      this._bodyInit = new Blob([this._bodyArrayBuffer])
    } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
      this._bodyArrayBuffer = bufferClone(body)
    } else {
      throw new Error('unsupported BodyInit type')
    }

    if (!this.headers.get('content-type')) {
      if (typeof body === 'string') {
        this.headers.set('content-type', 'text/plain;charset=UTF-8')
      } else if (this._bodyBlob && this._bodyBlob.type) {
        this.headers.set('content-type', this._bodyBlob.type)
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
      }
    }
  }

  text(): Promise<string> {
    var rejected = consumed(this)
    if (rejected) {
      return rejected
    }

    if (this._bodyBlob) {
      return readBlobAsText(this._bodyBlob)
    } else if (this._bodyArrayBuffer) {
      return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
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

}

if (support.blob) {
  Body.prototype.blob = function (): Promise<Blob> {
    var rejected = consumed(this)
    if (rejected) {
      return rejected
    }

    if (this._bodyBlob) {
      return Promise.resolve(this._bodyBlob)
    } else if (this._bodyArrayBuffer) {
      return Promise.resolve(new Blob([this._bodyArrayBuffer]))
    } else if (this._bodyFormData) {
      throw new Error('could not read FormData body as blob')
    } else {
      return Promise.resolve(new Blob([this._bodyText]))
    }
  }

  Body.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    if (this._bodyArrayBuffer) {
      return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
    } else {
      return this.blob().then(readBlobAsArrayBuffer)
    }
  }
}

if (support.formData) {
  Body.prototype.formData = function (): Promise<FormData> {
    return this.text().then(decode)
  }
}

export { Body }
