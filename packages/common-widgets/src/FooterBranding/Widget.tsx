import * as React from 'react'
import { connect } from 'react-redux';
import { WidgetProps, AppState } from '@courselit/components-library';
import { Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

const useStyles = makeStyles((theme: any) => ({
    container: {
        padding: theme.spacing(2)
    }
}));

export interface FooterBrandingWidgetProps extends WidgetProps {
    siteInfo: any
}

const Widget = (props: FooterBrandingWidgetProps) => {
    const classes = useStyles();
    const { siteInfo } = props;

    return (
        <Grid item xs className={classes.container}>
            <Typography variant="h5">{siteInfo.title}</Typography>
            <Typography variant="subtitle2">{siteInfo.subtitle}</Typography>
        </Grid>
    )
}

const mapStateToProps = (state: AppState) => ({
    siteInfo: state.siteinfo
});

export default connect(mapStateToProps)(Widget);