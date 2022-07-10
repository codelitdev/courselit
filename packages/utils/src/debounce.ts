export default function debounce(fn: (...args: any[]) => void, wait: number) {
    let timeout: NodeJS.Timeout;

    return function (...args: any[]) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            fn(...args);
        }, wait);
    };
}
