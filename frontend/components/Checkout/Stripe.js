import {CardElement} from 'react-stripe-elements';

const Stripe = (props) => {
  return (
    <label>
      Card details
      <CardElement />
    </label>
  )
}

export default Stripe