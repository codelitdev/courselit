export function truncate(str: string, length: number) {
    return str.length <= length ? str : `${str.substring(0, length)}...`;
}
