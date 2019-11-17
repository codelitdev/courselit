import React, { useState, useEffect } from 'react'
import { siteUser } from '../types'
import {
  Grid,
  IconButton,
  Typography,
  TextField,
  Button,
  Switch,
  Card
} from '@material-ui/core'
import { ExpandMore, ExpandLess, AccountCircle } from '@material-ui/icons'
import {
  CAPTION_VERIFIED,
  CAPTION_UNVERIFIED,
  LABEL_NEW_PASSWORD,
  LABEL_CONF_PASSWORD,
  BUTTON_SAVE,
  SWITCH_IS_ADMIN,
  SWITCH_IS_CREATOR,
  SWITCH_ACCOUNT_ACTIVE,
  ERR_PASSWORDS_DONT_MATCH
} from '../config/strings'
import { makeStyles } from '@material-ui/styles'
import { useExecuteGraphQLQuery } from './CustomHooks.js'

const useStyles = makeStyles({
  container: {
    padding: '0.8em 1.2em',
    marginBottom: '0.6em'
  },
  error: {
    color: '#ff0000'
  }
})

const UserDetails = (props) => {
  const newUserDataDefaults = {
    isAdmin: props.user.isAdmin,
    isCreator: props.user.isCreator,
    active: props.user.active || false,
    password: '',
    confirmPassword: ''
  }
  const [expanded, setExpanded] = useState(false)
  const [userData, setUserData] = useState(props.user)
  const [newUserData, setNewUserData] = useState(newUserDataDefaults)
  const classes = useStyles()
  const [error, setError] = useState('')
  const executeGQLCall = useExecuteGraphQLQuery()

  useEffect(() => {
    console.log(props.user, newUserData)
    setError(getUserDataError())
  }, [newUserData.confirmPassword, newUserData.password])

  const getUserDataError = () => {
    if ((newUserData.password || newUserData.confirmPassword) &&
            newUserData.password !== newUserData.confirmPassword) {
      return ERR_PASSWORDS_DONT_MATCH
    }

    return ''
  }

  const toggleExpandedState = () => {
    setExpanded(!expanded)
  }

  const saveUserChanges = async (e) => {
    e.preventDefault()
    setError(getUserDataError())

    const mutation = `
    mutation {
        user: updateUser(userData: {
            id: "${userData.id}"
            ${getChangedFieldsForMutation()}
        }) { 
            id,
            email,
            name,
            verified,
            isCreator,
            isAdmin,
            avatar,
            purchases,
            active
         }
    }
    `

    try {
      const response = await executeGQLCall(mutation)
      if (response.user) {
        setNewUserData(getNewUserDataObject(response.user))
        setUserData(response.user)
      }
    } catch (err) {
      setError(err.message)
      setNewUserData(newUserDataDefaults)
    }
  }

  const getNewUserDataObject = (user) => ({
    isAdmin: user.isAdmin,
    isCreator: user.isCreator,
    active: user.active,
    password: '',
    confirmPassword: ''
  })

  const getChangedFieldsForMutation = () => {
    let otherFields = ''
    if (newUserData.password) {
      otherFields += `, password: "${newUserData.password}"`
    }
    if (newUserData.isAdmin !== userData.isAdmin) {
      otherFields += `, isAdmin: ${newUserData.isAdmin}`
    }
    if (newUserData.isCreator !== userData.isCreator) {
      otherFields += `, isCreator: ${newUserData.isCreator}`
    }
    if (newUserData.active !== userData.active) {
      otherFields += `, active: ${newUserData.active}`
    }

    return otherFields
  }

  const isNewUserDataValid = () => {
    if ((newUserData.password || newUserData.confirmPassword) &&
            newUserData.password !== newUserData.confirmPassword) {
      return false
    }

    if (newUserData.password &&
            newUserData.password === newUserData.confirmPassword) {
      return true
    }

    if (userData.isAdmin !== newUserData.isAdmin) {
      return true
    }

    if (userData.isCreator !== newUserData.isCreator) {
      return true
    }

    if (userData.active !== newUserData.active) {
      return true
    }

    return false
  }

  const updateUserData = (key, value) => setNewUserData(
    Object.assign({}, newUserData, { [key]: value })
  )

  return (
    <Card className={classes.container}>
      <Grid container direction='column'>
        <Grid
          container
          direction='row'
          justify='space-between'
          alignItems='center'>
          <Grid item>
            <AccountCircle />
          </Grid>
          <Grid item xs={10}>
            <Grid
              container
              item
              direction='row'
              alignItems='center'>
              <Typography variant='h6'>
                {props.user.name}
              </Typography>
              {props.user.isAdmin &&
                                <Typography variant='caption'>Admin</Typography>}
              <Typography variant='caption'>
                {props.user.verified ? CAPTION_VERIFIED : CAPTION_UNVERIFIED }
              </Typography>
            </Grid>
            <Grid>
              <Typography variant='body2'>
                <a href={`mailto:${props.user.email}`}>{props.user.email}</a>
              </Typography>
            </Grid>
          </Grid>
          <Grid item xs={1}>
            <IconButton onClick={toggleExpandedState}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Grid>
        </Grid>
        {expanded &&
                    <Grid item>
                      <form onSubmit={saveUserChanges}>
                        <Grid container direction='column'>
                          <Grid container item>
                            <Grid container item direction='row' justify='space-between' xs={12} sm={4}>
                              <Typography variant='subtitle1'>{SWITCH_IS_ADMIN}</Typography>
                              <Switch
                                type='checkbox'
                                name='isAdmin'
                                checked={newUserData.isAdmin}
                                onChange={e => updateUserData('isAdmin', e.target.checked)}/>
                            </Grid>
                            <Grid container item direction='row' justify='space-between' xs={12} sm={4}>
                              <Typography variant='subtitle1'>{SWITCH_IS_CREATOR}</Typography>
                              <Switch
                                type='checkbox'
                                name='isAdmin'
                                checked={newUserData.isCreator}
                                onChange={e => updateUserData('isCreator', e.target.checked)}/>
                            </Grid>
                            <Grid container item direction='row' justify='space-between' xs={12} sm={4}>
                              <Typography variant='subtitle1'>{SWITCH_ACCOUNT_ACTIVE}</Typography>
                              <Switch
                                type='checkbox'
                                name='active'
                                checked={newUserData.active}
                                onChange={e => updateUserData('active', e.target.checked)}/>
                            </Grid>
                          </Grid>
                          <Grid item>
                            <TextField
                              variant='outlined'
                              label={LABEL_NEW_PASSWORD}
                              fullWidth
                              margin='normal'
                              name='password'
                              type='password'
                              value={newUserData.password}
                              onChange={e => updateUserData('password', e.target.value)}/>
                            <TextField
                              variant='outlined'
                              label={LABEL_CONF_PASSWORD}
                              fullWidth
                              margin='normal'
                              name='confirmPassword'
                              type='password'
                              value={newUserData.confirmPassword}
                              onChange={e => updateUserData('confirmPassword', e.target.value)}/>
                          </Grid>
                          <Grid container item justify='flex-end' alignItems='center'>
                            {error &&
                                    <Grid item>
                                      <Typography variant='caption' className={classes.error}>{error}</Typography>
                                    </Grid>}
                            <Grid item>
                              <Button
                                color='primary'
                                onClick={saveUserChanges}
                                disabled={!isNewUserDataValid()}>
                                {BUTTON_SAVE}
                              </Button>
                            </Grid>
                          </Grid>
                        </Grid>
                      </form>
                    </Grid>}
      </Grid>
    </Card>
  )
}

UserDetails.propTypes = {
  user: siteUser
}

export default UserDetails
