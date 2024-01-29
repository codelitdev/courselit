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
        <Form className="flex flex-col gap-1">
            <FormField
                label="CSS Id"
                value={value}
                tooltip="Useful for creating in page links"
                onChange={(e) => onChange(e.target.value)}
            />
            <p className="text-xs text-slate-400">
                <b>Tip</b>: Set vertical padding of this component to at-least
                80 for a decent scroll-to effect.
            </p>
        </Form>
    );
}
