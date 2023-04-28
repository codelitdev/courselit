import { Section } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { actionCreators } from "@courselit/state-management";
import {
    debounce,
    FetchBuilder,
    getGraphQLQueryStringFromObject,
} from "@courselit/utils";
import {
    Address,
    AppMessage,
    Mail,
    UIConstants,
} from "@courselit/common-models";
import { connect } from "react-redux";
import {
    BTN_SEND,
    BTN_SENDING,
    MAIL_BODY_PLACEHOLDER,
    MAIL_SUBJECT_PLACEHOLDER,
    MAIL_TO_PLACEHOLDER,
    PAGE_HEADER_ALL_MAILS,
    PAGE_HEADER_EDIT_MAIL,
    TOAST_MAIL_SENT,
} from "../../../ui-config/strings";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import Link from "next/link";
const { networkAction } = actionCreators;

interface MailEditorProps {
    id: string;
    address: Address;
    dispatch: AppDispatch;
}

function MailEditor({ id, address, dispatch }: MailEditorProps) {
    const [mail, setMail] = useState<Mail>({
        mailId: null,
        to: "",
        subject: "",
        body: "",
        published: false,
    });
    const [sending, setSending] = useState(false);
    const debouncedSave = debounce(async () => await saveMail(), 1000);

    useEffect(() => {
        loadMail();
    }, []);

    useEffect(() => {
        if (!mail.mailId) return;

        debouncedSave();
    }, [mail]);

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    const loadMail = async () => {
        const query = `
            query {
                mail: getMail(mailId: "${id}") {
                    mailId,
                    to,
                    subject,
                    body,
                    published
                }
            }`;

        const fetcher = fetch.setPayload(query).build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.mail) {
                setMail({
                    mailId: response.mail.mailId,
                    to: response.mail.to || "",
                    subject: response.mail.subject || "",
                    body: response.mail.body || "",
                    published: response.mail.published || false,
                });
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const saveMail = async () => {
        const mutation = `
            mutation {
                mail: updateMail(mailData: ${getGraphQLQueryStringFromObject(
                    Object.assign({}, mail, { published: undefined })
                )}) {
                    mailId,
                }
            }`;

        const fetcher = fetch.setPayload(mutation).build();

        try {
            dispatch(networkAction(true));
            await fetcher.exec();
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onChange = (key: string, value: string) => {
        setMail(
            Object.assign({}, mail, {
                [key]: value,
            })
        );
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const mutation = `
            mutation {
                mail: sendMail(mailId: "${id}") {
                    mailId,
                    to,
                    subject,
                    body,
                    published
                }
            }`;

        const fetcher = fetch.setPayload(mutation).build();

        try {
            dispatch(networkAction(true));
            setSending(true);
            const response = await fetcher.exec();
            if (response.mail) {
                setMail(response.mail);
            }
            dispatch(setAppMessage(new AppMessage(TOAST_MAIL_SENT)));
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
            setSending(false);
        }
    };

    if (!mail.mailId) {
        return <Section></Section>;
    }

    return (
        <Section>
            <Grid
                container
                direction="column"
                component="form"
                onSubmit={onSubmit}
            >
                <Grid item sx={{ mb: 2 }}>
                    <Breadcrumbs aria-label="breakcrumb">
                        <Link href="/dashboard/mails">
                            <MuiLink
                                color="inherit"
                                underline="hover"
                                sx={{ cursor: "pointer" }}
                            >
                                {PAGE_HEADER_ALL_MAILS}
                            </MuiLink>
                        </Link>
                        <Typography color="text.primary">
                            {PAGE_HEADER_EDIT_MAIL}
                        </Typography>
                    </Breadcrumbs>
                </Grid>
                <Grid item sx={{ mb: 2 }}>
                    <Typography variant="h1">
                        {PAGE_HEADER_EDIT_MAIL}
                    </Typography>
                </Grid>
                <Grid item sx={{ mb: 2 }}>
                    <TextField
                        value={mail.to.join(", ")}
                        multiline
                        rows={2}
                        fullWidth
                        label={MAIL_TO_PLACEHOLDER}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onChange(
                                "to",
                                e.target.value.split(
                                    UIConstants.MAIL_RECIPIENTS_SPLIT_REGEX
                                )
                            )
                        }
                        disabled={mail.published}
                    />
                </Grid>
                <Grid item sx={{ mb: 2 }}>
                    <TextField
                        value={mail.subject}
                        fullWidth
                        label={MAIL_SUBJECT_PLACEHOLDER}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onChange("subject", e.target.value)
                        }
                        disabled={mail.published}
                    />
                </Grid>
                <Grid item sx={{ mb: 2 }}>
                    <TextField
                        value={mail.body}
                        multiline
                        row={5}
                        fullWidth
                        label={MAIL_BODY_PLACEHOLDER}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onChange("body", e.target.value)
                        }
                        disabled={mail.published}
                    />
                </Grid>
                {!mail.published && (
                    <Grid item>
                        <Button
                            variant="contained"
                            disabled={
                                mail.to.length < 1 ||
                                !mail.subject ||
                                !mail.body ||
                                sending
                            }
                            type="submit"
                        >
                            {sending ? BTN_SENDING : BTN_SEND}
                        </Button>
                    </Grid>
                )}
            </Grid>
        </Section>
    );
}

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(MailEditor);
