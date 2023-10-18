import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Auction } from '../models/auction.model';

@Injectable({
    providedIn: 'root',
})
export class AuctionService {
    selectedFilter = 'All';
    filters: string[] = ['All', 'Electronics', 'Clothing', 'Books', 'Home Decor', "Sports", "Toys", "Other"];
    searchText: string = '';
    auctions: Auction[] = [
        {
            title: 'Table Tennis Set',
            description: 'Table tennis set with 4 paddles and 8 balls',
            type: 'Sports',
            endDate: new Date('2023-10-24T14:00:00'),
            startingPrice: 20.0,
            currentPrice: 20.0,
            isActive: true,
            createdBy: 'user1',
            imageSrc: 'assets/images/test.jpg'
        },
    ];
    filteredAuctions: Auction[] = this.auctions;



    constructor(private firestore: AngularFirestore) {}

    ngOnInit() {
        this.filteredAuctions = this.auctions;
    }

    addNewAuction(auction: Auction): Promise<void> {
        const auctionId = this.firestore.createId();
        auction.id = auctionId;

        return this.firestore.collection('auctions').doc(auctionId).set(auction);
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
            currentFiltered = currentFiltered.filter(auction => auction.title.toLowerCase().includes(searchLower));
        }

        this.filteredAuctions = currentFiltered;
    }

    timeLeft(auctionEndDate: Date): Observable<string> {
        const timeDiff = auctionEndDate.getTime() - new Date().getTime();
        const seconds = Math.floor(timeDiff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        let timeLeftStr = '';
        if (days > 0) {
            timeLeftStr += `${days}d `;
        }
        if (hours > 0) {
            timeLeftStr += `${hours % 24}h `;
        }
        if (minutes > 0) {
            timeLeftStr += `${minutes % 60}m `;
        }
        if (seconds > 0) {
            timeLeftStr += `${seconds % 60}s`;
        }

        return new Observable<string>((observer) => {
            observer.next(timeLeftStr);
            observer.complete();
        });
    }
}
