import React from 'react';
import { Button, Card, Dimmer, Divider, Form, Grid, Header, Image, Label, Loader, Menu, Message, Segment, Select, Table } from 'semantic-ui-react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { addressListCreateUrl, countryListUrl, userUrl, addressUpdateUrl, addressDeleteUrl, paymentListUrl } from '../constants';
import { authAxios } from '../utils';


const CREATE_FORM = 'CREATE_FORM';
const UPDATE_FORM = 'UPDATE_FORM';


class PaymentHistory extends React.Component {
  state = {
    payments: [],
    loading: false,
    error: null
  };
  handleFetchPayments = () => {
    this.setState({ loading: true });
    authAxios.get(paymentListUrl)
    .then(res => this.setState({ loading: false, payments: res.data }))
      .catch(error => {
        this.setState({ loading: false, error });
      })
  };

  componentDidMount() {
    this.handleFetchPayments()
  }

  render() {
    const { payments } = this.state;
    return (
      <Table celled>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>ID</Table.HeaderCell>
            <Table.HeaderCell>Amount</Table.HeaderCell>
            <Table.HeaderCell>Date</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {payments.map(p => {
            return (
              <Table.Row key={p.id}>
                <Table.Cell>{p.id}</Table.Cell>
                <Table.Cell>${p.amount}</Table.Cell>
                <Table.Cell>{new Date(p.timestamp).toUTCString()}</Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>

      </Table>
    )
  }
}


class AddressForm extends React.Component {
  state = {
    loading: false,
    error: null,
    formData: {
      userID: '',
      id: '',
      user: '',
      street_address: '',
      apartment_address: '',
      country: '',
      zip: '',
      default: false
    },
    saving: false,
    success: false,
  };

  handleToggleDefault = () => this.setState({ default: !this.state.default });

  handleChange = e => {
    const { formData } = this.state;
    const updatedFormData = { ...formData, [e.target.name]: e.target.value };
    this.setState({ formData: updatedFormData })
  };

  handleSelectChange = (e, { name, value }) => {
    const { formData } = this.state;
    const updatedFormData = { ...formData, [name]: value };
    this.setState({ formData: updatedFormData })
  };

  handleCreateAddress = () => {
    const { userID, activeItem } = this.props;
    const { formData } = this.state;
    this.setState({ saving: true });
    authAxios.post(addressListCreateUrl(), {
      ...formData,
      // 'B' and 'S' are choices in the model
      address_type: activeItem === 'billingAddress' ? 'B' : 'S',
      user: userID
    }).then(res => this.setState({ saving: false, success: true }))
      .catch(error => {
        this.setState({ saving: false, error });
      })
  };

  handleUpdateAddress = () => {
    const { userID, activeItem } = this.props;
    const { formData } = this.state;
    this.setState({ saving: true });

    authAxios.put(addressUpdateUrl(formData.id), {
      ...formData,
      // 'B' and 'S' are choices in the model
      address_type: activeItem === 'billingAddress' ? 'B' : 'S',
      user: userID
    }).then(res => {
      this.setState({ saving: false, success: true, formData: { default: false } });
      this.props.callback()
    })
      .catch(error => {
        this.setState({ saving: false, error });
      })
  };

  handleSubmit = e => {
    e.preventDefault();
    this.setState({ saving: true });
    const { formType } = this.props;
    if (formType === 'UPDATE_FORM') {
      this.handleUpdateAddress()
    } else {
      this.handleCreateAddress()
    }
  };

  componentDidMount() {
    const { formType, address } = this.props;
    if (formType === UPDATE_FORM) {
      this.setState({ formData: address })
    }
  }

  render() {
    const { saving, success, error, formData } = this.state;
    const { countries } = this.props;

    return (
      <Form onSubmit={this.handleSubmit} success={success} error={error}>
        <Form.Input
          name="street_address"
          value={formData.street_address}
          placeholder="Street Address"
          onChange={this.handleChange}
          required
        />
        <Form.Field required>
          <Select
            clearable
            search
            fluid
            name="country"
            value={formData.country}
            placeholder="Country"
            options={countries}
            loading={countries.length < 1}
            onChange={this.handleSelectChange}
          />
        </Form.Field>
        <Form.Input
          name="apartment_address"
          value={formData.apartment_address}
          placeholder="Apartment Address"
          onChange={this.handleChange}
          required
        />
        <Form.Input
          name="zip"
          value={formData.zip}
          placeholder="Zip Code"
          onChange={this.handleChange}
          required
        />
        <Form.Checkbox
          name="default"
          value={formData.default}
          label="Make this the default address"
          onChange={this.handleToggleDefault}
        />
        {/* on form submit show this message */}
        <Message
          success
          header='Success!'
          content="Your address was saved"
        />
        <Message
          error
          header='There was an error'
          list={JSON.stringify(error)}
        />
        <Form.Button disabled={saving} loading={saving} primary>Save</Form.Button>
      </Form>
    )
  }
}


class Profile extends React.Component {
  state = {
    activeItem: 'billingAddress',
    addresses: [],
    countries: [],
    userID: null,
    selectedAddress: null
  };

  handleGetActiveItem = () => {
    const { activeItem } = this.state;
    if (activeItem === "billingAddress") {
      return "Billing Address"
    } else if (activeItem === "physicalAddress") {
      return "Shipping Address"
    }
    return 'Payment History'
  };

  handleSelectAddress = address => {
    this.setState({ selectedAddress: address })
  };

  handleItemClick = (e, { name }) => {
    this.setState({ activeItem: name }, () => this.handleFetchAddresses())
  };

  handleFormatCountries = countries => {
    const keys = Object.keys(countries);
    return keys.map(key => {
      return {
        key,
        text: countries[key],
        value: key
      }
    })
  };

  handleFetchCountries = () => {
    authAxios.get(countryListUrl)
      .then(res => this.setState({ countries: this.handleFormatCountries(res.data) }))
      .catch(error => this.setState({ error }))
  };

  handleFetchUserID = () => {
    authAxios.get(userUrl)
      .then(res => this.setState({ userID: res.data.userID }))
      .catch(error => this.setState({ error }))
  };

  handleFetchAddresses = () => {
    const { activeItem } = this.state;
    this.setState({ loading: true });
    authAxios.get(addressListCreateUrl(activeItem === 'billingAddress' ? 'B' : 'S'))
      .then(res => this.setState({ loading: false, addresses: res.data }))
      .catch(error => this.setState({ loading: false, error }))
  };

  handleCallback = () => {
    this.handleFetchAddresses();
    this.setState({ selectedAddress: null })
  };

  handleDeleteAddress = id => {
    authAxios.delete(addressDeleteUrl(id))
      .then(res => this.handleCallback())
      .catch(error => this.setState({ error }))
  };

  componentDidMount() {
    this.handleFetchAddresses();
    this.handleFetchCountries();
    this.handleFetchUserID()
  }

  renderAddresses = () => {
    const { activeItem, addresses, countries, selectedAddress, userID } = this.state;
    return (
      <>
        <Card.Group>
          {addresses.map(address => {
            return (
              <Card key={address.id}>
                <Card.Content>
                  {address.default && <Label color='blue' ribbon='right'>Default</Label>}
                  <Card.Header>{address.street_address}, {address.apartment_address}</Card.Header>
                  <Card.Meta>{address.country}</Card.Meta>
                  <Card.Description>
                    {address.zip}
                  </Card.Description>
                </Card.Content>
                <Card.Content extra>
                  <Button color='yellow' onClick={() => this.handleSelectAddress(address)}>
                    Update
                  </Button>
                  <Button color='red' onClick={() => this.handleDeleteAddress(address.id)}>
                    Delete
                  </Button>
                </Card.Content>
              </Card>
            )
          })}
          </Card.Group>
          {addresses.length > 0 && <Divider />}
          {
            selectedAddress === null ?
              <AddressForm
                activeItem={activeItem}
                userID={userID}
                countries={countries}
                formType={CREATE_FORM}
                callback={this.handleCallback}
              />
            :
              null
          }
          {
            selectedAddress &&
              <AddressForm
                activeItem={activeItem}
                userID={userID}
                countries={countries}
                address={selectedAddress}
                formType={UPDATE_FORM}
                callback={this.handleCallback}
              />
          }
      </>
    )
  };

  render() {
    const { activeItem, loading } = this.state;
    const { isAuthenticated } = this.props;

    if (!isAuthenticated) {
      return <Redirect to="/login" />
    }

    return (
      <Grid container columns={2} divided>
        <Grid.Row columns={1}>
          <Grid.Column>
            {
              loading &&
              <Segment>
                <Dimmer active inverted>
                  <Loader inverted content='Loading' />
                </Dimmer>
                <Image src='/images/wireframe/short-paragraph.png' />
              </Segment>
            }
          </Grid.Column>
        </Grid.Row>
        <Grid.Row>
          <Grid.Column width={6}>
            <Menu pointing vertical fluid>
              <Menu.Item
                name='billingAddress'
                active={activeItem === 'billingAddress'}
                onClick={this.handleItemClick}
              />
              <Menu.Item
                name='physicalAddress'
                active={activeItem === 'physicalAddress'}
                onClick={this.handleItemClick}
              />
              <Menu.Item
                name='paymentHistory'
                active={activeItem === 'paymentHistory'}
                onClick={this.handleItemClick}
              />
            </Menu>
          </Grid.Column>
          <Grid.Column width={10}>
            <Header>{this.handleGetActiveItem()}</Header>
            <Divider />
            {activeItem === "paymentHistory" ? <PaymentHistory /> : this.renderAddresses()}
          </Grid.Column>
        </Grid.Row>
      </Grid>
    )
  }
}


const mapStateToProps = state => {
  return {
    isAuthenticated: state.auth.token !== null
  }
};


export default connect(mapStateToProps)(Profile);
