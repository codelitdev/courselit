import React, { FormEvent, useEffect, useState } from "react";
import { Address, AppMessage, SiteInfo } from "@courselit/common-models";
import { Section } from "@courselit/components-library";
import type { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { Button, Grid, TextField } from "@mui/material";
import { connect } from "react-redux";
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

interface PricingProps {
    id: string;
    siteinfo: SiteInfo;
    address: Address;
    dispatch: AppDispatch;
}

function Pricing({ id, siteinfo, address, dispatch }: PricingProps) {
    const course = useCourse(id);
    const [cost, setCost] = useState(course?.cost);
    const [costType, setCostType] = useState<string>(
        course?.costType?.toLowerCase() || PRICING_FREE
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
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.updateCourse) {
                dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_COURSE_SAVED))
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    if (!course?.courseId) {
        return null;
    }

    return (
        <Section>
            <form onSubmit={updatePricing}>
                <Grid container>
                    <Grid item xs={12} sx={{ mb: 2 }}>
                        <Select
                            value={costType}
                            title={PRICING_DROPDOWN}
                            onChange={(val: string) => {
                                setCostType(val);
                            }}
                            options={[
                                {
                                    label: PRICING_FREE_LABEL,
                                    value: PRICING_FREE,
                                    sublabel: PRICING_FREE_SUBTITLE,
                                },
                                {
                                    label: PRICING_EMAIL_LABEL,
                                    value: PRICING_EMAIL,
                                    sublabel: PRICING_EMAIL_SUBTITLE,
                                },
                                {
                                    label: PRICING_PAID_LABEL,
                                    value: PRICING_PAID,
                                    sublabel: siteinfo.paymentMethod
                                        ? PRICING_PAID_SUBTITLE
                                        : PRICING_PAID_NO_PAYMENT_METHOD,
                                    disabled: !siteinfo.paymentMethod,
                                },
                            ]}
                        />
                    </Grid>
                    {PRICING_PAID === costType && (
                        <Grid item xs={12} sx={{ mb: 2 }}>
                            <TextField
                                required
                                variant="outlined"
                                label="Cost"
                                fullWidth
                                margin="normal"
                                name="title"
                                value={cost}
                                type="number"
                                inputProps={{
                                    step: "0.1",
                                }}
                                onChange={(e) =>
                                    setCost(+e.target.value as number)
                                }
                            />
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        <Button
                            type="submit"
                            variant="contained"
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
                    </Grid>
                </Grid>
            </form>
        </Section>
    );
}

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Pricing);
