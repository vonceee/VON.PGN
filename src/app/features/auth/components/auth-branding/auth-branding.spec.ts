import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthBranding } from './auth-branding';

describe('AuthBranding', () => {
  let component: AuthBranding;
  let fixture: ComponentFixture<AuthBranding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthBranding],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthBranding);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
