import React, { useState } from 'react'
import { Grid, Typography, TextField } from '@material-ui/core'
import {
  USERS_MANAGER_PAGE_HEADING
} from '../config/strings.js'

const UsersManager = (props) => {
  const [totalUsers, setTotalUsers] = useState(0)
  const [searchText, setSearchText] = useState('')

  const handleSearch = event => {
    event.preventDefault()
  }

  return (
    <Grid container>
      <Grid 
        item
        container
        direction='row'
        justify='space-between'
        alignItems='center'>
        <Grid item xs={12} sm={8}>
          <Typography variant='h3'>
            {USERS_MANAGER_PAGE_HEADING}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <form onSubmit={handleSearch}>
            <TextField
              value={searchText}
              variant='outlined'
              label=''
              fullWidth
              margin="normal"
              placeholder={`Search ${totalUsers} users`}
              onChange={(e) => setSearchText(e.target.value)}/>
          </form>
        </Grid>
      </Grid>
      <Grid item>
        
      </Grid>
      <Grid item>

      </Grid>
    </Grid>
  )
}

export default UsersManager
