interface Link {
    href: string;
    text: string;
}

interface ResourcesProps {
    links: Link[];
}

export default function Resources({ links = [] }: ResourcesProps) {
    return (
        <div className="mb-8">
            <h2 className="font-medium text-base mt-8 mb-2">Resources</h2>
            <ul>
                {links.map((link, index) => (
                    <li key={index} className="mb-1">
                        -{" "}
                        <a
                            href={link.href}
                            className="text-blue-600 text-sm hover:underline"
                            target="_blank"
                        >
                            {link.text}
                        </a>
                    </li>
                ))}
            </ul>
            {/* {links.map((link, index) => (
                <div key={index}>
                    -{" "}
                    <a
                        href={link.href}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                    >
                        {link.text}
                    </a>
                </div>
            ))} */}
        </div>
    );
}
