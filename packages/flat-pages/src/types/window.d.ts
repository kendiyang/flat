interface Window {
    chrome?: {
        runtime?: {
            lastError?: Error;
        };
    };
    Sentry?: {
        captureException(error: Error | string | any): void;
    };
} 