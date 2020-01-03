import React from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogTitle } from '@material-ui/core'
import { CHECKOUT_DIALOG_TITLE } from '../../config/strings'
import Stripe from './Stripe.js'


const PaymentDialog = (props) => {
  const { onClose, onOpen } = props

  return (
    <Dialog onClose={onClose} open={onOpen}>
      <DialogTitle>{CHECKOUT_DIALOG_TITLE}</DialogTitle>
      <Stripe />
    </Dialog>
  )
}

export default PaymentDialog