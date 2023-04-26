import React, { ChangeEvent, useEffect, useState } from "react";
import { Address, Auth, AppMessage } from "@courselit/common-models";
import { Section } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import TablePagination from "@mui/material/TablePagination";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { PAGE_HEADER_ALL_MAILS } from "../../../ui-config/strings";
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
import { Chip } from "@mui/material";
import { Done } from "@mui/icons-material";
const { networkAction } = actionCreators;

interface MailsProps {
    auth: Auth;
    address: Address;
    dispatch: AppDispatch;
}

function Mails({ auth, address, dispatch }: MailsProps) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [mails, setMails] = useState([]);

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
        loadMails();
    }, [page]);

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
                    published
                }
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

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    return (
        <Grid container>
            <Grid item xs={12}>
                <Section>
                    <Grid container direction="column">
                        <Grid item>
                            <Typography variant="h1">
                                {PAGE_HEADER_ALL_MAILS}
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <TableContainer component={Paper}>
                                <Table sx={{ minWidth: "100%" }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Subject</TableCell>
                                            <TableCell align="right">
                                                # Recepients
                                            </TableCell>
                                            <TableCell align="right">
                                                Status
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
                        </Grid>
                        <Grid item>
                            <TablePagination
                                component="div"
                                count={100}
                                page={page}
                                onPageChange={handlePageChange}
                                rowsPerPage={rowsPerPage}
                                onRowsPerPageChange={handleRowsPerPageChange}
                            />
                        </Grid>
                    </Grid>
                </Section>
            </Grid>
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Mails);
