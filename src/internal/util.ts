/** @internal */
export function noOp(): void {
  return
}

/** @internal */
export type TypedArray =
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array

/** @internal */
export function concatUint8Array(arrays: TypedArray[]): Uint8Array {
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
