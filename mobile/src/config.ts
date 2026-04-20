import { NativeModules } from 'react-native';

function normalizeBaseUrl(url: string) {
    return url.trim().replace(/\/+$/, '');
}

function parseEnvList(value?: string) {
    if (!value) {
        return [] as string[];
    }

    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map(normalizeBaseUrl);
}

function resolveApiBaseCandidates() {
    const candidates: string[] = [];

    const envPreferred = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (envPreferred?.trim()) {
        candidates.push(normalizeBaseUrl(envPreferred));
    }

    candidates.push(...parseEnvList(process.env.EXPO_PUBLIC_API_BASE_URLS));

    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
        const host = scriptURL.split('://')[1]?.split(':')[0];
        if (host) {
            candidates.push(`http://${host}:3000`);
        }
    }

    candidates.push('http://localhost:3000');
    candidates.push('http://127.0.0.1:3000');

    return Array.from(new Set(candidates.map(normalizeBaseUrl)));
}

export const API_BASE_CANDIDATES = resolveApiBaseCandidates();

let activeApiBaseUrl = API_BASE_CANDIDATES[0] || 'http://localhost:3000';

export function getApiBaseUrl() {
    return activeApiBaseUrl;
}

export function setApiBaseUrl(url: string) {
    const normalized = normalizeBaseUrl(url);
    if (!normalized) {
        return;
    }

    activeApiBaseUrl = normalized;
}

export const API_BASE_URL = getApiBaseUrl();

export function toAbsoluteUrl(pathOrUrl: string) {
    if (!pathOrUrl) {
        return '';
    }

    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        return pathOrUrl;
    }

    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${getApiBaseUrl()}${normalizedPath}`;
}