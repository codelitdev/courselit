import React, { useState } from "react";
import { Address, AppMessage } from "@courselit/common-models";
import { Section } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { Button, Grid, TextField, Typography } from "@mui/material";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import {
    BTN_CONTINUE,
    BTN_NEW_BLOG,
    BUTTON_CANCEL_TEXT,
    COURSE_TYPE_BLOG,
    FORM_NEW_PRODUCT_TITLE_PLC,
} from "../../../ui-config/strings";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import Link from "next/link";

interface NewBlogProps {
    address: Address;
    dispatch: AppDispatch;
    networkAction: boolean;
}

function NewBlog({ address, dispatch, networkAction: loading }: NewBlogProps) {
    const [title, setTitle] = useState("");
    const router = useRouter();

    const createCourse = async () => {
        const query = `
            mutation {
                course: createCourse(courseData: {
                    title: "${title}",
                    type: ${COURSE_TYPE_BLOG.toUpperCase()},
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
                    `/dashboard/blog/${response.course.courseId}/details`
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
                    <Typography variant="h1">{BTN_NEW_BLOG}</Typography>
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
                            <Grid item>
                                <Button
                                    variant="contained"
                                    disabled={!title || (!!title && loading)}
                                    onClick={createCourse}
                                    sx={{ mr: 1 }}
                                >
                                    {BTN_CONTINUE}
                                </Button>
                                <Link href={`/dashboard/blogs`}>
                                    <Button component="a">
                                        {BUTTON_CANCEL_TEXT}
                                    </Button>
                                </Link>
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

export default connect(mapStateToProps, mapDispatchToProps)(NewBlog);
