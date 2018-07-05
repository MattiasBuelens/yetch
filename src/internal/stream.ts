import { ReadableStream as WhatWGReadableStream } from 'whatwg-streams'

export type ReadableStreamConstructor = typeof WhatWGReadableStream;
export type ReadableStream = WhatWGReadableStream;
