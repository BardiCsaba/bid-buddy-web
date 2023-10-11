import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewBidComponent } from './new-bid.component';

describe('NewBidComponent', () => {
  let component: NewBidComponent;
  let fixture: ComponentFixture<NewBidComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NewBidComponent]
    });
    fixture = TestBed.createComponent(NewBidComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
