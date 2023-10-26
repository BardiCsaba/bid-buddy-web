import { Component, OnInit } from '@angular/core';
import { AuctionService } from '../shared/auction.service';
import { Auction } from '../models/auction.model';
import { Bid } from '../models/bid.model';

@Component({
    selector: 'app-my-bids',
    templateUrl: './my-bids.component.html',
    styleUrls: ['./my-bids.component.scss']
})
export class MyBidsComponent implements OnInit {
    auctionsWithMyBid: { auction: Auction, highestBid?: Bid }[] = [];

    constructor(public auctionService: AuctionService) { }

    async ngOnInit() {
        this.auctionsWithMyBid = await this.auctionService.getAuctionsWithMyBids();
        console.log(this.auctionsWithMyBid);
    }

    onAuctionItemClick(auctionId: string): void {
        this.auctionService.navigateTo(`/auction/${auctionId}`);
    }
}