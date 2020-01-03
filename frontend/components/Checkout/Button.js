import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from '@material-ui/core'
import { connect } from 'react-redux'
import PriceTag from '../PriceTag'
import { publicCourse } from '../../types'
import PaymentDialog from './PaymentDialog.js'

const Button = (props) => {
  const [dialogOpened, setDialogOpened] = useState(false)
  const [purchased, setPurchased] = useState(false)
  const { course } = props

  const startCourse = () => {}

  const buyCourse = () => {}

  const cancelPayment = () => {
    setDialogOpened(false)
  }

  return purchased
    ? (<Button onClick={startCourse}></Button>) : (
      <Button onClick={buyCourse} variant='contained' color='secondary'>
        <PriceTag cost={course.cost} />
        <PaymentDialog
          onOpen={dialogOpened}
          onClose={cancelPayment} />
      </Button>
    )
}

BuyButton.propTypes = {
  course: publicCourse.isRequired,
  onTransactionSuccess: PropTypes.func.isRequired,
  onTransactionFailure: PropTypes.func.isRequired
}

export default connect()(Button)