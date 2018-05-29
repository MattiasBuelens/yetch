import { root } from './root'

// https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob#Parameters
export type BlobPart = ArrayBuffer | ArrayBufferView | Blob | string;
export type BlobConstructor = (blobParts?: BlobPart[], options?: BlobPropertyBag) => Blob;

function shimWithBlobClass(): BlobConstructor {
  return (blobParts?, options?) => {
    return new root.Blob(blobParts, options)
  }
}

function shimWithBlobBuilder(BlobBuilderConstructor: typeof MSBlobBuilder): BlobConstructor {
  return (blobParts?, options?) => {
    const builder = new BlobBuilderConstructor()
    if (blobParts) {
      for (let part of blobParts) {
        builder.append(part)
      }
    }
    return builder.getBlob(options && options.type || '')
  }
}

export const createBlob: BlobConstructor = ((() => {
  const Blob = root.Blob
  if (typeof Blob === 'function') {
    try {
      new Blob()
      return shimWithBlobClass()
    } catch (e) {
      // not supported
    }
  }

  const BlobBuilder = root.BlobBuilder || root.WebKitBlobBuilder || root.MozBlobBuilder || root.MSBlobBuilder
  if (typeof BlobBuilder === 'function') {
    return shimWithBlobBuilder(BlobBuilder)
  }

  return null!
})())
