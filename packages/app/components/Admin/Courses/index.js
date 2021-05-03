import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { GridListTileBar, Button } from "@material-ui/core";
import { connect } from "react-redux";
import {
  MANAGE_COURSES_PAGE_HEADING,
  NEW_COURSE_PAGE_HEADING,
  COURSE_TYPE_BLOG,
  COURSE_TYPE_COURSE,
  LOAD_MORE_TEXT,
} from "../../../config/strings";
import FetchBuilder from "../../../lib/fetch";
import { addressProps, authProps, profileProps } from "../../../types";
import { OverviewAndDetail } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { networkAction } from "../../../redux/actions";
import {
  checkPermission,
  constructThumbnailUrlFromFileUrl,
} from "../../../lib/utils";
import { permissions } from "../../../config/constants";
import { makeStyles } from "@material-ui/styles";
import { Add } from "@material-ui/icons";

const CourseEditor = dynamic(() => import("./CourseEditor"));
const Img = dynamic(() => import("../../Img.js"));

const useStyles = makeStyles((theme) => ({
  btn: {
    width: "100%",
    height: "100%",
  },
}));

const Index = (props) => {
  const [coursesPaginationOffset, setCoursesPaginationOffset] = useState(1);
  const [creatorCourses, setCreatorCourses] = useState([]);
  const [componentsMap, setComponentsMap] = useState([]);
  const classes = useStyles();

  useEffect(() => {
    loadCreatorCourses();
  }, []);

  useEffect(() => {
    const map = [];
    creatorCourses.map((course) => {
      map.push(getComponent(course));
    });
    map.push({
      Overview: (
        <Button
          variant="contained"
          className={classes.btn}
          onClick={loadCreatorCourses}
        >
          {LOAD_MORE_TEXT}
        </Button>
      ),
    });
    if (
      checkPermission(props.profile.permissions, [permissions.manageCourse])
    ) {
      map.unshift({
        subtitle: NEW_COURSE_PAGE_HEADING,
        Overview: (
          <>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              className={classes.btn}
            >
              Add new
            </Button>
          </>
        ),
        Detail: <CourseEditor markDirty={() => {}} closeEditor={() => {}} />,
      });
    }
    setComponentsMap(map);
  }, [coursesPaginationOffset]);

  const getComponent = (course) => ({
    subtitle: NEW_COURSE_PAGE_HEADING,
    Overview: (
      <>
        <Img src={constructThumbnailUrlFromFileUrl(course.featuredImage)} />
        <GridListTileBar
          title={course.title}
          subtitle={course.isBlog ? COURSE_TYPE_BLOG : COURSE_TYPE_COURSE}
        />
      </>
    ),
    Detail: (
      <CourseEditor
        courseId={course.id}
        markDirty={() => {}}
        closeEditor={() => {}}
      />
    ),
  });

  const loadCreatorCourses = async () => {
    const query = `
    query {
      courses: getCoursesAsAdmin(
        offset: ${coursesPaginationOffset}
      ) {
        id,
        title,
        featuredImage,
        isBlog
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${props.address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build();
    try {
      props.dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.courses && response.courses.length > 0) {
        setCreatorCourses([...creatorCourses, ...response.courses]);
        setCoursesPaginationOffset(coursesPaginationOffset + 1);
      }
    } catch (err) {
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  return (
    <OverviewAndDetail
      title={MANAGE_COURSES_PAGE_HEADING}
      componentsMap={componentsMap}
    />
  );
};

Index.propTypes = {
  auth: authProps,
  profile: profileProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
  address: state.address,
});

export default connect(mapStateToProps)(Index);
