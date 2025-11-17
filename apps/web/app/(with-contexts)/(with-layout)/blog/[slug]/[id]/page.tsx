import { Course } from "@courselit/common-models";
import { Caption, Header1, Section } from "@courselit/page-primitives";
import { formattedLocaleDate, getFullSiteSetup } from "@ui-lib/utils";
import { getAddressFromHeaders } from "@/app/actions";
import { headers } from "next/headers";
import { ProductWithAdminProps } from "@/hooks/use-product";
import { FetchBuilder } from "@courselit/utils";
import { Text2 } from "@courselit/page-primitives";
import Link from "next/link";
import { truncate } from "@ui-lib/utils";
import Image from "next/image";
import ClientSideTextRenderer from "./client-side-text-renderer";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@components/ui/breadcrumb";

export default async function ProductPage(props: {
    params: Promise<{ slug: string; id: string }>;
    course: Course;
}) {
    const params = await props.params;
    const address = await getAddressFromHeaders(headers);
    const [product, siteInfo] = await Promise.all([
        getProduct(address, params.id),
        getFullSiteSetup(address),
    ]);
    if (!siteInfo) {
        return null;
    }

    const { theme } = siteInfo;

    if (!product) {
        return <Section theme={theme.theme}>Post not found</Section>;
    }

    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col gap-4 max-w-[640px] mx-auto">
                <Breadcrumb className="mb-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Text2
                                    className="cursor-pointer"
                                    theme={theme.theme}
                                >
                                    <Link href="/blog">Blog</Link>
                                </Text2>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>
                                <Text2 theme={theme.theme}>
                                    {truncate(product?.title, 20)}
                                </Text2>
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <Header1 theme={theme.theme}>{product?.title}</Header1>
                <div className="flex items-center gap-4 mb-6">
                    <Image
                        src={
                            product?.user?.avatar?.file ||
                            "/courselit_backdrop_square.webp"
                        }
                        alt={product?.user?.name || ""}
                        width={32}
                        height={32}
                        className="rounded-full aspect-square"
                    />
                    <div className="flex items-center gap-2">
                        <Text2 theme={theme.theme}>
                            {truncate(product?.user?.name, 50)}
                        </Text2>
                        <Caption theme={theme.theme}>
                            · {formattedLocaleDate(product?.updatedAt, "long")}
                        </Caption>
                    </div>
                </div>
                {product?.featuredImage && (
                    <div className="mb-4 border rounded overflow-hidden">
                        <Image
                            alt={product.featuredImage.caption || ""}
                            src={product.featuredImage.file!}
                            width={640}
                            height={360}
                        />
                    </div>
                )}
                {product?.description && (
                    <ClientSideTextRenderer
                        json={JSON.parse(product.description)}
                        theme={theme.theme}
                    />
                )}
            </div>
        </Section>
    );
}

export const getProduct = async (
    backend: string,
    id: string,
): Promise<ProductWithAdminProps | undefined> => {
    const query = `
        query ($id: String!) {
            course: getCourse(id: $id) {
                title
                description
                type
                slug
                courseId
                featuredImage {
                    file
                    thumbnail
                    caption
                },
                updatedAt
                user {
                    name
                    avatar {
                        file
                        thumbnail
                        caption
                    }
                }
            }
        }
    `;
    const fetch = new FetchBuilder()
        .setUrl(`${backend}/api/graph`)
        .setPayload({ query, variables: { id } })
        .setIsGraphQLEndpoint(true)
        .build();

    try {
        const response = await fetch.exec();
        return response.course;
    } catch (e: any) {
        console.log("Error fetching product", e.message); // eslint-disable-line no-console
    }
};
