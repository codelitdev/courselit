import React, { useState, useRef, useEffect } from "react";
import { styled } from "@mui/material/styles";
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  capitalize,
} from "@mui/material";
import {
  LABEL_NAVIGATION_LINK_TEXT,
  LABEL_NAVIGATION_LINK_DESTINATION,
  LINK_DROPDOWN,
  LABEL_NAVIGATION_LINK_NEWTAB,
} from "../../../../ui-config/strings";
import {
  NAVIGATION_CATEGORY_MAIN,
  NAVIGATION_CATEGORY_FOOTER,
} from "../../../../ui-config/constants";
import { Done, Delete } from "@mui/icons-material";
import { connect } from "react-redux";
import FetchBuilder from "../../../../ui-lib/fetch";
import { networkAction, setAppMessage } from "../../../../state/actions";
import AppMessage from "../../../../ui-models/app-message";
import type { RootState } from "../../../../state/store";
import type { ThunkDispatch } from "redux-thunk";
import type Address from "../../../../ui-models/address";
import type { AnyAction } from "redux";
import type Auth from "../../../../ui-models/auth";
import type UILink from "../../../../ui-models/link";

const PREFIX = "NavigationLinkItem";

const classes = {
  formControl: `${PREFIX}-formControl`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
  [`& .${classes.formControl}`]: {
    minWidth: "100%",
    marginTop: theme.spacing(1),
  },
}));

interface NavigationLinkItemProps {
  link: UILink;
  auth: Auth;
  dispatch: ThunkDispatch<RootState, null, AnyAction>;
  index: number;
  removeItem: (...args: any[]) => void;
  address: Address;
}

const NavigationLinkItem = (props: NavigationLinkItemProps) => {
  const [link, setLink] = useState<UILink>(props.link);
  const inputLabel = useRef(null);
  const [labelWidth, setLabelWidth] = React.useState<number>(0);

  const [dirty, setDirty] = useState(false);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const fetcher = new FetchBuilder()
    .setUrl(`${props.address.backend}/api/graph`)
    .setIsGraphQLEndpoint(true);

  useEffect(() => {
    setLabelWidth(inputLabel.current ? inputLabel.current.offsetWidth : 0);
  }, [props.link]);

  const updateLinkData = (name: string, value: string | boolean) => {
    setLink(
      Object.assign({}, link, {
        [name]: value,
      })
    );
    setDirty(true);
  };

  const isLinkDataValid = () => {
    return link.text && link.destination && link.category;
  };

  const saveLink = async () => {
    const fetch = fetcher.setPayload(getGraphQLMutationString()).build();

    props.dispatch(networkAction(true));
    setRequestInProgress(true);

    try {
      const response = await fetch.exec();
      if (response.link) {
        setDirty(false);
      }
    } catch (e: any) {
      props.dispatch(setAppMessage(new AppMessage(e.message)));
    } finally {
      props.dispatch(networkAction(false));
      setRequestInProgress(false);
    }
  };

  const getGraphQLMutationString = () => {
    if (props.link.id) {
      return `
        mutation {
            link: saveLink(linkData: {
                id: "${props.link.id}",
                text: "${link.text}",
                destination: "${link.destination}",
                category: "${link.category}",
                newTab: ${link.newTab}
            }) {
                text,
                destination,
                category,
                newTab
            }
        }
        `;
    } else {
      return `
        mutation a {
            link: saveLink(linkData: {
                text: "${link.text}",
                destination: "${link.destination}",
                category: "${link.category}",
                newTab: ${link.newTab}
            }) {
                text,
                destination,
                category,
                newTab
            }
        }
        `;
    }
  };

  const deleteLink = async () => {
    if (link.id) {
      await deleteLinkFromServer();
    }

    props.removeItem(props.index);
  };

  const deleteLinkFromServer = async () => {
    const mutation = `
        mutation d {
            deleteLink(id: "${link.id}")
        }
        `;
    const fetch = fetcher.setPayload(mutation).build();

    props.dispatch(networkAction(true));
    setRequestInProgress(true);

    try {
      await fetch.exec();
    } catch (e: any) {
      props.dispatch(setAppMessage(new AppMessage(e.message)));
    } finally {
      props.dispatch(networkAction(false));
      setRequestInProgress(false);
    }
  };

  return (
    <StyledGrid item container direction="row" spacing={1} alignItems="center">
      <Grid item xs={12} sm={12} md={3}>
        <TextField
          variant="outlined"
          label={LABEL_NAVIGATION_LINK_TEXT}
          fullWidth
          margin="normal"
          type="text"
          value={link.text}
          onChange={(e) => updateLinkData("text", e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={12} md={3}>
        <TextField
          variant="outlined"
          label={LABEL_NAVIGATION_LINK_DESTINATION}
          fullWidth
          margin="normal"
          type="text"
          value={link.destination}
          onChange={(e) => updateLinkData("destination", e.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={12} md={2}>
        <FormControl variant="outlined" className={classes.formControl}>
          <InputLabel ref={inputLabel} id="select-type">
            {LINK_DROPDOWN}
          </InputLabel>
          <Select
            labelId="select-type"
            value={link.category}
            onChange={(e) => updateLinkData("category", e.target.value)}
            labelWidth={labelWidth}
            inputProps={{
              name: "category",
            }}
          >
            <MenuItem value={NAVIGATION_CATEGORY_MAIN}>
              {capitalize(NAVIGATION_CATEGORY_MAIN)}
            </MenuItem>
            <MenuItem value={NAVIGATION_CATEGORY_FOOTER}>
              {capitalize(NAVIGATION_CATEGORY_FOOTER)}
            </MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={12} md={2}>
        <FormControl className={classes.formControl}>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={link.newTab}
                  onChange={(e) => updateLinkData("newTab", e.target.checked)}
                />
              }
              label={LABEL_NAVIGATION_LINK_NEWTAB}
            />
          </FormGroup>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={12} md={1}>
        {dirty && isLinkDataValid() && (
          <IconButton
            onClick={saveLink}
            disabled={requestInProgress}
            size="large"
          >
            <Done />
          </IconButton>
        )}
      </Grid>
      <Grid item xs={12} sm={12} md={1}>
        <IconButton
          onClick={deleteLink}
          disabled={requestInProgress}
          size="large"
        >
          <Delete />
        </IconButton>
      </Grid>
    </StyledGrid>
  );
};

const mapStateToProps = (state: RootState) => ({
  auth: state.auth,
  networkAction: state.networkAction,
  address: state.address,
});

const mapDispatchToProps = (dispatch: any) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(NavigationLinkItem);
