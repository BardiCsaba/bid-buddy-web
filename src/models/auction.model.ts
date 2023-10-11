// models/auction.model.ts
export class Auction {
    constructor(
        public name: string,
        public price: number,
        public endDate: Date,
        public imageRes: string
    ) { }
}
