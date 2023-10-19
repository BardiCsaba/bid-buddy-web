import { Component } from '@angular/core';

interface Auction {
  name: string;
  price: number;
  endDate: Date;
  imageSrc: string;
}

@Component({
  selector: 'app-my-bids',
  templateUrl: './my-bids.component.html',
  styleUrls: ['./my-bids.component.scss']
})
export class MyBidsComponent {

}
