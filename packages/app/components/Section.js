import React from 'react';
import { connect } from "react-redux"
import { Grid } from '@material-ui/core';
import ComponentFromComponentsMap from './ComponentFromComponentsMap';

const Section = (props) => {
    const { name, layout } = props
    const sectionLayout = layout[name]

    return sectionLayout.length ? (
        <Grid container item direction='column'>
            {props.layout.top.map((item, index) => (
            <Grid item key={index}>
                <ComponentFromComponentsMap name={item} />
            </Grid>
            ))}
        </Grid>
    ) : (<></>)
}

Section.propTypes = {
    name: PropTypes.string.isRequired,
    layout: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
    layout: state.layout
})

export default connect(mapStateToProps)(Section);