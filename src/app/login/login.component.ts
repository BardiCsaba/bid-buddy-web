import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    email: string = '';
    password: string = '';
    name: string = '';
    isLoginMode: boolean = true;
    errorMessage: string | null = null;

    constructor(private afAuth: AngularFireAuth, private router: Router) {}

    toggleMode() {
        this.isLoginMode = !this.isLoginMode;
    }

    loginWithEmail() {
        this.afAuth.signInWithEmailAndPassword(this.email, this.password)
            .then(success => {
                console.log('Logged in successfully', success);
                this.router.navigate(['/']);
            })
            .catch(error => {
                console.error('Login error', error);
                this.errorMessage = this.getFriendlyErrorMessage(error.code); // Update error message
            });
    }

    registerWithEmail() {
        this.afAuth.createUserWithEmailAndPassword(this.email, this.password)
            .then(success => {
                console.log('Registration successful', success);
                if (this.name) {
                    success.user?.updateProfile({
                        displayName: this.name
                    });
                }
                this.router.navigate(['/']);
            })
            .catch(error => {
                console.error('Registration error', error);
                this.errorMessage = this.getFriendlyErrorMessage(error.code); // Update error message
            });
    }

    getFriendlyErrorMessage(errorCode: string): string {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'This email address is already in use by another account.';
            case 'auth/invalid-email':
                return 'Invalid email address format.';
            case 'auth/operation-not-allowed':
                return 'Email/password accounts are not enabled.';
            case 'auth/weak-password':
                return 'Password is too weak.';
            case 'auth/user-not-found':
                return 'No account exists with this email address.';
            case 'auth/invalid-login-credentials':
                return 'Invalid email or password.';
            default:
                return 'An error occurred. Please try again.';
        }
    }     
}