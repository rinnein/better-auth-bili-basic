import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'unplugin-dts/vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        'client/index': resolve(import.meta.dirname, 'src/client/index.ts'),
      },
      name: 'BetterAuthBiliBasic',
      formats: ['es', 'cjs'],
    },
  },
  plugins: [dts()],
});
