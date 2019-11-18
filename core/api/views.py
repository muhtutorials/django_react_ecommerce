from django.shortcuts import get_object_or_404
from django.http import Http404
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.conf import settings
from rest_framework.generics import ListAPIView, RetrieveAPIView, ListCreateAPIView, UpdateAPIView, DestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import stripe
from django_countries import countries

from core.models import Item, Variation, ItemVariation, OrderItem, Order, Address, Payment, Coupon, Refund, UserProfile
from .serializers import ItemSerializer, OrderSerializer, ItemDetailSerializer, AddressSerializer, PaymentSerializer


stripe.api_key = settings.STRIPE_SECRET_KEY


class ItemListView(ListAPIView):
    serializer_class = ItemSerializer
    queryset = Item.objects.all()
    permission_classes = [AllowAny]


class ItemDetailView(RetrieveAPIView):
    serializer_class = ItemDetailSerializer
    queryset = Item.objects.all()
    permission_classes = [AllowAny]


class OrderQuantityUpdate(APIView):
    def post(self, request, *args, **kwargs):
        item = get_object_or_404(Item, slug=request.data.get('slug'))
        order_qs = Order.objects.filter(user=request.user, ordered=False)  # ordered is a field
        if order_qs.exists():
            order = order_qs[0]
            # check if the ordered item is in the order
            if order.items.filter(item__slug=request.data.get('slug')).exists():
                order_item = OrderItem.objects.filter(user=request.user, item=item, ordered=False)[0]
                if order_item.quantity > 1:
                    order_item.quantity -= 1
                    order_item.save()
                else:
                    order.items.remove(order_item)
                return Response(status=status.HTTP_200_OK)
            else:
                return Response({'message': 'This item was not in your cart'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'message': 'You do not have an active order'}, status=status.HTTP_400_BAD_REQUEST)


class OrderItemDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = OrderItem.objects.all()


