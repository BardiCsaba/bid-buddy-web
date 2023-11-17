import firebase from 'firebase/compat/app';

export class ChatMessage {
    constructor(
        public messageId: string,
        public senderUserId: string,
        public message: string,
        public timestamp: firebase.firestore.Timestamp,
        public profilePicUrl?: string,
        public displayName?: string,
    ) { }
}