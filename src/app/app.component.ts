import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    title = 'bid-buddy-web';
    public menuOpen = false;
    profilePicUrl = '/assets/images/test.jpg';
    username = 'User Name';
    
    constructor(private router: Router) {}

    goToProfile(): void {
        this.router.navigate(['/profile']);
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    }

}
