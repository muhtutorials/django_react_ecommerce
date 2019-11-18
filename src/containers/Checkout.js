// how-to: https://stripe.com/docs/recipes/elements-react
import React, { Component } from 'react';
import {
  Container,
  Button,
  Message,
  Item,
  Divider,
  Header,
  Loader,
  Segment,
  Dimmer,
  Image,
  Label,
  Form,
  Select
} from 'semantic-ui-react';
import { Elements, StripeProvider, CardElement, injectStripe } from 'react-stripe-elements';
import { Link, withRouter } from 'react-router-dom';

import { authAxios } from '../utils';
import { checkoutUrl, orderSummaryUrl, addCouponUrl, addressListCreateUrl } from '../constants';


class CouponForm extends React.Component {
  state = { code: '' };

  handleChange = e => this.setState({ code: e.target.value });

  handleSubmit = e => {
    const code = this.state.code;
    this.props.handleAddCoupon(e, code);
    this.setState({ code: '' });
  };

  render() {
    const { code } = this.state;

    return (
      <Form onSubmit={this.handleSubmit}>
        <Form.Field>
          <label>Coupon code</label>
          <input placeholder='Enter a coupon' value={code} onChange={this.handleChange} />
        </Form.Field>
        <Button type='submit'>Submit</Button>
      </Form>
    )
  }
}


const OrderPreview = props => {
  const { order } = props;

  return (
    <>
      {
        order &&
          <>
            <Item.Group relaxed>
              {order.order_items.map((order_item) =>
                <Item key={order_item.id}>
                  <Item.Image size='tiny' src={`http://127.0.0.1:8000${order_item.item.image}`} />

                  <Item.Content verticalAlign='middle'>
                    <Item.Header as='a'>{order_item.quantity} x {order_item.item.title}</Item.Header>
                      <Item.Extra>
                        <Label>${order_item.final_price}</Label>
                    </Item.Extra>
                  </Item.Content>
                </Item>
              )}
            </Item.Group>

            <Item.Group>
              <Item>
                <Item.Content>
                  <Item.Header>
                    Order Total: ${order.total}
                    {
                      order.coupon &&
                        <Label color="green" style={{ marginLeft: '10px' }}>
                          Current coupon: {order.coupon.code} for ${order.coupon.amount}
                        </Label>
                    }
                  </Item.Header>
                </Item.Content>
              </Item>
            </Item.Group>
          </>
      }
    </>
  )
};


class CheckoutForm extends Component {
  state = {
    loading: false,
    success: false,
    order: null,
    error: null,
    billingAddress: [],
    shippingAddress: [],
    selectedBillingAddress: '',
    selectedShippingAddress: ''
  };

  handleSubmit = event => {
    event.preventDefault();
    this.setState({ loading: true });
    const { selectedBillingAddress, selectedShippingAddress } = this.state;
    if (this.props.stripe) {
      this.props.stripe.createToken().then(res => {
        if (res.error) {
          this.setState({ loading: false, error: res.error.message })
        } else {
          this.setState({ error: null});
          authAxios.post(checkoutUrl, { stripeToken: res.token.id, selectedBillingAddress, selectedShippingAddress })
            .then(res => this.setState({ loading: false, success: true }))
            .catch(error => this.setState({ loading: false, error }))
        }
      });
    } else {
      console.log('Stripe is not loaded')
    }
  };

  handleAddCoupon = (e, code) => {
    e.preventDefault();
    this.setState({ loading: true });
    authAxios.post(addCouponUrl, { code })
      .then(res => {
        this.setState({ loading: false });
        this.fetchOrder()
      })
      .catch(error => this.setState({ loading: false, error }))
  };

  fetchOrder = () => {
    this.setState({ loading: true });
    authAxios.get(orderSummaryUrl)
      .then(res => this.setState({ loading: false, order: res.data }))
      .catch(error => {
        if (error.response.status === 404) {
          this.props.history.push('/products')
        } else {
          this.setState({ loading: false, error })
        }
      });
  };

