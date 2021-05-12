/* tslint:disable */
/* eslint-disable */
/**
*/
export function greet(): void;
/**
*/
export class HashHelper {
  free(): void;
/**
* @returns {HashHelper}
*/
  static new(): HashHelper;
/**
* @param {Uint8Array} data
*/
  append(data: Uint8Array): void;
/**
* @returns {string}
*/
  end(): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly greet: () => void;
  readonly __wbg_hashhelper_free: (a: number) => void;
  readonly hashhelper_new: () => number;
  readonly hashhelper_append: (a: number, b: number, c: number) => void;
  readonly hashhelper_end: (a: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
