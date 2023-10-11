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
  auctions: Auction[] = [
    {
        name: 'Designer Shoes',
        price: 220.0,
        endDate: new Date('2023-10-30T17:00:00'),
        imageSrc: 'assets/images/test.jpg'
    },
    {
        name: 'Vintage Book Collection',
        price: 90.0,
        endDate: new Date('2023-10-11T15:30:00'),
        imageSrc: 'assets/images/test.jpg'
    },
    {
        name: 'Modern Sofa Set',
        price: 720.0,
        endDate: new Date('2023-10-11T20:45:00'),
        imageSrc: 'assets/images/test.jpg'
    }
];

}
