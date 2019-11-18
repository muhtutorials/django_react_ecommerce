const localhost = 'http://127.0.01:8000';

const apiUrl = '/api/';

export const endpoint = localhost + apiUrl;

export const productListUrl = endpoint + 'products/';

export const productDetailUrl = id => endpoint + `products/${id}/`;

export const addToCartUrl = 'add-to-cart/';

export const orderSummaryUrl = 'order-summary/';

export const checkoutUrl = endpoint + 'checkout/';

export const addCouponUrl = 'add-coupon/';

export const addressListCreateUrl = addressType => `addresses/?${addressType ? `address_type=${addressType}` : null}`;

export const addressUpdateUrl = id => `addresses/${id}/update/`;

export const addressDeleteUrl = id => `addresses/${id}/delete/`;

export const orderItemDeleteUrl = id => `order-items/${id}/delete/`;

export const orderItemUpdateQuantityUrl = 'order-items/update-quantity/';

export const countryListUrl = 'countries/';

export const userUrl = 'user/';

export const paymentListUrl = 'payments/';
