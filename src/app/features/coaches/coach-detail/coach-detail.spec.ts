import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoachDetail } from './coach-detail';

describe('CoachDetail', () => {
  let component: CoachDetail;
  let fixture: ComponentFixture<CoachDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(CoachDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
