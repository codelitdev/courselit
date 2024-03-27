import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import {
    Button2,
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    Link,
    TextRenderer,
} from "@courselit/components-library";
import { Check } from "@courselit/icons";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    columns as defaultColumns,
} from "./defaults";

const twGridColsMap = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
};

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        items,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        buttonBackground,
        buttonForeground,
        primaryButtonBackground,
        cardBorderColor,
        cssId,
        columns = defaultColumns,
    },
}: WidgetProps<Settings>) {
    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%]`}
                >
                    <div
                        className={`flex flex-col ${
                            headerAlignment === "center"
                                ? "items-center"
                                : "items-start"
                        }`}
                    >
                        <h2 className="text-4xl mb-4">{title}</h2>
                        {description && (
                            <div
                                className={`mb-4 ${
                                    headerAlignment === "center"
                                        ? "text-center"
                                        : "text-left"
                                }`}
                            >
                                <TextRenderer json={description} />
                            </div>
                        )}
                    </div>
                    {items && items.length > 0 && (
                        <div
                            className={`grid grid-cols-1 md:grid-cols-2 ${twGridColsMap[columns]} gap-4 justify-center items-center`}
                        >
                            {items.map((item) => (
                                <Card
                                    key={item.title}
                                    className="h-full flex flex-col w-full"
                                    style={{
                                        backgroundColor,
                                        color: foregroundColor,
                                        borderColor: cardBorderColor,
                                    }}
                                >
                                    <CardHeader>
                                        <p className="font-semibold">
                                            {item.title}
                                        </p>
                                        <CardTitle className="text-3xl">
                                            {item.price}
                                        </CardTitle>
                                        <span
                                            className="text-sm"
                                            style={{
                                                color: foregroundColor,
                                            }}
                                        >
                                            <TextRenderer
                                                json={item.description}
                                            />
                                        </span>
                                    </CardHeader>
                                    <CardContent className="grow">
                                        {item.features
                                            ?.split(",")
                                            .map((x) => x.trim())
                                            .map((feature) => (
                                                <div
                                                    className="flex items-center gap-2"
                                                    key={feature}
                                                >
                                                    {/* <svg
                                            className="w-4 h-4 text-green-500"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm4.707-10.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                clipRule="evenodd"
                                            />
                                        </svg> */}
                                                    <Check />
                                                    <span className="text-sm">
                                                        {feature}
                                                    </span>
                                                </div>
                                            ))}
                                    </CardContent>
                                    <CardFooter>
                                        <Link
                                            href={item.action.href}
                                            className="w-full"
                                        >
                                            <Button2
                                                className="w-full"
                                                style={{
                                                    backgroundColor:
                                                        item.primary
                                                            ? primaryButtonBackground
                                                            : buttonBackground,
                                                    color: buttonForeground,
                                                    borderColor: item.primary
                                                        ? ""
                                                        : cardBorderColor,
                                                }}
                                                variant={
                                                    item.primary
                                                        ? "default"
                                                        : "outline"
                                                }
                                            >
                                                {item.action.label}
                                            </Button2>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
