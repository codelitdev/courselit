import React from 'react'
import PropTypes from 'prop-types'
import { Card, CardContent, Typography } from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import { USER_ERROR_HEADER } from '../config/strings'
import ContainedBodyLayout from './ContainedBodyLayout'
import Masterlayout from './Masterlayout'

const useStyles = makeStyles(theme => ({
  header: {
    marginBottom: theme.spacing(1)
  }
}))

const AppError = (props) => {
  const { error } = props
  console.log(error)
  const classes = useStyles()

  return (
    <Masterlayout>
      <ContainedBodyLayout>
        <Card>
          <CardContent>
            <Typography
              variant='body1'
              color="textSecondary"
              className={classes.header}>
              {USER_ERROR_HEADER}
            </Typography>
            <Typography variant='h5'>
              {error}
            </Typography>
          </CardContent>
        </Card>
      </ContainedBodyLayout>
    </Masterlayout>
  )
}

AppError.propTypes = {
  error: PropTypes.string.isRequired
}

export default AppError
