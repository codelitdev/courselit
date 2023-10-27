import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FetchBuilder } from "@courselit/utils";
import {
    POPUP_CANCEL_ACTION,
    USER_FILTER_APPLY_BTN,
    USER_FILTER_CATEGORY_PRODUCT,
    USER_FILTER_PRODUCT_DOES_NOT_HAVE,
    USER_FILTER_PRODUCT_DROPDOWN_LABEL,
    USER_FILTER_PRODUCT_HAS,
} from "@ui-config/strings";
import { AppDispatch, AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import PopoverHeader from "../popover-header";
import {
    Button,
    Form,
    FormSubmit,
    Select,
} from "@courselit/components-library";
import { Address, AppMessage, Course } from "@courselit/common-models";
import { actionCreators } from "@courselit/state-management";
const { setAppMessage } = actionCreators;

interface ProductFilterEditorProps {
    onApply: (...args: any[]) => any;
    address: Address;
    dispatch: AppDispatch;
}

function ProductFilterEditor({
    onApply,
    address,
    dispatch,
}: ProductFilterEditorProps) {
    const [condition, setCondition] = useState(USER_FILTER_PRODUCT_HAS);
    const [value, setValue] = useState("");
    const [products, setProducts] = useState<
        Pick<Course, "title" | "courseId">[]
    >([]);

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
            dispatch(setAppMessage(new AppMessage(err.message)));
        }
    }, [address.backend, dispatch]);

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
                valueLabel: products.find((x) => x.courseId === value).title,
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
        options.unshift({
            label: USER_FILTER_PRODUCT_DROPDOWN_LABEL,
            value: "",
            disabled: true,
        });
        return options;
    }, [products]);

    return (
        <Form
            className="flex flex-col gap-2 p-2 max-w-[180px]"
            onSubmit={onSubmit}
        >
            <PopoverHeader>{USER_FILTER_CATEGORY_PRODUCT}</PopoverHeader>
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
            />
            <div className="flex justify-between">
                <FormSubmit name="apply" text={USER_FILTER_APPLY_BTN} />
                <Button name="cancel" variant="soft">
                    {POPUP_CANCEL_ACTION}
                </Button>
            </div>
        </Form>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ProductFilterEditor);
