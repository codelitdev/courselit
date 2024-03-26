import { SyntheticEvent } from "react";
import { Cross } from "@courselit/icons";
import IconButton from "./icon-button";
import {
    Action as ToastAction,
    Root,
    Description,
    Provider,
    Viewport,
} from "@radix-ui/react-toast";

interface Action {
    text: string;
    cb: (...args: any[]) => any;
}

interface Message {
    message: string;
    open: boolean;
    action: Action | null;
}

interface ToastProps {
    message: Message;
    dispatch: any;
    clearMessageAction: (...args: any[]) => void;
}

const Toast = ({ message, dispatch, clearMessageAction }: ToastProps) => {
    const handleClose: any = (_: Event | SyntheticEvent, reason: string) => {
        if (reason === "clickaway") {
            return;
        }

        dispatch(clearMessageAction());
    };

    // const getActionButtonsArray = () => {
    //     const actionButtonsArray = [
    //         <IconButton key="close" onClick={handleClose}>
    //             <Close />
    //         </IconButton>,
    //     ];
    //     if (action) {
    //         actionButtonsArray.unshift(
    //             <Button key="action" onClick={message.action!.cb}>
    //                 {message.action!.text}
    //             </Button>,
    //         );
    //     }

    //     return actionButtonsArray;
    // };

    if (!message) {
        return null;
    }

    return (
        <Provider>
            <Root
                className="bg-white border rounded-md shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] p-[15px] grid [grid-template-areas:_'title_action'_'description_action'] grid-cols-[auto_max-content] gap-x-[15px] items-center data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipeOut"
                open={message.open}
                onOpenChange={handleClose}
            >
                <Description>{message.message}</Description>
                <ToastAction
                    className="[grid-area:_action]"
                    asChild
                    altText="Close"
                >
                    <IconButton variant="soft">
                        <Cross />
                    </IconButton>
                </ToastAction>
            </Root>
            <Viewport className="[--viewport-padding:_25px] fixed bottom-0 right-0 flex flex-col p-[var(--viewport-padding)] gap-[10px] w-[390px] max-w-[100vw] m-0 list-none z-[2147483647] outline-none" />
        </Provider>
    );
};

export default Toast;
