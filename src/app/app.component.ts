import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth'; 
import { ChangeDetectorRef } from '@angular/core';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    title = 'bid-buddy-web';
    public menuOpen = false;
    profilePicUrl = '/assets/images/profile-pic.jpg';
    username: string | null = null; // Initializing username as null
    
    constructor(private router: Router, private afAuth: AngularFireAuth, private cdr: ChangeDetectorRef) {
        this.afAuth.authState.subscribe(user => {
            if (user) {
                this.username = user.displayName || user.email;
                this.cdr.detectChanges();
                this.profilePicUrl = 'assets/images/test.jpg'
            } else {
                this.username = null;
                this.cdr.detectChanges();
                this.profilePicUrl = '/assets/images/profile-pic.jpg';
            }
        }, error => {
            console.error('Error fetching auth state:', error);
        });
    }

    goToProfile(): void {
        if (this.username) {
            this.router.navigate(['/profile']);
        } else {
            this.router.navigate(['/login']);
        }
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    }
}