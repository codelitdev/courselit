import type { NextPage } from 'next'
import { Button } from '@mui/material'
import { connect } from 'react-redux';
import State from '../ui-models/state';
import Auth from '../ui-models/auth';

interface HomeProps {
  auth: Auth;
}

const Home = ({ auth }: HomeProps) => {
  console.log(auth)
  return (
    <>
      <p>Welcome</p>
      <Button>Click Me!</Button>
      <p>Guest: {auth.guest}</p>
      <p>Checked: {auth.checked}</p>
    </>
  )
}

const mapStateToProps = (state: State) => ({
  auth: state.auth
});

export default connect(mapStateToProps)(Home)
