import { TestBed } from '@angular/core/testing';

import { Fide } from './fide';

describe('Fide', () => {
  let service: Fide;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Fide);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
