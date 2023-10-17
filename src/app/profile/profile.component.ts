import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    defaultProfilePicUrl = '/assets/images/profile-pic.jpg';
    profilePicUrl = '';
    username: string | null = null;
    email: string | null = null;
    balance: number = 0;
    userId: string | null = null;

    constructor(
        private afAuth: AngularFireAuth,
        private router: Router,
        private firestore: AngularFirestore,
        private storage: AngularFireStorage
    ) {}    

    ngOnInit(): void {
        this.afAuth.authState.subscribe(user => {
            if (user) {
                this.username = user.displayName || 'No Name';
                this.email = user.email || 'No Email';
                this.userId = user.uid;
    
                this.firestore.collection('users').doc(user.uid).valueChanges()
                .subscribe((userData: any) => {
                    this.balance = userData && userData.balance ? Number(userData.balance) : 0;
                    this.profilePicUrl = userData.profilePicUrl || this.defaultProfilePicUrl;
                });
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

    uploadProfilePic(event: any): void {
        const file = event.target.files[0];
        if (file) {
            const filePath = `profile_pictures/${this.userId}`;
            const fileRef = this.storage.ref(filePath);
            const task = this.storage.upload(filePath, file);
    
            task.snapshotChanges().pipe(
                finalize(() => {
                    fileRef.getDownloadURL().subscribe(downloadURL => {
                        this.profilePicUrl = downloadURL;
                        if (this.userId) {
                            this.firestore.collection('users').doc(this.userId).update({
                                profilePicUrl: this.profilePicUrl
                            });
                        }
                    });
                })
            ).subscribe();
        }
    }    

    addFunds() {
        this.balance += 100;
        if (this.userId) {
            this.firestore.collection('users').doc(this.userId).update({
                balance: this.balance
            })
            .then(() => {
                console.log('Balance updated successfully in Firestore');
            })
            .catch(error => {
                console.error('Error updating balance in Firestore', error);
            });
        }
    }    
}