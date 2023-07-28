import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { getCsrfToken } from "next-auth/react"
import BaseLayout from "../../components/public/base-layout";
import { LOGIN_SECTION_HEADER } from "../../ui-config/strings";
import { getBackendAddress, getPage } from "../../ui-lib/utils";

export default function SignIn({ page, csrfToken }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
        <BaseLayout layout={page.layout} title={LOGIN_SECTION_HEADER}>
    <form method="post" action="/api/auth/signin/email">
      <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
      <label>
        Email address
        <input type="email" id="email" name="email" />
      </label>
      <button type="submit">Sign in with Email</button>
    </form>
    </BaseLayout>
  )
}

/*
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const csrfToken = await getCsrfToken(context)
  return {
    props: { csrfToken },
  }
}
*/
export async function getServerSideProps(context: any) {
    const { req } = context;
    const address = getBackendAddress(req.headers);
    const page = await getPage(address);
    const csrfToken = await getCsrfToken(context)
    if (!page) {
        return {
            notFound: true,
        };
    }
    return { props: { page, csrfToken } };
}
