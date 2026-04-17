import { NativeModules } from 'react-native';

function resolveApiBaseUrl() {
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (envUrl) {
        return envUrl;
    }

    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
        const host = scriptURL.split('://')[1]?.split(':')[0];
        if (host) {
            return `http://${host}:3000`;
        }
    }

    return 'http://localhost:3000';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function toAbsoluteUrl(pathOrUrl: string) {
    if (!pathOrUrl) {
        return '';
    }

    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        return pathOrUrl;
    }

    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${API_BASE_URL}${normalizedPath}`;
}