import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthBrandingComponent } from './auth-branding';

describe('AuthBrandingComponent', () => {
  let component: AuthBrandingComponent;
  let fixture: ComponentFixture<AuthBrandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthBrandingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthBrandingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
