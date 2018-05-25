// https://streams.spec.whatwg.org

export interface ReadableStreamConstructor {
  readonly prototype: ReadableStream;

  new<R = any>(underlyingSource?: ReadableStreamDefaultUnderlyingSource,
               strategy?: Partial<QueuingStrategy>): ReadableStream;
}

export interface ReadableStreamDefaultUnderlyingSource {
  start?(controller: ReadableStreamDefaultController): void | Promise<void>;

  pull?(controller: ReadableStreamDefaultController): void | Promise<void>;

  cancel?(reason: any): void | Promise<void>;
}

export interface ReadableStreamDefaultController {
  readonly desiredSize: number | null;

  close(): void;

  enqueue(chunk: any): void;

  error(e: any): void;
}

export interface QueuingStrategy {
  readonly highWaterMark: number;
  readonly size: QueuingStrategySize | undefined;
}

export type QueuingStrategySize = (chunk: any) => number;
