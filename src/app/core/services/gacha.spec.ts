import { TestBed } from '@angular/core/testing';

import { Gacha } from './gacha';

describe('Gacha', () => {
  let service: Gacha;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Gacha);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
