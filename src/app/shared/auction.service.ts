import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, takeWhile, map } from 'rxjs';
import { Auction } from '../models/auction.model';

export enum ViewContext {
    AllAuctions,
    MyAuctions,
}

@Injectable({
    providedIn: 'root',
})
export class AuctionService {
    viewContext: ViewContext | undefined;
    selectedFilter = 'All';
    searchText: string = '';
    filters: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(['All']);
    filteredAuctions: BehaviorSubject<Auction[]> = new BehaviorSubject<Auction[]>([]);

    private _auctions: Auction[] = [];

    constructor(private firestore: AngularFirestore, private afAuth: AngularFireAuth) {
        this.loadAllAuctions();
        this.loadAuctionTypes();
    }

    private loadAllAuctions() {
        this.firestore.collection('auctions').snapshotChanges().subscribe(data => {
            this._auctions = data.map(e => {
                const data = e.payload.doc.data() as any;
                data.endDate = data.endDate.toDate();

                return {
                    id: e.payload.doc.id,
                    ...data
                } as Auction;
            });
            this.updateFilteredAuctions();
        });
    }

    private loadAuctionTypes() {
        this.firestore.collection('auction-types', ref => ref.orderBy('order')).snapshotChanges().subscribe(data => {
            const auctionTypes = data.map(e => (e.payload.doc.data() as any).name);
            this.filters.next(['All', ...auctionTypes]);
        });
    }

    getAvailableFilters(): Observable<string[]> {
        return this.filters.pipe(map((filtersArray: any[]) => filtersArray.filter(filter => filter !== 'All')));
    }

    getAllAuctions(): Auction[] {
        return this._auctions;
    }    

    async getMyAuctions(): Promise<Auction[]> {
        const user = await this.afAuth.currentUser;
        if (!user) return [];
        return this._auctions.filter(auction => auction.createdBy === user.uid);
    }

    async addNewAuction(auction: Auction): Promise<void> {
        const user = await this.afAuth.currentUser;
        if (!user) {
            throw new Error('No user is currently authenticated.');
        }
        const auctionId = this.firestore.createId();
        auction.createdBy = user.uid;
        auction.id = auctionId;
        auction.isActive = true;

        return this.firestore.collection('auctions').doc(auctionId).set(auction).then(() => {
            this.loadAllAuctions();
        });
    }

    selectFilter(filter: string): void {
        this.selectedFilter = filter;
        this.updateFilteredAuctions();
    }

    searchAuctions(): void {
        this.updateFilteredAuctions();
    }

    updateFilteredAuctions(): void {
        let currentFiltered = [...this._auctions];
    
        // Filter by selected type.
        if (this.selectedFilter && this.selectedFilter !== 'All') {
            currentFiltered = currentFiltered.filter(auction => auction.type === this.selectedFilter);
        }
    
        // Search by title.
        if (this.searchText) {
            const searchLower = this.searchText.toLowerCase();
            currentFiltered = currentFiltered.filter(auction => auction.title.toLowerCase().includes(searchLower));
        }
    
        // Filter by view context.
        if (this.viewContext === ViewContext.MyAuctions) {
            this.getMyAuctions().then(myAuctions => {
                this.filteredAuctions.next(currentFiltered.filter(auction => myAuctions.includes(auction)));
            });
        } else {
            this.filteredAuctions.next(currentFiltered);
        }
    }       

    timeLeft(auctionEndDate: Date): Observable<string> {
        return new Observable<string>(observer => {
            const updateTime = () => {
                const now = new Date();
                let difference = auctionEndDate.getTime() - now.getTime();
    
                if (difference < 0) {
                    observer.next('Ended');
                    clearInterval(intervalId);
                    setTimeout(() => observer.complete(), 1000);
                    return;
                }
    
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                difference -= days * (1000 * 60 * 60 * 24);
    
                const hours = Math.floor(difference / (1000 * 60 * 60));
                difference -= hours * (1000 * 60 * 60);
    
                const minutes = Math.floor(difference / (1000 * 60));
    
                if (days > 0) {
                    observer.next(`Ends in ${days}d ${hours}h`);
                } else if (hours > 0) {
                    observer.next(`Ends in ${hours}h ${minutes}m`);
                } else if (minutes > 0) {
                    const sec = Math.floor((difference % (1000 * 60)) / 1000);
                    observer.next(`Ends in ${minutes}m ${sec}s`);
                } else {
                    const sec = Math.floor(difference / 1000);
                    observer.next(`Ends in ${sec}s`);
                }
            };
    
            const intervalId = setInterval(updateTime, 1000);
            updateTime();
    
            return () => clearInterval(intervalId);
        });
    }    

    /*
    populateAuctionTypes(): Promise<void[]> {
        const auctionTypes = [
            { name: 'Electronics', order: 1 },
            { name: 'Clothing', order: 2 },
            { name: 'Books', order: 3 },
            { name: 'Home Decor', order: 4 },
            { name: 'Sports', order: 5 },
            { name: 'Toys', order: 6 },
            { name: 'Other', order: 99 },
        ];

        const promises = auctionTypes.map(type => {
            const id = this.firestore.createId();
            return this.firestore.collection('auction-types').doc(id).set({
                id,
                ...type
            });
        });

        return Promise.all(promises);
    }
    */
}    
