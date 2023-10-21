import * as React from "react";
import {
    Arrow,
    Content,
    Portal,
    Root,
    Trigger,
} from "@radix-ui/react-dropdown-menu";
import IconButton from "./icon-button";

interface MenuProps {
    icon: React.ReactNode;
    children: React.ReactNode;
    style?: Record<string, string>;
    [x: string]: any;
}

export default function Menu({
    icon,
    children,
    style,
    ...iconButtonProps
}: MenuProps) {
    return (
        <Root>
            <Trigger asChild>
                <span>
                    <IconButton style={style} {...iconButtonProps}>
                        {icon}
                    </IconButton>
                </span>
            </Trigger>
            <Portal>
                <Content
                    className="min-w-[180px] bg-white rounded p-1 shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]"
                    style={style}
                >
                    {children}
                    <Arrow
                        fill={
                            style ? style.backgroundColor || "white" : "white"
                        }
                    />
                </Content>
            </Portal>
        </Root>
    );
}