  handleGetDefaultAddress = addresses => {
    const filteredAddresses = addresses.filter(a => a.default === true );
    if (filteredAddresses.length > 0) {
      return filteredAddresses[0].id
    }
    return ''
  };

  handleFetchBillingAddresses = () => {
    this.setState({ loading: true });
    authAxios.get(addressListCreateUrl('B'))
      .then(res => this.setState({ loading: false, billingAddress: res.data.map(a => {
        return {
          key: a.id,
          text: `${a.street_address}, ${a.apartment_address}, ${a.country}, ${a.zip}`,
          value: a.id
        }}),
        selectedBillingAddress: this.handleGetDefaultAddress(res.data)
      }))
      .catch(error => this.setState({ loading: false, error }));
  };

  handleFetchShippingAddresses = () => {
    this.setState({ loading: true });
    authAxios.get(addressListCreateUrl('S'))
      .then(res => this.setState({ loading: false, shippingAddress: res.data.map(a => {
        return {
          key: a.id,
          text: `${a.street_address}, ${a.apartment_address}, ${a.country}, ${a.zip}`,
          value: a.id
        }}),
        selectedShippingAddress: this.handleGetDefaultAddress(res.data)
      }))
      .catch(error => this.setState({ loading: false, error }));
  };

  componentDidMount() {
    console.log(this.props);
    this.fetchOrder();
    this.handleFetchBillingAddresses();
    this.handleFetchShippingAddresses();
  }

  handleSelectChange = (e, { name, value }) => this.setState({ [name]: value });

  render() {
    const { loading, success, order, error, billingAddress, shippingAddress, selectedBillingAddress, selectedShippingAddress } = this.state;

    return (
      <>
        {
          loading &&
            <Segment>
              <Dimmer active inverted>
                <Loader inverted content='Loading' />
              </Dimmer>
              <Image src='/images/wireframe/short-paragraph.png' />
            </Segment>
        }
        {
          error &&
            <Message negative>
              <Message.Header>Error:</Message.Header>
              <p>{error}</p>
            </Message>
        }

        {order && <OrderPreview order={order} />}

        <Divider />
        <CouponForm handleAddCoupon={(e, code) => this.handleAddCoupon(e, code)} />

        <Divider />
        <Header>Select a billing address</Header>
        {
          billingAddress.length > 0 ?
            <Select
              name="selectedBillingAddress"
              value={selectedBillingAddress}
              clearable
              options={billingAddress}
              selection
              onChange={this.handleSelectChange}
            />
          :
            <p>You need to <Link to="/profile">add a billing address</Link></p>
        }


        <Divider />
        <Header>Select a shipping address</Header>
        {
          billingAddress.length > 0 ?
            <Select
              name="selectedShippingAddress"
              value={selectedShippingAddress}
              clearable
              options={shippingAddress}
              selection
              onChange={this.handleSelectChange}
            />
          :
            <p>You need to <Link to="/profile">add a shipping address</Link></p>
        }

        <Divider />
        {
          billingAddress.length < 1 || shippingAddress.length < 1 ?
            <p>You need to add addresses before you can complete your purchase</p>
          :
            <>
              <Header>Would you like to complete the purchase?</Header>
              <CardElement />
              {
                success &&
                  <Message positive>
                    <Message.Header>Your payment was successful</Message.Header>
                    <p>
                      Go to your <b>profile</b> page to see delivery status.
                    </p>
                  </Message>
              }
              <Button primary loading={loading} disabled={loading} onClick={this.handleSubmit} style={{ marginTop: '10px' }}>
                Purchase
              </Button>
            </>
        }
      </>
    );
  }
}


const InjectedForm = withRouter(injectStripe(CheckoutForm));


const WrappedForm = () => (
  <Container text>
    <StripeProvider apiKey="pk_test_TYooMQauvdEDq54NiTphI7jx">
      <div>
        <h1>Complete your order</h1>
        <Elements>
          <InjectedForm />
        </Elements>
      </div>
    </StripeProvider>
  </Container>
);


export default WrappedForm;
