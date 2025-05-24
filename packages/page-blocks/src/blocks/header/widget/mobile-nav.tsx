import React, { useState } from "react";
import { Drawer, Image, Link as AppLink } from "@courselit/components-library";
import { Link } from "../settings";
import { Media } from "@courselit/common-models";
import { ThemeStyle } from "@courselit/page-models";
import { Header4, Button } from "@courselit/page-primitives";
import PageLink from "./link";
import { MenuIcon } from "lucide-react";

interface MobileNavSettings {
    title: string;
    logo: Partial<Media>;
    color: string;
    links: Link[];
    linkColor: string;
    btnBgColor: string;
    btnColor: string;
    linkFontWeight: "font-normal" | "font-bold" | "font-light";
    spacingBetweenLinks: number;
    appBarBackground: string;
    logoColor: string;
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
                    style={{
                        backgroundColor: props.btnBgColor,
                        color: props.color,
                    }}
                    theme={theme}
                    className="lg:!hidden"
                >
                    <MenuIcon className="h-4 w-4" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            }
            side="right"
            style={{
                backgroundColor:
                    props.appBarBackground || theme?.colors?.background,
                borderLeft: `1px solid ${props.appBarBackground || theme?.colors?.border}`,
            }}
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
                    <Header4
                        style={{
                            color: props.logoColor || theme?.colors?.text,
                        }}
                        theme={theme}
                    >
                        {props.title}
                    </Header4>
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
                            linkColor={props.linkColor}
                            btnBgColor={props.btnBgColor}
                            btnColor={props.btnColor}
                        />
                    ))}
                {showLoginControl && (
                    <>
                        <hr
                            style={{
                                borderColor: theme?.colors?.border,
                            }}
                        />
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
                                linkColor={props.linkColor}
                                btnBgColor={props.btnBgColor}
                                btnColor={props.btnColor}
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
                            linkColor={props.linkColor}
                            btnBgColor={props.btnBgColor}
                            btnColor={props.btnColor}
                        />
                    </>
                )}
            </ul>
        </Drawer>
    );
};

export default MobileNav;
