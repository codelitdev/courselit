import "../styles/globals.css";
import "remirror/styles/all.css";

export const metadata = {
    title: "CourseLit",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
