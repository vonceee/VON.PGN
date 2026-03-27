import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Coaches } from './coaches';

describe('Coaches', () => {
  let component: Coaches;
  let fixture: ComponentFixture<Coaches>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Coaches],
    }).compileComponents();

    fixture = TestBed.createComponent(Coaches);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
