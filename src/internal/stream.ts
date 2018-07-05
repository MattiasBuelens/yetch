import {ReadableStream as WhatWGReadableStream} from 'whatwg-streams'
import {root} from './root'

export type ReadableStream<R = Uint8Array> = WhatWGReadableStream<R>
export const ReadableStream: typeof WhatWGReadableStream = root.ReadableStream! as any
