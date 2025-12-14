import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { headers } from "next/headers";
import { getAddressFromHeaders } from "@/app/actions";
import { FetchBuilder } from "@courselit/utils";
import { error } from "@/services/logger";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const headersList = await headers();
    const session = await auth.api.getSession({
        headers: headersList,
    });

    const redirectTo = (await searchParams).redirect as string | undefined;
    const address = await getAddressFromHeaders(headers);

    if (session) {
        redirect(redirectTo || "/dashboard");
    }

    return (
        <LoginForm
            redirectTo={redirectTo}
            ssoProvider={await getSSOProvider(address)}
        />
    );
}

export const getSSOProvider = async (
    backend: string,
): Promise<
    | {
          providerId: string;
          domain: string;
      }
    | undefined
> => {
    const query = `
        query { 
            ssoProvider: getSSOProvider {
                providerId
                domain
            }
        }
        `;
    const fetch = new FetchBuilder()
        .setUrl(`${backend}/api/graph`)
        .setPayload({ query })
        .setIsGraphQLEndpoint(true)
        .build();

    try {
        const response = await fetch.exec();
        return response.ssoProvider;
    } catch (e: any) {
        error(`Error in fetching SSO provider`, {
            stack: e.stack,
        });
    }
};
