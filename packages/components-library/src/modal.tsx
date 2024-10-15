import { ReactNode } from "react";
import ReactDOM from "react-dom";
import { Cross } from "@courselit/icons";
import IconButton from "./icon-button";
import { cn } from "./lib/utils";

interface ModalProps {
    open: boolean;
    onOpenChange: (...args: any[]) => void;
    children: ReactNode;
    className?: string;
}

const Portal = (props: {
    container?: HTMLElement | null;
    children: ReactNode;
}) => {
    const { container = globalThis?.document?.body, children } = props;

    return container
        ? ReactDOM.createPortal(<div>{children}</div>, container)
        : null;
};

export default function Modal({
    open,
    children,
    onOpenChange,
    className,
}: ModalProps) {
    if (!open) return null;

    return (
        <Portal>
            <div
                className={cn(
                    "fixed flex z-10 inset-0 bg-white/90 backdrop-blur-md",
                    className,
                )}
            >
                <IconButton
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4"
                    variant="soft"
                >
                    <Cross />
                </IconButton>
                <div className="w-full overflow-y-auto">{children}</div>
            </div>
        </Portal>
    );
}
