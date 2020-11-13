import * as React from 'react'
import { connect } from 'react-redux';
import { WidgetProps, AppState } from '@courselit/components-library';
import { Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

const useStyles = makeStyles((theme: any) => ({
    container: {
        padding: theme.spacing(2)
    }
}));

const Widget = (props: WidgetProps) => {
    const classes = useStyles();

    return (
        <Grid item xs className={classes.container}>
            Footer menu
        </Grid>
    )
}

const mapStateToProps = (state: AppState) => ({});

export default connect(mapStateToProps)(Widget);