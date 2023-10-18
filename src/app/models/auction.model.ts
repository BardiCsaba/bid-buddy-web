import { Bid } from './bid.model';

export class Auction {
    constructor(
        public title: string,
        public description: string,
        public type: string,
        public endDate: Date,
        public startingPrice: number,
        public createdBy: string,
        public isActive: boolean,
        public imageSrc?: string,
        public id?: string,
        public currentPrice?: number,
        public bids?: Array<Bid>,
        public winningBidder?: string,
    ) { }
}