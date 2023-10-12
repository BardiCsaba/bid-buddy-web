import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { AngularFireDatabase } from '@angular/fire/compat/database'; // Import for the database

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    profilePicUrl = '/assets/images/test.jpg';
    username: string | null = null;
    email: string | null = null;
    balance: number = 0;

    constructor(
        private afAuth: AngularFireAuth,
        private router: Router,
        private db: AngularFireDatabase  // Inject AngularFireDatabase
    ) {}

    ngOnInit(): void {
        this.afAuth.authState.subscribe(user => {
            if (user) {
                this.username = user.displayName || 'No Name';
                this.email = user.email || 'No Email';
                this.balance = 0;
            }
        });
    }

    logout() {
        this.afAuth.signOut()
            .then(() => {
                console.log('Logged out successfully');
                this.router.navigate(['/']);
            })
            .catch(error => {
                console.error('Logout error', error);
            });
    }

    changePassword() {
        // Logic for changing the password using Firebase
        const email = this.email;
        if (email) {
            this.afAuth.sendPasswordResetEmail(email)
                .then(() => {
                    console.log('Password reset email sent');
                    alert('Password reset email has been sent to your email address.');
                })
                .catch(error => {
                    console.error('Error in sending password reset email', error);
                    alert('Error in sending password reset email. Please try again later.');
                });
        }
    }

    addFunds() {
        this.balance += 100;
    }
}