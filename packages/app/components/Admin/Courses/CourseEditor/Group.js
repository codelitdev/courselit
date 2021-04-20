import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Grid,
  TextField,
  Switch,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@material-ui/core";
import { lesson } from "../../../../types";
import {
  BUTTON_SAVE,
  GROUP_SETTINGS_HEADER,
  LABEL_GROUP_NAME,
  GROUP_LESSONS_HEADER,
  BUTTON_NEW_LESSON_TEXT,
  BUTTON_DELETE_GROUP,
} from "../../../../config/strings";
import { ExpandMore, Add } from "@material-ui/icons";

const Group = ({ lessons, group, onAddLesson, onRemoveGroup, updateGroup }) => {
  const [name, setName] = useState(group.name);
  const [rank, setRank] = useState(group.rank);
  const [collapsed, setCollapsed] = useState(group.collapsed);

  useEffect(() => {
    setName(group.name);
    setRank(group.rank);
    setCollapsed(group.collapsed);
  }, [group])

  const groupLessons = lessons.filter((lesson) => lesson.group === group.id);

  const isDirty =
    group.name !== name || group.rank !== rank || group.collapsed !== collapsed;

  const onSubmit = (e) => {
    e.preventDefault();

    updateGroup({ id: group.id, name, rank, collapsed });
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        aria-controls="edit-lesson"
        id="edit-lesson"
      >
        {name}
      </AccordionSummary>
      <AccordionDetails>
        <Grid container direction="column" spacing={4}>
          <Grid item>
            <form onSubmit={onSubmit}>
              <Grid container direction="column" spacing={1}>
                <Grid item>
                  <Grid container justify="space-between">
                    <Grid item>
                      <Typography variant="h6">
                        {GROUP_SETTINGS_HEADER}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Button onClick={() => onRemoveGroup(group.id)}>
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
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item>
                  <Switch
                    type="checkbox"
                    name="collapsed"
                    checked={collapsed}
                    onChange={(e) => setCollapsed(e.target.checked)}
                  />
                </Grid>
                <Grid item>
                  <Button type="submit" disabled={!isDirty || !name}>
                    {BUTTON_SAVE}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Grid>
          <Grid item>
            <Grid container direction="column" spacing={1}>
              <Grid item>
                <Typography variant="h6">{GROUP_LESSONS_HEADER}</Typography>
              </Grid>
              <Grid item>
                {groupLessons.map((item, index) => (
                  <LessonEditor
                    lesson={item}
                    onLessonDeleted={onDeleteLesson}
                    key={index}
                    onLessonCreated={onLessonCreated}
                    lessonIndex={index}
                  />
                ))}
              </Grid>
              <Grid item>
                <Button onClick={onAddLesson} startIcon={<Add />}>
                  {BUTTON_NEW_LESSON_TEXT}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

Group.propTypes = {
  group: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    rank: PropTypes.number,
    collapsed: PropTypes.bool,
  }),
  lessons: PropTypes.arrayOf(lesson),
  onAddLesson: PropTypes.func.isRequired,
  onRemoveGroup: PropTypes.func.isRequired,
  updateGroup: PropTypes.func.isRequired,
};

export default Group;
