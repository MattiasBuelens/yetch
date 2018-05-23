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

function Headers(headers: HeadersInit) {
  this.map = {}

  if (headers instanceof Headers) {
    headers.forEach(function (value, name) {
      this.append(name, value)
    }, this)
  } else if (Array.isArray(headers)) {
    headers.forEach(function (header) {
      this.append(header[0], header[1])
    }, this)
  } else if (headers) {
    Object.getOwnPropertyNames(headers).forEach(function (name) {
      this.append(name, headers[name])
    }, this)
  }
}

Headers.prototype.append = function (name: string, value: string): void {
  name = normalizeName(name)
  value = normalizeValue(value)
  var oldValue = this.map[name]
  this.map[name] = oldValue ? oldValue + ',' + value : value
}

Headers.prototype['delete'] = function (name: string): void {
  delete this.map[normalizeName(name)]
}

Headers.prototype.get = function (name: string) {
  name = normalizeName(name)
  return this.has(name) ? this.map[name] : null
}

Headers.prototype.has = function (name: string): boolean {
  return this.map.hasOwnProperty(normalizeName(name))
}

Headers.prototype.set = function (name: string, value: string): void {
  this.map[normalizeName(name)] = normalizeValue(value)
}

Headers.prototype.forEach = function (callback: (value: string, key: string, headers: Headers) => any,
                                      thisArg?: any): void {
  for (var name in this.map) {
    if (this.map.hasOwnProperty(name)) {
      callback.call(thisArg, this.map[name], name, this)
    }
  }
}

Headers.prototype.keys = function (): IterableIterator<string> {
  var items = []
  this.forEach(function (value, name) { items.push(name) })
  return iteratorFor(items)
}

Headers.prototype.values = function (): IterableIterator<string> {
  var items = []
  this.forEach(function (value) { items.push(value) })
  return iteratorFor(items)
}

Headers.prototype.entries = function (): IterableIterator<[string, string]> {
  var items = []
  this.forEach(function (value, name) { items.push([name, value]) })
  return iteratorFor(items)
}

if (support.iterable) {
  Headers.prototype[Symbol.iterator] = Headers.prototype.entries
}

export { Headers }
