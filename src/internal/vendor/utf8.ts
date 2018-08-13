/*
 * utf8.js by Mathias Bynens
 * License: MIT
 *
 * https://github.com/mathiasbynens/utf8.js/blob/v3.0.0/utf8.js
 */

import {ucs2decode, ucs2encode} from './ucs2'
import {fromCodeUnits} from '../util'

function checkScalarValue(codePoint: number) {
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
    throw new Error('Lone surrogate U+' + codePoint.toString(16).toUpperCase() + ' is not a scalar value')
  }
}

/*--------------------------------------------------------------------------*/

function createByte(codePoint: number, shift: number): number {
  return ((codePoint >> shift) & 0x3f) | 0x80
}

function encodeCodePoint(codePoint: number, output: number[]) {
  if ((codePoint & 0xffffff80) === 0) {
    // 1-byte sequence
    output.push(codePoint)
    return
  }
  if ((codePoint & 0xfffff800) === 0) {
    // 2-byte sequence
    output.push(((codePoint >> 6) & 0x1f) | 0xc0)
  } else if ((codePoint & 0xffff0000) === 0) {
    // 3-byte sequence
    checkScalarValue(codePoint)
    output.push(((codePoint >> 12) & 0x0f) | 0xe0)
    output.push(createByte(codePoint, 6))
  } else if ((codePoint & 0xffe00000) === 0) {
    // 4-byte sequence
    output.push(((codePoint >> 18) & 0x07) | 0xf0)
    output.push(createByte(codePoint, 12))
    output.push(createByte(codePoint, 6))
  }
  output.push((codePoint & 0x3f) | 0x80)
}

function utf8encoderaw(codePoints: number[]): number[] {
  const bytes: number[] = []
  for (let codePoint of codePoints) {
    encodeCodePoint(codePoint, bytes)
  }
  return bytes
}

function utf8encode(string: string): string {
  return fromCodeUnits(utf8encoderaw(ucs2decode(string)))
}

/*--------------------------------------------------------------------------*/

let byteArray: ArrayLike<number>
let byteCount: number
let byteIndex: number

function readContinuationByte(): number {
  if (byteIndex >= byteCount) {
    throw new Error('Invalid byte index')
  }

  const continuationByte = byteArray[byteIndex] & 0xff
  byteIndex++

  if ((continuationByte & 0xc0) === 0x80) {
    return continuationByte & 0x3f
  }

  // If we end up here, it’s not a continuation byte
  throw new Error('Invalid continuation byte')
}

function decodeSymbol(): number | false {
  let byte1: number
  let byte2: number
  let byte3: number
  let byte4: number
  let codePoint: number

  if (byteIndex > byteCount) {
    throw new Error('Invalid byte index')
  }

  if (byteIndex === byteCount) {
    return false
  }

  // Read first byte
  byte1 = byteArray[byteIndex] & 0xff
  byteIndex++

  // 1-byte sequence (no continuation bytes)
  if ((byte1 & 0x80) === 0) {
    return byte1
  }

  // 2-byte sequence
  if ((byte1 & 0xe0) === 0xc0) {
    byte2 = readContinuationByte()
    codePoint = ((byte1 & 0x1f) << 6) | byte2
    if (codePoint >= 0x80) {
      return codePoint
    } else {
      throw new Error('Invalid continuation byte')
    }
  }

  // 3-byte sequence (may include unpaired surrogates)
  if ((byte1 & 0xf0) === 0xe0) {
    byte2 = readContinuationByte()
    byte3 = readContinuationByte()
    codePoint = ((byte1 & 0x0f) << 12) | (byte2 << 6) | byte3
    if (codePoint >= 0x0800) {
      checkScalarValue(codePoint)
      return codePoint
    } else {
      throw new Error('Invalid continuation byte')
    }
  }

  // 4-byte sequence
  if ((byte1 & 0xf8) === 0xf0) {
    byte2 = readContinuationByte()
    byte3 = readContinuationByte()
    byte4 = readContinuationByte()
    codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4
    if (codePoint >= 0x010000 && codePoint <= 0x10ffff) {
      return codePoint
    }
  }

  throw new Error('Invalid UTF-8 detected')
}

function utf8decoderaw(bytes: ArrayLike<number>): number[] {
  byteArray = bytes
  byteCount = byteArray.length
  byteIndex = 0
  const codePoints: number[] = []
  let tmp: number | false
  while ((tmp = decodeSymbol()) !== false) {
    codePoints.push(tmp)
  }
  return codePoints
}

function utf8decode(byteString: string): string {
  return ucs2encode(utf8decoderaw(ucs2decode(byteString)))
}

/*--------------------------------------------------------------------------*/

export const version = '3.0.0'
export {utf8encode, utf8encoderaw, utf8decode, utf8decoderaw}
