import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'memory-engine': resolve(__dirname, '../memory-engine/src/index.browser.ts')
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: './popup.html',
                background: './src/background/index.ts',
                universalContent: './src/content-scripts/universalContent.ts'
            },
            output: {
                entryFileNames: 'src/[name]/index.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    }
});
