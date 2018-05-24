import { root } from './root'

interface DOMException extends Error {
}

interface DOMExceptionConstructor {
  new(message?: string, name?: string): DOMException

  prototype: DOMException
}

let DOMException: DOMExceptionConstructor = root.DOMException!
try {
  new DOMException()
} catch (err) {
  DOMException = function DOMException(this: DOMException, message?: string, name?: string) {
    this.message = message || ''
    this.name = name || 'Error'
    const error = Error(message)
    this.stack = error.stack
  } as any
  DOMException.prototype = Object.create(Error.prototype)
  DOMException.prototype.constructor = DOMException
}

export { DOMException }
