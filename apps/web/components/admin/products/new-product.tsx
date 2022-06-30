import React, { useState } from "react";
import { Address, AppMessage } from "@courselit/common-models";
import { Section } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
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
import { useRouter } from "next/router";
import { connect } from "react-redux";
import {
    COURSE_TYPE_COURSE,
    COURSE_TYPE_DOWNLOAD,
} from "../../../ui-config/constants";
import {
    BTN_CONTINUE,
    BTN_NEW_PRODUCT,
    FORM_NEW_PRODUCT_MENU_COURSE_SUBTITLE,
    FORM_NEW_PRODUCT_MENU_DOWNLOADS_SUBTITLE,
    FORM_NEW_PRODUCT_TITLE_PLC,
} from "../../../ui-config/strings";
import { capitalize } from "../../../ui-lib/utils";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";

interface NewProductProps {
    address: Address;
    dispatch: AppDispatch;
    networkAction: boolean;
}

function NewProduct({
    address,
    dispatch,
    networkAction: loading,
}: NewProductProps) {
    const [title, setTitle] = useState("");
    const [type, setType] = useState("");
    const router = useRouter();

    const createCourse = async () => {
        const query = `
            mutation {
                course: createCourse(courseData: {
                    title: "${title}",
                    type: ${type.toUpperCase()},
                }) {
                    id,
                    courseId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                router.replace(
                    `/dashboard/product/${response.course.courseId}/content`
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <Section>
            <Grid container direction="column">
                <Grid item>
                    <Typography variant="h1">{BTN_NEW_PRODUCT}</Typography>
                </Grid>
                <Grid item>
                    <form onSubmit={createCourse}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    required
                                    variant="outlined"
                                    label="Title"
                                    fullWidth
                                    margin="normal"
                                    name="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={FORM_NEW_PRODUCT_TITLE_PLC}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl required fullWidth>
                                    <InputLabel id="product-selection-label">
                                        Product type
                                    </InputLabel>
                                    <Select
                                        labelId="product-selection-label"
                                        id="product-select"
                                        value={type}
                                        label="Product type"
                                        onChange={(e) =>
                                            setType(e.target.value)
                                        }
                                    >
                                        <MenuItem value={COURSE_TYPE_COURSE}>
                                            <Grid container direction="column">
                                                <Grid item>
                                                    {capitalize(
                                                        COURSE_TYPE_COURSE
                                                    )}
                                                </Grid>
                                                <Grid item>
                                                    <Typography
                                                        variant="body2"
                                                        color="textSecondary"
                                                    >
                                                        {
                                                            FORM_NEW_PRODUCT_MENU_COURSE_SUBTITLE
                                                        }
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </MenuItem>
                                        <MenuItem value={COURSE_TYPE_DOWNLOAD}>
                                            <Grid container direction="column">
                                                <Grid item>
                                                    {capitalize(
                                                        COURSE_TYPE_DOWNLOAD
                                                    )}
                                                </Grid>
                                                <Grid item>
                                                    <Typography
                                                        variant="body2"
                                                        color="textSecondary"
                                                    >
                                                        {
                                                            FORM_NEW_PRODUCT_MENU_DOWNLOADS_SUBTITLE
                                                        }
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item>
                                <Button
                                    variant="contained"
                                    disabled={
                                        !title ||
                                        !type ||
                                        (!!title && !!type && loading)
                                    }
                                    onClick={createCourse}
                                >
                                    {BTN_CONTINUE}
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                </Grid>
            </Grid>
        </Section>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    networkAction: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(NewProduct);
