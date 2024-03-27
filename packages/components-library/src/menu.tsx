import { ReactNode } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";

interface MenuProps {
    trigger: ReactNode;
    children: ReactNode;
}

export function Menu({ trigger, children }: MenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export {
    DropdownMenuItem as MenuItem2,
    DropdownMenuLabel as MenuLabel,
    DropdownMenuSeparator as MenuSeparator,
} from "./components/ui/dropdown-menu";
