import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'unplugin-dts/vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'BetterAuthBiliBasic',
      formats: ['es', 'cjs'],
      fileName: 'index',
    },
  },
  plugins: [dts()],
});
