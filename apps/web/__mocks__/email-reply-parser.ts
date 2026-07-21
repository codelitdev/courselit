export default class EmailReplyParser {
    parseReply(text: string) {
        if (/^On .+wrote:/.test(text)) {
            return "";
        }

        return text.split(/\r?\n\r?\nOn .+/)[0];
    }
}
