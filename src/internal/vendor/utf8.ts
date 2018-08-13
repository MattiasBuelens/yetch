/*
 * utf8.js by Mathias Bynens
 * License: MIT
 *
 * https://github.com/mathiasbynens/utf8.js/blob/v3.0.0/utf8.js
 */

import {ucs2decode, ucs2encode} from './ucs2'

var stringFromCharCode = String.fromCharCode

function checkScalarValue(codePoint: number) {
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
    throw Error('Lone surrogate U+' + codePoint.toString(16).toUpperCase() + ' is not a scalar value')
  }
}
/*--------------------------------------------------------------------------*/

function createByte(codePoint: number, shift: number): string {
  return stringFromCharCode(((codePoint >> shift) & 0x3f) | 0x80)
}

function encodeCodePoint(codePoint: number): string {
  if ((codePoint & 0xffffff80) == 0) {
    // 1-byte sequence
    return stringFromCharCode(codePoint)
  }
  var symbol = ''
  if ((codePoint & 0xfffff800) == 0) {
    // 2-byte sequence
    symbol = stringFromCharCode(((codePoint >> 6) & 0x1f) | 0xc0)
  } else if ((codePoint & 0xffff0000) == 0) {
    // 3-byte sequence
    checkScalarValue(codePoint)
    symbol = stringFromCharCode(((codePoint >> 12) & 0x0f) | 0xe0)
    symbol += createByte(codePoint, 6)
  } else if ((codePoint & 0xffe00000) == 0) {
    // 4-byte sequence
    symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xf0)
    symbol += createByte(codePoint, 12)
    symbol += createByte(codePoint, 6)
  }
  symbol += stringFromCharCode((codePoint & 0x3f) | 0x80)
  return symbol
}

function utf8encode(string: string): string {
  var codePoints = ucs2decode(string)
  var length = codePoints.length
  var index = -1
  var codePoint: number
  var byteString = ''
  while (++index < length) {
    codePoint = codePoints[index]
    byteString += encodeCodePoint(codePoint)
  }
  return byteString
}

/*--------------------------------------------------------------------------*/

function readContinuationByte(): number {
  if (byteIndex >= byteCount) {
    throw Error('Invalid byte index')
  }

  var continuationByte = byteArray[byteIndex] & 0xff
  byteIndex++

  if ((continuationByte & 0xc0) == 0x80) {
    return continuationByte & 0x3f
  }

  // If we end up here, it’s not a continuation byte
  throw Error('Invalid continuation byte')
}

function decodeSymbol(): number | false {
  var byte1: number
  var byte2: number
  var byte3: number
  var byte4: number
  var codePoint: number

  if (byteIndex > byteCount) {
    throw Error('Invalid byte index')
  }

  if (byteIndex == byteCount) {
    return false
  }

  // Read first byte
  byte1 = byteArray[byteIndex] & 0xff
  byteIndex++

  // 1-byte sequence (no continuation bytes)
  if ((byte1 & 0x80) == 0) {
    return byte1
  }

  // 2-byte sequence
  if ((byte1 & 0xe0) == 0xc0) {
    byte2 = readContinuationByte()
    codePoint = ((byte1 & 0x1f) << 6) | byte2
    if (codePoint >= 0x80) {
      return codePoint
    } else {
      throw Error('Invalid continuation byte')
    }
  }

  // 3-byte sequence (may include unpaired surrogates)
  if ((byte1 & 0xf0) == 0xe0) {
    byte2 = readContinuationByte()
    byte3 = readContinuationByte()
    codePoint = ((byte1 & 0x0f) << 12) | (byte2 << 6) | byte3
    if (codePoint >= 0x0800) {
      checkScalarValue(codePoint)
      return codePoint
    } else {
      throw Error('Invalid continuation byte')
    }
  }

  // 4-byte sequence
  if ((byte1 & 0xf8) == 0xf0) {
    byte2 = readContinuationByte()
    byte3 = readContinuationByte()
    byte4 = readContinuationByte()
    codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4
    if (codePoint >= 0x010000 && codePoint <= 0x10ffff) {
      return codePoint
    }
  }

  throw Error('Invalid UTF-8 detected')
}

var byteArray: number[]
var byteCount: number
var byteIndex: number
function utf8decode(byteString: string): string {
  byteArray = ucs2decode(byteString)
  byteCount = byteArray.length
  byteIndex = 0
  var codePoints: number[] = []
  var tmp: number | false
  while ((tmp = decodeSymbol()) !== false) {
    codePoints.push(tmp)
  }
  return ucs2encode(codePoints)
}

/*--------------------------------------------------------------------------*/

const version = '3.0.0'

export {version, utf8encode as encode, utf8decode as decode}
