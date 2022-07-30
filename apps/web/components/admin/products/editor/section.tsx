import { Address, AppMessage } from "@courselit/common-models";
import { Section } from "@courselit/components-library";
import {
    actionCreators,
    AppDispatch,
    AppState,
} from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { Button, Grid, TextField, Typography } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
    BTN_CONTINUE,
    EDIT_SECTION_HEADER,
    LABEL_GROUP_NAME,
    NEW_SECTION_HEADER,
    POPUP_CANCEL_ACTION,
} from "../../../../ui-config/strings";
import useCourse from "./course-hook";

interface SectionEditorProps {
    id: string;
    section?: string;
    loading: boolean;
    address: Address;
    dispatch: AppDispatch;
}

function SectionEditor({
    id,
    loading,
    section,
    dispatch,
    address,
}: SectionEditorProps) {
    const [name, setName] = useState("");
    const router = useRouter();
    const course = useCourse(id);

    useEffect(() => {
        if (section && course && course.groups) {
            const group = course.groups.filter(
                (group) => group.id === section
            )[0];
            if (group) {
                setName(group.name);
            }
        }
    }, [course]);

    const updateGroup = async (e) => {
        e.preventDefault();
        const mutation = section
            ? `
        mutation {
            course: updateGroup(
                id: "${section}",
                courseId: "${course.id}",
                name: "${name}"
            ) {
                courseId,
                groups {
                    id,
                    name,
                    rank,
                    collapsed
                }
            }
        }
        `
            : `
        mutation {
            course: addGroup(id: "${course.id}", name: "${name}") {
                courseId,
                groups {
                    id,
                    name,
                    rank,
                    collapsed
                }
            }
        }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                router.replace(`/dashboard/product/${course.courseId}/content`);
            }
        } catch (err: any) {
            dispatch(actionCreators.setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    if (!course) {
        return <></>;
    }

    return (
        <Section>
            <Grid container direction="column">
                <Grid item>
                    <Typography variant="h2">
                        {section ? EDIT_SECTION_HEADER : NEW_SECTION_HEADER}
                    </Typography>
                </Grid>
                <Grid item>
                    <form onSubmit={updateGroup}>
                        <TextField
                            variant="outlined"
                            label={LABEL_GROUP_NAME}
                            fullWidth
                            margin="normal"
                            name="Section name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <Button
                            variant="contained"
                            disabled={!name || loading}
                            type="submit"
                        >
                            {BTN_CONTINUE}
                        </Button>
                        {course.courseId && (
                            <Link
                                href={`/dashboard/product/${course.courseId}/content`}
                            >
                                <Button component="a">
                                    {POPUP_CANCEL_ACTION}
                                </Button>
                            </Link>
                        )}
                    </form>
                </Grid>
            </Grid>
        </Section>
    );
}

const mapStateToProps = (state: AppState) => ({
    loading: state.networkAction,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(SectionEditor);
