import "../styles/globals.css";
import "remirror/styles/all.css";
import "@courselit/common-widgets/styles.css";
import "@courselit/components-library/styles.css";

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
