import { support } from './support'

function normalizeName(name: any): string {
  if (typeof name !== 'string') {
    name = String(name)
  }
  if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
    throw new TypeError('Invalid character in header field name')
  }
  return name.toLowerCase()
}

function normalizeValue(value: any): string {
  if (typeof value !== 'string') {
    value = String(value)
  }
  return value
}

// Build a destructive iterator for the value list
function iteratorFor<T>(items: T[]): IterableIterator<T> {
  var iterator = {
    next: function () {
      var value = items.shift()
      return { done: value === undefined, value: value }
    }
  } as IterableIterator<T>

  if (support.iterable) {
    iterator[Symbol.iterator] = function () {
      return iterator
    }
  }

  return iterator
}

export type HeadersInit = Headers | Array<[string, string]> | { [name: string]: string }

class Headers {

  private map: { [name: string]: string }

  constructor(headers?: HeadersInit) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach((value, name) => {
        this.append(name, value)
      })
    } else if (Array.isArray(headers)) {
      headers.forEach((header) => {
        this.append(header[0], header[1])
      })
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach((name) => {
        this.append(name, headers[name])
      })
    }
  }

  append(name: string, value: string): void {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue + ',' + value : value
  }

  delete(name: string): void {
    delete this.map[normalizeName(name)]
  }

  get(name: string) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  has(name: string): boolean {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  set(name: string, value: string): void {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  forEach(callback: (this: typeof thisArg, value: string, key: string, headers: Headers) => any,
           thisArg?: any): void {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  keys(): IterableIterator<string> {
    var items: string[] = []
    this.forEach(function (value, name) { items.push(name) })
    return iteratorFor(items)
  }

  values(): IterableIterator<string> {
    var items: string[] = []
    this.forEach(function (value) { items.push(value) })
    return iteratorFor(items)
  }

  entries(): IterableIterator<[string, string]> {
    var items: Array<[string, string]> = []
    this.forEach(function (value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  [Symbol.iterator]: () => Iterator<[string, string]>

}

if (support.iterable) {
  Headers.prototype[Symbol.iterator] = Headers.prototype.entries
}

export { Headers }
