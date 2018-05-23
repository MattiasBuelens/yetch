import { support } from './support'
import { DOMException } from './DOMException'
import { Headers } from './Headers'
import { Request, RequestInit } from './Request'
import { Response, ResponseInit } from './Response'

function parseHeaders(rawHeaders: string): Headers {
  const headers = new Headers()
  // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
  // https://tools.ietf.org/html/rfc7230#section-3.2
  const preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ')
  preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
    const parts = line.split(':')
    const key = parts.shift()!.trim()
    if (key) {
      const value = parts.join(':').trim()
      headers.append(key, value)
    }
  })
  return headers
}

function fetch(input?: Request | string, init?: RequestInit): Promise<Response> {
  return new Promise<Response>(function (resolve, reject) {
    const request = new Request(input, init)

    if (request.signal && request.signal.aborted) {
      return reject(new DOMException('Aborted', 'AbortError'))
    }

    const xhr = new XMLHttpRequest()

    const abortXhr = () => {
      xhr.abort()
    }

    xhr.onload = () => {
      const headers = parseHeaders(xhr.getAllResponseHeaders() || '')
      const options: ResponseInit = {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: headers,
        url: xhr.responseURL || headers.get('X-Request-URL')
      }
      const body = xhr.response || xhr.responseText
      resolve(new Response(body, options))
    }

    xhr.onerror = () => {
      reject(new TypeError('Network request failed'))
    }

    xhr.ontimeout = () => {
      reject(new TypeError('Network request failed'))
    }

    xhr.onabort = () => {
      reject(new DOMException('Aborted', 'AbortError'))
    }

    xhr.open(request.method, request.url, true)

    xhr.withCredentials = (request.credentials === 'include')

    if ('responseType' in xhr && support.blob) {
      xhr.responseType = 'blob'
    }

    request.headers.forEach((value, name) => {
      xhr.setRequestHeader(name, value)
    })

    if (request.signal) {
      request.signal.addEventListener('abort', abortXhr)

      xhr.onreadystatechange = () => {
        // DONE (success or failure)
        if (xhr.readyState === 4) {
          request.signal!.removeEventListener('abort', abortXhr)
        }
      }
    }

    xhr.send(request._bodyInit === undefined ? null : request._bodyInit)
  })
}

fetch.polyfill = true
export { fetch }
