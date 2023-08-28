interface AppMessageAction {
    text: string;
    cb: (...args: any[]) => void;
}

class AppMessage {
    public action?: AppMessageAction;

    constructor(
        private message: string,
        private actionText?: string,
        private actionFunc?: (...args: any[]) => void,
    ) {
        if (actionText && typeof actionText !== "string") {
            throw new Error("actionText should be of type string");
        }

        if (actionFunc && typeof actionFunc !== "function") {
            throw new Error("actionText should be of type function");
        }

        this.message = message;
        if (actionText && actionFunc) {
            this.action = {
                text: actionText,
                cb: actionFunc,
            };
        }
    }
}

export default AppMessage;
