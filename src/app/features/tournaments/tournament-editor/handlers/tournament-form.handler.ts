import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators, FormArray, FormControl, FormGroup } from '@angular/forms';
import { FIELD_LIMITS } from '../models/tournament-editor.models';

@Injectable({
  providedIn: 'root',
})
export class TournamentFormHandler {
  private fb = inject(FormBuilder);

  public tournamentForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    status: ['upcoming', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    registrationDeadline: [''],
    location: ['', Validators.required],
    lat: [undefined as number | undefined],
    lng: [undefined as number | undefined],
    format: ['Swiss System', Validators.required],
    timeControl: ['15 min + 3 sec', Validators.required],
    rounds: [7, Validators.required],
    entryFee: [''],
    prizePool: [''],
    organizer: ['', Validators.required],
    contact: ['', Validators.required],
    link: [''],
    registrationInstructions: [
      'For inquiries or registration, please reach out directly to the event organizer listed.',
      Validators.required,
    ],
    eligibility: this.fb.array([]),
    scheduleDays: this.fb.array([]),
    categories: this.fb.array([]),
    posterSettings: this.fb.group({
      theme: ['light'], // 'light' or 'dark'
      backgroundImage: [null as string | null],
      logos: this.fb.array([]),
      visibility: this.fb.group({
        showPrizePool: [true],
        showSchedule: [true],
        showEntryFee: [true],
        showOrganizerInfo: [true],
      }),
      useCustomPoster: [false],
      customPosterUrl: [null as string | null],
    }),
  });

  // ---- Form Array Getters ----

  get eligibilityArray() { return this.tournamentForm.get('eligibility') as FormArray; }
  get scheduleDaysArray() { return this.tournamentForm.get('scheduleDays') as FormArray; }
  get categoriesArray() { return this.tournamentForm.get('categories') as FormArray; }

  // ---- Validation Helpers ----

  public getError(fieldName: string): string {
    const ctrl = this.tournamentForm.get(fieldName);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'This field is required';
    if (ctrl.errors['min']) return 'Value must be a positive number';
    return 'Invalid value';
  }

  // ---- Form Array Management ----

  addEligibilityItem() { this.eligibilityArray.push(this.fb.control('')); }
  removeEligibilityItem(index: number) { this.eligibilityArray.removeAt(index); }

  addScheduleDay() {
    this.scheduleDaysArray.push(this.fb.group({
      events: this.fb.array([this.fb.group({ name: [''], time: [''] })])
    }));
  }
  removeScheduleDay(index: number) { this.scheduleDaysArray.removeAt(index); }

  addScheduleEvent(dayIndex: number) {
    (this.scheduleDaysArray.at(dayIndex).get('events') as FormArray).push(this.fb.group({ name: [''], time: [''] }));
  }
  removeScheduleEvent(dayIndex: number, eventIndex: number) {
    (this.scheduleDaysArray.at(dayIndex).get('events') as FormArray).removeAt(eventIndex);
  }

  addCategory() {
    this.categoriesArray.push(this.fb.group({
      name: [''], champion: [''], '2nd_place': [''], '3rd_place': [''],
      extraPrizes: this.fb.array([]),
      specialAwards: this.fb.array([this.fb.group({ name: [''], type: ['simple'], value: [''], '1st': [''], '2nd': [''], '3rd': [''] })])
    }));
  }
  removeCategory(index: number) { this.categoriesArray.removeAt(index); }

  addSpecialAward(catIndex: number) {
    (this.categoriesArray.at(catIndex).get('specialAwards') as FormArray).push(
      this.fb.group({ name: [''], type: ['simple'], value: [''], '1st': [''], '2nd': [''], '3rd': [''] })
    );
  }
  removeSpecialAward(catIndex: number, awardIndex: number) {
    (this.categoriesArray.at(catIndex).get('specialAwards') as FormArray).removeAt(awardIndex);
  }

  addExtraPrize(catIndex: number) {
    (this.categoriesArray.at(catIndex).get('extraPrizes') as FormArray).push(this.fb.group({ label: [''], value: [''] }));
  }
  removeExtraPrize(catIndex: number, prizeIndex: number) {
    (this.categoriesArray.at(catIndex).get('extraPrizes') as FormArray).removeAt(prizeIndex);
  }

  public resetForm() {
    this.tournamentForm.reset({
      status: 'upcoming',
      format: 'Swiss System',
      timeControl: '15 min + 3 sec',
      rounds: 7,
      registrationInstructions: 'For inquiries or registration, please reach out directly to the event organizer listed.',
      posterSettings: {
        theme: 'light',
        backgroundImage: null,
        visibility: {
          showPrizePool: true,
          showSchedule: true,
          showEntryFee: true,
          showOrganizerInfo: true,
        },
        useCustomPoster: false,
        customPosterUrl: null,
      },
    });
    this.eligibilityArray.clear();
    this.scheduleDaysArray.clear();
    this.categoriesArray.clear();
    (this.tournamentForm.get('posterSettings.logos') as FormArray).clear();
  }

  // ---- Data Hydration ----

  public populateForm(t: any) {
    this.eligibilityArray.clear();
    this.scheduleDaysArray.clear();
    this.categoriesArray.clear();

    const ps = this.parsePosterSettings(t.poster_settings);
    this.tournamentForm.patchValue({
      name: t.name,
      description: t.description,
      status: t.status,
      startDate: t.dates?.start || t.start_date,
      endDate: t.dates?.end || t.end_date,
      registrationDeadline: t.registrationDeadline || t.registration_deadline,
      location: t.location,
      lat: t.coordinates?.lat || t.latitude,
      lng: t.coordinates?.lng || t.longitude,
      format: t.format,
      timeControl: t.timeControl || t.time_control || '15 min + 3 sec',
      rounds: t.rounds,
      entryFee: this.parseCurrency(t.entryFee || t.entry_fee),
      prizePool: this.parseCurrency(t.prizePool || t.prize_pool),
      organizer: t.organizer,
      contact: t.contact || t.contactEmail || t.contact_email || '',
      link: t.link || '',
      registrationInstructions: t.registrationInstructions || t.registration_instructions || '',
      posterSettings: ps || {
        theme: 'light',
        backgroundImage: null,
        logos: [],
        visibility: {
          showPrizePool: true,
          showSchedule: true,
          showEntryFee: true,
          showOrganizerInfo: true,
        },
        useCustomPoster: false,
        customPosterUrl: null,
      },
    });

    if (ps?.logos && Array.isArray(ps.logos)) {
      const logosArray = this.tournamentForm.get('posterSettings.logos') as FormArray;
      logosArray.clear();
      ps.logos.forEach((logo: string) => logosArray.push(this.fb.control(logo)));
    }

    if (t.eligibility && Array.isArray(t.eligibility)) {
      t.eligibility.forEach((item: string) => this.eligibilityArray.push(this.fb.control(item)));
    }

    if (t.schedule && typeof t.schedule === 'object') {
      Object.values(t.schedule as Record<string, any>).forEach((day: any) => {
        const eventsArray = this.fb.array(
          (day.events || []).map((e: any) => this.fb.group({ name: [e.name], time: [e.time] })),
        );
        this.scheduleDaysArray.push(this.fb.group({ events: eventsArray }));
      });
    }

    if (t.categories && typeof t.categories === 'object') {
      Object.entries(t.categories as Record<string, any>).forEach(([catName, cat]) => {
        const awardsArray = this.fb.array(
          Object.entries(cat.specialAwards || {}).map(([awardName, award]: [string, any]) => {
            if (typeof award === 'object' && award !== null && '1st' in award) {
              return this.fb.group({
                name: [awardName],
                type: ['nested'],
                value: [''],
                '1st': [(award as any)['1st'] || ''],
                '2nd': [(award as any)['2nd'] || ''],
                '3rd': [(award as any)['3rd'] || ''],
              });
            }
            return this.fb.group({
              name: [awardName],
              type: ['simple'],
              value: [award as string],
              '1st': [''],
              '2nd': [''],
              '3rd': [''],
            });
          }),
        );
        
        const extraPrizesArray = this.fb.array(
          Object.entries(cat.prizes || {})
            .filter(([key]) => !['champion', '2nd_place', '3rd_place', '4th_place', '5th_place'].includes(key))
            .map(([key, val]) => this.fb.group({ label: [key.replace(/_/g, ' ')], value: [val as string] }))
        );

        this.categoriesArray.push(
          this.fb.group({
            name: [catName],
            champion: [cat.prizes?.champion || ''],
            '2nd_place': [cat.prizes?.['2nd_place'] || ''],
            '3rd_place': [cat.prizes?.['3rd_place'] || ''],
            extraPrizes: extraPrizesArray,
            specialAwards: awardsArray,
          }),
        );
      });
    }
  }

  // ---- Data Dehydration ----

  public buildTournamentData(): Record<string, any> {
    const v = this.tournamentForm.value;
    const sanitize = (val: string, field: string) => {
      const limit = FIELD_LIMITS[field] || 255;
      const sanitized = this.sanitizeInput(val || '');
      return sanitized.slice(0, limit);
    };

    const eligibility = this.eligibilityArray.value
      .map((e: string) => this.sanitizeInput(e))
      .filter((e: string) => e);

    const schedule: Record<string, { events: { name: string; time: string }[] }> = {};
    this.scheduleDaysArray.controls.forEach((day, i) => {
      const dayVal = day.value;
      schedule[`day_${i + 1}`] = {
        events: dayVal.events.filter((e: { name: string }) => e.name?.trim()),
      };
    });

    const categories: Record<string, any> = {};
    this.categoriesArray.controls.forEach((cat) => {
      const catVal = cat.value;
      const catKey = (catVal.name || '').toLowerCase().replace(/\s+/g, '_');
      if (!catKey) return;

      const prizes: Record<string, string> = {};
      if (catVal.champion) prizes['champion'] = catVal.champion;
      if (catVal['2nd_place']) prizes['2nd_place'] = catVal['2nd_place'];
      if (catVal['3rd_place']) prizes['3rd_place'] = catVal['3rd_place'];
      
      catVal.extraPrizes?.forEach((ep: any) => {
        if (!ep.label?.trim()) return;
        const key = ep.label.toLowerCase().replace(/\s+/g, '_');
        if (ep.value?.trim()) prizes[key] = ep.value;
      });

      const specialAwards: Record<string, any> = {};
      catVal.specialAwards?.forEach((award: any) => {
        if (!award.name?.trim()) return;
        if (award.type === 'nested') {
          specialAwards[award.name] = { '1st': award['1st'], '2nd': award['2nd'], '3rd': award['3rd'] };
        } else {
          specialAwards[award.name] = award.value;
        }
      });

      categories[catKey] = { prizes, ...(Object.keys(specialAwards).length ? { specialAwards } : {}) };
    });

    const sanitizedName = sanitize(v.name || '', 'name');

    const result: any = {
      id: sanitizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: sanitizedName,
      description: sanitize(v.description || '', 'description'),
      status: v.status,
      dates: { start: v.startDate, end: v.endDate },
      location: sanitize(v.location || '', 'location'),
      coordinates: { lat: v.lat || 0, lng: v.lng || 0 },
      format: sanitize(v.format || '', 'format'),
      timeControl: sanitize(v.timeControl || '', 'timeControl'),
      entryFee: this.formatCurrencyOutput(v.entryFee || ''),
      registrationDeadline: v.registrationDeadline || '',
      prizePool: this.formatCurrencyOutput(v.prizePool || ''),
      organizer: sanitize(v.organizer || '', 'organizer'),
      contact: sanitize(v.contact || '', 'contact'),
      link: sanitize(v.link || '', 'link'),
      rounds: v.rounds || 0,
      registrationInstructions: sanitize(v.registrationInstructions || '', 'registrationInstructions'),
      poster_settings: v.posterSettings,
    };

    if (eligibility.length) result.eligibility = eligibility;
    if (Object.keys(schedule).length) result.schedule = schedule;
    if (Object.keys(categories).length) result.categories = categories;

    return result;
  }

  // ---- Helpers ----

  private parsePosterSettings(ps: any): any {
    if (!ps) return null;
    let decoded = ps;
    if (typeof ps === 'string') {
      try {
        decoded = JSON.parse(ps);
        if (typeof decoded === 'string') decoded = JSON.parse(decoded);
      } catch (e) { return null; }
    }
    if (decoded && typeof decoded === 'object') {
      if (decoded.background_image && !decoded.backgroundImage) decoded.backgroundImage = decoded.background_image;
    }
    return decoded;
  }

  public parseCurrency(value: string | number | undefined): string {
    if (!value) return '';
    const str = String(value).replace(/[₱,\s]/g, '');
    if (!str || isNaN(parseFloat(str))) return '';
    const num = parseFloat(str);
    const parts = num.toString().split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? intPart + '.' + parts[1] : intPart;
  }

  public formatCurrencyOutput(value: string): string {
    if (!value) return '';
    const cleaned = value.replace(/,/g, '');
    return '₱' + cleaned;
  }

  public sanitizeInput(value: string): string {
    return value
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t+/g, ' ')
      .replace(/  +/g, ' ')
      .trim();
  }
}
