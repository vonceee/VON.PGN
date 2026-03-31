import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CoachesComponent } from './coaches.component';

describe('CoachesComponent', () => {
  let component: CoachesComponent;
  let fixture: ComponentFixture<CoachesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachesComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CoachesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
