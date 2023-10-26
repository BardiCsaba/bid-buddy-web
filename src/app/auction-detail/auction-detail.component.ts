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

    constructor(
        private route: ActivatedRoute,
        public auctionService: AuctionService,
        private afAuth: AngularFireAuth
    ) {}

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.auctionService.getAuctionWithBids(id)
                .subscribe(
                    (auctionWithBids) => {
                        this.auction = auctionWithBids;
                        this.userBidAmount = this.auction.currentPrice + 1;

                        if (!this.auction.bids) {
                            this.auction.bids = [];
                        }

                        if (this.auction.createdBy) {
                            this.auctionService.getUserData(this.auction.createdBy).subscribe(userData => {
                                this.createdByUser = userData;
                            });
                        }

                        this.afAuth.currentUser.then(user => {
                            if (user) {
                                this.currentUserId = user.uid;
                            }
                        });
                    },
                    (error) => {
                        console.error("Error fetching auction with bids:", error);
                    }
                );
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
    
        try {
            const success = await this.auctionService.placeBidForAuction(this.auction.id, this.userBidAmount); 
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
}
