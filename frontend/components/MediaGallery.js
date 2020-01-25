import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import {
  Card,
  CardContent,
  Grid,
  TextField,
  GridListTile,
  ListSubheader,
  GridList,
  GridListTileBar,
  IconButton,
  Button
} from '@material-ui/core'

const MediaGallery = (props) => {
  return (
    <Card>
      <CardContent>
        <form onSubmit={searchMedia}>
          <Grid container direction='row' alignItems='center'>
            <Grid item className={classes.searchField}>
              <TextField
                value={searchText}
                variant='outlined'
                label=''
                fullWidth
                margin="normal"
                placeholder={MEDIA_SEARCH_INPUT_PLACEHOLDER}
                onChange={onSearchTextChanged}/>
            </Grid>
            <Grid item>
              <Button
                type='submit'
                variant={searchText.trim().length !== 0 ? 'contained' : 'text'}
                disabled={searchText.trim().length === 0}>
                {BUTTON_SEARCH}
              </Button>
            </Grid>
          </Grid>
        </form>
        <GridList cols={3} className={classes.mediaGrid}>
          <GridListTile cols={3} key='Subheader' style={{ height: 'auto' }}>
            <ListSubheader component='div'>
              {HEADER_YOUR_MEDIA}
            </ListSubheader>
          </GridListTile>
          {userMedia.map((item) =>
            <GridListTile key={item.id} cols={1}>
              <img src={`${BACKEND}/media/${item.id}?thumb=1`} />
              <GridListTileBar
                title={item.title}
                subtitle={item.mimeType}
                actionIcon={
                  <IconButton className={classes.gridListItemIcon}>
                    <InfoOutlined />
                  </IconButton>
                }/>
            </GridListTile>
          )}
        </GridList>
        {props.networkAction &&
            <AppLoader />}
        <Button onClick={loadMedia}>
          {LOAD_MORE_TEXT}
        </Button>
      </CardContent>
    </Card>
  )
}

MediaGallery.propTypes = {

}

export default connect()(MediaGallery)
