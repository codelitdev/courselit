"use client";

import {
    Button2,
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@courselit/components-library";
import { HELP_HEADER } from "@ui-config/strings";

export default function Page() {
    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">{HELP_HEADER}</h1>
            </div>
            <p className="mb-8 text-slate-600">
                If you need a helping hand, we are out there for you.
            </p>
            <div className="flex flex-col lg:!flex-row gap-4 mb-16">
                <Card className="lg:!w-1/3">
                    <CardHeader>
                        <CardTitle>Documentation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4">
                            Our documentation contains tutorials to do
                            everything in CourseLit.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <a href="https://docs.courselit.app" target="_blank">
                            <Button2 variant="secondary">
                                See documentation
                            </Button2>
                        </a>
                    </CardFooter>
                </Card>
                <Card className="lg:!w-1/3">
                    <CardHeader>
                        <CardTitle>Ask in Discord</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4">
                            Come ask your questions directly from the team. We
                            are quite active there.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <a
                            href="https://discord.com/invite/GR4bQsN"
                            target="_blank"
                        >
                            <Button2 variant="secondary">Open Discord</Button2>
                        </a>
                    </CardFooter>
                </Card>
                <Card className="lg:!w-1/3">
                    <CardHeader>
                        <CardTitle>Found a bug?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4">
                            We encourage you to raise an issue so that we can
                            make the product better for everyone.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <a
                            href="https://discord.com/channels/727630561895514212/1244954638747303946"
                            target="_blank"
                        >
                            <Button2 variant="secondary">Post an issue</Button2>
                        </a>
                    </CardFooter>
                </Card>
            </div>
            <div>
                <h2 className="font-semibold text-2xl mb-4">
                    Priority Support
                </h2>
                <p>
                    In case you need to get in touch with the team to get help
                    faster, we offer <strong>paid</strong> support. Please reach
                    out to us on{" "}
                    <a
                        href="mailto:support@courselit.app"
                        className="underline"
                    >
                        CourseLit Support
                    </a>{" "}
                    with your requirements .
                </p>
            </div>
        </div>
    );
}
