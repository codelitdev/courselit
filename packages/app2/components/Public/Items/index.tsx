import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { networkAction } from "../../../state/actions";
import FetchBuilder from "../../../ui-lib/fetch";
import { Grid, Button } from "@mui/material";
import { BTN_LOAD_MORE } from "../../../ui-config/strings";
import Post from "./Post";
import Course from "./Course";
import { AppDispatch } from "../../../state/store";
import State from "../../../ui-models/state";
import Address from "../../../ui-models/address";

interface ListProps {
  generateQuery: (...args: any[]) => void;
  initialItems: any[];
  showLoadMoreButton: boolean;
  dispatch: AppDispatch;
  posts: boolean;
  address: Address;
};

const List = (props: ListProps) => {
  const [courses, setCourses] = useState(props.initialItems || []);
  const [offset, setOffset] = useState(2);
  const [shouldShowLoadMoreButton, setShouldShowLoadMoreButton] = useState(
    typeof props.showLoadMoreButton === "boolean"
      ? props.showLoadMoreButton
      : false
  );
  const { generateQuery } = props;
  const posts = typeof props.posts === "boolean" ? props.posts : false;

  useEffect(() => {
    getPosts();
  }, [offset]);

  const getPosts = async () => {
    try {
      props.dispatch && props.dispatch(networkAction(true));
      const fetch = new FetchBuilder()
        .setUrl(`${props.address.backend}/graph`)
        .setPayload(generateQuery(offset))
        .setIsGraphQLEndpoint(true)
        .build();
      const response = await fetch.exec();
      if (response.courses) {
        if (response.courses.length > 0) {
          setCourses([...courses, ...response.courses]);
        } else {
          setShouldShowLoadMoreButton(false);
        }
      }
    } finally {
      props.dispatch && props.dispatch(networkAction(false));
    }
  };

  return courses.length > 0 ? (
    <>
      <Grid container justifyContent="space-between" spacing={2}>
        {courses.map((x, index) =>
          posts ? <Post key={index} {...x} /> : <Course key={index} {...x} />
        )}
      </Grid>
      {shouldShowLoadMoreButton && courses.length > 0 && (
        <Grid item xs={12}>
          <Button
            variant="outlined"
            disableElevation
            onClick={() => setOffset(offset + 1)}
          >
            {BTN_LOAD_MORE}
          </Button>
        </Grid>
      )}
    </>
  ) : (
    <></>
  );
};

const mapStateToProps = (state: State) => ({
  address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(List);
