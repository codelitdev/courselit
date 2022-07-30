export default function formatCurrency(amount: number, isoCode?: string) {
    return amount.toLocaleString("en-US", {
        style: "currency",
        currency: isoCode || "usd",
    });
}
