import React, { FormEvent, useEffect, useState } from "react";
import { Address, AppMessage, SiteInfo } from "@courselit/common-models";
import { Section } from "@courselit/components-library";
import type { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import {
    Button,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from "@mui/material";
import { connect } from "react-redux";
import {
    APP_MESSAGE_COURSE_SAVED,
    BUTTON_SAVE,
    PRICING_DROPDOWN,
    PRICING_PAID_NO_PAYMENT_METHOD,
} from "../../../../ui-config/strings";
import useCourse from "./course-hook";

interface PricingProps {
    id: string;
    siteinfo: SiteInfo;
    address: Address;
    dispatch: AppDispatch;
}

function Pricing({ id, siteinfo, address, dispatch }: PricingProps) {
    const [paid, setPaid] = useState(0);
    const [cost, setCost] = useState(0);
    const course = useCourse(id);

    useEffect(() => {
        if (course) {
            setPaid(course!.cost > 0 ? 1 : 0);
            setCost(course!.cost);
        }
    }, [course]);

    const updatePricing = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const mutation = `
        mutation {
            updateCourse(courseData: {
                id: "${course!.id}",
                cost: ${paid ? cost : 0}
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

    const onSelectionChanged = (e) => {
        const val = +e.target.value;
        setPaid(val);
        if (!val) {
            setCost(0);
        }
    };

    return (
        <Section>
            <form onSubmit={updatePricing}>
                <Grid container>
                    <Grid item xs={12} sx={{ mb: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel id="demo-simple-select-label">
                                {PRICING_DROPDOWN}
                            </InputLabel>
                            <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={paid}
                                label={PRICING_DROPDOWN}
                                onChange={onSelectionChanged}
                            >
                                <MenuItem value={0}>Free</MenuItem>
                                <MenuItem
                                    value={1}
                                    disabled={!siteinfo.paymentMethod}
                                >
                                    <Grid container direction="column">
                                        <Grid item>Paid</Grid>
                                        <Grid item>
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                            >
                                                {PRICING_PAID_NO_PAYMENT_METHOD}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    {!!paid && (
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
                            disabled={!course || course.cost === cost}
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
