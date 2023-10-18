import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    email: string = '';
    password: string = '';
    firstName: string = '';
    lastName: string = '';
    isLoginMode: boolean = true;
    errorMessage: string | null = null;

    constructor(
        private afAuth: AngularFireAuth, 
        private router: Router, 
        private firestore: AngularFirestore
    ) {}
    

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
                this.errorMessage = this.getFriendlyErrorMessage(error.code);
            });
    }

    registerWithEmail() {
        this.afAuth.createUserWithEmailAndPassword(this.email, this.password)
            .then(success => {
                console.log('Registration successful', success);
                const userId = success.user?.uid;
    
                const displayName = `${this.firstName} ${this.lastName}`.trim();
                if (displayName) {
                    success.user?.updateProfile({
                        displayName: displayName
                    });
                }
    
                if (userId) {
                    this.firestore.collection('users').doc(userId).set({
                        balance: '0',
                        email: this.email,
                        firstName: this.firstName,
                        lastName: this.lastName,
                        userId: userId
                    })
                    .then(() => {
                        console.log('User record created in Firestore');
                        this.router.navigate(['/']);
                    })
                    .catch(error => {
                        console.error('Error creating user record in Firestore', error);
                        this.errorMessage = this.getFriendlyErrorMessage(error.code);
                    });
                }
    
            })
            .catch(error => {
                console.error('Registration error', error);
                this.errorMessage = this.getFriendlyErrorMessage(error.code);
            });
    }    

    getFriendlyErrorMessage(errorCode: string): string {
        switch (errorCode) {
            // Firebase Authentication errors
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
    
            // Firestore errors
            case 'permission-denied':
                return 'You do not have permission to perform this action.';
            case 'unavailable':
                return 'The service is currently unavailable. Please try again later.';
    
            default:
                return 'An error occurred. Please try again.';
        }
    }      
}