interface Action {
    text: string;
    cb: (...args: any[]) => any;
}

export default interface Message {
    message: string;
    open: boolean;
    action: Action | null;
}
