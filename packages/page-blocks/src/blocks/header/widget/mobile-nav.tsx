import React, { useState } from "react";
import { Image, Link as AppLink } from "@courselit/components-library";
import { Link } from "../settings";
import { Media } from "@courselit/common-models";
import { ThemeStyle } from "@courselit/page-models";
import { Header4, Button, Drawer } from "@courselit/page-primitives";
import PageLink from "./link";
import { MenuIcon } from "lucide-react";

interface MobileNavSettings {
    title: string;
    logo: Partial<Media>;
    links: Link[];
    linkFontWeight: "font-normal" | "font-bold" | "font-light";
    spacingBetweenLinks: number;
    theme: ThemeStyle;
    showLoginControl: boolean;
    isGuest: boolean;
}

const MobileNav = (props: MobileNavSettings) => {
    const [open, setOpen] = useState(false);
    const { theme, isGuest, showLoginControl } = props;

    return (
        <Drawer
            open={open}
            setOpen={setOpen}
            trigger={
                <Button
                    variant="ghost"
                    size="icon"
                    theme={theme}
                    className="lg:!hidden"
                >
                    <MenuIcon className="h-4 w-4" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            }
            side="right"
            theme={theme}
        >
            <AppLink
                href="/"
                onClick={() => {
                    setOpen(false);
                }}
            >
                <div className="flex items-center mb-4">
                    {props.logo && (
                        <div className="mr-2">
                            <Image
                                src={props.logo.file}
                                borderRadius={2}
                                width="w-[32px]"
                                height="h-[32px]"
                            />
                        </div>
                    )}
                    <Header4 theme={theme}>{props.title}</Header4>
                </div>
            </AppLink>
            <ul
                className="flex flex-col"
                style={{
                    gap: `${props.spacingBetweenLinks}px`,
                }}
            >
                {props.links &&
                    (props.links as Link[]).map((link: Link, index) => (
                        <PageLink
                            key={index}
                            href={link.href}
                            theme={theme}
                            linkFontWeight={props.linkFontWeight}
                            onClick={() => {
                                setOpen(false);
                            }}
                            isButton={link.isButton}
                            label={link.label}
                        />
                    ))}
                {showLoginControl && (
                    <>
                        <hr />
                        {!isGuest && (
                            <PageLink
                                theme={theme}
                                href="/dashboard"
                                linkFontWeight={props.linkFontWeight}
                                onClick={() => {
                                    setOpen(false);
                                }}
                                isButton={false}
                                label="Dashboard"
                            />
                        )}
                        <PageLink
                            theme={theme}
                            href={isGuest ? "/login" : "/logout"}
                            label={isGuest ? "Login" : "Logout"}
                            linkFontWeight={props.linkFontWeight}
                            onClick={() => {
                                setOpen(false);
                            }}
                            isButton={false}
                        />
                    </>
                )}
            </ul>
        </Drawer>
    );
};

export default MobileNav;
