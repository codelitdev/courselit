import { Item } from "@radix-ui/react-dropdown-menu";
import Dialog2 from "./dialog2";
import { ReactNode, forwardRef } from "react";

interface DialogMenuItemProps {
    component: "dialog";
    triggerChildren: ReactNode;
    children: ReactNode;
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
    component: "button";
    children: ReactNode;
}

type MenuItemProps = ButtonMenuItemProps | DialogMenuItemProps;

// eslint-disable-next-line react/display-name
const MenuItem = forwardRef((props: MenuItemProps, forwardedRef: any) => {
    if (isButton(props)) {
        const { children, ...otherProps } = props;
        return (
            <Item asChild {...otherProps}>
                <div className="flex w-full text-sm rounded outline-none py-1 px-2 hover:!text-white hover:!bg-slate-500 active:!bg-slate-600 disabled:bg-slate-300">
                    {children}
                </div>
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
                        event.preventDefault();
                        onSelect && onSelect();
                    }}
                    className="flex text-sm rounded outline-none py-1 px-2 hover:!text-white hover:!bg-slate-500 active:!bg-slate-600 disabled:bg-slate-300 cursor-pointer"
                >
                    {triggerChildren}
                </Item>
            }
        >
            {children}
        </Dialog2>
    );
});

function isButton(item: MenuItemProps): item is ButtonMenuItemProps {
    return item.component === "button" || typeof item.component === "undefined";
}

export default MenuItem;
