import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import BaseLayout from "../../components/public/base-layout";
import { LOGIN_SECTION_HEADER, SIGNIN_SUCCESS_PREFIX } from "../../ui-config/strings";
import { getBackendAddress, getPage } from "../../ui-lib/utils";

export default function VerifyRequest({ page }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
        <BaseLayout layout={page.layout} title={LOGIN_SECTION_HEADER}>
        <p>{SIGNIN_SUCCESS_PREFIX}</p>
    </BaseLayout>
  )
}

export async function getServerSideProps(context: any) {
    const { req } = context;
    const address = getBackendAddress(req.headers);
    const page = await getPage(address);
    if (!page) {
        return {
            notFound: true,
        };
    }
    return { props: { page } };
}
