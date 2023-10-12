import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { interval } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';

interface Auction {
    name: string;
    price: number;
    type: string;
    endDate: Date;
    imageSrc: string;
}

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent {
    selectedFilter = 'All';
    filters: string[] = ['All', 'Electronics', 'Clothing', 'Books', 'Home Decor', "Sports", "Toys", "Other"];
    searchText: string = '';
    filteredAuctions: any[] = [];

    auctions: Auction[] = [
        {
            name: 'Table Tennis Set',
            price: 120.0,
            type: 'Sports',
            endDate: new Date('2023-12-24T14:00:00'),
            imageSrc: 'assets/images/test.jpg'
        },
        {
            name: 'Gaming Laptop',
            price: 1400.0,
            type: 'Electronics',
            endDate: new Date('2023-11-14T12:30:00'),
            imageSrc: 'assets/images/test.jpg'
        },
        {
            name: 'Designer Shoes',
            price: 220.0,
            type: 'Clothing',
            endDate: new Date('2023-10-30T17:00:00'),
            imageSrc: 'assets/images/test.jpg'
        },
        {
            name: 'Vintage Book Collection',
            price: 90.0,
            type: 'Books',
            endDate: new Date('2023-10-15T19:15:00'),
            imageSrc: 'assets/images/test.jpg'
        },
        {
            name: 'Modern Sofa Set',
            price: 720.0,
            type: 'Home Decor',
            endDate: new Date('2023-10-15T20:45:00'),
            imageSrc: 'assets/images/test.jpg'
        },
        {
            name: 'Barbie Doll',
            price: 20.0,
            type: 'Toys',
            endDate: new Date('2023-10-14T16:45:00'),
            imageSrc: 'assets/images/test.jpg'
        }
    ];

    ngOnInit() {
        this.filteredAuctions = this.auctions;
    }

    timeLeft(auctionEndDate: Date): Observable<string> {
        return new Observable<string>(observer => {
            const updateTime = () => {
                const now = new Date();
                let difference = auctionEndDate.getTime() - now.getTime();
    
                if (difference < 0) {
                    observer.next('Ended');
                    observer.complete();
                }
    
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                difference -= days * (1000 * 60 * 60 * 24);
    
                const hours = Math.floor(difference / (1000 * 60 * 60));
                difference -= hours * (1000 * 60 * 60);
    
                const minutes = Math.floor(difference / (1000 * 60));
    
                if (days > 0) {
                    observer.next(`Ends in ${days}d ${hours}h`);
                    observer.complete();
                } else if (hours > 0) {
                    observer.next(`Ends in ${hours}h ${minutes}m`);
                    observer.complete();
                } else {
                    const sec = Math.floor((difference % (1000 * 60)) / 1000);
                    observer.next(`Ends in ${minutes}m ${sec}s`);
                }
            };
    
            const intervalId = setInterval(updateTime, 1000);
            updateTime();
    
            return () => clearInterval(intervalId);
        }).pipe(
            takeWhile(val => !val.includes('Ended'))
        );
    }    

    selectFilter(filter: string): void {
        this.selectedFilter = filter;
        this.updateFilteredAuctions();
    }
    
    searchAuctions(): void {
        this.updateFilteredAuctions();
    }
    
    private updateFilteredAuctions(): void {
        let currentFiltered = this.auctions;
    
        if (this.selectedFilter && this.selectedFilter !== 'All') {
            currentFiltered = currentFiltered.filter(auction => auction.type === this.selectedFilter);
        }
    
        if (this.searchText) {
            const searchLower = this.searchText.toLowerCase();
            currentFiltered = currentFiltered.filter(auction => auction.name.toLowerCase().includes(searchLower));
        }
    
        this.filteredAuctions = currentFiltered;
    }
}
