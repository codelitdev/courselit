import React, { ReactNode, useState } from "react";
import Header from "./base-layout/header";
import { usePathname, useRouter } from "next/navigation";
import { Chip, Link, Modal, Toaster } from "@courselit/components-library";
import { SiteInfo } from "@courselit/common-models";

export interface ComponentScaffoldMenuItem {
    label: string;
    badge?: string;
    href?: string;
    icon?: ReactNode;
    iconPlacementRight?: boolean;
}

export type Divider = "divider";

interface ComponentScaffoldProps {
    items: (ComponentScaffoldMenuItem | Divider)[];
    children: ReactNode;
    drawerWidth?: number;
    siteinfo: SiteInfo;
    showCourseLitBranding?: boolean;
}

export const ComponentScaffold = ({
    items,
    children,
    drawerWidth = 240,
    siteinfo,
    showCourseLitBranding,
}: ComponentScaffoldProps) => {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    function navigateTo(route: string) {
        router.push(route);
    }

    const drawer = (
        <ul className="w-full">
            {items.map(
                (item: ComponentScaffoldMenuItem | Divider, index: number) =>
                    item === "divider" ? (
                        <div className="my-4 border-b" key={index}></div>
                    ) : item.href ? (
                        <li
                            key={index}
                            onClick={() => {
                                setOpen(false);
                                navigateTo(item.href as string);
                            }}
                            className={`flex items-center px-2 py-3 hover:bg-accent! hover:text-accent-foreground! cursor-pointer ${
                                pathname === item.href
                                    ? "bg-accent text-accent-foreground"
                                    : ""
                            } ${
                                item.icon && item.iconPlacementRight
                                    ? "justify-between"
                                    : "justify-start"
                            }`}
                        >
                            {item.icon && !item.iconPlacementRight && (
                                <div className="mr-2">{item.icon}</div>
                            )}
                            <p className="text-sm">{item.label as string}</p>
                            {item.icon && item.iconPlacementRight && (
                                <div>{item.icon}</div>
                            )}
                        </li>
                    ) : (
                        <li
                            key={index}
                            className="px-2 py-3 border-b text-foreground flex flex-col gap-2 mt-6 font-semibold"
                        >
                            {item.label as string}
                            {item.badge && <Chip>{item.badge}</Chip>}
                        </li>
                    ),
            )}

            {!siteinfo.hideCourseLitBranding && showCourseLitBranding && (
                <span className="flex justify-center align-center">
                    <Link
                        href={`https://courselit.app`}
                        openInSameTab={false}
                        className="px-2 py-1 my-[10px] border rounded-md bg-background text-foreground text-sm text-center"
                    >
                        Powered by{" "}
                        <span className="font-semibold">CourseLit</span>
                    </Link>
                </span>
            )}
        </ul>
    );

    return (
        <div className="flex">
            <div className="z-20 fixed flex w-full p-4 h-[64px] items-center border-0 border-b border-border bg-background/80 backdrop-blur-md">
                <Header onMenuClick={() => setOpen(true)} siteinfo={siteinfo} />
            </div>
            <div className="flex h-screen pt-[64px] w-full">
                <div
                    style={{ width: drawerWidth }}
                    className={`hidden md:flex! overflow-x-hidden overflow-y-auto min-w-[240px] max-h-screen border-r border-border z-10 bg-background`}
                >
                    {drawer}
                </div>
                <main className="w-full max-h-screen overflow-y-auto scroll-smooth p-4">
                    {children}
                </main>
            </div>

            <Modal
                open={open}
                onOpenChange={(status: boolean) => setOpen(status)}
            >
                {drawer}
            </Modal>
            <Toaster />
        </div>
    );
};
