import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

export const baseOptions: BaseLayoutProps = {
    nav: {
        title: (
            <>
                <Image
                    src="/favicon.svg"
                    alt="CourseLit logo"
                    width={24}
                    height={24}
                />
                CourseLit Docs
            </>
        ),
    },
    githubUrl: "https://github.com/codelitdev/courselit",
};
