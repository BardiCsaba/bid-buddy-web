import { Component } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn, Validators, FormBuilder } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuctionService, ViewContext } from '../shared/auction.service';
import { Auction } from '../models/auction.model';

@Component({
    selector: 'app-my-auctions',
    templateUrl: './my-auctions.component.html',
    styleUrls: ['./my-auctions.component.scss'],
})
export class MyAuctionsComponent {
    myAuctions: Auction[] = [];
    formSubmitted = false;
    isFormVisible = false;
    uploadedImageURL: Observable<string | null> | undefined;
    auctionForm = this.fb.group({
        title: ['', Validators.required],
        description: ['', Validators.required],
        type: ['', Validators.required],
        endDate: ['', [Validators.required, this.endDateValidator()]],
        startingPrice: [null as number | null, [Validators.required, this.startingPriceValidator()]],
        imageSrc: [null as string | null, Validators.required],
        imageFile: [null as File | null, [Validators.required, this.imageFileTypeValidator()]],
    });

    constructor(
        public auctionService: AuctionService,
        private fb: FormBuilder,
        private storage: AngularFireStorage) { }

    ngOnInit() {
        this.auctionService.viewContext = ViewContext.MyAuctions;
        this.auctionService.updateFilteredAuctions();
        this.auctionService.filteredAuctions.subscribe((auctions) => {
            this.myAuctions = auctions;
        });
    }

    startingPriceValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const price = control.value;
            if (price <= 0) {
                return { invalidStartingPrice: true };
            }
            return null;
        };
    }    

    endDateValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const selectedDate = new Date(control.value);
            const currentDate = new Date();
            currentDate.setHours(currentDate.getHours() + 24);

            if (selectedDate <= currentDate) {
                return { invalidEndDate: true };
            }
            return null;
        };
    }

    imageFileTypeValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const file = control.value as File | null;
            if (file) {
                const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!validImageTypes.includes(file.type)) {
                    return { invalidFileType: true };
                }
            }
            return null;
        };
    }     

    onImageUpload(event: any) {
        const file: File = event.target.files[0];
        this.auctionForm.patchValue({ imageFile: file });
    
        if (this.auctionForm.get('imageFile')?.invalid) {
            console.error('Invalid file type. Please upload an image.');
            return;
        }
    
        const filePath = `auctions/${new Date().getTime()}_${file.name}`;
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, file);
    
        task.snapshotChanges().pipe(
            finalize(() => {
                this.uploadedImageURL = fileRef.getDownloadURL();
                this.uploadedImageURL.subscribe(url => {
                    if (url) {
                        this.auctionForm.patchValue({ imageSrc: url });
                    }
                });
            })
        )
        .subscribe();
    }    

    onSubmit() {
        this.formSubmitted = true;
        if (this.auctionForm.valid) {
            const newAuction: Auction = {
                currentPrice: this.auctionForm.value.startingPrice!,
                title: this.auctionForm.value.title!,
                description: this.auctionForm.value.description!,
                type: this.auctionForm.value.type!,
                endDate: new Date(this.auctionForm.value.endDate!),
                startingPrice: this.auctionForm.value.startingPrice!,
                imageSrc: this.auctionForm.value.imageSrc!,
            };
            this.auctionForm.patchValue({ imageFile: null });
            this.auctionService
                .addNewAuction(newAuction)
                .then(() => {
                    this.toggleForm();
                })
                .catch((error) => {
                    console.error('Error adding auction: ', error);
                });
        }
    }

    isFieldInvalid(fieldName: string, validationType: string): boolean {
        const control = this.auctionForm.get(fieldName);
        return !!(this.formSubmitted && control?.hasError(validationType));
    }

    toggleForm() {
        if (this.isFormVisible) {
            this.isFormVisible = false;
        } else {
            const defaultEndDate = new Date();
            defaultEndDate.setHours(defaultEndDate.getHours() + 27);
            this.auctionForm.patchValue({ endDate: defaultEndDate.toISOString().slice(0, 16)});
            this.auctionForm.patchValue({ startingPrice: 1 });
            this.isFormVisible = true;
            //this.auctionService.populateAuctions();
        }
    }

    onAuctionItemClick(auctionId: string): void {
        this.auctionService.navigateTo(`/auction/${auctionId}`);
    }
}
