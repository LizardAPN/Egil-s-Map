interface WebpackModule {
  hot?: unknown;
}

export function isWebpackHmr(): boolean {
  if (typeof module === "undefined") {
    return false;
  }

  return !!(module as WebpackModule).hot;
}
