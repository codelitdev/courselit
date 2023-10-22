import React, { ReactNode } from "react";

export default function PopoverHeader({ children }: { children: ReactNode }) {
    return <div className="font-medium mb-1 px-2">{children}</div>;
}
