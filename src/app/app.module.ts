import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';

import { AppComponent } from './app.component';
import { MainPageComponent } from './main-page/main-page.component';
import { MyBidsComponent } from './my-bids/my-bids.component';
import { MyAuctionsComponent } from './my-auctions/my-auctions.component';
import { ProfileComponent } from './profile/profile.component';
import { LoginComponent } from './login/login.component';
import { AuctionDetailComponent } from './auction-detail/auction-detail.component';

const firebaseConfig = {
    apiKey: 'AIzaSyBn12GXVxNM_VwQV2knOvKex7KSMQwsKyU',
    authDomain: 'bidbuddy-c3d4d.firebaseapp.com',
    projectId: 'bidbuddy-c3d4d',
    storageBucket: 'bidbuddy-c3d4d.appspot.com',
    messagingSenderId: '1087219194781',
    appId: '1:1087219194781:web:a5a3478c1d7472b84c6d74',
};

const routes: Routes = [
    { path: '', component: MainPageComponent },
    { path: 'my-auctions', component: MyAuctionsComponent },
    { path: 'my-bids', component: MyBidsComponent },
    { path: 'profile', component: ProfileComponent },
    { path: 'login', component: LoginComponent },
    { path: 'auction/:id', component: AuctionDetailComponent },
    { path: '**', redirectTo: '/' },
];

@NgModule({
    declarations: [
        AppComponent,
        LoginComponent,
        MainPageComponent,
        MyBidsComponent,
        MyAuctionsComponent,
        ProfileComponent,
        AuctionDetailComponent,
    ],
    imports: [
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        AngularFireModule.initializeApp(firebaseConfig),
        AngularFireAuthModule,
        RouterModule.forRoot(routes),
    ],
    exports: [RouterModule],
    bootstrap: [AppComponent],
})
export class AppModule {}
