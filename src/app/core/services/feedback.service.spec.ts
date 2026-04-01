import { TestBed } from '@angular/core/testing';
import { FeedbackService, FeedbackItem, FeedbackType } from './feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeedbackService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── INITIALIZATION ─────────────────────────────────────────────

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with empty feedback items when localStorage is empty', () => {
    expect(service.feedbackItems().length).toBe(0);
  });

  it('should load existing feedback from localStorage', () => {
    const stored: FeedbackItem[] = [
      {
        id: 'abc123',
        name: 'Test User',
        email: 'test@example.com',
        type: 'bug',
        message: 'Found a bug',
        createdAt: new Date('2026-01-15T10:00:00Z'),
        read: false,
      },
    ];
    localStorage.setItem('vonpgn_feedback', JSON.stringify(stored));

    const freshService = new FeedbackService();
    expect(freshService.feedbackItems().length).toBe(1);
    expect(freshService.feedbackItems()[0].message).toBe('Found a bug');
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem('vonpgn_feedback', 'not valid json');
    const freshService = new FeedbackService();
    expect(freshService.feedbackItems().length).toBe(0);
  });

  // ─── ADD FEEDBACK ───────────────────────────────────────────────

  it('should add feedback and return the created item', () => {
    const item = service.addFeedback({
      name: 'John',
      email: 'john@example.com',
      type: 'suggestion',
      message: 'Add dark mode',
    });

    expect(item.id).toBeDefined();
    expect(item.name).toBe('John');
    expect(item.email).toBe('john@example.com');
    expect(item.type).toBe('suggestion');
    expect(item.message).toBe('Add dark mode');
    expect(item.read).toBe(false);
    expect(item.createdAt).toBeInstanceOf(Date);
  });

  it('should prepend new feedback to the list', () => {
    service.addFeedback({ name: '', email: '', type: 'general', message: 'First' });
    service.addFeedback({ name: '', email: '', type: 'general', message: 'Second' });

    expect(service.feedbackItems().length).toBe(2);
    expect(service.feedbackItems()[0].message).toBe('Second');
    expect(service.feedbackItems()[1].message).toBe('First');
  });

  it('should persist feedback to localStorage after adding', () => {
    service.addFeedback({ name: 'A', email: '', type: 'bug', message: 'Bug report' });

    const stored = JSON.parse(localStorage.getItem('vonpgn_feedback')!);
    expect(stored.length).toBe(1);
    expect(stored[0].message).toBe('Bug report');
  });

  it('should support all feedback types', () => {
    const types: FeedbackType[] = ['bug', 'suggestion', 'general'];
    types.forEach((type) => {
      service.addFeedback({ name: '', email: '', type, message: `A ${type}` });
    });

    expect(service.feedbackItems().length).toBe(3);
    expect(service.feedbackItems().map((f) => f.type)).toEqual(
      expect.arrayContaining(['bug', 'suggestion', 'general']),
    );
  });

  it('should allow empty name and email', () => {
    const item = service.addFeedback({ name: '', email: '', type: 'general', message: 'Anonymous' });
    expect(item.name).toBe('');
    expect(item.email).toBe('');
  });

  // ─── MARK AS READ ───────────────────────────────────────────────

  it('should mark a feedback item as read', () => {
    const item = service.addFeedback({ name: '', email: '', type: 'general', message: 'Unread' });
    expect(item.read).toBe(false);

    service.markAsRead(item.id);

    expect(service.feedbackItems()[0].read).toBe(true);
  });

  it('should persist read status to localStorage', () => {
    const item = service.addFeedback({ name: '', email: '', type: 'general', message: 'Test' });
    service.markAsRead(item.id);

    const stored = JSON.parse(localStorage.getItem('vonpgn_feedback')!);
    expect(stored[0].read).toBe(true);
  });

  it('should not affect other items when marking one as read', () => {
    const item1 = service.addFeedback({ name: '', email: '', type: 'general', message: 'First' });
    const item2 = service.addFeedback({ name: '', email: '', type: 'general', message: 'Second' });

    service.markAsRead(item2.id);

    const items = service.feedbackItems();
    expect(items.find((f) => f.id === item1.id)!.read).toBe(false);
    expect(items.find((f) => f.id === item2.id)!.read).toBe(true);
  });

  it('should do nothing when marking a non-existent id as read', () => {
    service.addFeedback({ name: '', email: '', type: 'general', message: 'Test' });
    service.markAsRead('non-existent-id');

    expect(service.feedbackItems()[0].read).toBe(false);
  });

  // ─── DELETE FEEDBACK ────────────────────────────────────────────

  it('should delete a feedback item', () => {
    const item = service.addFeedback({ name: '', email: '', type: 'general', message: 'Delete me' });
    expect(service.feedbackItems().length).toBe(1);

    service.deleteFeedback(item.id);

    expect(service.feedbackItems().length).toBe(0);
  });

  it('should persist deletion to localStorage', () => {
    const item = service.addFeedback({ name: '', email: '', type: 'general', message: 'Gone' });
    service.deleteFeedback(item.id);

    const stored = JSON.parse(localStorage.getItem('vonpgn_feedback')!);
    expect(stored.length).toBe(0);
  });

  it('should only delete the specified item', () => {
    const item1 = service.addFeedback({ name: '', email: '', type: 'general', message: 'Keep' });
    service.addFeedback({ name: '', email: '', type: 'general', message: 'Remove' });

    service.deleteFeedback(service.feedbackItems()[0].id);

    expect(service.feedbackItems().length).toBe(1);
    expect(service.feedbackItems()[0].id).toBe(item1.id);
  });

  it('should do nothing when deleting a non-existent id', () => {
    service.addFeedback({ name: '', email: '', type: 'general', message: 'Test' });
    service.deleteFeedback('non-existent-id');

    expect(service.feedbackItems().length).toBe(1);
  });

  // ─── UNREAD COUNT ───────────────────────────────────────────────

  it('should return 0 unread count when all items are read', () => {
    const item = service.addFeedback({ name: '', email: '', type: 'general', message: 'Read' });
    service.markAsRead(item.id);

    expect(service.unreadCount).toBe(0);
  });

  it('should return correct unread count', () => {
    service.addFeedback({ name: '', email: '', type: 'general', message: 'One' });
    service.addFeedback({ name: '', email: '', type: 'general', message: 'Two' });
    service.addFeedback({ name: '', email: '', type: 'general', message: 'Three' });

    expect(service.unreadCount).toBe(3);

    const items = service.feedbackItems();
    service.markAsRead(items[0].id);

    expect(service.unreadCount).toBe(2);
  });

  it('should return 0 when there are no items', () => {
    expect(service.unreadCount).toBe(0);
  });
});
