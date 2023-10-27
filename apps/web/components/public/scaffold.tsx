import React, { ReactNode, useState } from "react";
import Header from "./base-layout/header";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import { AppState } from "@courselit/state-management";
import { Modal } from "@courselit/components-library";
import AppToast from "@components/app-toast";

export interface ComponentScaffoldMenuItem {
    label: string;
    href?: string;
    icon?: ReactNode;
    iconPlacementRight?: boolean;
}

interface ComponentScaffoldProps {
    items: ComponentScaffoldMenuItem[];
    children: ReactNode;
}

const ComponentScaffold = ({ items, children }: ComponentScaffoldProps) => {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    function navigateTo(route: string) {
        router.push(route);
    }

    const drawer = (
        <ul className="w-full">
            {items.map((item: ComponentScaffoldMenuItem, index: number) =>
                item.href ? (
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
                        className={`flex items-center px-2 py-3 hover:!bg-slate-100 cursor-pointer ${
                            item.icon && item.iconPlacementRight
                                ? "justify-between"
                                : "justify-start"
                        }`}
                    >
                        {item.icon && !item.iconPlacementRight && (
                            <div className="mr-2">{item.icon}</div>
                        )}
                        <p>{item.label as string}</p>
                        {item.icon && item.iconPlacementRight && (
                            <div>{item.icon}</div>
                        )}
                    </li>
                ) : (
                    <li
                        key={index}
                        className="px-2 py-3 text-xs text-slate-500"
                    >
                        {item.label as string}
                    </li>
                ),
            )}
        </ul>
    );

    return (
        <div className="flex">
            <div className="fixed flex w-full p-4 h-[64px] items-center border-0 border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <Header onMenuClick={() => setOpen(true)} />
            </div>
            <div className="flex h-screen pt-[64px] w-full">
                <div className="hidden md:!flex overflow-x-hidden overflow-y-auto w-[240px] max-h-screen border-r border-slate-200">
                    {drawer}
                </div>
                <main className="w-full p-4 max-h-screen overflow-y-auto scroll-smooth">
                    {children}
                </main>
            </div>
            <Modal
                open={open}
                onOpenChange={(status: boolean) => setOpen(status)}
            >
                {drawer}
            </Modal>
            <AppToast />
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({});

export default connect(mapStateToProps)(ComponentScaffold);
