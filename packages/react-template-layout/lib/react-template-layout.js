'use strict';

import React from 'react'
import PropTypes from "prop-types";
import { Grid } from '@material-ui/core'

const ReactTemplateLayout = props => {
    const { layout } = props;

    if (!layout) {
        return <>Prop 'layout' is not provided.</>
    }

    const {width, rows} = layout;

    return (
        <>
            {parseBlock({width, rows})}
        </>
    )
}

const parseBlock = ({ width, rows }) => {
    return (
        <Grid container xs={width.xs || 12} sm={width.sm || 12} md={width.md || 12} lg={width.lg || 12} xl={width.xl || 12}>
            {parseRows(rows)}
        </Grid>
    );
}

const parseRows = rows => {
    const parsedRows = []

    for (let row of rows) {
        if (Array.isArray(row)) {
            const parsedRow = []

            for (let item of row) {
                parsedRow.push(
                    parseBlock({
                        width: item.width,
                        rows: item.rows
                    })
                )
            }

            parsedRows.push(
                <Grid item>
                    {parsedRow}
                </Grid>
            )
        } else {
            parsedRows.push(
                <Grid item>
                    {React.createElement(row)}
                </Grid>
            )
        }
    }

    return parsedRows;
}

ReactTemplateLayout.propTypes = {
    layout: PropTypes.arrayOf(PropTypes.object).isRequired
}

export default ReactTemplateLayout;
