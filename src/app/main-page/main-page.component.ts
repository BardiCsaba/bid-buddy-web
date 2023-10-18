import { Component } from '@angular/core';
import { AuctionService } from '../shared/auction.service';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent {
    constructor(public auctionService: AuctionService) { }

    ngOnInit() { }
}
