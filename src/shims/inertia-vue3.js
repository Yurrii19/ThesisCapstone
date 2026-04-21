import { computed, defineComponent, h, onMounted, reactive, shallowReactive, watchEffect } from 'vue';

export const page = shallowReactive({
    component: '',
    url: '/',
    props: {
        auth: {
            user: {
                id: null,
                uid: null,
                name: 'Guest',
                email: '',
                role: 'guest',
            },
            sidebar: {},
            flags: {},
            employee_rbac: null,
        },
    },
});

let spaRouter = null;
export function __setSpaRouter(router) {
    spaRouter = router;
}

export function usePage() {
    return page;
}

export const router = {
    visit(url) {
        if (!url) return;
        if (spaRouter && typeof url === 'string' && url.startsWith('/')) {
            return spaRouter.push(url);
        }
        window.location.href = String(url);
    },
    get(url) {
        return this.visit(url);
    },
    post(_url) {
        return Promise.resolve();
    },
    put(_url) {
        return Promise.resolve();
    },
    patch(_url) {
        return Promise.resolve();
    },
    delete(_url) {
        return Promise.resolve();
    },
};

export function useForm(initialData = {}) {
    const initial = initialData && typeof initialData === 'object' ? initialData : {};
    const fieldKeys = Object.keys(initial);

    const normalizeErrors = (errors, value) => {
        if (typeof errors === 'string') {
            return { [errors]: value };
        }

        if (errors && typeof errors === 'object') {
            return Object.entries(errors).reduce((acc, [key, entry]) => {
                acc[key] = Array.isArray(entry) ? entry[0] : entry;
                return acc;
            }, {});
        }

        return {};
    };

    const buildFormData = (payload) => {
        const formData = new FormData();
        Object.entries(payload || {}).forEach(([key, value]) => {
            if (value === undefined) return;

            if (value === null) {
                formData.append(key, '');
                return;
            }

            if (value instanceof File || value instanceof Blob) {
                formData.append(key, value);
                return;
            }

            if (Array.isArray(value)) {
                value.forEach((entry, index) => {
                    formData.append(`${key}[${index}]`, entry ?? '');
                });
                return;
            }

            formData.append(key, value);
        });
        return formData;
    };

    const form = reactive({
        ...initial,
        errors: {},
        processing: false,
        data() {
            const payload = {};
            for (const key of fieldKeys) payload[key] = form[key];
            return payload;
        },
        reset(...fields) {
            const targetFields = fields.length ? fields : fieldKeys;
            for (const key of targetFields) {
                form[key] = Object.prototype.hasOwnProperty.call(initial, key) ? initial[key] : undefined;
            }
        },
        clearErrors(...fields) {
            if (!fields.length) {
                form.errors = {};
                return;
            }

            const nextErrors = { ...form.errors };
            fields.forEach((field) => {
                delete nextErrors[field];
            });
            form.errors = nextErrors;
        },
        setError(field, value) {
            form.errors = {
                ...form.errors,
                ...normalizeErrors(field, value),
            };
        },
        async submit(method, url, options = {}) {
            const axios = window.axios;
            if (!axios || !url) return Promise.resolve();

            const payload = typeof options.transform === 'function'
                ? options.transform(form.data())
                : form.data();
            const requestData = options.forceFormData ? buildFormData(payload) : payload;

            form.processing = true;
            if (typeof options.onStart === 'function') {
                options.onStart();
            }
            form.clearErrors();

            try {
                const response = await axios.request({
                    method,
                    url,
                    data: requestData,
                    headers: options.headers,
                    timeout: options.timeout,
                    validateStatus: options.validateStatus,
                    skipGlobalLoading: options.skipGlobalLoading,
                    forceGlobalLoading: options.forceGlobalLoading,
                });
                if (typeof options.onSuccess === 'function') {
                    options.onSuccess(response.data, response);
                }
                return response;
            } catch (e) {
                const serverErrors = e?.response?.data?.errors;
                if (serverErrors && typeof serverErrors === 'object') {
                    form.errors = normalizeErrors(serverErrors);
                }
                if (typeof options.onError === 'function') {
                    options.onError(form.errors, e);
                }
                return e?.response ?? null;
            } finally {
                form.processing = false;
                if (typeof options.onFinish === 'function') {
                    options.onFinish();
                }
            }
        },
        post(url, options) {
            return form.submit('post', url, options);
        },
        put(url, options) {
            return form.submit('put', url, options);
        },
        patch(url, options) {
            return form.submit('patch', url, options);
        },
        delete(url, options) {
            return form.submit('delete', url, options);
        },
    });

    return form;
}

export const Link = defineComponent({
    name: 'InertiaLinkShim',
    props: {
        href: { type: String, required: true },
        as: { type: String, default: 'a' },
        method: { type: String, default: 'get' },
        prefetch: { type: Boolean, default: false },
    },
    setup(props, { slots, attrs }) {
        const tag = computed(() => (props.as === 'button' ? 'button' : 'a'));
        const invokeAttrHandler = (handler, event) => {
            if (typeof handler === 'function') {
                handler(event);
                return;
            }

            if (Array.isArray(handler)) {
                handler.forEach((entry) => {
                    if (typeof entry === 'function') {
                        entry(event);
                    }
                });
            }
        };
        const maybePrefetch = () => {
            if (!props.prefetch) return;
            if (!spaRouter || typeof spaRouter.prefetch !== 'function') return;
            if (typeof props.href !== 'string' || !props.href.startsWith('/')) return;
            spaRouter.prefetch(props.href).catch(() => {});
        };
        const onClick = (event) => {
            event?.preventDefault?.();
            const method = String(props.method || 'get').toLowerCase();
            if (method !== 'get') {
                const axios = window.axios;
                if (axios) {
                    axios.request({ method, url: props.href }).finally(() => {
                        if (spaRouter && props.href.startsWith('/')) {
                            spaRouter.push(props.href);
                        }
                    });
                }
                return;
            }
            router.visit(props.href);
        };
        const onMouseenter = (event) => {
            invokeAttrHandler(attrs.onMouseenter, event);
            maybePrefetch();
        };
        const onFocus = (event) => {
            invokeAttrHandler(attrs.onFocus, event);
            maybePrefetch();
        };

        onMounted(() => {
            if (!props.prefetch) return;

            if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(() => {
                    maybePrefetch();
                }, { timeout: 1500 });
                return;
            }

            window.setTimeout(() => {
                maybePrefetch();
            }, 0);
        });

        return () =>
            h(
                tag.value,
                {
                    ...attrs,
                    href: tag.value === 'a' ? props.href : undefined,
                    type: tag.value === 'button' ? 'button' : undefined,
                    onClick,
                    onMouseenter,
                    onFocus,
                },
                slots.default ? slots.default() : []
            );
    },
});

export const Head = defineComponent({
    name: 'InertiaHeadShim',
    props: {
        title: { type: String, default: '' },
    },
    setup(props) {
        watchEffect(() => {
            const title = String(props.title || '').trim();
            if (title) document.title = title;
        });
        return () => null;
    },
});
