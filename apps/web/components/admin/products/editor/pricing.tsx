import React, { FormEvent, useEffect, useState } from "react";
import { Address, AppMessage, SiteInfo } from "@courselit/common-models";
import { FormField, Form, Button } from "@courselit/components-library";
import type { AppDispatch } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import {
    APP_MESSAGE_COURSE_SAVED,
    BUTTON_SAVE,
    PRICING_DROPDOWN,
    PRICING_EMAIL,
    PRICING_EMAIL_LABEL,
    PRICING_EMAIL_SUBTITLE,
    PRICING_FREE,
    PRICING_FREE_LABEL,
    PRICING_FREE_SUBTITLE,
    PRICING_PAID,
    PRICING_PAID_LABEL,
    PRICING_PAID_NO_PAYMENT_METHOD,
    PRICING_PAID_SUBTITLE,
} from "../../../../ui-config/strings";
import useCourse from "./course-hook";
import { Select } from "@courselit/components-library";
import { COURSE_TYPE_DOWNLOAD } from "../../../../ui-config/constants";

interface PricingProps {
    id: string;
    siteinfo: SiteInfo;
    address: Address;
    dispatch?: AppDispatch;
}

export default function Pricing({
    id,
    siteinfo,
    address,
    dispatch,
}: PricingProps) {
    const course = useCourse(id, address);
    const [cost, setCost] = useState(course?.cost);
    const [costType, setCostType] = useState<string>(
        course?.costType?.toLowerCase() || PRICING_FREE,
    );

    useEffect(() => {
        if (course) {
            setCost(course!.cost);
            setCostType(course!.costType!.toLowerCase());
        }
    }, [course]);

    const updatePricing = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const mutation = `
        mutation {
            updateCourse(courseData: {
                id: "${course!.id}",
                costType: ${costType.toUpperCase()},
                cost: ${cost}
            }) {
                id
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.updateCourse) {
                dispatch &&
                    dispatch(
                        setAppMessage(new AppMessage(APP_MESSAGE_COURSE_SAVED)),
                    );
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    if (!course?.courseId) {
        return null;
    }

    const options = [
        {
            label: PRICING_FREE_LABEL,
            value: PRICING_FREE,
            sublabel: PRICING_FREE_SUBTITLE,
        },
        {
            label: PRICING_PAID_LABEL,
            value: PRICING_PAID,
            sublabel: siteinfo.paymentMethod
                ? PRICING_PAID_SUBTITLE
                : PRICING_PAID_NO_PAYMENT_METHOD,
            disabled: !siteinfo.paymentMethod,
        },
    ];
    if (course.type?.toLowerCase() === COURSE_TYPE_DOWNLOAD) {
        options.splice(1, 0, {
            label: PRICING_EMAIL_LABEL,
            value: PRICING_EMAIL,
            sublabel: PRICING_EMAIL_SUBTITLE,
        });
    }

    return (
        <Form onSubmit={updatePricing} className="flex flex-col gap-4">
            <Select
                value={costType}
                title={PRICING_DROPDOWN}
                onChange={(val: string) => {
                    setCostType(val);
                }}
                options={options}
            />
            {PRICING_PAID === costType && (
                <FormField
                    required
                    label="Cost"
                    name="title"
                    value={cost}
                    type="number"
                    step="0.1"
                    onChange={(e) => setCost(+e.target.value as number)}
                />
            )}
            <div>
                <Button
                    type="submit"
                    disabled={
                        !course ||
                        (costType === PRICING_PAID &&
                            (!cost || course.cost === cost)) ||
                        (costType !== PRICING_PAID &&
                            costType === course.costType?.toLowerCase())
                    }
                >
                    {BUTTON_SAVE}
                </Button>
            </div>
        </Form>
    );
}
