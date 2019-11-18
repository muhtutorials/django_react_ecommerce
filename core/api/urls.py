from django.urls import path

from . import views


urlpatterns = [
    path('checkout/', views.PaymentView.as_view()),
    path('user/', views.UserView.as_view()),
    path('products/', views.ItemListView.as_view()),
    path('products/<int:pk>/', views.ItemDetailView.as_view()),
    path('add-to-cart/', views.AddToCartView.as_view()),
    path('order-summary/', views.OrderDetailView.as_view()),
    path('add-coupon/', views.AddCoupon.as_view()),
    path('addresses/', views.AddressListCreateView.as_view()),
    path('addresses/<pk>/update/', views.AddressUpdateView.as_view()),
    path('addresses/<pk>/delete/', views.AddressDeleteView.as_view()),
    path('countries/', views.CountriesListView.as_view()),
    path('order-items/<pk>/delete/', views.OrderItemDeleteView.as_view()),
    path('order-items/update-quantity/', views.OrderQuantityUpdate.as_view()),
    path('payments/', views.PaymentListView.as_view()),
]
