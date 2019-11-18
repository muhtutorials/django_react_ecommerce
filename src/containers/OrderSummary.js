import React from 'react';
import { Container, Header, Label, Table, Button, Message, Segment, Dimmer, Loader, Image, Icon } from 'semantic-ui-react';
import { connect } from 'react-redux';
import { Link, Redirect } from 'react-router-dom';

import { authAxios } from '../utils';
import { orderSummaryUrl, orderItemDeleteUrl, addToCartUrl, orderItemUpdateQuantityUrl } from '../constants';


class OrderSummary extends React.Component {
  state = {
    loading: false,
    order: null,
    error: null
  };

  fetchOrder = () => {
    this.setState({ loading: true });
    authAxios.get(orderSummaryUrl)
      .then(res => this.setState({ loading: false, order: res.data }))
      .catch(error => {
        if (error.response.status === 404) {
          console.log(error.response);
          this.setState({ loading: false, error: 'You currently do not have an order.' })
        } else {
          this.setState({ loading: false, error: 'error' })
        }
      });
  };

  componentDidMount() {
    this.fetchOrder()
  }

  renderVariations = orderItem => {
    let text = '';
    orderItem.item_variations.forEach(iv => {
      text += `${iv.variation.name}: ${iv.value}, `
    });
    return text;
  };

  // return formData values as array which are primary keys in model m2m relationship
  handleFormatData = itemVariations => Object.keys(itemVariations).map(key => itemVariations[key].id);

  handleAddToCart = (slug, itemVariations) => {
    this.setState({ loading: true });
    const variations = this.handleFormatData(itemVariations);
    authAxios.post(addToCartUrl, { slug, variations })
      .then(res => {
        this.setState({ loading: false });
        this.fetchOrder()
      })
      .catch(error => this.setState({ loading: false, error: error }))
  };

  handleRemoveQuantityFromCart = slug => {
    authAxios.post(orderItemUpdateQuantityUrl, { slug })
      .then(res => this.fetchOrder())
      .catch(error => {
        this.setState({ error: 'error' })
      });
  };

  handleRemoveItem = id => {
    authAxios.delete(orderItemDeleteUrl(id))
      .then(res => this.fetchOrder())
      .catch(error => {
        this.setState({ error: 'error' })
      });
  };

  render() {
    const { loading, order, error } = this.state;
    const { isAuthenticated } = this.props;

    if (!isAuthenticated) {
      return <Redirect to="/login" />
    }

    return (
      <Container>
        <Header as="h3">Order Summary</Header>
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
        {
          order &&
            <Table celled>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Item #</Table.HeaderCell>
                  <Table.HeaderCell>Item Name</Table.HeaderCell>
                  <Table.HeaderCell>Item Price</Table.HeaderCell>
                  <Table.HeaderCell>Item Quantity</Table.HeaderCell>
                  <Table.HeaderCell>Total Item Price</Table.HeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {order.order_items.map((order_item, index) =>
                  <Table.Row key={order_item.id}>
                    <Table.Cell>{index + 1}</Table.Cell>
                    <Table.Cell>{order_item.item.title} - {this.renderVariations(order_item)}</Table.Cell>
                    <Table.Cell>${order_item.item.price}</Table.Cell>
                    <Table.Cell textAlign="center">
                      <Icon name="minus" style={{ float: 'left', cursor: 'pointer' }} onClick={() => this.handleRemoveQuantityFromCart(order_item.item.slug)} />
                      {order_item.quantity}
                      <Icon name="plus" style={{ float: 'right', cursor: 'pointer' }} onClick={() => this.handleAddToCart(order_item.item.slug, order_item.item_variations)} />
                    </Table.Cell>
                    <Table.Cell>
                      {order_item.item.discount_price && <Label ribbon color="green">THIS IS ON DISCOUNT</Label>}
                      ${order_item.final_price}
                      <Icon name="trash" color="red" style={{ float: 'right', cursor: 'pointer' }} onClick={() => this.handleRemoveItem(order_item.id)} />
                    </Table.Cell>
                  </Table.Row>
                )}
                <Table.Row>
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell colSpan='2' textAlign="center">
                    Total: ${order.total}
                  </Table.Cell>
                </Table.Row>
              </Table.Body>

              <Table.Footer>
                <Table.Row>
                  <Table.HeaderCell colSpan='5' textAlign="right">
                    <Link to="/checkout"><Button color="yellow">Checkout</Button></Link>
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Footer>
            </Table>
        }
      </Container>
   )
  }
}


const mapStateToProps = state => {
  return {
    isAuthenticated: state.auth.token !== null
  }
};



export default connect(mapStateToProps, {})(OrderSummary);
