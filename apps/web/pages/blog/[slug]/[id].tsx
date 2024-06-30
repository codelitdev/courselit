import { connect } from "react-redux";
import { getBackendAddress, getPage } from "../../../ui-lib/utils";
import { FetchBuilder } from "@courselit/utils";
import type { SiteInfo, Address, Course, Page } from "@courselit/common-models";
import type { AppState } from "@courselit/state-management";
import dynamic from "next/dynamic";
import BaseLayout from "../../../components/public/base-layout";
import { Link } from "@courselit/components-library";
import { BACK_TO_BLOG } from "../../../ui-config/strings";

const Article = dynamic(() => import("../../../components/public/article"));

interface PostProps {
    siteInfo: SiteInfo;
    address: Address;
    post: Course;
    page: Page;
}

const Post = ({ siteInfo, address, post, page }: PostProps) => {
    const articleOptions = {
        showAttribution: true,
    };

    return (
        <BaseLayout
            title={post.title}
            layout={page.layout}
            childrenOnTop={true}
            socialImage={post.featuredImage}
        >
            {post && (
                <div className="flex flex-col min-h-[80vh] gap-4 mb-8 lg:max-w-[720px] w-full mx-auto">
                    <div className="flex flex-col gap-4 p-4 mt-8">
                        <Article course={post} options={articleOptions} />
                        <div className="">
                            <Link href="/blog" className="hover:underline">
                                {BACK_TO_BLOG}
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </BaseLayout>
    );
};

export async function getServerSideProps({ query, req }: any) {
    const address = getBackendAddress(req.headers);
    const page = await getPage(address, "blog");
    const graphQuery = `
    query {
      post: getCourse(id: "${query.id}") {
          id,
          title,
          description,
          featuredImage {
            file,
            caption
          },
          updatedAt,
          creatorName,
          creatorId,
          slug,
          courseId,
          tags
      }
    }
  `;
    const fetch = new FetchBuilder()
        .setUrl(`${address}/api/graph`)
        .setPayload(graphQuery)
        .setIsGraphQLEndpoint(true)
        .build();

    let post = null;
    try {
        const response = await fetch.exec();
        post = response.post;
    } catch (err) {
        console.error(err);
        return {
            notFound: true,
        };
    }

    return {
        props: {
            post,
            page,
        },
    };
}

const mapStateToProps = (state: AppState) => ({
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(Post);
