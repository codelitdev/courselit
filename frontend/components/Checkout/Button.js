import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from '@material-ui/core'
import { connect } from 'react-redux'
import PriceTag from '../PriceTag'
import { publicCourse, authProps, profileProps } from '../../types'
import PaymentDialog from './PaymentDialog.js'
import Router from 'next/router'

const CheckoutButton = (props) => {
  const [dialogOpened, setDialogOpened] = useState(false)
  const { course, auth } = props

  const buyCourse = () => {
    if (auth.guest) {
      Router.push('/login')
    } else {
      setDialogOpened(true)
    }
  }

  const cancelPayment = () => setDialogOpened(false)

  return (
    <>
      <Button onClick={buyCourse} variant='contained' color='secondary'>
        <PriceTag cost={course.cost} />
      </Button>
      <PaymentDialog
        course={course}
        open={dialogOpened}
        onClose={cancelPayment} />
    </>
  )
}

CheckoutButton.propTypes = {
  course: publicCourse.isRequired,
  onTransactionSuccess: PropTypes.func.isRequired,
  onTransactionFailure: PropTypes.func.isRequired,
  auth: authProps,
  profile: profileProps
}

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
})

export default connect(mapStateToProps)(CheckoutButton)
