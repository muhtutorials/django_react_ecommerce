import { CART_START, CART_SUCCESS, CART_FAIL } from './actionTypes';
import { authAxios } from '../../utils';
import { orderSummaryUrl } from '../../constants';


export const cartStart = () => {
  return {
    type: CART_START
  };
};


export const cartSuccess = cart => {
  return {
    type: CART_SUCCESS,
    cart
  };
};


export const cartFail = error => {
  return {
    type: CART_FAIL,
    error
  };
};


export const fetchCart = () => dispatch => {
  dispatch(cartStart());
  authAxios.get(orderSummaryUrl)
    .then(res => {
      dispatch(cartSuccess(res.data));
    })
    .catch(error => {
      dispatch(cartFail(error));
    });
};

