import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { headers } from "next/headers";
import { getAddressFromHeaders } from "@/app/actions";
import { FetchBuilder } from "@courselit/utils";
import { error } from "@/services/logger";
import type { RuntimeLoginProvider } from "@/lib/login-providers";

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
            loginProviders={await getExternalLoginProviders(address)}
        />
    );
}

export const getExternalLoginProviders = async (
    backend: string,
): Promise<RuntimeLoginProvider[]> => {
    const query = `
        query { 
            loginProviders: getExternalLoginProviders {
                key
                providerId
                label
                buttonText
                authType
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
        return response.loginProviders || [];
    } catch (e: any) {
        error(`Error in fetching login providers`, {
            stack: e.stack,
        });
        return [];
    }
};
