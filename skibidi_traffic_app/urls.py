from django.urls import path
from . import views

urlpatterns = [
    path('home', views.home, name='home'),
    path('profile', views.profile, name='profile'),
    path('signup', views.signup_view, name='signup'),
    path('login', views.login_view, name='login'),
    path('aboutus', views.aboutus, name='aboutus'),
    path('logout', views.logout_view, name='logout'),
    path('changepassword', views.change_password_view, name='changepassword'),
]

from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)