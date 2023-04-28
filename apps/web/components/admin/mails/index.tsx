import React, { ChangeEvent, useEffect, useState } from "react";
import { Address, Auth, AppMessage, Profile } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import TablePagination from "@mui/material/TablePagination";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import {
    BTN_NEW_MAIL,
    MAIL_TABLE_HEADER_STATUS,
    PAGE_HEADER_ALL_MAILS,
    MAIL_TABLE_HEADER_SUBJECT,
    PAGE_PLACEHOLDER_MAIL,
    MAIL_TABLE_HEADER_RECEPIENTS,
    MAIL_TABLE_HEADER_SENDER,
} from "../../../ui-config/strings";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import Paper from "@mui/material/Paper";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Link from "next/link";
import { Button, Chip } from "@mui/material";
import { Done } from "@mui/icons-material";
import { useRouter } from "next/router";
import { ThunkDispatch } from "redux-thunk";
const { networkAction } = actionCreators;

interface MailsProps {
    auth: Auth;
    address: Address;
    profile: Profile;
    dispatch: AppDispatch;
    featureFlags: string[];
}

function Mails({ auth, address, profile, dispatch, featureFlags }: MailsProps) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [count, setCount] = useState(0);
    const [mails, setMails] = useState([]);
    const router = useRouter();

    const handlePageChange = (
        e: MouseEvent<HTMLButtonElement> | null,
        newPage: number
    ) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    useEffect(() => {
        loadMailsCount();
    }, []);

    useEffect(() => {
        loadMails();
    }, [page, rowsPerPage]);

    useEffect(() => {
        if (!featureFlags.includes("mail")) {
            router.replace("/dashboard");
        }
    }, [featureFlags]);

    const loadMails = async () => {
        const query = `
            query {
                mails: getMails(searchData: {
                    offset: ${page + 1},
                    rowsPerPage: ${rowsPerPage}
                }) {
                    mailId,
                    to,
                    subject,
                    body,
                    published,
                    user {
                        userId,
                        email,
                        name
                    }
                },
                count: getMailsCount
            }`;

        const fetcher = fetch.setPayload(query).build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.mails) {
                setMails(response.mails);
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const loadMailsCount = async () => {
        const query = `
            query {
                count: getMailsCount
            }`;

        const fetcher = fetch.setPayload(query).build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.count) {
                setCount(response.count);
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    const createMail = async () => {
        const mutation = `
            mutation {
                mail: createMail {
                    mailId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(true)
            );
            const response = await fetch.exec();
            if (response.mail && response.mail.mailId) {
                router.push(`/dashboard/mails/${response.mail.mailId}/edit`);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(false)
            );
        }
    };

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 2 }}>
                <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Grid item>
                        <Typography variant="h1">
                            {PAGE_HEADER_ALL_MAILS}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Button variant="contained" onClick={createMail}>
                            {BTN_NEW_MAIL}
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
            {mails.length === 0 && (
                <Grid item>
                    <Typography color="secondary">
                        {PAGE_PLACEHOLDER_MAIL}
                    </Typography>
                </Grid>
            )}
            {mails.length > 0 && (
                <>
                    <Grid item xs={12} component={Paper}>
                        <TableContainer>
                            <Table aria-label="Mails" sx={{ minWidth: "100%" }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            {MAIL_TABLE_HEADER_SUBJECT}
                                        </TableCell>
                                        <TableCell align="right">
                                            {MAIL_TABLE_HEADER_SENDER}
                                        </TableCell>
                                        <TableCell align="right">
                                            {MAIL_TABLE_HEADER_RECEPIENTS}
                                        </TableCell>
                                        <TableCell align="right">
                                            {MAIL_TABLE_HEADER_STATUS}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {mails.map((mail: Mail) => (
                                        <Link
                                            href={`/dashboard/mails/${mail.mailId}/edit`}
                                            key={mail.mailId}
                                        >
                                            <TableRow
                                                hover
                                                sx={{ cursor: "pointer" }}
                                            >
                                                <TableCell
                                                    component="th"
                                                    scope="row"
                                                >
                                                    {mail.subject}
                                                </TableCell>
                                                <TableCell
                                                    component="th"
                                                    align="right"
                                                    scope="row"
                                                >
                                                    <Link
                                                        href={`/dashboard/users/${mail.user.userId}`}
                                                    >
                                                        {mail.user.name ||
                                                            mail.user.email}
                                                    </Link>
                                                    {mail.user.userId ===
                                                        profile.userId && (
                                                        <Typography variant="subtitle2">
                                                            (You)
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    scope="row"
                                                >
                                                    {mail.to.length}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    scope="row"
                                                >
                                                    {mail.published && (
                                                        <Chip
                                                            icon={<Done />}
                                                            label="Sent"
                                                            size="small"
                                                            color="success"
                                                        />
                                                    )}
                                                    {!mail.published && (
                                                        <Chip
                                                            label="Draft"
                                                            size="small"
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </Link>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={count}
                            page={page}
                            onPageChange={handlePageChange}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleRowsPerPageChange}
                        />
                    </Grid>
                </>
            )}
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
    profile: state.profile,
    featureFlags: state.featureFlags,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Mails);
