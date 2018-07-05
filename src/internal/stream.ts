import {ReadableStream as WhatWGReadableStream} from 'whatwg-streams'
import {root} from './root'

type GlobalReadableStream<R = Uint8Array> = WhatWGReadableStream<R>
const GlobalReadableStream: typeof WhatWGReadableStream = root.ReadableStream! as any

export {GlobalReadableStream as ReadableStream}
