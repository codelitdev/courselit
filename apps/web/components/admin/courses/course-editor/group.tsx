import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import { connect } from "react-redux";
import {
    Grid,
    TextField,
    Switch,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    FormControlLabel,
} from "@mui/material";
import {
    BUTTON_SAVE,
    GROUP_SETTINGS_HEADER,
    LABEL_GROUP_NAME,
    GROUP_LESSONS_HEADER,
    BUTTON_NEW_LESSON_TEXT,
    BUTTON_DELETE_GROUP,
    GROUP_LESSON_ITEM_UNTITLED,
    ERROR_GROUP_NEW_LESSON_WITHOUT_SAVE,
    LABEL_GROUP_COLLAPSE,
} from "../../../../ui-config/strings";
import { ExpandMore, Add } from "@mui/icons-material";
import { AppMessage } from "@courselit/common-models";
import type { Group, Lesson } from "@courselit/common-models";
import type { AppDispatch } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";

const PREFIX = "Group";

const classes = {
    lesson: `${PREFIX}-lesson`,
    selected: `${PREFIX}-selected`,
    section: `${PREFIX}-section`,
};

const StyledAccordion = styled(Accordion)(({ theme }: { theme: any }) => ({
    [`& .${classes.lesson}`]: {
        cursor: "pointer",
    },

    [`& .${classes.selected}`]: {
        background: "#eee",
        borderRadius: 4,
        margin: theme.spacing(1),
    },

    [`& .${classes.section}`]: {
        border: "1px solid #eee",
        background: "#f7f7f7",
        borderRadius: 4,
        padding: theme.spacing(1),
        marginBottom: theme.spacing(2),
    },
}));

interface GroupProps {
    group: Group;
    lessons: Lesson[];
    onAddLesson: (...args: any[]) => void;
    onRemoveGroup: (...args: any[]) => void;
    updateGroup: (...args: any[]) => void;
    onSelectLesson: (...args: any[]) => void;
    selectedLesson: {
        groupId: string;
        index: number;
    };
    dispatch: AppDispatch;
}

const Group = ({
    lessons,
    group,
    onAddLesson,
    onRemoveGroup,
    updateGroup,
    onSelectLesson,
    selectedLesson,
    dispatch,
}: GroupProps) => {
    const [name, setName] = useState(group.name);
    const [rank, setRank] = useState(group.rank);
    const [collapsed, setCollapsed] = useState(group.collapsed);

    useEffect(() => {
        setName(group.name);
        setRank(group.rank);
        setCollapsed(group.collapsed);
    }, [group]);

    const groupLessons = lessons.filter(
        (lesson: Lesson) => lesson.groupId === group.id
    );

    const isDirty =
        group.name !== name ||
        group.rank !== rank ||
        group.collapsed !== collapsed;

    const onSubmit = (e: any) => {
        e.preventDefault();

        updateGroup({ id: group.id, name, rank, collapsed });
    };

    const handleAddLesson = (groupId: string) => {
        if (!groupId) {
            return dispatch(
                actionCreators.setAppMessage(
                    new AppMessage(ERROR_GROUP_NEW_LESSON_WITHOUT_SAVE)
                )
            );
        }

        onAddLesson(groupId);
    };

    return (
        <StyledAccordion>
            <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls="edit-lesson"
                id="edit-lesson"
            >
                <Typography variant="subtitle1">{name}</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Grid container direction="column">
                    <Grid item className={classes.section}>
                        <form onSubmit={onSubmit}>
                            <Grid container direction="column" spacing={1}>
                                <Grid item>
                                    <Grid
                                        container
                                        justifyContent="space-between"
                                    >
                                        <Grid item>
                                            <Typography variant="h6">
                                                {GROUP_SETTINGS_HEADER}
                                            </Typography>
                                        </Grid>
                                        <Grid item>
                                            <Button
                                                onClick={() =>
                                                    onRemoveGroup(group.id)
                                                }
                                            >
                                                {BUTTON_DELETE_GROUP}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item>
                                    <TextField
                                        variant="outlined"
                                        label={LABEL_GROUP_NAME}
                                        fullWidth
                                        margin="normal"
                                        name="title"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        required
                                    />
                                </Grid>
                                <Grid item>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                type="checkbox"
                                                name="collapsed"
                                                checked={collapsed}
                                                onChange={(e) =>
                                                    setCollapsed(
                                                        e.target.checked
                                                    )
                                                }
                                            />
                                        }
                                        label={LABEL_GROUP_COLLAPSE}
                                        labelPlacement="start"
                                    />
                                </Grid>
                                <Grid item>
                                    <Button
                                        type="submit"
                                        disabled={!isDirty || !name}
                                    >
                                        {BUTTON_SAVE}
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </Grid>
                    <Grid item className={classes.section}>
                        <Grid container direction="column" spacing={1}>
                            <Grid item>
                                <Typography variant="h6">
                                    {GROUP_LESSONS_HEADER}
                                </Typography>
                            </Grid>
                            <Grid item>
                                <Grid container direction="column" spacing={2}>
                                    {groupLessons.map((item, index: number) => (
                                        <>
                                            {index === selectedLesson.index &&
                                                group.id ===
                                                    selectedLesson.groupId && (
                                                    <Grid
                                                        item
                                                        className={
                                                            classes.selected
                                                        }
                                                        key={index}
                                                    >
                                                        {item.title && (
                                                            <Typography>
                                                                {item.title}
                                                            </Typography>
                                                        )}
                                                        {!item.title && (
                                                            <Typography>
                                                                {
                                                                    GROUP_LESSON_ITEM_UNTITLED
                                                                }
                                                            </Typography>
                                                        )}
                                                    </Grid>
                                                )}

                                            {(index !== selectedLesson.index ||
                                                group.id !==
                                                    selectedLesson.groupId) && (
                                                <Grid
                                                    item
                                                    className={classes.lesson}
                                                    onClick={() =>
                                                        onSelectLesson(
                                                            group.id,
                                                            index
                                                        )
                                                    }
                                                    key={index}
                                                >
                                                    {item.title && (
                                                        <Typography>
                                                            {item.title}
                                                        </Typography>
                                                    )}
                                                    {!item.title && (
                                                        <Typography>
                                                            {
                                                                GROUP_LESSON_ITEM_UNTITLED
                                                            }
                                                        </Typography>
                                                    )}
                                                </Grid>
                                            )}
                                        </>
                                    ))}
                                </Grid>
                            </Grid>
                            <Grid item>
                                <Button
                                    onClick={() => handleAddLesson(group.id)}
                                    startIcon={<Add />}
                                >
                                    {BUTTON_NEW_LESSON_TEXT}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </AccordionDetails>
        </StyledAccordion>
    );
};

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(() => ({}), mapDispatchToProps)(Group);
