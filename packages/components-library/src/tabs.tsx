import React, { Children, ReactNode } from "react";
import { Content, List, Root, Trigger } from "@radix-ui/react-tabs";

interface TabsProps {
    items: string[];
    children: ReactNode;
}

export default function Tabs({ items, children }: TabsProps) {
    return (
        <Root className="flex flex-col w-full" defaultValue={items[0]}>
            <List className="shrink-0 flex border-b border-slate-200">
                {items.map((item) => (
                    <Trigger
                        className="bg-white px-5 h-[45px] flex items-center justify-center text-[15px] leading-none select-none hover:text-black data-[state=active]:text-black data-[state=active]:shadow-[inset_0_-1px_0_0,0_1px_0_0] data-[state=active]:shadow-current data-[state=active]:focus:relative data-[state=active]:focus:shadow-[0_0_0_2px] data-[state=active]:focus:shadow-black outline-none cursor-default"
                        value={item}
                    >
                        {item}
                    </Trigger>
                ))}
            </List>
            {Children.map(children, (child, index) => (
                <Content className="grow" value={items[index]}>
                    {child}
                </Content>
            ))}
        </Root>
    );
}
