import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuctionService } from '../shared/auction.service';
import { Auction } from '../models/auction.model';
import { User } from '../models/user.model';

@Component({
    selector: 'app-auction-detail',
    templateUrl: './auction-detail.component.html',
    styleUrls: ['./auction-detail.component.scss'],
})
export class AuctionDetailComponent implements OnInit {
    defaultProfilePicUrl = '/assets/images/profile-pic.jpg';
    auction?: Auction;
    userBidAmount?: number;
    errorMessage: string | null = null;
    createdByUser?: User;
    currentUserId?: string;
    currentUser?: User;
    showChat = false;
    userChatMessage: string = '';

    constructor(
        private route: ActivatedRoute,
        public auctionService: AuctionService,
        private afAuth: AngularFireAuth
    ) {}

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.auctionService.getAuctionWithBidsAndChats(id)
                .subscribe(
                    async (auctionWithBidsAndChats) => {
                        this.auction = auctionWithBidsAndChats;
                        this.userBidAmount = this.auction.currentPrice + 1;

                        if (!this.auction.bids) {
                            this.auction.bids = [];
                        }

                        if (!this.auction.chats) {
                            this.auction.chats = [];
                        }

                        if (this.auction.createdBy) {
                            this.auctionService.getUserData(this.auction.createdBy).subscribe(userData => {
                                this.createdByUser = userData;
                            });
                        }

                        this.afAuth.currentUser.then(user => {
                            if (user) {
                                this.currentUserId = user.uid;
                                this.auctionService.getUserData(this.currentUserId!).subscribe(userData => {
                                    this.currentUser = userData;
                                });
                            }
                        });
                    },
                    (error) => {
                        console.error("Error fetching auction with bids:", error);
                    }
                );
        }
    }

    sendChatMessage() {
        if (this.userChatMessage.trim()) {
            console.log('Sending message:', this.userChatMessage);
            this.auctionService.sendChatMessage(this.auction!.id!, this.userChatMessage, this.currentUserId!);
            this.userChatMessage = '';
            this.auction = this.auctionService.getAllAuctions().find((auction) => auction.id === this.auction!.id);
        }
    }

    async placeBid() {
        if (!this.auction || !this.auction.id) return;
    
        if (this.userBidAmount === undefined) {
            this.errorMessage = 'Place your bid amount.';
            return;
        }
    
        if (this.userBidAmount <= this.auction.currentPrice) {
            this.errorMessage = 'Your bid must be higher than the current price.';
            return;
        }

        if (this.currentUser && this.currentUser.balance < this.userBidAmount) {
            this.errorMessage = 'You do not have enough balance to place this bid.';
            return;
        }
    
        try {
            const success = await this.auctionService.placeBidForAuction(this.auction.id, this.userBidAmount, this.currentUserId!); 
            if (success) {
                if (this.auction && this.auction.id) {
                    this.auction = this.auctionService.getAllAuctions().find((auction) => auction.id === this.auction!.id);
                }
            } else {
                this.errorMessage = 'Error placing your bid. Please try again.';
            }
        } catch (error) {
            console.error(error);
            this.errorMessage = 'Error placing your bid. Please try again.';
        }
    }

    toggleChat() {
        if (this.showChat) {
            this.showChat = false;
        } else {
            this.showChat = true;
        }
    }
}
