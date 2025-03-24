import { capitalize, FetchBuilder } from "@courselit/utils";
import { getBackendAddress, getPage } from "../../ui-lib/utils";
import dynamic from "next/dynamic";
import { Course, Page } from "@courselit/common-models";
import BaseLayout from "../../components/public/base-layout";
import { useRouter } from "next/router";
const Items = dynamic(() => import("../../components/public/items"));

const generateQuery = (pageOffset = 1) => `
  query {
    courses: getCourses(offset: ${pageOffset}, filterBy: BLOG) {
      id,
      title,
      description,
      updatedAt,
      creatorName,
      slug,
      featuredImage {
        file
      },
      courseId,
      type
    }
  }
`;

interface PostsProps {
    courses: Course[];
    page: Page;
}

function Posts(props: PostsProps) {
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
                        posts={true}
                    />
                </div>
            </div>
        </BaseLayout>
    );
}

const getCourses = async (backend: string) => {
    let courses = [];
    const fetch = new FetchBuilder()
        .setUrl(`${backend}/api/graph`)
        .setPayload(generateQuery())
        .setIsGraphQLEndpoint(true)
        .build();
    try {
        const response = await fetch.exec();
        courses = response.courses;
    } catch (e) {
        console.error(e);
    }
    return courses;
};

export async function getServerSideProps({ req }: any) {
    const address = getBackendAddress(req.headers);
    const page = await getPage(address);
    if (!page) {
        return {
            notFound: true,
        };
    }
    const courses = await getCourses(address);
    return { props: { courses, page } };
}

export default Posts;
