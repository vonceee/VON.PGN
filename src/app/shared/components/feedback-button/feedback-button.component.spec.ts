import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FeedbackButtonComponent } from './feedback-button.component';
import { FeedbackService } from '../../../core/services/feedback.service';

describe('FeedbackButtonComponent', () => {
  let component: FeedbackButtonComponent;
  let fixture: ComponentFixture<FeedbackButtonComponent>;
  let feedbackServiceSpy: {
    addFeedback: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    feedbackServiceSpy = {
      addFeedback: vi.fn().mockReturnValue({
        id: 'test-id',
        name: '',
        email: '',
        type: 'general',
        message: '',
        createdAt: new Date(),
        read: false,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [FeedbackButtonComponent, FormsModule],
      providers: [
        { provide: FeedbackService, useValue: feedbackServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── CREATION ────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the floating feedback button', () => {
    const button = fixture.nativeElement.querySelector('button[aria-label="Send feedback"]');
    expect(button).toBeTruthy();
  });

  it('should not show the modal initially', () => {
    expect(component.isOpen()).toBe(false);
    const modal = fixture.nativeElement.querySelector('.feedback-backdrop');
    expect(modal).toBeNull();
  });

  // ─── MODAL OPEN / CLOSE ─────────────────────────────────────────

  it('should open modal when button is clicked', () => {
    const button = fixture.nativeElement.querySelector('button[aria-label="Send feedback"]');
    button.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
  });

  it('should close modal when closeModal is called', () => {
    component.openModal();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    component.closeModal();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
  });

  it('should close modal when backdrop is clicked', () => {
    component.openModal();
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('.feedback-backdrop');
    backdrop.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
  });

  it('should not close modal when clicking inside modal content', () => {
    component.openModal();
    fixture.detectChanges();

    const modalContent = fixture.nativeElement.querySelector('.bg-white, .dark\\:bg-slate-900');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: modalContent });
    component.onBackdropClick(clickEvent);

    expect(component.isOpen()).toBe(true);
  });

  // ─── FORM STATE ──────────────────────────────────────────────────

  it('should initialize form with empty values', () => {
    expect(component.form.name).toBe('');
    expect(component.form.email).toBe('');
    expect(component.form.type).toBe('general');
    expect(component.form.message).toBe('');
  });

  it('should have three feedback types', () => {
    expect(component.feedbackTypes.length).toBe(3);
    expect(component.feedbackTypes.map((t) => t.value)).toEqual(['bug', 'suggestion', 'general']);
  });

  it('should initialize with isSubmitting false', () => {
    expect(component.isSubmitting()).toBe(false);
  });

  it('should initialize with isSubmitted false', () => {
    expect(component.isSubmitted()).toBe(false);
  });

  // ─── FORM SUBMISSION ────────────────────────────────────────────

  it('should not submit when message is empty', async () => {
    component.form = { name: '', email: '', type: 'general', message: '' };
    await component.onSubmit();

    expect(feedbackServiceSpy.addFeedback).not.toHaveBeenCalled();
  });

  it('should not submit when message is only whitespace', async () => {
    component.form = { name: '', email: '', type: 'general', message: '   ' };
    await component.onSubmit();

    expect(feedbackServiceSpy.addFeedback).not.toHaveBeenCalled();
  });

  it('should call feedbackService.addFeedback on submit', async () => {
    component.form = {
      name: 'John',
      email: 'john@test.com',
      type: 'bug',
      message: 'Found a bug',
    };

    await component.onSubmit();

    expect(feedbackServiceSpy.addFeedback).toHaveBeenCalledWith({
      name: 'John',
      email: 'john@test.com',
      type: 'bug',
      message: 'Found a bug',
    });
  });

  it('should set isSubmitted to true after successful submission', async () => {
    component.form = { name: '', email: '', type: 'general', message: 'Test feedback' };

    await component.onSubmit();

    expect(component.isSubmitted()).toBe(true);
  });

  it('should set isSubmitting during submission', () => {
    component.form = { name: '', email: '', type: 'general', message: 'Test' };

    const promise = component.onSubmit();
    expect(component.isSubmitting()).toBe(true);

    return promise.then(() => {
      expect(component.isSubmitting()).toBe(false);
    });
  });

  // ─── FORM RESET ─────────────────────────────────────────────────

  it('should reset form after closing submitted modal', () => {
    component.isSubmitted.set(true);
    component.form = {
      name: 'John',
      email: 'john@test.com',
      type: 'bug',
      message: 'Bug',
    };

    component.closeModal();

    expect(component.form.name).toBe('');
    expect(component.form.email).toBe('');
    expect(component.form.type).toBe('general');
    expect(component.form.message).toBe('');
    expect(component.isSubmitted()).toBe(false);
  });

  it('should not reset form when closing non-submitted modal', () => {
    component.form = {
      name: 'John',
      email: '',
      type: 'suggestion',
      message: 'In progress',
    };

    component.closeModal();

    expect(component.form.name).toBe('John');
    expect(component.form.message).toBe('In progress');
  });

  it('should reset form via resetForm method', () => {
    component.form = {
      name: 'John',
      email: 'john@test.com',
      type: 'bug',
      message: 'Bug report',
    };
    component.isSubmitted.set(true);

    component.resetForm();

    expect(component.form.name).toBe('');
    expect(component.form.email).toBe('');
    expect(component.form.type).toBe('general');
    expect(component.form.message).toBe('');
    expect(component.isSubmitted()).toBe(false);
  });

  // ─── RENDERING ──────────────────────────────────────────────────

  it('should show modal content when open', () => {
    component.openModal();
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('h2');
    expect(heading.textContent).toContain('Send Feedback');
  });

  it('should show success state after submission', () => {
    component.openModal();
    component.isSubmitted.set(true);
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('h2');
    expect(heading.textContent).toContain('Thank You');
  });

  it('should have name, email, type, and message inputs in modal', () => {
    component.openModal();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#feedback-name');
    const emailInput = fixture.nativeElement.querySelector('#feedback-email');
    const typeSelect = fixture.nativeElement.querySelector('#feedback-type');
    const messageInput = fixture.nativeElement.querySelector('#feedback-message');

    expect(nameInput).toBeTruthy();
    expect(emailInput).toBeTruthy();
    expect(typeSelect).toBeTruthy();
    expect(messageInput).toBeTruthy();
  });
});
