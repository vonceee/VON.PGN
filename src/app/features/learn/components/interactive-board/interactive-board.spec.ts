import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractiveBoardComponent } from './interactive-board.component';

describe('InteractiveBoard', () => {
  let component: InteractiveBoardComponent;
  let fixture: ComponentFixture<InteractiveBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveBoardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveBoardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
