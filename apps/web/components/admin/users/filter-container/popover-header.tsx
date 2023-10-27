import React, { ReactNode } from "react";

export default function PopoverHeader({ children }: { children: ReactNode }) {
    return <div className="font-bold">{children}</div>;
}
