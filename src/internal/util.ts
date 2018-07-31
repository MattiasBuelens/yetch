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
