import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuctionService } from '../shared/auction.service';
import { Auction } from '../models/auction.model';

@Component({
    selector: 'app-my-auctions',
    templateUrl: './my-auctions.component.html',
    styleUrls: ['./my-auctions.component.scss'],
})
export class MyAuctionComponent {
    isFormVisible = false;
    uploadedImageURL: Observable<string | null> | undefined;
    auctionForm = this.fb.group({
        title: ['', Validators.required],
        description: ['', Validators.required],
        type: ['', Validators.required],
        endDate: ['', Validators.required],
        startingPrice: [null, Validators.required],
        imageSrc: [null as string | null, Validators.required],
    });    

    constructor(
        public auctionService: AuctionService, 
        private fb: FormBuilder, 
        private storage: AngularFireStorage) {}

    ngOnInit() {
    }

    onImageUpload(event: any) {
        const file = event.target.files[0];
        const filePath = `auctions/${new Date().getTime()}_${file.name}`;
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, file);

        task.snapshotChanges().pipe(
            finalize(() => {
                this.uploadedImageURL = fileRef.getDownloadURL();
                this.uploadedImageURL.subscribe(url => {
                    if (url) {
                        this.auctionForm.patchValue({ imageSrc: url });
                        file.value = '';
                    }
                });
            })
        )
        .subscribe();
    }

    onSubmit() {
        if (this.auctionForm.valid) {
            const newAuction: Auction = {
                createdBy: 'user1',
                isActive: true,
                currentPrice: this.auctionForm.value.startingPrice!,
                title: this.auctionForm.value.title!,
                description: this.auctionForm.value.description!,
                type: this.auctionForm.value.type!,
                endDate: new Date(this.auctionForm.value.endDate!),
                startingPrice: this.auctionForm.value.startingPrice!,
                imageSrc: this.auctionForm.value.imageSrc!,
            };
            this.auctionService
                .addNewAuction(newAuction)
                .then(() => {
                    this.hideForm();
                })
                .catch((error) => {
                    console.error('Error adding auction: ', error);
                });
        }
    }

    isFieldInvalid(fieldName: string, validationType: string): boolean {
        const control = this.auctionForm.get(fieldName);
        return !!(control?.touched && control?.hasError(validationType));
    }

    showForm() {
        this.isFormVisible = true;
    }

    hideForm() {
        this.isFormVisible = false;
    }
}
