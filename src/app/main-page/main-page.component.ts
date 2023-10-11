import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { interval } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';

interface Auction {
    name: string;
    price: number;
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
    filters: string[] = ['All', 'Electronics', 'Clothing', 'Books', 'Home Decor'];
    searchText: string = '';

    auctions: Auction[] = [
        {
            name: 'Table Tennis Set',
            price: 120.0,
            endDate: new Date('2023-12-24T14:00:00'),
            imageSrc: 'assets/images/test.jpg'
        },
        {
            name: 'Gaming Laptop',
            price: 1400.0,
            endDate: new Date('2023-11-14T12:30:00'),
            imageSrc: 'assets/images/test.jpg'
        },
        {
            name: 'Designer Shoes',
            price: 220.0,
            endDate: new Date('2023-10-30T17:00:00'),
            imageSrc: 'assets/images/test.jpg'
        },
        {
            name: 'Vintage Book Collection',
            price: 90.0,
            endDate: new Date('2023-10-11T15:30:00'),
            imageSrc: 'assets/images/test.jpg'
        },
        {
            name: 'Modern Sofa Set',
            price: 720.0,
            endDate: new Date('2023-10-11T20:45:00'),
            imageSrc: 'assets/images/test.jpg'
        }
    ];

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
            updateTime(); // run immediately
    
            return () => clearInterval(intervalId); // clear interval on unsubscribe
        }).pipe(
            takeWhile(val => !val.includes('Ended'))
        );
    }    
    

    selectFilter(filter: string): void {
        this.selectedFilter = filter;
    }

    searchAuctions(): void {
        // Implement search logic here
    }
}
