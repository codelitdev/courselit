import * as React from "react";
import { Item } from "@radix-ui/react-dropdown-menu";
import Dialog2 from "./dialog2";

interface DialogMenuItemProps {
    component: "dialog";
    triggerChildren: React.ReactNode;
    children: React.ReactNode;
    onSelect: (...args: any[]) => void;
    onOpenChange: (...args: any[]) => void;
    title: string;
    description?: string;
    [x: string]: any;
    cancelButtonCaption?: string;
    okButtonCaption?: string;
    onClick?: (...args: any[]) => void;
}

interface ButtonMenuItemProps {
    component: "button"
    children: React.ReactNode;
}

type MenuItemProps = ButtonMenuItemProps | DialogMenuItemProps;

const MenuItem = React.forwardRef((props: MenuItemProps, forwardedRef: any) => {
    if (isButton(props)) {
        const { children, ...otherProps } = props;
        return (
            <Item className="flex text-sm rounded outline-none py-1 px-2 hover:!text-white hover:!bg-slate-500 active:!bg-slate-600 disabled:bg-slate-300"
            {...otherProps}>
                {children}
            </Item>
        );
    }

    const {
        triggerChildren,
        children,
        onSelect,
        onOpenChange,
        title,
        description,
        cancelButtonCaption,
        okButtonCaption,
        onClick,
        ...itemProps
    } = props;
    return (
        <Dialog2 
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            cancelButtonCaption={cancelButtonCaption}
            okButtonCaption={okButtonCaption}
            onClick={onClick}
            trigger={
                <Item
                    {...itemProps}
                    ref={forwardedRef}
                    onSelect={(event) => {
                        event.preventDefault()
                        console.log(onSelect, onOpenChange)
                        onSelect && onSelect()
                    }}
                    className="flex text-sm rounded outline-none py-1 px-2 hover:!text-white hover:!bg-slate-500 active:!bg-slate-600 disabled:bg-slate-300"
                    >
                    {triggerChildren}
                </Item>
            }>
            {children}
        </Dialog2>
    );
})

function isButton(item: MenuItemProps): item is ButtonMenuItemProps {
    return item.component === "button" || typeof item.component === "undefined";
}

export default MenuItem;
