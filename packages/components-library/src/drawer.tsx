import { ReactNode } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./components/ui/sheet";

interface DrawerProps {
    trigger: ReactNode;
    children: ReactNode;
    side?: "left" | "right" | "top" | "bottom";
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function Drawer({
    trigger,
    children,
    side = "left",
    open,
    setOpen,
}: DrawerProps) {
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <span>{trigger}</span>
            </SheetTrigger>
            <SheetContent side={side}>{children}</SheetContent>
        </Sheet>
    );
}

export {
    SheetHeader as DrawerHeader,
    SheetTitle as DrawerTitle,
    SheetDescription as DrawerDescription,
} from "./components/ui/sheet";
