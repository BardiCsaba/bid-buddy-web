import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    email: string = '';
    password: string = '';

    constructor(public afAuth: AngularFireAuth) {}

    loginWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        this.afAuth.signInWithPopup(provider)
            .then(success => {
                console.log('Logged in successfully', success);
            })
            .catch(error => {
                console.error('Login error', error);
            });
    }

    loginWithEmail() {
        this.afAuth.signInWithEmailAndPassword(this.email, this.password)
            .then(success => {
                console.log('Logged in successfully', success);
            })
            .catch(error => {
                console.error('Login error', error);
            });
    }

    registerWithEmail() {
        this.afAuth.createUserWithEmailAndPassword(this.email, this.password)
            .then(success => {
                console.log('Registration successful', success);
            })
            .catch(error => {
                console.error('Registration error', error);
            });
    }
}