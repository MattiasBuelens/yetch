import { root } from './root'

interface DOMException extends Error {
}

interface DOMExceptionConstructor {
  new(message?: string, name?: string): DOMException
  readonly prototype: DOMException
}

var DOMException: DOMExceptionConstructor = root.DOMException!
try {
  new DOMException()
} catch (err) {
  DOMException = function DOMException(message, name) {
    this.message = message
    this.name = name
    var error = Error(message)
    this.stack = error.stack
  }
  DOMException.prototype = Object.create(Error.prototype)
  DOMException.prototype.constructor = DOMException
}

export { DOMException }
