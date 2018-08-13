/*
 * utf8.js by Mathias Bynens
 * License: MIT
 *
 * https://github.com/mathiasbynens/utf8.js/blob/v3.0.0/utf8.js
 */

import {fromCodeUnits} from '../util'

// Taken from https://mths.be/punycode
export function ucs2decode(string: string): number[] {
  var output: number[] = []
  var counter = 0
  var length = string.length
  var value: number
  var extra: number
  while (counter < length) {
    value = string.charCodeAt(counter++)
    if (value >= 0xd800 && value <= 0xdbff && counter < length) {
      // high surrogate, and there is a next character
      extra = string.charCodeAt(counter++)
      if ((extra & 0xfc00) == 0xdc00) {
        // low surrogate
        output.push(((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000)
      } else {
        // unmatched surrogate; only append this code unit, in case the next
        // code unit is the high surrogate of a surrogate pair
        output.push(value)
        counter--
      }
    } else {
      output.push(value)
    }
  }
  return output
}

// Taken from https://mths.be/punycode
export function ucs2encode(array: number[]): string {
  var output: number[] = []
  for (var value of array) {
    if (value > 0xffff) {
      value -= 0x10000
      output.push(((value >>> 10) & 0x3ff) | 0xd800)
      value = 0xdc00 | (value & 0x3ff)
    }
    output.push(value)
  }
  return fromCodeUnits(output)
}
