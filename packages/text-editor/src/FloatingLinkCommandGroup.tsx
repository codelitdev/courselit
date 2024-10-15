import type { ChangeEvent, HTMLProps, KeyboardEvent } from "react";
import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    createMarkPositioner,
    LinkExtension,
    ShortcutHandlerProps,
} from "remirror/extensions";
import {
    FloatingWrapper,
    useActive,
    useAttrs,
    useChainedCommands,
    useCurrentSelection,
    useExtensionEvent,
    useUpdateReason,
} from "@remirror/react";
import { CommandButton, CommandButtonGroup } from "@remirror/react-ui";

function useLinkShortcut() {
    const [linkShortcut, setLinkShortcut] = useState<
        ShortcutHandlerProps | undefined
    >();
    const [isEditing, setIsEditing] = useState(false);

    useExtensionEvent(
        LinkExtension,
        "onShortcut",
        useCallback(
            (props) => {
                if (!isEditing) {
                    setIsEditing(true);
                }

                return setLinkShortcut(props);
            },
            [isEditing],
        ),
    );

    return { linkShortcut, isEditing, setIsEditing };
}

function useFloatingLinkState() {
    const chain = useChainedCommands();
    const { isEditing, linkShortcut, setIsEditing } = useLinkShortcut();
    const { to, empty } = useCurrentSelection();

    const url = (useAttrs().link()?.href as string) ?? "";
    const [href, setHref] = useState<string>(url);

    // A positioner which only shows for links.
    const linkPositioner = useMemo(
        () => createMarkPositioner({ type: "link" }),
        [],
    );

    const onRemove = useCallback(() => {
        return chain.removeLink().focus().run();
    }, [chain]);

    const updateReason = useUpdateReason();

    useLayoutEffect(() => {
        if (!isEditing) {
            return;
        }

        if (updateReason.doc || updateReason.selection) {
            setIsEditing(false);
        }
    }, [isEditing, setIsEditing, updateReason.doc, updateReason.selection]);

    useEffect(() => {
        setHref(url);
    }, [url]);

    const submitHref = useCallback(() => {
        setIsEditing(false);
        const range = linkShortcut ?? undefined;

        if (href === "") {
            chain.removeLink();
        } else {
            chain.updateLink({ href, auto: false }, range);
        }

        chain.focus(range?.to ?? to).run();
    }, [setIsEditing, linkShortcut, chain, href, to]);

    const cancelHref = useCallback(() => {
        setIsEditing(false);
    }, [setIsEditing]);

    const clickEdit = useCallback(() => {
        if (empty) {
            chain.selectLink();
        }

        setIsEditing(true);
    }, [chain, empty, setIsEditing]);

    return useMemo(
        () => ({
            href,
            setHref,
            linkShortcut,
            linkPositioner,
            isEditing,
            clickEdit,
            onRemove,
            submitHref,
            cancelHref,
        }),
        [
            href,
            linkShortcut,
            linkPositioner,
            isEditing,
            clickEdit,
            onRemove,
            submitHref,
            cancelHref,
        ],
    );
}

const DelayAutoFocusInput = ({
    autoFocus,
    ...rest
}: HTMLProps<HTMLInputElement>) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!autoFocus) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            inputRef.current?.focus();
        });

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [autoFocus]);

    return <input ref={inputRef} {...rest} />;
};

const FloatingLinkToolbar = () => {
    const {
        isEditing,
        clickEdit,
        onRemove,
        submitHref,
        href,
        setHref,
        cancelHref,
    } = useFloatingLinkState();
    const active = useActive();
    const activeLink = active.link();
    const { empty } = useCurrentSelection();

    const handleClickEdit = useCallback(() => {
        clickEdit();
    }, [clickEdit]);
    const label = "Link";

    const linkEditButtons = activeLink ? (
        <>
            <CommandButton
                commandName="updateLink"
                onSelect={handleClickEdit}
                icon="pencilLine"
                enabled
            />
            <CommandButton
                commandName="removeLink"
                onSelect={onRemove}
                icon="linkUnlink"
                enabled
                displayShortcut
                label={label}
            />
        </>
    ) : (
        <CommandButton
            commandName="updateLink"
            onSelect={handleClickEdit}
            icon="link"
            enabled
            displayShortcut
            label={label}
        />
    );

    return (
        <>
            {!isEditing && (
                <CommandButtonGroup>{linkEditButtons}</CommandButtonGroup>
            )}
            {!isEditing && empty && (
                <CommandButtonGroup>{linkEditButtons}</CommandButtonGroup>
            )}

            <FloatingWrapper
                positioner="always"
                placement="bottom"
                enabled={isEditing}
            >
                <DelayAutoFocusInput
                    style={{ zIndex: 20 }}
                    autoFocus
                    placeholder="Enter link..."
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setHref(event.target.value)
                    }
                    value={href}
                    onKeyPress={(event: KeyboardEvent<HTMLInputElement>) => {
                        const { code } = event;

                        if (code === "Enter") {
                            submitHref();
                        }

                        if (code === "Escape") {
                            cancelHref();
                        }
                    }}
                />
            </FloatingWrapper>
        </>
    );
};

export default FloatingLinkToolbar;
