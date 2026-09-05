import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BughouseInviteToastComponent } from './bughouse-invite-toast.component';
import { BughouseInviteService } from '../../../../core/services/bughouse-invite.service';
import { signal } from '@angular/core';

describe('BughouseInviteToastComponent', () => {
  let component: BughouseInviteToastComponent;
  let fixture: ComponentFixture<BughouseInviteToastComponent>;
  let mockInviteService: any;

  beforeEach(async () => {
    mockInviteService = {
      incomingInvites: signal([
        { id: 'lobby_123', sender: 'Emilia Gates' }
      ]),
      acceptInvite: jasmine.createSpy('acceptInvite'),
      rejectInvite: jasmine.createSpy('rejectInvite'),
      dismissInvite: jasmine.createSpy('dismissInvite')
    };

    await TestBed.configureTestingModule({
      imports: [BughouseInviteToastComponent],
      providers: [
        { provide: BughouseInviteService, useValue: mockInviteService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BughouseInviteToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render invitation card', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Emilia Gates');
    expect(compiled.textContent).toContain('Sent you an invite to play Bughouse.');
    expect(compiled.textContent).toContain('Accept');
    expect(compiled.textContent).toContain('Decline');
  });

  it('should call acceptInvite when Accept button is clicked', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const acceptBtn = Array.from(buttons).find((b: any) => b.textContent.includes('Accept')) as HTMLButtonElement;
    expect(acceptBtn).toBeTruthy();
    acceptBtn.click();
    expect(mockInviteService.acceptInvite).toHaveBeenCalledWith('lobby_123');
  });

  it('should call rejectInvite when Decline button is clicked', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const declineBtn = Array.from(buttons).find((b: any) => b.textContent.includes('Decline')) as HTMLButtonElement;
    expect(declineBtn).toBeTruthy();
    declineBtn.click();
    expect(mockInviteService.rejectInvite).toHaveBeenCalledWith('lobby_123');
  });

  it('should call dismissInvite when close button is clicked', () => {
    const closeBtn = fixture.nativeElement.querySelector('button[aria-label="Dismiss"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(mockInviteService.dismissInvite).toHaveBeenCalledWith('lobby_123');
  });
});
