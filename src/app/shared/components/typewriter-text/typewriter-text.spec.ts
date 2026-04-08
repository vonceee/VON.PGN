import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypewriterText } from './typewriter-text';

describe('TypewriterText', () => {
  let component: TypewriterText;
  let fixture: ComponentFixture<TypewriterText>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypewriterText],
    }).compileComponents();

    fixture = TestBed.createComponent(TypewriterText);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
