import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const { default: dts } = (await import('unplugin-dts/vite')) as unknown as {
  default: (...args: any[]) => any;
};

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        'client/index': resolve(import.meta.dirname, 'src/client/index.ts'),
      },
      name: 'BetterAuthBiliBasic',
      formats: ['es', 'cjs'],
      fileName: (format: string, entryName: string) =>
        `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
  },
  plugins: [dts()],
});
