import React, { useState } from 'react'
import { Grid, Typography } from '@material-ui/core'
import {
  USERS_MANAGER_PAGE_HEADING
} from '../config/strings.js'

const UsersManager = (props) => {
  const [totalUsers, setTotalUsers] = useState(0)

  return (
    <div>
      <Grid
        container
        direction='row'
        justify='space-between'
        alignItems='center'>
        <Grid item xs={12} sm={10}>
          <Typography variant='h3'>
            {USERS_MANAGER_PAGE_HEADING}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Typography variant='subtitle1'>
            {totalUsers} Users
          </Typography>
        </Grid>
      </Grid>
    </div>
  )
}

export default UsersManager