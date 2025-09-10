import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useContext,
} from "react";
import { FetchBuilder } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
    POPUP_CANCEL_ACTION,
    USER_FILTER_APPLY_BTN,
    USER_FILTER_CATEGORY_PRODUCT,
    USER_FILTER_PRODUCT_DOES_NOT_HAVE,
    USER_FILTER_PRODUCT_DROPDOWN_LABEL,
    USER_FILTER_PRODUCT_HAS,
} from "@ui-config/strings";
import { DropdownMenuLabel } from "@components/ui/dropdown-menu";
import {
    Button,
    Form,
    FormSubmit,
    Select,
    useToast,
} from "@courselit/components-library";
import { Course } from "@courselit/common-models";
import { AddressContext } from "@components/contexts";

interface ProductFilterEditorProps {
    onApply: (...args: any[]) => any;
}

export default function ProductFilterEditor({
    onApply,
}: ProductFilterEditorProps) {
    const [condition, setCondition] = useState(USER_FILTER_PRODUCT_HAS);
    const [value, setValue] = useState("");
    const [products, setProducts] = useState<
        Pick<Course, "title" | "courseId">[]
    >([]);
    const address = useContext(AddressContext);
    const { toast } = useToast();

    const loadCreatorCourses = useCallback(async () => {
        const query = `
            query { courses: getCoursesAsAdmin(
                offset: 1
              ) {
                title,
                courseId,
              }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.courses) {
                setProducts([...response.courses]);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    }, [address.backend]);

    useEffect(() => {
        loadCreatorCourses();
    }, [loadCreatorCourses]);

    const onSubmit = (e: any) => {
        e.preventDefault();
        const buttonName = e.nativeEvent.submitter.name;
        if (buttonName === "apply") {
            onApply({
                condition,
                value,
                valueLabel: products.find((x) => x.courseId === value)?.title,
            });
        } else {
            onApply();
        }
    };

    const productOptions = useMemo(() => {
        const options: { label: string; value: string; disabled?: boolean }[] =
            products.map((product) => ({
                label: product.title,
                value: product.courseId,
            }));
        return options;
    }, [products]);

    return (
        <Form className="flex flex-col gap-2 p-2" onSubmit={onSubmit}>
            <DropdownMenuLabel>
                {USER_FILTER_CATEGORY_PRODUCT}
            </DropdownMenuLabel>
            <Select
                value={condition}
                onChange={setCondition}
                title=""
                options={[
                    {
                        label: USER_FILTER_PRODUCT_HAS,
                        value: USER_FILTER_PRODUCT_HAS,
                    },
                    {
                        label: USER_FILTER_PRODUCT_DOES_NOT_HAVE,
                        value: USER_FILTER_PRODUCT_DOES_NOT_HAVE,
                    },
                ]}
            />
            <Select
                options={productOptions}
                value={value}
                title=""
                variant="without-label"
                onChange={setValue}
                placeholderMessage={USER_FILTER_PRODUCT_DROPDOWN_LABEL}
            />
            <div className="flex justify-between">
                <FormSubmit
                    disabled={!value}
                    name="apply"
                    text={USER_FILTER_APPLY_BTN}
                />
                <Button name="cancel" variant="soft">
                    {POPUP_CANCEL_ACTION}
                </Button>
            </div>
        </Form>
    );
}
