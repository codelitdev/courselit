import { capitalize, FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/router";
import { getBackendAddress, getPage } from "../ui-lib/utils";
import dynamic from "next/dynamic";
import { Course, Page } from "@courselit/common-models";
import BaseLayout from "../components/public/base-layout";

const Items = dynamic(() => import("../components/public/items"));

const generateQuery = (page = 1) => `
  query {
    communities: getCommunities(page: ${page}) {
        name
        communityId
        membersCount
    }
  }
`;

interface CoursesProps {
    courses: Course[];
    page: Page;
}

const Communities = (props: CoursesProps) => {
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
    const courses = await getCommunities(address);
    return { props: { courses, page } };
}

const getCommunities = async (backend: string) => {
    let communities = [];
    try {
        const fetch = new FetchBuilder()
            .setUrl(`${backend}/api/graph`)
            .setPayload(generateQuery())
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetch.exec();
        communities = response.communities;
    } catch (e) {}
    return communities;
};

export default Communities;
