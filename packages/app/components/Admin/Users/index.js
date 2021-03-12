import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Grid, Typography, Button } from "@material-ui/core";
import {
  USERS_MANAGER_PAGE_HEADING,
  LOAD_MORE_TEXT,
} from "../../../config/strings.js";
import UserDetails from "./UserDetails.js";
import FetchBuilder from "../../../lib/fetch.js";
import { connect } from "react-redux";
import { addressProps, authProps } from "../../../types.js";
import { networkAction } from "../../../redux/actions.js";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  header: {
    marginBottom: theme.spacing(1),
  },
}));

const UsersManager = ({ auth, address, dispatch }) => {
  const [, setUsersSummary] = useState({
    count: 0,
    verified: 0,
    admins: 0,
    creators: 0,
  });
  const [usersPaginationOffset, setUsersPaginationOffset] = useState(1);
  const [users, setUsers] = useState([]);
  // const [searchText, setSearchText] = useState("");
  const classes = useStyles();

  useEffect(() => {
    loadUsersSummary();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [usersPaginationOffset]);

  const loadUsersSummary = async () => {
    const query = `
    query {
      summary: getUsersSummary {
        count,
        verified,
        admins,
        creators
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      const response = await fetch.exec();
      if (response.summary) {
        setUsersSummary({
          count: response.summary.count,
          verified: response.summary.verified,
          admins: response.summary.admins,
          creators: response.summary.creators,
        });
      }
    } catch (err) {}
  };

  const loadUsers = async () => {
    const query = `
    query c {
      users: getSiteUsers(searchData: {
        offset: ${usersPaginationOffset}
      }) {
        id,
        email,
        name,
        verified,
        isCreator,
        isAdmin,
        avatar,
        purchases,
        active
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.users && response.users.length > 0) {
        setUsers([...users, ...response.users]);
      }
    } catch (err) {
    } finally {
      dispatch(networkAction(false));
    }
  };

  const onLoadMoreClick = () =>
    setUsersPaginationOffset(usersPaginationOffset + 1);

  return (
    <Grid container direction="column">
      <Grid
        item
        container
        direction="row"
        justify="space-between"
        alignItems="center"
        className={classes.header}
      >
        <Grid item xs={12} sm={8}>
          <Typography variant="h1">{USERS_MANAGER_PAGE_HEADING}</Typography>
        </Grid>
        {/* <Grid item xs={12} sm={4}>
          <form onSubmit={handleSearch}>
            <TextField
              value={searchText}
              variant="outlined"
              label=""
              fullWidth
              margin="normal"
              placeholder={`Search in ${usersSummary.count} users`}
              onChange={e => setSearchText(e.target.value)}
            />
          </form>
        </Grid> */}
      </Grid>
      <Grid item>
        {users.map((user) => (
          <UserDetails user={user} key={user.id} />
        ))}
      </Grid>
      <Grid item>
        <Button onClick={onLoadMoreClick}>{LOAD_MORE_TEXT}</Button>
      </Grid>
    </Grid>
  );
};

UsersManager.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(UsersManager);
