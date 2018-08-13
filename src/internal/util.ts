/** @internal */
export function noOp(): void {
  return
}

/** @internal */
export function concatUint8Array(arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0
  for (let array of arrays) {
    totalLength += array.byteLength
  }
  let result = new Uint8Array(totalLength)
  let offset = 0
  for (let array of arrays) {
    result.set(array, offset)
    offset += array.byteLength
  }
  return result
}

const mathMin = Math.min
const stringFromCharCode = String.fromCharCode
const MAX_SIZE = 0x4000

/** @internal */
export function fromCodeUnits(codeUnits: number[]): string {
  const length = codeUnits.length
  // Prevent stack overflow when apply()ing with long array
  // by splitting input in smaller slices
  const parts: string[] = []
  for (let start = 0; start < length; start += MAX_SIZE) {
    const end = mathMin(start + MAX_SIZE, length)
    parts.push(stringFromCharCode.apply(null, codeUnits.slice(start, end)))
  }
  return parts.join('')
}