class AddToCartView(APIView):
    def post(self, request, *args, **kwargs):
        slug = request.data.get('slug')
        variations = request.data.get('variations', [])
        item_qs = Item.objects.filter(slug=slug)
        if not item_qs.exists():
            return Response({'message': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
        item = item_qs[0]

        minimum_variation_count = Variation.objects.filter(item=item).count()
        if len(variations) < minimum_variation_count:
            return Response({'message': 'Please specify the required variations'}, status=status.HTTP_400_BAD_REQUEST)

        # ordered is a field which we set so we don't get an item that's already been purchased
        order_item_qs = OrderItem.objects.filter(user=self.request.user, item=item, ordered=False)

        for v in variations:
            order_item_qs = order_item_qs.filter(item_variations__exact=v)

        if order_item_qs.exists():
            order_item = order_item_qs.first()
            order_item.quantity += 1
            order_item.save()
        else:
            order_item = OrderItem.objects.create(user=self.request.user, item=item, ordered=False)
            order_item.item_variations.add(*variations)
            order_item.save()

        order_qs = Order.objects.filter(user=self.request.user, ordered=False)  # ordered is a field
        if order_qs.exists():
            order = order_qs[0]
            # check if the ordered item is in the order
            if not order.items.filter(item__id=order_item.id).exists():
                order.items.add(order_item)
            return Response(status.HTTP_200_OK)
        else:
            ordered_date = timezone.now()
            order = Order.objects.create(user=self.request.user, ordered_date=ordered_date)
            order.items.add(order_item)
            return Response(status.HTTP_200_OK)


class OrderDetailView(RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        try:
            return Order.objects.get(user=self.request.user, ordered=False)
        except ObjectDoesNotExist:
            raise Http404('You do not have an active order')
            # return Response({'message': 'You do not have an active order'}, status=status.HTTP_400_BAD_REQUEST)


class PaymentView(APIView):
    def post(self, request, *args, **kwargs):
        print(self.request.user)
        order = get_object_or_404(Order, user=self.request.user, ordered=False)
        user_profile = get_object_or_404(UserProfile, user=self.request.user)
        # doesn't work on test visa card with the number 4242 4242 4242 4242
        token = self.request.data.get('stripeToken')
        # https://stripe.com/docs/testing#cards
        # token = 'tok_visa'
        billing_address_id = self.request.data.get('selectedBillingAddress')
        shipping_address_id = self.request.data.get('selectedShippingAddress')
        billing_address = Address.objects.get(id=billing_address_id)
        shipping_address = Address.objects.get(id=shipping_address_id)

        if user_profile.stripe_customer_id != '' and user_profile.stripe_customer_id is not None:
            customer = stripe.Customer.retrieve(
                user_profile.stripe_customer_id)
            customer.sources.create(source=token)

        else:
            customer = stripe.Customer.create(
                email=self.request.user.email,
            )
            customer.sources.create(source=token)
            user_profile.stripe_customer_id = customer['id']
            user_profile.one_click_purchasing = True
            user_profile.save()

        amount = int(order.get_total() * 100)

        try:
            # create a charge (https://stripe.com/docs/api/charges/create?lang=python)
            # charge the customer because we cannot charge the token more than once
            charge = stripe.Charge.create(
                amount=amount,  # cents
                currency="usd",
                customer=user_profile.stripe_customer_id)

            # charge once off on the token
            # charge = stripe.Charge.create(
            #     amount=amount,  # cents
            #     currency="usd",
            #     source=token  # obtained with Stripe.js
            # )

            # create the payment
            payment = Payment()
            payment.stripe_charge_id = charge['id']
            payment.user = self.request.user
            payment.amount = order.get_total()
            payment.save()

            # assign the payment to the order

            order_items = order.items.all()
            order_items.update(ordered=True)
            for item in order_items:
                item.save()

            order.ordered = True
            order.payment = payment
            order.billing_address = billing_address
            order.shipping_address = shipping_address
            # order.ref_code = generate_ref_code()
            order.save()

            return Response({'message': 'Your order was successful!'}, status=status.HTTP_200_OK)

        # stripe error handling (https://stripe.com/docs/api/errors/handling?lang=python)
        except stripe.error.CardError as e:
            # Since it's a decline, stripe.error.CardError will be caught
            body = e.json_body
            err = body.get('error', {})
            return Response({'message': f"{err.get('message')}"}, status=status.HTTP_400_BAD_REQUEST)

        except stripe.error.RateLimitError as e:
            # Too many requests made to the API too quickly
            return Response(
                {'message': 'Too many requests made to the API too quickly'},
                status=status.HTTP_400_BAD_REQUEST)

        except stripe.error.InvalidRequestError as e:
            # Invalid parameters were supplied to Stripe's API
            return Response(
                {'message': "Invalid parameters were supplied to Stripe's API"},
                status=status.HTTP_400_BAD_REQUEST)

        except stripe.error.AuthenticationError as e:
            # Authentication with Stripe's API failed
            # (maybe you changed API keys recently)
            return Response(
                {'message': "Authentication with Stripe's API failed"},
                status=status.HTTP_400_BAD_REQUEST)

        except stripe.error.APIConnectionError as e:
            # Network communication with Stripe failed
            return Response(
                {'message': 'Network communication with Stripe failed'},
                status=status.HTTP_400_BAD_REQUEST)

        except stripe.error.StripeError as e:
            # Display a very generic error to the user, and maybe send
            # yourself an email
            return Response(
                {'message': 'Something went wrong. You were not charged. Please try again'},
                status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            # send an email to myself because there's something wrong with my code
            return Response(
                {'message': 'Serious error occurred. We have been notified'},
                status=status.HTTP_400_BAD_REQUEST)
        # return Response({'message': 'Invalid data received'}, status=status.HTTP_400_BAD_REQUEST)


class AddCoupon(APIView):
    def post(self, *args, **kwargs):
        code = self.request.data.get('code')
        if code is None:
            return Response({'message': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
        coupon = get_object_or_404(Coupon, code=code)
        order = Order.objects.get(user=self.request.user, ordered=False)
        order.coupon = coupon
        order.save()
        return Response(status.HTTP_200_OK)


class CountriesListView(APIView):
    def get(self, *args, **kwargs):
        return Response(countries, status.HTTP_200_OK)


# unnecessary since could be performed through method perform_create inside AddressListCreateView
class UserView(APIView):
    def get(self, *args, **kwargs):
        return Response({'userID': self.request.user.id}, status.HTTP_200_OK)


class AddressListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self, *args, **kwargs):
        address_type = self.request.query_params.get('address_type')
        if address_type is None:
            return Address.objects.filter(user=self.request.user)
        return Address.objects.filter(user=self.request.user, address_type=address_type)


class AddressUpdateView(UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer
    queryset = Address.objects.all()


class AddressDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Address.objects.all()


class PaymentListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)
