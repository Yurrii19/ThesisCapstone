import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const functionsRegion = env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';
    const projectId = env.VITE_FIREBASE_PROJECT_ID || 'thesiscapstone-785e2';
    const functionsOrigin = `https://${functionsRegion}-${projectId}.cloudfunctions.net`;

    return {
        plugins: [
            vue({
                template: {
                    transformAssetUrls: {
                        base: null,
                        includeAbsolute: false,
                    },
                },
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
                '@inertiajs/vue3': path.resolve(__dirname, 'src/shims/inertia-vue3.js'),
                vue: 'vue/dist/vue.esm-bundler.js', // <-- add this line for full build with compiler
                sweetalert2: path.resolve(__dirname, 'src/lib/sweetalert-toast-shim.js'),
            },
        },
        server: {
            proxy: {
                '/__firebase_functions': {
                    target: functionsOrigin,
                    changeOrigin: true,
                    rewrite: (requestPath) => requestPath.replace(/^\/__firebase_functions/, ''),
                },
            },
        },
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (!id.includes('node_modules')) return;
                        if (id.includes('vue')) return 'vendor-vue';
                        if (id.includes('leaflet')) return 'vendor-leaflet';
                        if (id.includes('chart.js')) return 'vendor-chartjs';
                        if (id.includes('sweetalert2') || id.includes('vue-toastification')) return 'vendor-ui-feedback';
                        if (id.includes('axios') || id.includes('lodash')) return 'vendor-utils';
                        return 'vendor-misc';
                    },
                },
            },
        },
    };
});
