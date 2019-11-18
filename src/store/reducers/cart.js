import { CART_START, CART_SUCCESS, CART_FAIL } from '../actions/actionTypes';
import { updateObject } from "../utility";


const initialState = {
  loading: false,
  cart: null,
  error: null
};


const cartStart = (state) => {
  return updateObject(state, {
    loading: true,
    error: null
  });
};


const cartSuccess = (state, action) => {
  return updateObject(state, {
    loading: false,
    cart: action.cart,
    error: null
  });
};


const cartFail = (state, action) => {
  return updateObject(state, {
    loading: false,
    error: action.error
  });
};


const reducer = (state = initialState, action) => {
  switch (action.type) {
    case CART_START:
      return cartStart(state, action);
    case CART_SUCCESS:
      return cartSuccess(state, action);
    case CART_FAIL:
      return cartFail(state, action);
    default:
      return state;
  }
};


export default reducer;
