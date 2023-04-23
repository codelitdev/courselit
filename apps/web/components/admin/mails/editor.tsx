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
import { Address, AppMessage, Mail } from "@courselit/common-models";
import { connect } from "react-redux";
import {
    BTN_SEND,
    GENERIC_FAILURE_MESSAGE,
    MAIL_BODY_PLACEHOLDER,
    MAIL_SUBJECT_PLACEHOLDER,
    MAIL_TO_PLACEHOLDER,
    PAGE_HEADER_ALL_MAILS,
    PAGE_HEADER_EDIT_MAIL,
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
    });
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
                    body
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
                });
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const checkFirstLoad = () => !mail.subject && !mail.body && !mail.to;

    const saveMail = async () => {
        const mutation = `
            mutation {
                mail: updateMail(mailData: ${getGraphQLQueryStringFromObject(
                    mail
                )}) {
                    mailId,
                    to,
                    subject,
                    body
                }
            }`;

        const fetcher = fetch.setPayload(mutation).build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(GENERIC_FAILURE_MESSAGE)));
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

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
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
                            <MuiLink color="inherit" underline="hover">
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
                            onChange("to", e.target.value.split(/,\s*/))
                        }
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
                    />
                </Grid>
                <Grid item>
                    <Button
                        variant="contained"
                        disabled={
                            mail.to.length < 1 || !mail.subject || !mail.body
                        }
                        type="submit"
                    >
                        {BTN_SEND}
                    </Button>
                </Grid>
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
