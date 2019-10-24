import { useSelector, useDispatch } from 'react-redux'
import { BACKEND } from '../config/constants.js'
import { queryGraphQLWithUIEffects } from '../lib/utils.js'
import { networkAction } from '../redux/actions.js'

// export const useExecuteGraphQLQuery = () => connect(
//   state => ({ auth: state.auth }),
//   dispatch => dispatch
// )(props => queryGraphQLWithUIEffects(
//   `${BACKEND}/graph`,
//   props.dispatch,
//   networkAction,
//   props.auth.token
// ))

export const useExecuteGraphQLQuery = () => {
  const auth = useSelector(state => state.auth)
  const dispatch = useDispatch()

  return queryGraphQLWithUIEffects(
    `${BACKEND}/graph`,
    dispatch,
    networkAction,
    auth.token
  )
}
