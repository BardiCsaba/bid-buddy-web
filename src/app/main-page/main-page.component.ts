import { Component } from '@angular/core';
import { AuctionService, ViewContext } from '../shared/auction.service';
import { Auction } from '../models/auction.model';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent {
    auctions: Auction[] = [];

    constructor(public auctionService: AuctionService) { }

    ngOnInit() {
        this.auctionService.viewContext = ViewContext.AllAuctions;
        this.auctionService.updateFilteredAuctions();
        this.auctionService.filteredAuctions.subscribe(auctions => {
            this.auctions = auctions;
        });
    }
}