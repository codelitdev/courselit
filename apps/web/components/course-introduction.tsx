import React from "react";
import dynamic from "next/dynamic";
import { Course } from "@courselit/common-models";

const Article = dynamic(() => import("./public/article"));

interface CourseIntroductionProps {
    course: Course;
}

const CourseIntroduction = (props: CourseIntroductionProps) => {
    const { course } = props;
    const options = {
        showEnrollmentArea: true,
    };

    return <>{course && <Article course={course} options={options} />}</>;
};

export default CourseIntroduction;
