import { capitalize, Grid, Typography } from "@mui/material";
import { FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/router";
import { getBackendAddress } from "../ui-lib/utils";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { Course } from "@courselit/common-models";
import BaseLayout from "../components/public/base-layout";

const Items = dynamic(() => import("../components/public/items"));

const generateQuery = (pageOffset = 1) => `
  query {
    courses: getCourses(offset: ${pageOffset}, filterBy: COURSE) {
      id
      title,
      description,
      updatedAt,
      creatorName,
      slug,
      featuredImage {
          thumbnail 
      },
      courseId,
      cost
    }
  }
`;

interface CoursesProps {
    courses: Course[];
}

const Courses = (props: CoursesProps) => {
    const router = useRouter();
    const path = capitalize(router.pathname.split("/")[1]);

    return (
        <BaseLayout title={path}>
            <Grid item xs={12}>
                <Section>
                    <Grid
                        container
                        sx={{
                            padding: 2,
                        }}
                    >
                        <Grid item container>
                            <Grid item xs={12}>
                                <Typography variant="h2">{path}</Typography>
                            </Grid>
                        </Grid>
                        <Items
                            showLoadMoreButton={true}
                            generateQuery={generateQuery}
                            initialItems={props.courses}
                        />
                    </Grid>
                </Section>
            </Grid>
        </BaseLayout>
    );
};

const getCourses = async (backend: string) => {
    let courses = [];
    try {
        const fetch = new FetchBuilder()
            .setUrl(`${backend}/api/graph`)
            .setPayload(generateQuery())
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetch.exec();
        courses = response.courses;
    } catch (e) {}
    return courses;
};

export async function getServerSideProps({ req }: any) {
    const courses = await getCourses(getBackendAddress(req.headers.host));
    return { props: { courses } };
}

export default Courses;
