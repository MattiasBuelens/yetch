import {support} from './support'

function normalizeName(name: any): string {
  if (typeof name !== 'string') {
    name = String(name)
  }
  if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
    throw new TypeError('Invalid character in header field name')
  }
  return name
}

function normalizeValue(value: any): string {
  if (typeof value !== 'string') {
    value = String(value)
  }
  return value
}

function isIterable<T>(obj: any): obj is Iterable<T> {
  return support.iterable && obj && obj[Symbol.iterator]
}

// Build a destructive iterator for the value list
function iteratorFor<T>(items: T[]): IterableIterator<T> {
  const iterator = {
    next() {
      const value = items.shift()
      return {done: value === undefined, value: value}
    }
  } as IterableIterator<T>

  if (support.iterable) {
    iterator[Symbol.iterator] = () => iterator
  }

  return iterator
}

export type HeadersInit = Headers | Iterable<[string, string]> | {[name: string]: string}

export class Headers implements Iterable<[string, string]> {
  // Map of lower-case header name to [original header name, header value]
  private _map: {[name: string]: [string, string]}

  constructor(headers?: HeadersInit) {
    this._map = {}

    if (headers instanceof Headers) {
      headers.asList().forEach(([name, value]) => {
        this.append(name, value)
      })
    } else if (Array.isArray(headers)) {
      headers.forEach(header => {
        this.append(header[0], header[1])
      })
    } else if (isIterable(headers)) {
      Array.from(headers).forEach(header => {
        this.append(header[0], header[1])
      })
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(name => {
        this.append(name, headers[name])
      })
    }
  }

  append(name: string, value: string): void {
    name = normalizeName(name)
    value = normalizeValue(value)
    const key = name.toLowerCase()
    if (this._map.hasOwnProperty(key)) {
      const entry = this._map[key]
      const oldValue = entry[1]
      entry[1] = oldValue ? oldValue + ', ' + value : value
    } else {
      this._map[key] = [name, value]
    }
  }

  delete(name: string): void {
    const key = normalizeName(name).toLowerCase()
    delete this._map[key]
  }

  get(name: string): string | null {
    const key = normalizeName(name).toLowerCase()
    return this._map.hasOwnProperty(key) ? this._map[key][1] : null
  }

  has(name: string): boolean {
    const key = normalizeName(name).toLowerCase()
    return this._map.hasOwnProperty(key)
  }

  set(name: string, value: string): void {
    name = normalizeName(name)
    const key = name.toLowerCase()
    this._map[key] = [name, normalizeValue(value)]
  }

  forEach(callback: (this: typeof thisArg, value: string, key: string, headers: Headers) => any, thisArg?: any): void {
    for (const name in this._map) {
      if (this._map.hasOwnProperty(name)) {
        callback.call(thisArg, this._map[name][1], name, this)
      }
    }
  }

  keys(): IterableIterator<string> {
    const items: string[] = []
    this.forEach((value, name) => {
      items.push(name)
    })
    return iteratorFor(items)
  }

  values(): IterableIterator<string> {
    const items: string[] = []
    this.forEach(value => {
      items.push(value)
    })
    return iteratorFor(items)
  }

  entries(): IterableIterator<[string, string]> {
    const items: Array<[string, string]> = []
    this.forEach((value, name) => {
      items.push([name, value])
    })
    return iteratorFor(items)
  }

  /**
   * Returns the headers as a list of tuples of header names and header values,
   * with the original case for the header names.
   *
   * Warning: non-standard extension.
   */
  asList(): Array<[string, string]> {
    const list: Array<[string, string]> = []
    for (const key in this._map) {
      if (this._map.hasOwnProperty(key)) {
        const [name, value] = this._map[key]
        list.push([name, value])
      }
    }
    return list
  }

  [Symbol.iterator]: () => Iterator<[string, string]>
}

if (support.iterable) {
  Headers.prototype[Symbol.iterator] = Headers.prototype.entries
}
