"use client";

import { Button } from "@courselit/page-primitives";
import { Constants } from "@courselit/common-models";
import type { RuntimeLoginProvider } from "@/lib/login-providers";
import type { ThemeStyle } from "@courselit/page-models";

function GoogleLogo() {
    return (
        <svg
            aria-hidden="true"
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
        >
            <path
                d="M21.805 12.23c0-.69-.062-1.35-.177-1.984H12v3.75h5.502a4.707 4.707 0 0 1-2.04 3.088v2.565h3.305c1.934-1.782 3.038-4.41 3.038-7.419Z"
                fill="#4285F4"
            />
            <path
                d="M12 22c2.76 0 5.074-.915 6.766-2.481l-3.305-2.565c-.915.613-2.086.974-3.46.974-2.657 0-4.906-1.794-5.71-4.206H2.875v2.646A10 10 0 0 0 12 22Z"
                fill="#34A853"
            />
            <path
                d="M6.29 13.722A5.996 5.996 0 0 1 5.97 12c0-.598.108-1.18.32-1.722V7.632H2.874A10 10 0 0 0 2 12c0 1.614.387 3.142 1.074 4.368l3.216-2.646Z"
                fill="#FBBC05"
            />
            <path
                d="M12 6.071c1.5 0 2.846.516 3.907 1.529l2.93-2.93C17.07 3.055 14.758 2 12 2A10 10 0 0 0 3.074 7.632l3.216 2.646c.804-2.412 3.053-4.207 5.71-4.207Z"
                fill="#EA4335"
            />
        </svg>
    );
}

function getProviderIcon(provider: RuntimeLoginProvider) {
    if (provider.key === Constants.LoginProvider.GOOGLE) {
        return <GoogleLogo />;
    }

    return null;
}

export default function ExternalLoginButton({
    provider,
    theme,
    className = "",
    onClick,
}: {
    provider: RuntimeLoginProvider;
    theme?: ThemeStyle;
    className?: string;
    onClick: () => Promise<void> | void;
}) {
    const icon = getProviderIcon(provider);

    return (
        <Button
            variant="outline"
            onClick={onClick}
            className={className}
            theme={theme}
        >
            <span className="flex items-center justify-center gap-2">
                {icon}
                <span>{provider.buttonText}</span>
            </span>
        </Button>
    );
}
