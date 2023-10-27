import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Injectable, } from '@angular/core';
import { Observable, BehaviorSubject, map, combineLatest, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Auction } from '../models/auction.model';
import { Bid } from '../models/bid.model';
import { User } from '../models/user.model';
import { Router } from '@angular/router';

export enum ViewContext {
    AllAuctions,
    MyAuctions,
}

@Injectable({
    providedIn: 'root',
})
export class AuctionService {
    defaultProfilePicUrl = '/assets/images/profile-pic.jpg';
    viewContext: ViewContext | undefined;
    selectedFilter = 'All';
    searchText: string = '';
    filters: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(['All']);
    filteredAuctions: BehaviorSubject<Auction[]> = new BehaviorSubject<Auction[]>([]);
    
    private _currentUserId?: string;
    private _auctionsCache: Map<string, Auction> = new Map();
    private _bidsCache: Map<string, Bid[]> = new Map();
    
    constructor(
            private firestore: AngularFirestore, 
            private afAuth: AngularFireAuth,
            private router: Router) {
        this.loadAllAuctions();
        this.loadAuctionTypes();
    }

    // Load collections from Firestore.
    private loadAllAuctions() {
        this.firestore.collection('auctions').snapshotChanges().subscribe(data => {
            data.forEach(e => {
                const data = e.payload.doc.data() as any;
                data.endDate = data.endDate.toDate();
                const auction: Auction = {
                    id: e.payload.doc.id,
                    ...data
                };
                this._auctionsCache.set(e.payload.doc.id, auction);
            });
            this.updateFilteredAuctions();
        });
    }

