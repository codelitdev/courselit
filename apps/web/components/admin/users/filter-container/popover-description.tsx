import React, { ReactNode } from "react";

export default function PopoverDescription({
    children,
}: {
    children: ReactNode;
}) {
    return <p className="text-xs text-slate-500">{children}</p>;
}
