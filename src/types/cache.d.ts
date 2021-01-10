type PreBundledCacheItem = {
  items: string[];
  isDefaultExport: boolean;
  cacheHit: boolean | undefined;
}

export type Cache = {
  [modulename: string]: {
    items: string[];
    isDefaultExport: boolean;
    cacheHit: boolean | undefined;
    input: {
      input: string;
      plugins: { [key: string]: string }[];
    };
    output: {
      format: 'esm';
      file: string;
    };
  };
}
