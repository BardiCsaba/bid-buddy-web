import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';

import { LoginComponent } from './login/login.component';
import { FormsModule } from '@angular/forms';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';

const firebaseConfig = {
    apiKey: 'AIzaSyBn12GXVxNM_VwQV2knOvKex7KSMQwsKyU',
    authDomain: 'bidbuddy-c3d4d.firebaseapp.com',
    projectId: 'bidbuddy-c3d4d',
    storageBucket: 'bidbuddy-c3d4d.appspot.com',
    messagingSenderId: '1087219194781',
    appId: '1:1087219194781:web:a5a3478c1d7472b84c6d74',
};

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AngularFireModule.initializeApp((firebaseConfig)),
    AngularFireAuthModule,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }