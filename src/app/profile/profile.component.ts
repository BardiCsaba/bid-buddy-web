import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {  // Implement the OnInit interface
    profilePicUrl = '/assets/images/test.jpg';  // Adjust as per your requirements
    username: string | null = null;  // Init as null
    email: string | null = null;    // Init as null

    constructor(private afAuth: AngularFireAuth, private router: Router) {}

    ngOnInit(): void {  // Add the ngOnInit method
        this.afAuth.authState.subscribe(user => {
            if (user) {
                this.username = user.displayName || 'No Name';  // Default to 'No Name' if not set
                this.email = user.email || 'No Email';
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
}