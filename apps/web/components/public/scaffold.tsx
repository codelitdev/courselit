import React, { ReactNode, useState } from "react";
import Header from "./base-layout/header";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import { AppDispatch, AppState } from "@courselit/state-management";
import { Chip, Link, Modal } from "@courselit/components-library";
import { AppToast } from "@components/app-toast";
import { Message, SiteInfo } from "@courselit/common-models";

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
    dispatch?: AppDispatch;
    message?: Message;
}

const ComponentScaffold = ({
    items,
    children,
    drawerWidth = 240,
    siteinfo,
    showCourseLitBranding,
    dispatch,
    message,
}: ComponentScaffoldProps) => {
    const [open, setOpen] = useState(false);
    const router = useRouter();

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
                            style={{
                                backgroundColor:
                                    router.asPath === item.href
                                        ? "#d6d6d6"
                                        : "inherit",
                            }}
                            className={`flex items-center px-2 py-3 hover:!bg-slate-200 cursor-pointer ${
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
                            className="px-2 py-3 border-b text-slate-900 flex flex-col gap-2 mt-6 font-semibold"
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
                        className="px-2 py-1 my-[10px] border rounded-md bg-[#FFFFFF] text-[#000000] text-sm text-center"
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
            <div className="z-20 fixed flex w-full p-4 h-[64px] items-center border-0 border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <Header onMenuClick={() => setOpen(true)} />
            </div>
            <div className="flex h-screen pt-[64px] w-full">
                <div
                    style={{ width: drawerWidth }}
                    className={`hidden md:!flex overflow-x-hidden overflow-y-auto min-w-[240px] max-h-screen border-r border-slate-200 z-10 bg-white`}
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
            {message && dispatch && (
                <AppToast dispatch={dispatch} message={message} />
            )}
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
    message: state.message,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps)(ComponentScaffold);
