from django.shortcuts import render
from django.conf import settings

def home(request):
    #print(settings.BASE_DIR)
    return render(request, 'home.html')

def profile(request):
    return render(request, 'profile.html')

def signup(request):
    return render(request, 'signup.html')

def login(request):
    return render(request, 'login.html')

def aboutus(request):
    return render(request, 'aboutus.html')