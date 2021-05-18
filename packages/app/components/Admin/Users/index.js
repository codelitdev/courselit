import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Button, GridListTileBar } from "@material-ui/core";
import {
  USERS_MANAGER_PAGE_HEADING,
  LOAD_MORE_TEXT,
  HEADER_EDITING_USER,
  SWITCH_IS_ADMIN,
  SWITCH_IS_CREATOR,
} from "../../../config/strings.js";
import FetchBuilder from "../../../lib/fetch.js";
import { connect } from "react-redux";
import { addressProps, authProps } from "../../../types.js";
import { networkAction } from "../../../redux/actions.js";
import { OverviewAndDetail } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { makeStyles } from "@material-ui/styles";
const Img = dynamic(() => import("../../Img"));
const Details = dynamic(() => import("./Details.js"));

const useStyles = makeStyles((theme) => ({
  btn: {
    width: "100%",
    height: "100%",
  },
}));

const UsersManager = ({ auth, address, dispatch }) => {
  // const [, setUsersSummary] = useState({
  //   count: 0,
  //   verified: 0,
  //   admins: 0,
  //   creators: 0,
  // });
  const [usersPaginationOffset, setUsersPaginationOffset] = useState(1);
  const [users, setUsers] = useState([]);
  const [componentsMap, setComponentsMap] = useState([]);
  const classes = useStyles();
  // const [searchText, setSearchText] = useState("");

  // useEffect(() => {
  //   loadUsersSummary();
  // }, []);

  useEffect(() => {
    loadUsers();
  }, [usersPaginationOffset]);

  // const loadUsersSummary = async () => {
  //   const query = `
  //   query {
  //     summary: getUsersSummary {
  //       count,
  //       verified,
  //       admins,
  //       creators
  //     }
  //   }
  //   `;
  //   const fetch = new FetchBuilder()
  //     .setUrl(`${address.backend}/graph`)
  //     .setPayload(query)
  //     .setIsGraphQLEndpoint(true)
  //     .setAuthToken(auth.token)
  //     .build();
  //   try {
  //     const response = await fetch.exec();
  //     if (response.summary) {
  //       setUsersSummary({
  //         count: response.summary.count,
  //         verified: response.summary.verified,
  //         admins: response.summary.admins,
  //         creators: response.summary.creators,
  //       });
  //     }
  //   } catch (err) {}
  // };

  const loadUsers = async () => {
    const query = `
    query {
      users: getSiteUsers(searchData: {
        offset: ${usersPaginationOffset}
      }) {
        id,
        name,
        userId,
        email
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
        setUsersPaginationOffset(usersPaginationOffset + 1);
      }
    } catch (err) {
    } finally {
      dispatch(networkAction(false));
    }
  };

  useEffect(() => {
    const map = [];
    users.map((user) => {
      map.push(getComponent(user));
    });
    map.push({
      Overview: (
        <Button variant="contained" className={classes.btn} onClick={loadUsers}>
          {LOAD_MORE_TEXT}
        </Button>
      ),
    });
    setComponentsMap(map);
  }, [usersPaginationOffset]);

  const getComponent = (user) => ({
    subtitle: HEADER_EDITING_USER,
    Overview: (
      <>
        <Img src={""} isThumbnail={true} />
        <GridListTileBar
          title={user.name ? user.name : user.email}
          subtitle={
            user.isAdmin
              ? SWITCH_IS_ADMIN
              : user.isCreator
              ? SWITCH_IS_CREATOR
              : ""
          }
        />
      </>
    ),
    Detail: <Details userId={user.userId} />,
  });

  return (
    <OverviewAndDetail
      title={USERS_MANAGER_PAGE_HEADING}
      componentsMap={componentsMap}
    />
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
