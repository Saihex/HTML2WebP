export interface request_structure {
  html: string;
  cache_id?: string;
  width?: number;
  height?: number;
  values: Record<string, string>;
  image_values: string[];
}

export interface request_cache {
  promise: Promise<Uint8Array<ArrayBufferLike> | Error>;
  timestamp: ReturnType<typeof Date.now>;
}
