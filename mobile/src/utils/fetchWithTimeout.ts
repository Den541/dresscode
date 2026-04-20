import {
    API_BASE_CANDIDATES,
    getApiBaseUrl,
    setApiBaseUrl,
} from '../config';

function withTimeout(timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return { controller, timeout };
}

function toInputString(input: RequestInfo | URL) {
    if (typeof input === 'string') {
        return input;
    }

    if (input instanceof URL) {
        return input.toString();
    }

    return null;
}

function buildAttemptUrls(input: string) {
    const matchedBase = API_BASE_CANDIDATES.find((base) => input.startsWith(base));
    if (!matchedBase) {
        return [input];
    }

    const orderedBases = [
        getApiBaseUrl(),
        ...API_BASE_CANDIDATES.filter((base) => base !== getApiBaseUrl()),
    ];

    return orderedBases.map((base) => `${base}${input.slice(matchedBase.length)}`);
}

export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = 10000,
): Promise<Response> {
    const inputString = toInputString(input);
    const attemptUrls = inputString ? buildAttemptUrls(inputString) : [input];

    let lastError: Error | null = null;

    for (const attemptInput of attemptUrls) {
        const { controller, timeout } = withTimeout(timeoutMs);

        try {
            const response = await fetch(attemptInput as RequestInfo | URL, {
                ...init,
                signal: controller.signal,
            });

            if (typeof attemptInput === 'string') {
                const matchedBase = API_BASE_CANDIDATES.find((base) => attemptInput.startsWith(base));
                if (matchedBase) {
                    setApiBaseUrl(matchedBase);
                }
            }

            return response;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                lastError = new Error('Request timeout. Перевірте API URL і що backend запущений.');
            } else if (error instanceof Error) {
                lastError = error;
            } else {
                lastError = new Error('Network request failed');
            }
        } finally {
            clearTimeout(timeout);
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error('Network request failed');
}
