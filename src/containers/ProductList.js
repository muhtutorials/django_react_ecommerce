import React from 'react';
import axios from 'axios';
import { Container, Image, Item, Label, Segment, Dimmer, Loader, Message } from 'semantic-ui-react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import { productListUrl } from '../constants';
import { fetchCart } from "../store/actions/cart";


class ProductList extends React.Component {
  state = {
    loading: false,
    products: [],
    error: null
  };

  componentDidMount() {
    this.setState({ loading: true });
    axios.get(productListUrl)
      .then(res => this.setState({ loading: false, products: res.data }))
      .catch(error => this.setState({ loading: false, error: error }))
  }

  render() {
    const { loading, products, error } = this.state;
    return (
      <Container>
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
          <Message
            error
            header='There was some errors with your submission'
            list={JSON.stringify(error)}
          />
        }
        <Item.Group divided>
          {products.map(item => {
            return (
              <Item key={item.id}>
                <Item.Image src={item.image} />
                <Item.Content>
                  <Link to={`products/${item.id}`}><Item.Header as='a'>{item.title}</Item.Header></Link>
                  <Item.Meta>
                    <span className='cinema'>{item.category}</span>
                  </Item.Meta>
                  <Item.Description>{item.description}</Item.Description>
                  <Item.Extra>
                    {
                      item.discount_price &&
                      <Label color={item.label === 'primary' ? 'blue' : item.label === 'green' ? 'green' : 'olive'}>
                        {item.label}
                      </Label>
                    }
                  </Item.Extra>
                </Item.Content>
              </Item>
            )
          })}
        </Item.Group>
      </Container>
    );
  }
}


const mapDispatchToProps = dispatch => {
  return {
    fetchCart: () => dispatch(fetchCart())
  }
};


export default connect(null, mapDispatchToProps)(ProductList);
