import { createRouter, createWebHistory } from 'vue-router';
import DynamicPage from './DynamicPage.vue';
import { getDashboardPathForRole } from '@/lib/firebase-auth';

const normalizePagePath = (value) => {
    if (Array.isArray(value)) {
        return value.map((segment) => String(segment || '').trim()).filter(Boolean).join('/');
    }

    return String(value || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
};

const toKebabCase = (value) =>
    String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

const toCompactSlug = (value) => toKebabCase(value).replace(/-/g, '');

const addAliasTarget = (aliasMap, aliasPath, target) => {
    const normalizedAlias = normalizePagePath(aliasPath);
    const normalizedTarget = normalizePagePath(target);

    if (!normalizedAlias || normalizedAlias === normalizedTarget || aliasMap.has(normalizedAlias)) {
        return;
    }

    aliasMap.set(normalizedAlias, `/${normalizedTarget}`);
};

export function createSpaRouter(inertiaPage) {
    const pages = import.meta.glob('../Pages/**/*.vue');
    const mappedPages = Object.fromEntries(
        Object.entries(pages).map(([key, loader]) => [key.replace(/^\.\.\//, './'), loader])
    );
    const pagePaths = Object.keys(pages)
        .map((key) => key.replace(/^..\/Pages\//, '').replace(/\.vue$/, ''))
        .filter(Boolean);

    const routeFor = (pagePath) => {
        if (!pagePath) return null;
        return pages[`../Pages/${pagePath}.vue`] ? `/${pagePath}` : null;
    };

    const resolveDashboardTarget = () => {
        const user = inertiaPage?.props?.auth?.user;
        const role = user?.role;
        const normalizedRole = String(role || '').toLowerCase().replace(/\s+/g, '_');
        if (!normalizedRole || normalizedRole === 'guest') {
            return routeFor('Auth/Login') || '/Auth/Login';
        }

        const target = getDashboardPathForRole(user || role);

        return target || '/Public/Dashboard';
    };

    const aliasMap = new Map();

    pagePaths.forEach((pagePath) => {
        const target = routeFor(pagePath);
        if (!target) return;

        const segments = pagePath.split('/').filter(Boolean);
        const fileName = segments.at(-1) || '';
        const folderSegments = segments.slice(0, -1);
        const folderSlug = folderSegments.map(toKebabCase).join('/');
        const folderCompact = folderSegments.map(toCompactSlug).join('/');
        const kebabPath = segments.map(toKebabCase).join('/');
        const compactPath = segments.map(toCompactSlug).join('/');

        addAliasTarget(aliasMap, kebabPath, target);
        addAliasTarget(aliasMap, compactPath, target);

        if (folderSegments.length) {
            const lastFolder = folderSegments.at(-1) || '';
            const strippedName = fileName.toLowerCase().startsWith(lastFolder.toLowerCase())
                ? fileName.slice(lastFolder.length)
                : fileName;
            const strippedSlug = toKebabCase(strippedName);
            const strippedCompact = toCompactSlug(strippedName);

            if (strippedSlug) {
                addAliasTarget(aliasMap, `${folderSlug}/${strippedSlug}`, target);
            }

            if (strippedCompact) {
                addAliasTarget(aliasMap, `${folderCompact}/${strippedCompact}`, target);
            }

            if (/dashboard$/i.test(fileName)) {
                addAliasTarget(aliasMap, folderSlug, target);
                addAliasTarget(aliasMap, folderCompact, target);
            }
        } else {
            addAliasTarget(aliasMap, toKebabCase(fileName), target);
            addAliasTarget(aliasMap, toCompactSlug(fileName), target);
        }
    });

    addAliasTarget(aliasMap, '', routeFor('Public/Welcome'));
    addAliasTarget(aliasMap, 'home', routeFor('Public/Welcome'));
    addAliasTarget(aliasMap, 'welcome', routeFor('Public/Welcome'));
    addAliasTarget(aliasMap, 'login', routeFor('Auth/Login'));
    addAliasTarget(aliasMap, 'register', routeFor('Auth/Register'));
    addAliasTarget(aliasMap, 'profile', routeFor('Profile/Profile'));
    addAliasTarget(aliasMap, 'service-provider/dashboard', routeFor('ServiceProvider/ServiceProviderDashboard'));
    addAliasTarget(aliasMap, 'serviceprovider/dashboard', routeFor('ServiceProvider/ServiceProviderDashboard'));
    addAliasTarget(aliasMap, 'employee/hr/approval-queue', routeFor('HR/HrManager'));
    addAliasTarget(aliasMap, 'hr/approval-queue', routeFor('HR/HrManager'));
    addAliasTarget(aliasMap, 'employee/hr/reports', routeFor('HR/HrSettings'));
    addAliasTarget(aliasMap, 'hr/reports', routeFor('HR/HrSettings'));
    addAliasTarget(aliasMap, 'finance/procurement-approvals', routeFor('FinanceProcurementApprovals'));

    const aliasTargets = Array.from(aliasMap.entries()).map(([path, target]) => [
        path ? `/${path}` : '/',
        target,
    ]);

    const pageRoutes = pagePaths.map((pagePath) => ({
        path: `/${pagePath}`,
        name: `page:${pagePath}`,
        sensitive: true,
        component: pages[`../Pages/${pagePath}.vue`],
    }));

    const routes = [];

    routes.push({
        path: '/',
        sensitive: true,
        redirect: (to) => ({
            path: routeFor('Public/Welcome') || '/Public/Welcome',
            query: to.query,
            hash: to.hash,
        }),
    });

    routes.push({
        path: '/dashboard',
        sensitive: true,
        redirect: (to) => ({
            path: resolveDashboardTarget(),
            query: to.query,
            hash: to.hash,
        }),
    });

    aliasTargets.forEach(([path, target]) => {
        routes.push({
            path,
            sensitive: true,
            redirect: (to) => ({
                path: target,
                query: to.query,
                hash: to.hash,
            }),
        });
    });

    pageRoutes.forEach((route) => {
        routes.push(route);
    });

    routes.push({
        path: '/:pagePath(.*)*',
        name: 'dynamic',
        sensitive: true,
        component: DynamicPage,
        props: (route) => ({
            pagePath: normalizePagePath(route.params.pagePath),
            pages: mappedPages,
        }),
    });

    const router = createRouter({
        history: createWebHistory(),
        routes,
        scrollBehavior() {
            return { top: 0 };
        },
    });

    const prefetchedTargets = new Set();

    const resolvePrefetchTarget = (rawTarget) => {
        let target = router.resolve(rawTarget || '/');

        for (let attempt = 0; attempt < 5; attempt += 1) {
            const redirectRecord = target.matched.find((record) => record.redirect);
            if (!redirectRecord) {
                return target;
            }

            const redirect = typeof redirectRecord.redirect === 'function'
                ? redirectRecord.redirect(target)
                : redirectRecord.redirect;

            if (!redirect) {
                return target;
            }

            const nextTarget = typeof redirect === 'string'
                ? { path: redirect, query: target.query, hash: target.hash }
                : {
                    ...redirect,
                    query: redirect.query ?? target.query,
                    hash: redirect.hash ?? target.hash,
                };

            const resolvedNext = router.resolve(nextTarget);
            if (resolvedNext.fullPath === target.fullPath) {
                return target;
            }

            target = resolvedNext;
        }

        return target;
    };

    router.prefetch = async (rawTarget) => {
        const target = resolvePrefetchTarget(rawTarget);
        const cacheKey = target.fullPath || String(rawTarget || '/');
        if (!cacheKey || prefetchedTargets.has(cacheKey)) {
            return [];
        }

        prefetchedTargets.add(cacheKey);

        const loaders = target.matched
            .map((record) => record.components?.default || record.component)
            .filter((component) => typeof component === 'function');

        return Promise.allSettled(loaders.map((loader) => loader()));
    };

    router.beforeEach((to) => {
        const path = normalizePagePath(to.params?.pagePath);
        inertiaPage.component = path;
    });

    return router;
}
