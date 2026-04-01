import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { FeedbackListComponent } from './feedback-list';
import { FeedbackService, FeedbackItem, FeedbackType } from '../../../core/services/feedback.service';

describe('FeedbackListComponent', () => {
  let component: FeedbackListComponent;
  let fixture: ComponentFixture<FeedbackListComponent>;
  let feedbackServiceSpy: {
    feedbackItems: ReturnType<typeof signal<FeedbackItem[]>>;
    markAsRead: ReturnType<typeof vi.fn>;
    deleteFeedback: ReturnType<typeof vi.fn>;
    unreadCount: number;
  };

  const createFeedbackItem = (overrides: Partial<FeedbackItem> = {}): FeedbackItem => ({
    id: Math.random().toString(36).substring(2, 11),
    name: 'Test User',
    email: 'test@example.com',
    type: 'general',
    message: 'Test feedback message',
    createdAt: new Date('2026-03-15T10:00:00Z'),
    read: false,
    ...overrides,
  });

  const mockItems: FeedbackItem[] = [
    createFeedbackItem({ id: '1', type: 'bug', message: 'Bug report', read: false }),
    createFeedbackItem({ id: '2', type: 'suggestion', message: 'Suggestion item', read: true }),
    createFeedbackItem({ id: '3', type: 'general', message: 'General feedback', read: false }),
    createFeedbackItem({ id: '4', type: 'bug', message: 'Another bug', read: true }),
  ];

  beforeEach(async () => {
    feedbackServiceSpy = {
      feedbackItems: signal<FeedbackItem[]>([...mockItems]),
      markAsRead: vi.fn(),
      deleteFeedback: vi.fn(),
      unreadCount: 2,
    };

    await TestBed.configureTestingModule({
      imports: [FeedbackListComponent],
      providers: [
        provideRouter([]),
        { provide: FeedbackService, useValue: feedbackServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── CREATION ────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the page heading', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Feedback');
  });

  it('should display all feedback items by default', () => {
    expect(component.filteredItems().length).toBe(4);
  });

  // ─── FILTER TABS ────────────────────────────────────────────────

  it('should initialize with "all" filter selected', () => {
    expect(component.selectedFilter()).toBe('all');
  });

  it('should filter to bug reports', () => {
    component.setFilter('bug');
    fixture.detectChanges();

    expect(component.filteredItems().length).toBe(2);
    expect(component.filteredItems().every((item) => item.type === 'bug')).toBe(true);
  });

  it('should filter to suggestions', () => {
    component.setFilter('suggestion');
    fixture.detectChanges();

    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].type).toBe('suggestion');
  });

  it('should filter to general feedback', () => {
    component.setFilter('general');
    fixture.detectChanges();

    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].type === 'general').toBe(true);
  });

  it('should show all items when filter is set to "all"', () => {
    component.setFilter('bug');
    expect(component.filteredItems().length).toBe(2);

    component.setFilter('all');
    expect(component.filteredItems().length).toBe(4);
  });

  it('should highlight the active filter button', () => {
    component.setFilter('bug');
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    const bugButton = Array.from(buttons as NodeListOf<HTMLButtonElement>).find(
      (btn) => btn.textContent?.trim() === 'Bug Reports',
    );
    expect(bugButton?.classList.contains('bg-cyan-500')).toBe(true);
  });

  // ─── OPEN / CLOSE FEEDBACK ──────────────────────────────────────

  it('should open feedback detail on click', () => {
    component.openFeedback(mockItems[0]);
    fixture.detectChanges();

    expect(component.selectedFeedback()).toEqual(mockItems[0]);
  });

  it('should close feedback detail', () => {
    component.openFeedback(mockItems[0]);
    fixture.detectChanges();

    component.closeFeedback();
    fixture.detectChanges();

    expect(component.selectedFeedback()).toBeNull();
  });

  it('should mark feedback as read when opened', () => {
    const unreadItem = mockItems[0];
    expect(unreadItem.read).toBe(false);

    component.openFeedback(unreadItem);

    expect(feedbackServiceSpy.markAsRead).toHaveBeenCalledWith(unreadItem.id);
  });

  it('should not mark already-read feedback as read again', () => {
    const readItem = mockItems[1];
    expect(readItem.read).toBe(true);

    component.openFeedback(readItem);

    expect(feedbackServiceSpy.markAsRead).not.toHaveBeenCalled();
  });

  // ─── DELETE FLOW ────────────────────────────────────────────────

  it('should set delete target when requesting delete', () => {
    component.requestDelete('item-id');
    expect(component.deleteTarget()).toBe('item-id');
  });

  it('should clear delete target on cancel', () => {
    component.requestDelete('item-id');
    expect(component.deleteTarget()).toBe('item-id');

    component.cancelDelete();
    expect(component.deleteTarget()).toBeNull();
  });

  it('should call deleteFeedback on confirm delete', () => {
    component.requestDelete('item-id');
    component.confirmDelete();

    expect(feedbackServiceSpy.deleteFeedback).toHaveBeenCalledWith('item-id');
    expect(component.deleteTarget()).toBeNull();
  });

  it('should clear selected feedback if deleted item was selected', () => {
    component.selectedFeedback.set(mockItems[0]);
    component.requestDelete('1');
    component.confirmDelete();

    expect(component.selectedFeedback()).toBeNull();
  });

  it('should not clear selected feedback if different item was deleted', () => {
    component.selectedFeedback.set(mockItems[0]);
    component.requestDelete('2');
    component.confirmDelete();

    expect(component.selectedFeedback()).toEqual(mockItems[0]);
  });

  it('should do nothing on confirmDelete when no target is set', () => {
    component.deleteTarget.set(null);
    component.confirmDelete();

    expect(feedbackServiceSpy.deleteFeedback).not.toHaveBeenCalled();
  });

  // ─── DATE FORMATTING ────────────────────────────────────────────

  it('should format date correctly', () => {
    const date = new Date('2026-03-15T14:30:00Z');
    const formatted = component.formatDate(date);

    expect(formatted).toContain('Mar');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2026');
  });

  // ─── TYPE LABELS AND COLORS ─────────────────────────────────────

  it('should have correct type labels', () => {
    expect(component.typeLabels['bug']).toBe('Bug Report');
    expect(component.typeLabels['suggestion']).toBe('Suggestion');
    expect(component.typeLabels['general']).toBe('General Feedback');
  });

  it('should have color classes for each type', () => {
    expect(component.typeColors['bug']).toContain('text-red-500');
    expect(component.typeColors['suggestion']).toContain('text-amber-500');
    expect(component.typeColors['general']).toContain('text-cyan-500');
  });

  // ─── RENDERING ──────────────────────────────────────────────────

  it('should render filter buttons', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const buttonTexts = Array.from(buttons as NodeListOf<HTMLButtonElement>).map(
      (btn) => btn.textContent?.trim(),
    );

    expect(buttonTexts).toContain('All');
    expect(buttonTexts).toContain('Bug Reports');
    expect(buttonTexts).toContain('Suggestions');
    expect(buttonTexts).toContain('General');
  });

  it('should show empty state when no feedback matches filter', () => {
    feedbackServiceSpy.feedbackItems.set([]);
    fixture.detectChanges();

    component.setFilter('bug');
    fixture.detectChanges();

    const emptyText = fixture.nativeElement.textContent;
    expect(emptyText).toContain('No feedback yet');
  });

  it('should show back to dashboard link', () => {
    const link = fixture.nativeElement.querySelector('a[routerlink="/admin"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Back to Dashboard');
  });

  it('should render feedback items with type badges', () => {
    const badges = fixture.nativeElement.querySelectorAll('.rounded-full.text-xs');
    expect(badges.length).toBeGreaterThanOrEqual(4);
  });

  it('should show unread indicator for unread items', () => {
    const unreadDots = fixture.nativeElement.querySelectorAll('.bg-cyan-500.rounded-full');
    expect(unreadDots.length).toBeGreaterThanOrEqual(2);
  });
});
