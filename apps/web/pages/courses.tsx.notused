import { capitalize, FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/router";
import { getBackendAddress, getPage } from "../ui-lib/utils";
import dynamic from "next/dynamic";
import { Course, Page } from "@courselit/common-models";
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
        file
      },
      courseId,
      cost,
      type,
      pageId
    }
  }
`;

interface CoursesProps {
    courses: Course[];
    page: Page;
}

const Courses = (props: CoursesProps) => {
    const router = useRouter();
    const path = capitalize(router.pathname.split("/")[1]);

    return (
        <BaseLayout title={path} layout={props.page.layout}>
            <div className="mx-auto lg:max-w-[1200px] w-full">
                <div className="flex flex-col p-4 gap-4">
                    <h1 className="text-4xl font-semibold my-4 lg:my-8">
                        {path}
                    </h1>
                    <Items
                        showLoadMoreButton={true}
                        generateQuery={generateQuery}
                        initialItems={props.courses}
                    />
                </div>
            </div>
        </BaseLayout>
    );
};

export async function getServerSideProps({ req }: any) {
    const address = getBackendAddress(req.headers);
    const page = await getPage(address);
    const courses = await getCourses(address);
    return { props: { courses, page } };
}

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

export default Courses;
