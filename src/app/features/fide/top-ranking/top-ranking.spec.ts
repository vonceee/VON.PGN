import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopRanking } from './top-ranking';

describe('TopRanking', () => {
  let component: TopRanking;
  let fixture: ComponentFixture<TopRanking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopRanking],
    }).compileComponents();

    fixture = TestBed.createComponent(TopRanking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
