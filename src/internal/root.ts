declare global {
  interface Window {
    DOMException?: typeof DOMException
  }
}

export const root: typeof window = typeof window === 'object' ?
  window : typeof self === 'object' ?
    self : typeof global === 'object' ?
      global as any : null!
