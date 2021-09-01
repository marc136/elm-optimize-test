export const pureFuncs = 'F2,F3,F4,F5,F6,F7,F8,F9,A2,A3,A4,A5,A6,A7,A8,A9'.split(',');

export interface VariantInfo {
  filename: string;
  filepath: string;
  title: string;
  duration: number;
  size: number;
  gzipSize: number;
}

export interface VariantInfoWithContent extends VariantInfo {
  content: Buffer;
}

export interface ElmVariants {
  iife: VariantInfoWithContent;
  esm: VariantInfoWithContent;
}

export interface Variant {
  key: string;
  description: string;
  transform: (elm: ElmVariants, filename: string) => Promise<void | string>;
}

export function variant(
  key: string,
  description: string,
  transform: (elm: ElmVariants, filename: string) => Promise<void | string>
) {
  return { key, description, transform };
}

export interface ToolVariants {
  closure: Variant[];
  esbuild: Variant[];
  // TODO add swc
  terser: Variant[];
  uglify: Variant[];
  'uglify+esbuild': Variant[];
}
