import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth'; 
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
    title = 'bid-buddy-web';
    public menuOpen = false;
    defaultProfilePicUrl = '/assets/images/profile-pic.jpg';
    profilePicUrl = this.defaultProfilePicUrl;
    username: string | null = null;
    private userSubscription: Subscription | null = null;
    
    constructor(
        private router: Router,
        private afAuth: AngularFireAuth,
        private firestore: AngularFirestore,
        private cdr: ChangeDetectorRef
    ) {
        this.afAuth.authState.subscribe(user => {
            if (this.userSubscription) {
                this.userSubscription.unsubscribe();
            }

            if (user) {
                this.username = user.displayName || user.email;

                this.userSubscription = this.firestore.collection('users').doc(user.uid).valueChanges()
                .subscribe((userData: any) => {
                    this.username = `${userData.firstName} ${userData.lastName}`.trim();
                    this.profilePicUrl = userData.profilePicUrl || this.defaultProfilePicUrl;
                    this.cdr.detectChanges();
                });
            } else {
                this.onLogout();
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
        this.menuOpen = false;
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    }

    onLogout() {
        this.username = null;
        this.profilePicUrl = this.defaultProfilePicUrl;
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
            this.userSubscription = null;
        }
        this.cdr.detectChanges();
    }

    ngOnDestroy() {
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }
}