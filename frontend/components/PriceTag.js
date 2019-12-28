import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { BUTTON_TEXT_BUY_NOW, BUTTON_START_NOW } from '../config/strings'
import { siteInfoProps } from '../types'

const PriceTag = (props) => {
  const cost = props.cost || 0
  const costText = cost > 0
    ? `${BUTTON_TEXT_BUY_NOW} ${props.siteInfo.currencyUnit}${cost}` : BUTTON_START_NOW

  return <>{costText}</>
}

PriceTag.propTypes = {
  cost: PropTypes.number.isRequired,
  siteInfo: siteInfoProps.isRequired
}

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
})

export default connect(mapStateToProps)(PriceTag)
