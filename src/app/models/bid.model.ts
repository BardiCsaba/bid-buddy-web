import firebase from 'firebase/compat/app';

export class Bid {
    constructor(
        public userId: string,
        public amount: number,
        public timestamp: firebase.firestore.Timestamp,
        public profilePicUrl?: string,
        public displayName?: string,
    ) { }
}

