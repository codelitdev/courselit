import * as React from "react";
import { Item } from "@radix-ui/react-dropdown-menu";

interface MenuItemProps {
    children: React.ReactNode;
}

export default function MenuItem({ children }: MenuItemProps) {
    return (
        <Item className="flex text-sm rounded outline-none py-1 px-2 hover:!text-white hover:!bg-slate-500 active:!bg-slate-600 disabled:bg-slate-300">
            {children}
        </Item>
    );
}
