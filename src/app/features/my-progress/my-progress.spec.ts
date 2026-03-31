import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyProgressComponent } from './my-progress.component';

describe('MyProgressComponent', () => {
  let component: MyProgressComponent;
  let fixture: ComponentFixture<MyProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyProgressComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MyProgressComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
