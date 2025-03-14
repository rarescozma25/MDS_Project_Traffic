from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, update_session_auth_hash
from django.contrib import messages
from django.core.mail import mail_admins
from .forms import SignUpForm
from .forms import CustomAuthenticationForm
from django.contrib.auth.forms import PasswordChangeForm
import logging
logger = logging.getLogger('django')

def home(request):
    #print(settings.BASE_DIR)
    return render(request, 'home.html')

def profile(request):
    return render(request, 'profile.html')


def aboutus(request):
    return render(request, 'aboutus.html')




def signup_view(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)

        # Verificare validitate formular
        if form.is_valid():
            user = form.save()
            login(request, user)  # autentificare automata dupa inregistrare
            return redirect('home')
    else:
        form = SignUpForm()
        
    print(form)
    return render(request, 'signup.html', {'form': form})


def login_view(request):
    if request.method == 'POST':
        form = CustomAuthenticationForm(data=request.POST, request=request)
        if form.is_valid():
            user = form.get_user()
            
            login(request, user)
            if not form.cleaned_data.get('ramane_logat'):
                request.session.set_expiry(0)
            else:
                request.session.set_expiry(24*60*60)  # 1 zi
                
            
            request.session['user_data'] = {
                'username': user.username,
                'first_name' : user.first_name,
                'last_name' : user.last_name,
                'email' : user.email
            }          
            return redirect('profile')
        
    else:
        form = CustomAuthenticationForm()

    return render(request, 'login.html', {'form': form})

def logout_view(request):
    logout(request)  # sterg sesiunea utilizatorului
    messages.success(request, "Te-ai delogat cu succes!")
    return redirect('home')

def change_password_view(request):
    if request.method == 'POST':
        form = PasswordChangeForm(user=request.user, data=request.POST)
        if form.is_valid():
            form.save()
            update_session_auth_hash(request, request.user)
            messages.success(request, 'Parola a fost actualizata')
            
            return redirect('home')
        else:
            messages.error(request, 'Exista erori.')
    else:
        form = PasswordChangeForm(user=request.user)
    return render(request, 'change_password.html', {'form': form})