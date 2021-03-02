import { GridListTile, GridListTileBar } from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { BACKEND } from "../../../config/constants";
import {
  MANAGE_COURSES_PAGE_HEADING,
  NEW_COURSE_PAGE_HEADING,
  COURSE_TYPE_BLOG,
  COURSE_TYPE_COURSE,
} from "../../../config/strings";
import FetchBuilder from "../../../lib/fetch";
import { authProps, profileProps } from "../../../types";
import Img from "../../Img";
import dynamic from "next/dynamic";
const OverviewAndDetail = dynamic(() =>
  import("../../Public/OverviewAndDetail")
);
const CourseEditor = dynamic(() => import("./CourseEditor"));

const Index = (props) => {
  const [coursesPaginationOffset, setCoursesPaginationOffset] = useState(1);
  const [creatorCourses, setCreatorCourses] = useState([]);
  const [componentsMap, setComponentsMap] = useState([]);

  useEffect(() => {
    loadCreatorCourses();
  }, [props.profile.id]);

  useEffect(() => {
    const map = [];
    creatorCourses.map((course) => {
      map.push({
        subtitle: NEW_COURSE_PAGE_HEADING,
        Overview: (
          <GridListTile key={course.id} cols={1}>
            <Img src={course.featuredImage} isThumbnail={true} />
            <GridListTileBar
              title={course.title}
              subtitle={course.isBlog ? COURSE_TYPE_BLOG : COURSE_TYPE_COURSE}
            />
          </GridListTile>
        ),
        Detail: (
          <CourseEditor
            courseId={course.id}
            markDirty={() => {}}
            closeEditor={() => {}}
          />
        ),
      });
    });
    setComponentsMap(map);
  }, [coursesPaginationOffset]);

  const loadCreatorCourses = async () => {
    if (!props.profile.id) {
      return;
    }
    const query = `
        query {
          courses: getCreatorCourses(
            id: "${props.profile.id}",
            offset: ${coursesPaginationOffset}
          ) {
            id, title, featuredImage, isBlog
          }
        }
        `;
    const fetch = new FetchBuilder()
      .setUrl(`${BACKEND}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build();
    try {
      const response = await fetch.exec();
      if (response.courses && response.courses.length > 0) {
        setCreatorCourses([...creatorCourses, ...response.courses]);
        setCoursesPaginationOffset(coursesPaginationOffset + 1);
      }
    } catch (err) {}
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
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
});

export default connect(mapStateToProps)(Index);
