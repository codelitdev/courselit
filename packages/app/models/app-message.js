class AppMessage {
  constructor(message, actionText, actionFunc) {
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
