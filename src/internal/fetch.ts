import { xhrFetch } from './xhr'
import { nativeFetch, nativeFetchSupported } from './native'
import { Request, RequestInit } from './Request'
import { Response } from './Response'

type FetchImplementation = (request: Request) => Promise<Response>
const fetchImplementation: FetchImplementation = nativeFetchSupported() ? nativeFetch : xhrFetch;

export function fetch(input: Request | string, init?: RequestInit): Promise<Response> {
  return new Promise<Response>(resolve => {
    resolve(fetchImplementation(new Request(input, init)))
  })
}

(fetch as any).polyfill = true
