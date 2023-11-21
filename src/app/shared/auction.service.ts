import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, map, combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Auction } from '../models/auction.model';
import { Bid } from '../models/bid.model';
import { User } from '../models/user.model';
import { Router } from '@angular/router';
import { ChatMessage } from '../models/chat.model';

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
    filteredAuctions: BehaviorSubject<Auction[]> = new BehaviorSubject<
        Auction[]
    >([]);

    private _currentUserId?: string;
    private _auctionsCache: Map<string, Auction> = new Map();
    private _bidsCache: Map<string, Bid[]> = new Map();

    constructor(
        private firestore: AngularFirestore,
        private afAuth: AngularFireAuth,
        private router: Router
    ) {
        this.loadAllAuctions();
        this.loadAuctionTypes();
    }

    // Load collections from Firestore.
    private loadAllAuctions() {
        this.firestore
            .collection('auctions')
            .snapshotChanges()
            .subscribe((data) => {
                data.forEach((e) => {
                    const data = e.payload.doc.data() as any;
                    data.endDate = data.endDate.toDate();
                    const auction: Auction = {
                        id: e.payload.doc.id,
                        ...data,
                    };
                    this._auctionsCache.set(e.payload.doc.id, auction);
                });
                this.updateFilteredAuctions();
            });
    }

    private loadAuctionBids(auctionId: string) {
        if (!this._bidsCache.has(auctionId)) {
            this._bidsCache.set(auctionId, []);
        }

        this.firestore
            .collection('auctions')
            .doc(auctionId)
            .collection<Bid>('bids')
            .snapshotChanges()
            .subscribe((data) => {
                const bids: Bid[] = data.map(
                    (e) => e.payload.doc.data() as Bid
                );
                this._bidsCache.set(auctionId, bids);
            });
    }

    private loadAuctionChats(auctionId: string): Observable<ChatMessage[]> {
        return this.firestore
            .collection('auctions')
            .doc(auctionId)
            .collection<ChatMessage>('chat', (ref) =>
                ref.orderBy('timestamp', 'desc')
            )
            .snapshotChanges()
            .pipe(
                switchMap((chatSnapshots) => {
                    if (chatSnapshots.length === 0) {
                        return of([]);
                    }
                    const chats = chatSnapshots.map(
                        (chatSnapshot) =>
                            chatSnapshot.payload.doc.data() as ChatMessage
                    );
                    return combineLatest(
                        chats.map((chat) =>
                            this.firestore
                                .collection('users')
                                .doc(chat.senderUserId)
                                .get()
                                .pipe(
                                    map((userDoc) => {
                                        const userData = userDoc.data() as User;
                                        if (userData.profilePicUrl === '') {
                                            chat.profilePicUrl =
                                                this.defaultProfilePicUrl;
                                        } else {
                                            chat.profilePicUrl =
                                                userData.profilePicUrl;
                                        }
                                        if (userData.firstName) {
                                            chat.displayName =
                                                userData.firstName +
                                                ' ' +
                                                userData.lastName;
                                        } else {
                                            chat.displayName = 'Anonymous';
                                        }
                                        return chat;
                                    })
                                )
                        )
                    );
                })
            );
    }

    private loadAuctionTypes() {
        this.firestore
            .collection('auction-types', (ref) => ref.orderBy('order'))
            .snapshotChanges()
            .subscribe((data) => {
                const auctionTypes = data.map(
                    (e) => (e.payload.doc.data() as any).name
                );
                this.filters.next(['All', ...auctionTypes]);
            });
    }

    getAvailableFilters(): Observable<string[]> {
        return this.filters.pipe(
            map((filtersArray: any[]) =>
                filtersArray.filter((filter) => filter !== 'All')
            )
        );
    }

    getAllAuctions(): Auction[] {
        return Array.from(this._auctionsCache.values());
    }

    getUserData(userId: string): Observable<User> {
        return this.firestore
            .collection('users')
            .doc(userId)
            .snapshotChanges()
            .pipe(
                map((userSnapshot) => {
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
        return Array.from(this._auctionsCache.values()).filter(
            (auction) => auction.createdBy === userId
        );
    }

    async addNewAuction(auction: Auction): Promise<void> {
        const userId = await this.getCurrentUserId();
        if (!userId) {
            throw new Error('No user is currently authenticated.');
        }
        auction.createdBy = userId;
        auction.id = this.firestore.createId();
        auction.isActive = true;

        return this.firestore
            .collection('auctions')
            .doc(auction.id)
            .set(auction)
            .then(() => {
                this.loadAllAuctions();
            });
    }

    getAuctionWithBidsAndChats(auctionId: string): Observable<Auction> {
        try {
            const auction$ = this.firestore
                .collection('auctions')
                .doc(auctionId)
                .snapshotChanges()
                .pipe(
                    map((auctionSnapshot) => {
                        const auctionData =
                            auctionSnapshot.payload.data() as any;
                        auctionData.endDate = auctionData.endDate.toDate();
                        return {
                            id: auctionSnapshot.payload.id,
                            ...auctionData,
                        } as Auction;
                    })
                );
            const bids$ = this.firestore
                .collection('auctions')
                .doc(auctionId)
                .collection<Bid>('bids')
                .snapshotChanges()
                .pipe(
                    switchMap((bidSnapshots) => {
                        if (bidSnapshots.length === 0) {
                            return of([]);
                        }
                        const bids = bidSnapshots.map(
                            (bidSnapshot) =>
                                bidSnapshot.payload.doc.data() as Bid
                        );
                        return combineLatest(
                            bids.map((bid) =>
                                this.firestore
                                    .collection('users')
                                    .doc(bid.userId)
                                    .get()
                                    .pipe(
                                        map((userDoc) => {
                                            const userData =
                                                userDoc.data() as User;
                                            if (userData.profilePicUrl === '') {
                                                bid.profilePicUrl =
                                                    this.defaultProfilePicUrl;
                                            } else {
                                                bid.profilePicUrl =
                                                    userData.profilePicUrl;
                                            }
                                            if (userData.firstName) {
                                                bid.displayName =
                                                    userData.firstName +
                                                    ' ' +
                                                    userData.lastName;
                                            } else {
                                                bid.displayName = 'Anonymous';
                                            }
                                            return bid;
                                        })
                                    )
                            )
                        );
                    }),
                    map((bids) => bids.sort((a, b) => b.amount - a.amount))
                );

            const chats$ = this.loadAuctionChats(auctionId);

            return combineLatest([auction$, bids$, chats$]).pipe(
                map(([auction, bids, chats]) => {
                    auction.bids = bids;
                    auction.chats = chats;
                    return auction;
                })
            );
        } catch (error) {
            console.log('Error getting auction with bids:', error);
            throw error;
        }
    }

    async sendChatMessage(
        auctionId: string,
        message: string,
        userId: string
    ): Promise<void> {
        if (!message.trim()) {
            return;
        }

        const chatsRef = this.firestore
            .collection('auctions')
            .doc(auctionId)
            .collection('chat');
        const batch = this.firestore.firestore.batch();
        const messageId = this.firestore.createId();

        batch.set(chatsRef.doc(messageId).ref, {
            messageId: messageId,
            senderUserId: userId,
            message: message.trim(),
            timestamp: new Date(),
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error('Error sending chat message:', error);
        }
    }

    async placeBidForAuction(
        auctionId: string,
        userBidAmount: number,
        userId: string
    ): Promise<boolean> {
        const auctionRef = this.firestore.collection('auctions').doc(auctionId);
        const bidsCollectionRef = auctionRef.collection('bids');

        const batch = this.firestore.firestore.batch();

        batch.update(auctionRef.ref, {
            currentPrice: userBidAmount,
            highestBidderId: userId,
        });

        const bidId = this.firestore.createId();
        batch.set(bidsCollectionRef.doc(bidId).ref, {
            id: bidId,
            userId: userId,
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

    async getAuctionsWithMyBids(): Promise<
        { auction: Auction; highestBid?: Bid }[]
    > {
        const userId = await this.getCurrentUserId();
        if (!userId) return [];

        const auctionsWithBids: { auction: Auction; highestBid?: Bid }[] = [];

        const auctionsSnapshot = await this.firestore
            .collection('auctions')
            .get()
            .toPromise();

        // Fetch highest bids for all auctions in parallel
        const bidsPromises = auctionsSnapshot!.docs.map(async (auctionDoc) => {
            const auctionData = auctionDoc.data() as Auction;
            auctionData.endDate = (auctionData.endDate as any).toDate();
            const bidsSnapshot = await auctionDoc.ref
                .collection('bids')
                .orderBy('amount', 'desc')
                .limit(1)
                .get();
            if (!bidsSnapshot.empty) {
                const highestBidData = bidsSnapshot.docs[0].data() as Bid;
                if (highestBidData.userId === userId) {
                    auctionsWithBids.push({
                        auction: auctionData,
                        highestBid: highestBidData,
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
            currentFiltered = currentFiltered.filter(
                (auction) => auction.type === this.selectedFilter
            );
        }

        // Search by title.
        if (this.searchText) {
            const searchLower = this.searchText.toLowerCase();
            currentFiltered = currentFiltered.filter((auction) =>
                auction.title.toLowerCase().includes(searchLower)
            );
        }

        // Filter by view context.
        if (this.viewContext === ViewContext.MyAuctions) {
            this.getMyAuctions().then((myAuctions) => {
                this.filteredAuctions.next(
                    currentFiltered.filter((auction) =>
                        myAuctions.includes(auction)
                    )
                );
            });
        } else {
            this.filteredAuctions.next(currentFiltered);
        }
    }

    timeLeft(auctionEndDate: Date): Observable<string> {
        return new Observable<string>((observer) => {
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
    populateAuctions(): Promise<void[]> {
        const auctions = [
            {
                createdBy: 'N2oWHPKKfEcsHkJK8zUDjkZnFlN2',
                currentPrice: 100,
                description:
                    'High-quality tennis racket, perfect for professional players.',
                endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700574744414_Tennis_Racket_and_Balls.jpg?alt=media&token=d69395d5-8cf8-41d3-9046-b0db2a7e93af',
                isActive: true,
                startingPrice: 100,
                title: 'Professional Tennis Racket',
                type: 'Sports',
            },
            {
                createdBy: 'NrhdpkTqzqajHkxnH4g9qKE5d2f2',
                currentPrice: 50,
                description:
                    'Latest Bluetooth headphones with noise cancellation.',
                endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700574744414_Tennis_Racket_and_Balls.jpg?alt=media&token=d69395d5-8cf8-41d3-9046-b0db2a7e93af',
                isActive: true,
                startingPrice: 50,
                title: 'Bluetooth Headphones',
                type: 'Electronics',
            },
            {
                createdBy: 'RFWqMpXuYGMbpWdGl1vohkZGvlM2',
                currentPrice: 30,
                description: 'Elegant, stylish summer dress, size M.',
                endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700574744414_Tennis_Racket_and_Balls.jpg?alt=media&token=d69395d5-8cf8-41d3-9046-b0db2a7e93af',
                isActive: true,
                startingPrice: 30,
                title: 'Summer Dress',
                type: 'Clothing',
            },
            {
                createdBy: 'pJYJpZr57VVI8QLjcMyz290q3ht2',
                currentPrice: 20,
                description:
                    'Bestselling novel, hardcover edition, in mint condition.',
                endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700574744414_Tennis_Racket_and_Balls.jpg?alt=media&token=d69395d5-8cf8-41d3-9046-b0db2a7e93af',
                isActive: true,
                startingPrice: 20,
                title: 'Bestselling Novel',
                type: 'Books',
            },
            {
                createdBy: 'KEyBE0lCDoh9lEmf1MnFGMNmy4u2',
                currentPrice: 40,
                description:
                    'Handmade wooden picture frame, perfect for home decor.',
                endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700574744414_Tennis_Racket_and_Balls.jpg?alt=media&token=d69395d5-8cf8-41d3-9046-b0db2a7e93af',
                isActive: true,
                startingPrice: 40,
                title: 'Wooden Picture Frame',
                type: 'Home Decor',
            },
            {
                createdBy: 'N2oWHPKKfEcsHkJK8zUDjkZnFlN2',
                currentPrice: 200,
                description:
                    'Sleek and powerful laptop, ideal for both work and gaming.',
                endDate: new Date(Date.now() +(3 + Math.floor(Math.random() * 9)) *24 *60 *60 *1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700576271001_laptop.jpg?alt=media&token=9beb3723-72f7-444f-831e-a671b297dfd3',
                isActive: true,
                startingPrice: 200,
                title: 'High-End Laptop',
                type: 'Electronics',
            },
            {
                createdBy: 'NrhdpkTqzqajHkxnH4g9qKE5d2f2',
                currentPrice: 150,
                description:
                    'Latest model smartwatch with fitness tracking and heart rate monitor.',
                endDate: new Date(Date.now() +(3 + Math.floor(Math.random() * 9)) *24 *60 *60 *1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700576271001_laptop.jpg?alt=media&token=9beb3723-72f7-444f-831e-a671b297dfd3',
                isActive: true,
                startingPrice: 150,
                title: 'Smartwatch',
                type: 'Electronics',
            },
            {
                createdBy: 'RFWqMpXuYGMbpWdGl1vohkZGvlM2',
                currentPrice: 120,
                description:
                    'Compact and portable Bluetooth speaker with excellent sound quality.',
                endDate: new Date(Date.now() +(3 + Math.floor(Math.random() * 9)) *24 *60 *60 *1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700576271001_laptop.jpg?alt=media&token=9beb3723-72f7-444f-831e-a671b297dfd3',
                isActive: true,
                startingPrice: 120,
                title: 'Bluetooth Speaker',
                type: 'Electronics',
            },
            {
                createdBy: 'pJYJpZr57VVI8QLjcMyz290q3ht2',
                currentPrice: 80,
                description:
                    'Ergonomic wireless mouse with high precision sensor and long battery life.',
                endDate: new Date(Date.now() +(3 + Math.floor(Math.random() * 9)) *24 *60 *60 *1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700576271001_laptop.jpg?alt=media&token=9beb3723-72f7-444f-831e-a671b297dfd3',
                isActive: true,
                startingPrice: 80,
                title: 'Wireless Mouse',
                type: 'Electronics',
            },
            {
                createdBy: 'KEyBE0lCDoh9lEmf1MnFGMNmy4u2',
                currentPrice: 90,
                description:
                    'VR headset providing an immersive virtual reality experience.',
                endDate: new Date(Date.now() +(3 + Math.floor(Math.random() * 9)) *24 *60 *60 *1000),
                imageSrc:
                    'https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700576271001_laptop.jpg?alt=media&token=9beb3723-72f7-444f-831e-a671b297dfd3',
                isActive: true,
                startingPrice: 90,
                title: 'VR Headset',
                type: 'Electronics',
            },
            {
                createdBy: "N2oWHPKKfEcsHkJK8zUDjkZnFlN2",
                currentPrice: 60,
                description: "Designer ceramic vase, perfect for modern home decor.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578377670_t-shirt.png?alt=media&token=534d1509-1b88-462a-b2e4-9308a14cb503",
                isActive: true,
                startingPrice: 60,
                title: "Ceramic Vase",
                type: "Home Decor"
              },
              {
                createdBy: "NrhdpkTqzqajHkxnH4g9qKE5d2f2",
                currentPrice: 25,
                description: "Set of premium quality kitchen knives for culinary enthusiasts.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578377670_t-shirt.png?alt=media&token=534d1509-1b88-462a-b2e4-9308a14cb503",
                isActive: true,
                startingPrice: 25,
                title: "Kitchen Knife Set",
                type: "Home Goods"
              },
              {
                createdBy: "RFWqMpXuYGMbpWdGl1vohkZGvlM2",
                currentPrice: 45,
                description: "Advanced yoga mat with non-slip surface for fitness enthusiasts.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578377670_t-shirt.png?alt=media&token=534d1509-1b88-462a-b2e4-9308a14cb503",
                isActive: true,
                startingPrice: 45,
                title: "Yoga Mat",
                type: "Sports"
              },
              {
                createdBy: "pJYJpZr57VVI8QLjcMyz290q3ht2",
                currentPrice: 35,
                description: "Stylish wall clock with a minimalist design, perfect for any room.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578377670_t-shirt.png?alt=media&token=534d1509-1b88-462a-b2e4-9308a14cb503",
                isActive: true,
                startingPrice: 35,
                title: "Wall Clock",
                type: "Home Decor"
              },
              {
                createdBy: "KEyBE0lCDoh9lEmf1MnFGMNmy4u2",
                currentPrice: 50,
                description: "High-performance wireless earbuds with excellent sound quality.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578377670_t-shirt.png?alt=media&token=534d1509-1b88-462a-b2e4-9308a14cb503",
                isActive: true,
                startingPrice: 50,
                title: "Wireless Earbuds",
                type: "Electronics"
              },
              {
                createdBy: "N2oWHPKKfEcsHkJK8zUDjkZnFlN2",
                currentPrice: 150,
                description: "Elegant table lamp with a contemporary design, perfect for bedside tables.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578857399_sofa.jpg?alt=media&token=e45e365a-3b6d-4bd4-a4b4-6285303e6813",
                isActive: true,
                startingPrice: 150,
                title: "Table Lamp",
                type: "Home Decor"
              },
              {
                createdBy: "NrhdpkTqzqajHkxnH4g9qKE5d2f2",
                currentPrice: 70,
                description: "Innovative smart home hub with voice control features.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578857399_sofa.jpg?alt=media&token=e45e365a-3b6d-4bd4-a4b4-6285303e6813",
                isActive: true,
                startingPrice: 70,
                title: "Smart Home Hub",
                type: "Electronics"
              },
              {
                createdBy: "RFWqMpXuYGMbpWdGl1vohkZGvlM2",
                currentPrice: 40,
                description: "Premium quality chef's apron, durable and stain-resistant.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578857399_sofa.jpg?alt=media&token=e45e365a-3b6d-4bd4-a4b4-6285303e6813",
                isActive: true,
                startingPrice: 40,
                title: "Chef's Apron",
                type: "Home Decor"
              },
              {
                createdBy: "pJYJpZr57VVI8QLjcMyz290q3ht2",
                currentPrice: 100,
                description: "Innovative gardening tool set, essential for every gardener.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578857399_sofa.jpg?alt=media&token=e45e365a-3b6d-4bd4-a4b4-6285303e6813",
                isActive: true,
                startingPrice: 100,
                title: "Gardening Tool Set",
                type: "Home Decor"
              },
              {
                createdBy: "KEyBE0lCDoh9lEmf1MnFGMNmy4u2",
                currentPrice: 85,
                description: "Compact and portable coffee maker, ideal for coffee enthusiasts.",
                endDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 9)) * 24 * 60 * 60 * 1000),
                imageSrc: "https://firebasestorage.googleapis.com/v0/b/bidbuddy-c3d4d.appspot.com/o/auctions%2F1700578857399_sofa.jpg?alt=media&token=e45e365a-3b6d-4bd4-a4b4-6285303e6813",
                isActive: true,
                startingPrice: 85,
                title: "Portable Coffee Maker",
                type: "Home Decor"
              }
        ];

        const promises = auctions.sort(() => 0.5 - Math.random()).map((auction) => {
            const id = this.firestore.createId();
            return this.firestore
                .collection('auctions')
                .doc(id)
                .set({
                    id,
                    ...auction,
                });
        });

        return Promise.all(promises);
    }
    */

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
