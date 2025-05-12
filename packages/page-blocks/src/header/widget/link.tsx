import { Button, Link as PageLink } from "@courselit/page-primitives";
import { Link as AppLink } from "@courselit/components-library";
import { Theme } from "@courselit/common-models";

export default function Link({
    href,
    theme,
    linkFontWeight,
    onClick,
    isButton,
    label,
    linkColor,
    btnBgColor,
    btnColor,
}: {
    href: string;
    theme: Theme;
    linkFontWeight: string;
    onClick?: () => void;
    isButton: boolean;
    label: string;
    linkColor: string;
    btnBgColor: string;
    btnColor: string;
}) {
    return (
        <AppLink href={href} className={`${linkFontWeight}`} onClick={onClick}>
            {isButton && (
                <Button
                    size="sm"
                    style={{
                        background: btnBgColor,
                        color: btnColor,
                    }}
                    theme={theme}
                >
                    {label}
                </Button>
            )}
            {!isButton && (
                <PageLink
                    theme={theme}
                    style={{ color: linkColor || theme?.colors?.text }}
                >
                    {label}
                </PageLink>
            )}
        </AppLink>
    );
}
