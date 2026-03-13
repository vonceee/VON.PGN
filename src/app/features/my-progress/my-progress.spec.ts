import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyProgress } from './my-progress';

describe('MyProgress', () => {
  let component: MyProgress;
  let fixture: ComponentFixture<MyProgress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyProgress],
    }).compileComponents();

    fixture = TestBed.createComponent(MyProgress);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
