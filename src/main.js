import './bootstrap';
import './css/app.css';
import 'leaflet/dist/leaflet.css';
import 'vue-toastification/dist/index.css';

import { createApp, watch } from 'vue';
import { createToastInterface, POSITION } from 'vue-toastification';
import App from './spa/App.vue';
import { createSpaRouter } from './spa/router';
import { page as inertiaPage, __setSpaRouter } from '@inertiajs/vue3';
import { useTheme } from '@/Composables/useTheme';
import {
    createRoutePath,
    getDashboardPathForRole,
    isLoginRedirectSuppressed,
    isRegistrationRedirectSuppressed,
    isPublicPath,
    shouldRedirectAuthenticatedUser,
    watchFirebaseSession,
} from '@/lib/firebase-auth';
import {
    completeInitialGlobalLoading,
    installGlobalNavigationLoading,
} from '@/lib/global-loading';
import {
    prefetchWorkspaceRoutes,
    warmRoleDashboardData,
} from '@/lib/dashboard-prefetch';
import { consumeQueuedAppToast } from '@/lib/app-toast';

const routeMap = {
    'profile.edit': '/Profile/Edit',
    login: '/Auth/Login',
    register: '/Auth/Register',
    logout: '/Auth/Login',
};

const normalizedPath = (value) => {
    const path = String(value || '/').split('?')[0].replace(/\/+$/, '');
    return path || '/';
};

const resolveNamedRoute = (name) => {
    if (name === 'dashboard') {
        return getDashboardPathForRole(inertiaPage.props?.auth?.user);
    }

    return routeMap[name] || createRoutePath(name);
};

function route(name) {
    if (!name) {
        return {
            current: (expectedName) => normalizedPath(inertiaPage.url) === normalizedPath(resolveNamedRoute(expectedName)),
        };
    }

    return resolveNamedRoute(name);
}

window.route = route;

const router = createSpaRouter(inertiaPage);
__setSpaRouter(router);
installGlobalNavigationLoading(router);

const feedbackToast = window.__appFeedbackToast || createToastInterface({
    position: POSITION.TOP_RIGHT,
    timeout: 2400,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    maxToasts: 4,
    newestOnTop: true,
    closeButton: 'button',
    showCloseButtonOnHover: false,
});
window.__appFeedbackToast = feedbackToast;

const app = createApp(App);
app.config.globalProperties.$page = inertiaPage;
app.config.globalProperties.route = route;

app.use(router);

const { initTheme } = useTheme();
initTheme();

watch(
    () => router.currentRoute.value.fullPath,
    (path) => {
        const normalized = String(path || '/');
        inertiaPage.url = normalized;
        inertiaPage.component = normalized.replace(/^\//, '');
    },
    { immediate: true }
);

watchFirebaseSession((authState) => {
    inertiaPage.props.auth = authState;

    const currentPath = normalizedPath(inertiaPage.url);
    const role = authState?.user?.role;
    const isAuthenticated = Boolean(authState?.user?.uid);
    if (!isAuthenticated) {
        if (!isPublicPath(currentPath)) {
            router.replace('/Auth/Login');
        }
        return;
    }

    warmRoleDashboardData(authState?.user).catch(() => {});
    prefetchWorkspaceRoutes(authState?.user, router).catch(() => {});

    if (isRegistrationRedirectSuppressed()) {
        return;
    }

    if (isLoginRedirectSuppressed()) {
        return;
    }

    if (shouldRedirectAuthenticatedUser(currentPath)) {
        router.replace(getDashboardPathForRole(authState?.user || role));
    }
});

app.mount('#app');

const queuedAppToast = consumeQueuedAppToast();
if (queuedAppToast?.message) {
    const handler = feedbackToast?.[queuedAppToast.type] || feedbackToast?.info;
    if (typeof handler === 'function') {
        handler(queuedAppToast.message, {
            timeout: queuedAppToast.timeout,
        });
    }
}

router.isReady().finally(() => {
    completeInitialGlobalLoading();
});
