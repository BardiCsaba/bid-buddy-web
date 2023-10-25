export class User {
    constructor(
        public userId: string,
        public displayName: string,
        public firstName: string,
        public lastName: string,
        public profilePicUrl: string,
        public balance: number,
    ) { }
}