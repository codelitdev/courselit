import { Lightbulb } from "lucide-react";
import Form from "./form";
import FormField from "./form-field";

export default function CssIdField({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <Form className="flex flex-col gap-2">
            <FormField
                label="CSS Id"
                value={value}
                tooltip="Useful for creating in page links"
                onChange={(e) => onChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lightbulb className="w-8 h-8" />
                For a nice scroll-to effect, set vertical padding of this
                component to at-least 10.
            </p>
        </Form>
    );
}
