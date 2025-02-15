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
            <h2 className="font-semibold text-xl mt-8 mb-2">Resources</h2>
            {links.map((link, index) => (
                <span key={index}>
                    -{" "}
                    <a
                        href={link.href}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                    >
                        {link.text}
                    </a>
                </span>
            ))}
        </div>
    );
}