    private loadAuctionBids(auctionId: string) {
        if(!this._bidsCache.has(auctionId)){
            this._bidsCache.set(auctionId, []);
        }

        this.firestore.collection('auctions').doc(auctionId).collection<Bid>('bids').snapshotChanges().subscribe(data => {
            const bids: Bid[] = data.map(e => e.payload.doc.data() as Bid);
            this._bidsCache.set(auctionId, bids);
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
        return Array.from(this._auctionsCache.values());
    }    

    getUserData(userId: string): Observable<User> {
        return this.firestore.collection('users').doc(userId).snapshotChanges().pipe(
            map(userSnapshot => {
                const userData = userSnapshot.payload.data() as User;
                return userData;
            })
        );
    }

    async getCurrentUser(): Promise<User | undefined> {
        const userId = await this.getCurrentUserId();
        if (!userId) return undefined;
        return this.getUserData(userId).toPromise();
    }

    async getCurrentUserId(): Promise<string | undefined> {
        if (!this._currentUserId) {
            const user = await this.afAuth.currentUser;
            this._currentUserId = user?.uid;
        }
        return this._currentUserId;
    }

    async getMyAuctions(): Promise<Auction[]> {
        const userId = await this.getCurrentUserId();
        if (!userId) return [];
        return Array.from(this._auctionsCache.values()).filter(auction => auction.createdBy === userId);
    }

    async addNewAuction(auction: Auction): Promise<void> {
        const userId = await this.getCurrentUserId();
        if (!userId) {
            throw new Error('No user is currently authenticated.');
        }
        auction.createdBy = userId;
        auction.id = this.firestore.createId();
        auction.isActive = true;

        return this.firestore.collection('auctions').doc(auction.id).set(auction).then(() => {
            this.loadAllAuctions();
        });
    }
    
    getAuctionWithBids(auctionId: string): Observable<Auction> {
        try {
            const auction$ = this.firestore.collection('auctions').doc(auctionId).snapshotChanges().pipe(
                map(auctionSnapshot => {
                    const auctionData = auctionSnapshot.payload.data() as any;
                    auctionData.endDate = auctionData.endDate.toDate();
                    return {
                        id: auctionSnapshot.payload.id,
                        ...auctionData
                    } as Auction;
                })
            );
            const bids$ = this.firestore.collection('auctions').doc(auctionId).collection<Bid>('bids').snapshotChanges().pipe(
                switchMap(bidSnapshots => {
                    if (bidSnapshots.length === 0) {
                        return of([]);
                    }
                    const bids = bidSnapshots.map(bidSnapshot => bidSnapshot.payload.doc.data() as Bid);
                    return combineLatest(
                        bids.map(bid => 
                            this.firestore.collection('users').doc(bid.userId).get().pipe(
                                map(userDoc => {
                                    const userData = userDoc.data() as User;
                                    if (userData.profilePicUrl === "") {
                                        bid.profilePicUrl = this.defaultProfilePicUrl;
                                    } else {
                                        bid.profilePicUrl = userData.profilePicUrl;
                                    }
                                    if (userData.firstName) {
                                        bid.displayName = userData.firstName + ' ' + userData.lastName;
                                    } else {
                                        bid.displayName = 'Anonymous';
                                    }
                                    return bid;
                                })                            
                            )
                        )
                    );
                }),
                map(bids => bids.sort((a, b) => b.amount - a.amount))
            );
            return combineLatest([auction$, bids$]).pipe(
                map(([auction, bids]) => {
                    auction.bids = bids;
                    return auction;
                })
            ); 
        } catch (error) {
            console.log("Error getting auction with bids:", error);
            throw error;
        }
    }  
    
    async placeBidForAuction(auctionId: string, userBidAmount: number): Promise<boolean> {
        const auctionRef = this.firestore.collection('auctions').doc(auctionId);
        const bidsCollectionRef = auctionRef.collection('bids');
    
        const batch = this.firestore.firestore.batch();
    
        batch.update(auctionRef.ref, { currentPrice: userBidAmount });
    
        const bidId = this.firestore.createId();
        const user = await this.afAuth.currentUser;
        batch.set(bidsCollectionRef.doc(bidId).ref, {
            id: bidId,
            userId: user?.uid,
            amount: userBidAmount,
            timestamp: new Date(),
        });
    
        try {
            await batch.commit();
            return true;
        } catch (error) {
            console.error('Error placing bid:', error);
            return false;
        }
    } 

    async getAuctionsWithMyBids(): Promise<{ auction: Auction, highestBid?: Bid }[]> {
        const userId = await this.getCurrentUserId();
        if (!userId) return [];
        
        const auctionsWithBids: { auction: Auction, highestBid?: Bid }[] = [];
        
        const auctionsSnapshot = await this.firestore.collection('auctions').get().toPromise();
        
        // Fetch highest bids for all auctions in parallel
        const bidsPromises = auctionsSnapshot!.docs.map(async auctionDoc => {
            const auctionData = auctionDoc.data() as Auction;
            const bidsSnapshot = await auctionDoc.ref.collection('bids').orderBy('amount', 'desc').limit(1).get();
            if (!bidsSnapshot.empty) {
                const highestBidData = bidsSnapshot.docs[0].data() as Bid;
                if (highestBidData.userId === userId) {
                    auctionsWithBids.push({
                        auction: auctionData,
                        highestBid: highestBidData
                    });
                }
            }
        });
    
        await Promise.all(bidsPromises);
        
        return auctionsWithBids;
    }       

    selectFilter(filter: string): void {
        this.selectedFilter = filter;
        this.updateFilteredAuctions();
    }

    searchAuctions(): void {
        this.updateFilteredAuctions();
    }

    updateFilteredAuctions(): void {
        let currentFiltered = Array.from(this._auctionsCache.values());
        
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
    
    onAuctionItemClick(auctionId: string): void {
        this.navigateTo(`/auction/${auctionId}`);
    }
    
    async navigateTo(route: string): Promise<void> {
        const user = await this.afAuth.currentUser;
        const authenticated = user !== null;
        if (authenticated) {
            this.router.navigate([`/${route}`]);
        } else {
            this.router.navigate(['/login']);
        }
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
