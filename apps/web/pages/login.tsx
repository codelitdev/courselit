import { useState } from "react";
import {
    BTN_LOGIN,
    LOGIN_SECTION_HEADER,
    BTN_LOGIN_GET_CODE,
    BTN_LOGIN_CODE_INTIMATION,
    LOGIN_NO_CODE,
    BTN_LOGIN_NO_CODE,
    LOGIN_FORM_LABEL,
    LOGIN_FORM_DISCLAIMER,
    LOADING,
    LOGIN_SUCCESS,
} from "../ui-config/strings";
import { useRouter } from "next/router";
import type { Address, Auth, State } from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import { connect } from "react-redux";
import { AppDispatch } from "@courselit/state-management";
import BaseLayout from "../components/public/base-layout";
import { getBackendAddress, getPage } from "../ui-lib/utils";
import { Form, FormField, FormSubmit } from "@courselit/components-library";
import { signIn } from "next-auth/react";
import { FormEvent } from "react";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import Link from "next/link";
import { useEffect } from "react";

interface LoginProps {
    email: string;
    error: any;
    address: Address;
    auth: Auth;
    dispatch: AppDispatch;
    progress: boolean;
    page: {
        layout: Record<string, unknown>[];
    };
}

const Login = ({ page, auth, dispatch }: LoginProps) => {
    const [showCode, setShowCode] = useState(false);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!auth.guest) {
            const { query } = router;
            query.redirect
                ? router.push(`${query.redirect}`)
                : router.push("/");
        }
    });

    useEffect(() => {
        if (!auth.guest) {
            const { query } = router;
            query.redirect
                ? router.push(`${query.redirect}`)
                : router.push("/");
        }
    });

    const requestCode = async function (e: FormEvent) {
        e.preventDefault();
        const url = `/api/auth/code/generate?email=${encodeURIComponent(
            email,
        )}`;
        try {
            setLoading(true);
            const response = await fetch(url);
            const resp = await response.json();
            if (response.ok) {
                setShowCode(true);
            } else {
                dispatch(setAppMessage(new AppMessage(resp.error)));
            }
        } finally {
            setLoading(false);
        }
    };

    const signInUser = async function (e: FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await signIn("credentials", {
                email,
                code,
                redirect: false,
            });
            if (response?.error) {
                setError(`Can't sign you in at this time`);
            } else {
                dispatch(setAppMessage(new AppMessage(LOGIN_SUCCESS)));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseLayout title={LOGIN_SECTION_HEADER} layout={page.layout}>
            <div className="flex justify-center grow items-center px-4 mx-auto lg:max-w-[1200px] w-full">
                <div className="flex flex-col">
                    {error && (
                        <div className="bg-red-500 text-white px-2 py-1 rounded-md mb-4">
                            <p>{error}</p>
                        </div>
                    )}
                    {!showCode && (
                        <div>
                            <p className="mb-4">{LOGIN_FORM_LABEL}</p>
                            <Form
                                onSubmit={requestCode}
                                className="flex flex-col gap-4"
                            >
                                <FormField
                                    type="email"
                                    value={email}
                                    placeholder="Enter your email"
                                    required={true}
                                    onChange={(e) => setEmail(e.target.value)}
                                />

                                <p className="text-center text-xs text-slate-500">
                                    {LOGIN_FORM_DISCLAIMER}
                                    <Link href="/p/terms">
                                        <span className="underline">Terms</span>
                                    </Link>
                                </p>
                                <div className="flex justify-center">
                                    <FormSubmit
                                        text={
                                            loading
                                                ? LOADING
                                                : BTN_LOGIN_GET_CODE
                                        }
                                        disabled={loading}
                                    />
                                </div>
                            </Form>
                        </div>
                    )}
                    {showCode && (
                        <div>
                            <p className="mb-4">
                                {BTN_LOGIN_CODE_INTIMATION}{" "}
                                <strong>{email}</strong>
                            </p>
                            <Form
                                className="flex flex-col gap-4 mb-4"
                                onSubmit={signInUser}
                            >
                                <FormField
                                    type="text"
                                    value={code}
                                    placeholder="Code"
                                    required={true}
                                    onChange={(e) => setCode(e.target.value)}
                                />
                                <div className="flex justify-center">
                                    <FormSubmit
                                        text={loading ? LOADING : BTN_LOGIN}
                                        disabled={loading}
                                    />
                                </div>
                            </Form>
                            <div className="flex justify-center items-center gap-1 text-sm">
                                <p className="text-slate-500">
                                    {LOGIN_NO_CODE}
                                </p>
                                <button
                                    onClick={requestCode}
                                    className="underline"
                                    disabled={loading}
                                >
                                    {loading ? LOADING : BTN_LOGIN_NO_CODE}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseLayout>
    );
};

const mapStateToProps = (state: State) => ({
    auth: state.auth,
    address: state.address,
    progress: state.networkAction,
});

const mapDispatchToProps = (dispatch: any) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Login);

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
