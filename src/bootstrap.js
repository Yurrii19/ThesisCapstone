import _ from 'lodash';
window._ = _;

import axios from 'axios';
window.axios = axios;
import Swal from '@/lib/sweetalert-toast-shim';
import { createToastInterface, POSITION } from 'vue-toastification';
import { canHandleViaFirebase, firebaseApiAdapter } from '@/lib/firebase-api';

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

const GLOBAL_LOADING_MIN_MS = 0;
const ENABLE_GLOBAL_LOADING_TOAST = false;
const loadingToast = window.__appLoadingToast || createToastInterface({
    position: POSITION.TOP_RIGHT,
    timeout: false,
    closeOnClick: false,
    closeButton: 'button',
    showCloseButtonOnHover: false,
    pauseOnHover: false,
    draggable: false,
    maxToasts: 1,
    newestOnTop: true,
});
window.__appLoadingToast = loadingToast;

const globalLoaderState = window.__appGlobalLoaderState || {
    count: 0,
    shownAt: 0,
    hideTimer: null,
    toastId: null,
};
window.__appGlobalLoaderState = globalLoaderState;

const showGlobalLoader = () => {
    globalLoaderState.count += 1;

    if (globalLoaderState.hideTimer) {
        clearTimeout(globalLoaderState.hideTimer);
        globalLoaderState.hideTimer = null;
    }

    if (!ENABLE_GLOBAL_LOADING_TOAST) {
        return;
    }

    if (!globalLoaderState.toastId) {
        globalLoaderState.toastId = loadingToast.info('Loading...', {
            timeout: false,
            closeOnClick: false,
            pauseOnHover: false,
            draggable: false,
            icon: false,
        });
        globalLoaderState.shownAt = Date.now();
    }
};

const hideGlobalLoader = () => {
    globalLoaderState.count = Math.max(0, globalLoaderState.count - 1);
    if (globalLoaderState.count > 0) return;

    if (!ENABLE_GLOBAL_LOADING_TOAST) {
        return;
    }

    const elapsed = Date.now() - globalLoaderState.shownAt;
    const wait = Math.max(0, GLOBAL_LOADING_MIN_MS - elapsed);

    if (globalLoaderState.hideTimer) clearTimeout(globalLoaderState.hideTimer);
    globalLoaderState.hideTimer = setTimeout(() => {
        if (globalLoaderState.count === 0 && globalLoaderState.toastId) {
            loadingToast.dismiss(globalLoaderState.toastId);
            globalLoaderState.toastId = null;
        }
    }, wait);
};

const dismissGlobalLoaderImmediately = () => {
    globalLoaderState.count = 0;
    if (globalLoaderState.hideTimer) {
        clearTimeout(globalLoaderState.hideTimer);
        globalLoaderState.hideTimer = null;
    }
    if (globalLoaderState.toastId) {
        loadingToast.dismiss(globalLoaderState.toastId);
        globalLoaderState.toastId = null;
    }
};

window.__appGlobalLoader = {
    start: showGlobalLoader,
    stop: hideGlobalLoader,
    forceStop: dismissGlobalLoaderImmediately,
};

if (!window.__appSwalGuardPatched) {
    const originalSwalFire = Swal.fire.bind(Swal);
    Swal.fire = (...args) => {
        dismissGlobalLoaderImmediately();
        return originalSwalFire(...args);
    };
    window.__appSwalGuardPatched = true;
}

if (window.__appAxiosInterceptors?.requestId !== undefined) {
    window.axios.interceptors.request.eject(window.__appAxiosInterceptors.requestId);
}
if (window.__appAxiosInterceptors?.responseId !== undefined) {
    window.axios.interceptors.response.eject(window.__appAxiosInterceptors.responseId);
}

const requestInterceptorId = window.axios.interceptors.request.use(
    (config) => {
        const method = String(config?.method || 'get').toUpperCase();
        const shouldShowLoader = Boolean(config?.forceGlobalLoading) || (!config?.skipGlobalLoading && method !== 'GET');
        config.__usesGlobalLoading = shouldShowLoader;

        if (canHandleViaFirebase(config)) {
            config.adapter = firebaseApiAdapter;
        }

        if (shouldShowLoader) {
            showGlobalLoader();
        }

        return config;
    },
    (error) => {
        dismissGlobalLoaderImmediately();
        return Promise.reject(error);
    }
);

const responseInterceptorId = window.axios.interceptors.response.use(
    (response) => {
        if (response?.config?.__usesGlobalLoading) {
            dismissGlobalLoaderImmediately();
        }
        return response;
    },
    async (error) => {
        if (error?.config?.__usesGlobalLoading) {
            dismissGlobalLoaderImmediately();
        }

        return Promise.reject(error);
    }
);

window.__appAxiosInterceptors = {
    requestId: requestInterceptorId,
    responseId: responseInterceptorId,
};

