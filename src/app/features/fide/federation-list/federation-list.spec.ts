import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FederationList } from './federation-list';

describe('FederationList', () => {
  let component: FederationList;
  let fixture: ComponentFixture<FederationList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FederationList],
    }).compileComponents();

    fixture = TestBed.createComponent(FederationList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
