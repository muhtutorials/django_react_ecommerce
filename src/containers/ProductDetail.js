import React from 'react';
import axios from 'axios';
import {
  Container,
  Button,
  Icon,
  Image,
  Grid,
  Label,
  Segment,
  Dimmer,
  Loader,
  Message,
  Card,
  Item,
  Header,
  Form,
  Divider,
  Select
} from 'semantic-ui-react';
import { connect } from 'react-redux';

import { productDetailUrl, addToCartUrl } from '../constants';
import { authAxios } from '../utils';
import { fetchCart } from "../store/actions/cart";


class ProductDetail extends React.Component {
  state = {
    loading: false,
    item: {},
    error: null,
    formVisible: false,
    formData: {}
  };

  handleToggleForm = () => this.setState({ formVisible: !this.state.formVisible });

  // return formData values as array which are primary keys in model m2m relationship
  handleFormatData = formData => Object.keys(formData).map(key => formData[key]);

  handleAddToCart = slug => {
    this.setState({ loading: true });
    const { formData } = this.state;
    const variations = this.handleFormatData(formData);
    console.log(slug);
    console.log(variations);
    authAxios.post(addToCartUrl, { slug, variations })
      .then(res => {
        this.setState({ loading: false });
        this.props.fetchCart()
      })
      .catch(error => this.setState({ loading: false, error: error }))
  };

  handleFetchItem = () => {
    this.setState({ loading: true });
    axios.get(productDetailUrl(this.props.match.params.id))
      .then(res => this.setState({ loading: false, item: res.data }))
      .catch(error => this.setState({ loading: false, error: error }))
  };

  handleChange = (e, { name, value }) => {
    const { formData } = this.state;
    const updatedFormData = { ...formData, [name]: value };
    this.setState({ formData: updatedFormData })
  };

  componentDidMount() {
    this.handleFetchItem()
  }

  render() {
    const { loading, item, error, formVisible, formData } = this.state;
    console.log(item);

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
              header='There were some errors with your submission'
              // list={JSON.stringify(error)}
            />
        }
        <Grid columns={2} divided>
          <Grid.Row>
            <Grid.Column>
              <Card
                fluid
                image={item.image}
                header={item.title}
                meta={
                  <>
                    {item.category}
                    {
                      item.discount_price &&
                        <Label color={item.label === 'primary' ? 'blue' : item.label === 'green' ? 'green' : 'olive'}>
                          {item.label}
                        </Label>
                    }
                  </>
                }
                description={item.description}
                extra={
                  <>
                    <Button
                      fluid
                      color="yellow"
                      floated='right'
                      icon
                      labelPosition="right"
                      onClick={this.handleToggleForm}
                    >
                      Add to cart
                      <Icon name='plus cart' />
                    </Button>
                  </>
                }
              />
              {
                formVisible &&
                  <>
                    <Divider />
                    <Form>
                      {item.variations.map(variation => {
                        const name = variation.name.toLowerCase();
                        return (
                          <Form.Field key={variation.id}>
                            <Select
                              name={name}
                              onChange={this.handleChange}
                              options={variation.item_variations.map(item => {
                                return { key: item.id, text: item.value, value: item.id }
                              })}
                              placeholder={`Choose an option ${name}`}
                              selection
                              value={formData[name]}
                            />
                          </Form.Field>
                        )
                      })}
                      <Form.Button primary onClick={() => this.handleAddToCart(item.slug)}>
                        Submit
                      </Form.Button>
                    </Form>
                  </>
              }
            </Grid.Column>
            <Grid.Column>
              <Header as="h2">Try different variations</Header>
              {
                item.variations &&
                  item.variations.map(variation => {
                    return (
                      <Item.Group divided key={variation.id}>
                        <Header as="h3">{variation.name}</Header>
                        {variation.item_variations.map(iv => {
                          return (
                            <React.Fragment key={iv.id}>
                              <Header>{iv.name}</Header>
                              <Item>
                                {iv.attachment && <Item.Image size='tiny' src={`http://127.0.0.1:8000${iv.attachment}`} />}
                                <Item.Content verticalAlign='middle'>{iv.value}</Item.Content>
                              </Item>
                            </React.Fragment>
                          )
                        })}
                      </Item.Group>
                    )
                  })
              }
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
    );
  }
}


const mapDispatchToProps = dispatch => {
  return {
    fetchCart: () => dispatch(fetchCart())
  }
};


export default connect(null, mapDispatchToProps)(ProductDetail);
