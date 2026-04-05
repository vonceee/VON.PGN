import { Component, inject, OnInit, signal, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormArray, FormControl, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { TournamentService } from '../../../core/services/tournament.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import html2canvas from 'html2canvas-pro';

import { StepIndicatorComponent } from './components/step-indicator.component';
import {
  StepBasicInfoComponent,
  StepDatesLocationComponent,
  StepFormatRulesComponent
} from './components/steps.component';
import {
  StepOrganizerComponent,
  StepRegistrationComponent,
  StepEligibilityComponent
} from './components/steps-extra.component';
import {
  StepPrizesComponent,
  StepScheduleComponent
} from './components/steps-prizes-schedule.component';
import { ReviewSectionComponent } from './components/review-section.component';
import { PosterPreviewComponent } from './components/poster-preview.component';

interface Step {
  key: string;
  label: string;
  fields: string[];
}

@Component({
  selector: 'app-tournament-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonComponent,

    StepIndicatorComponent,
    StepBasicInfoComponent,
    StepDatesLocationComponent,
    StepFormatRulesComponent,
    StepOrganizerComponent,
    StepRegistrationComponent,
    StepEligibilityComponent,
    StepPrizesComponent,
    StepScheduleComponent,
    ReviewSectionComponent,
    PosterPreviewComponent
  ],
  templateUrl: './tournament-editor.html',
  styleUrls: ['./tournament-editor.css']
})
export class TournamentEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private tournamentService = inject(TournamentService);
  private toastService = inject(ToastService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public location = inject(Location);

  @Input() mode: 'admin' | 'user' = 'admin';

  tournamentId = signal<string | null>(null);
  saving = signal(false);
  currentStep = signal(0);
  stepsCompleted = signal<Set<number>>(new Set());
  attempted = signal<Set<string>>(new Set());
  mapsLink = signal('');
  mapsLinkError = signal('');
  mapsLinkLoading = signal(false);
  verificationStatus = signal<'idle' | 'success' | 'error'>('idle');

  posterTheme = signal<'dark' | 'light'>('dark');
  downloadingPoster = signal(false);

  fieldLimits: Record<string, number> = {
    name: 255,
    description: 65535,
    location: 255,
    organizer: 255,
    contact: 255,
    link: 255,
    format: 255,
    timeControl: 255,
    registrationInstructions: 65535,
  };
  @ViewChild('posterDark') posterDarkRef!: ElementRef<HTMLElement>;
  @ViewChild('posterLight') posterLightRef!: ElementRef<HTMLElement>;

  steps: Step[] = [
    { key: 'basic', label: 'Basic Info', fields: ['name', 'status'] },
    { key: 'dates', label: 'Dates & Location', fields: ['startDate', 'endDate', 'location'] },
    { key: 'format', label: 'Format', fields: ['format', 'timeControl', 'rounds', 'entryFee'] },
    { key: 'organizer', label: 'Organizer', fields: ['organizer', 'contact'] },
    { key: 'registration', label: 'Registration', fields: ['registrationInstructions'] },
    { key: 'eligibility', label: 'Eligibility', fields: [] },
    { key: 'prizes', label: 'Prizes', fields: [] },
    { key: 'schedule', label: 'Schedule', fields: [] },
    { key: 'review', label: 'Review', fields: [] },
  ];

  get totalSteps(): number { return this.steps.length; }
  get isLastStep(): boolean { return this.currentStep() === this.totalSteps - 1; }
  get isReviewStep(): boolean { return this.steps[this.currentStep()].key === 'review'; }

  tournamentForm = this.fb.group({
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
    timeControl: ['15 min + sec increment', Validators.required],
    rounds: [7, Validators.required],
    entryFee: ['', Validators.required],
    prizePool: [''],
    maxParticipants: [],
    currentParticipants: [],
    organizer: ['', Validators.required],
    contact: ['', Validators.required],
    link: [''],
    registrationInstructions: ['', Validators.required],
    eligibility: this.fb.array([]),
    scheduleDays: this.fb.array([]),
    categories: this.fb.array([])
  });

  ngOnInit() {
    const routeData = this.route.snapshot.data;
    if (routeData['mode']) {
      this.mode = routeData['mode'];
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('tournamentId');
      if (id) {
        this.loadTournament(id);
      }
    });
  }

  // ---- Step navigation ----

  nextStep() {
    const step = this.currentStep();
    const stepFields = this.steps[step].fields;

    // Mark current step fields as attempted
    const a = new Set(this.attempted());
    stepFields.forEach(f => a.add(f));
    this.attempted.set(a);

    // Validate
    let valid = true;
    for (const fieldName of stepFields) {
      const ctrl = this.tournamentForm.get(fieldName);
      if (ctrl) {
        ctrl.markAsTouched();
        if (ctrl.invalid) valid = false;
      }
    }

    if (!valid) return;

    // Mark step as completed
    const completed = new Set(this.stepsCompleted());
    completed.add(step);
    this.stepsCompleted.set(completed);

    if (step < this.totalSteps - 1) {
      this.currentStep.set(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.set(this.currentStep() - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(index: number) {
    if (this.tournamentId()) {
      this.currentStep.set(index);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const completed = this.stepsCompleted();
    if (completed.has(index) || index <= this.currentStep()) {
      this.currentStep.set(index);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getStepStatus(index: number): 'completed' | 'current' | 'upcoming' {
    if (this.tournamentId() && index !== this.currentStep()) return 'completed';
    if (this.stepsCompleted().has(index) && index !== this.currentStep()) return 'completed';
    if (index === this.currentStep()) return 'current';
    return 'upcoming';
  }

  isStepClickable(index: number): boolean {
    if (this.tournamentId()) return true;
    return this.stepsCompleted().has(index) || index <= this.currentStep();
  }

  // ---- Field validation helpers ----

  hasError(fieldName: string): boolean {
    const ctrl = this.tournamentForm.get(fieldName);
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.attempted().has(fieldName));
  }

  getError(fieldName: string): string {
    const ctrl = this.tournamentForm.get(fieldName);
    if (!ctrl || !ctrl.errors) return '';
    if (ctrl.errors['required']) return 'This field is required';
    if (ctrl.errors['min']) return 'Value must be a positive number';
    return 'Invalid value';
  }

  inputClass(fieldName: string): string {
    const base = 'w-full p-3 border rounded focus:outline-none transition-colors';
    if (this.hasError(fieldName)) {
      return base + ' border-red-500 focus:border-red-500';
    }
    return base + ' border-border-theme focus:border-cyan-400';
  }

  // ---- Currency formatting ----

  onCurrencyInput(fieldName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^\d.]/g, '');

    // Only allow one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Format integer part with commas
    if (parts.length > 0) {
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      value = parts.length > 1 ? intPart + '.' + parts[1] : intPart;
    }

    input.value = value;
    this.tournamentForm.get(fieldName)?.setValue(value, { emitEvent: false });
  }

  onCurrencyFocus(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/,/g, '');
  }

  onCurrencyBlur(fieldName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^\d.]/g, '');
    if (!value) return;

    const parts = value.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    value = parts.length > 1 ? intPart + '.' + parts[1] : intPart;

    input.value = value;
    this.tournamentForm.get(fieldName)?.setValue(value, { emitEvent: false });
  }

  onNumberInput(fieldName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value === '' ? 0 : parseInt(input.value, 10);
    if (!isNaN(value) && value >= 0) {
      this.tournamentForm.get(fieldName)?.setValue(value, { emitEvent: false });
    }
  }

  private parseCurrency(value: string | number | undefined): string {
    if (!value) return '';
    const str = String(value).replace(/[₱,\s]/g, '');
    if (!str || isNaN(parseFloat(str))) return '';
    const num = parseFloat(str);
    const parts = num.toString().split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? intPart + '.' + parts[1] : intPart;
  }

  private formatCurrencyOutput(value: string): string {
    if (!value) return '';
    const cleaned = value.replace(/,/g, '');
    return '₱' + cleaned;
  }

  sanitizeInput(fieldName: string, value: string): string {
    return value
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t+/g, ' ')
      .replace(/  +/g, ' ')
      .trim();
  }

  truncateToLimit(value: string, limit: number): string {
    if (!value) return '';
    return value.slice(0, limit);
  }

  getCharCount(fieldName: string): number {
    const ctrl = this.tournamentForm.get(fieldName);
    if (!ctrl) return 0;
    return (ctrl.value || '').length;
  }

  getCharLimit(fieldName: string): number {
    return this.fieldLimits[fieldName] || 255;
  }

  isNearLimit(fieldName: string, threshold = 0.9): boolean {
    const count = this.getCharCount(fieldName);
    const limit = this.getCharLimit(fieldName);
    return count >= limit * threshold;
  }

  // ---- Maps link ----

  parseMapsLink() {
    const link = this.mapsLink().trim();
    if (!link) return;

    this.mapsLinkError.set('');
    this.mapsLinkLoading.set(true);
    this.verificationStatus.set('idle');

    const coords = this.extractCoords(link);

    if (coords) {
      this.tournamentForm.patchValue({ lat: coords.lat, lng: coords.lng });
      if (coords.name) {
        this.tournamentForm.patchValue({ location: coords.name });
      }
      this.mapsLinkLoading.set(false);
      this.verificationStatus.set('success');
    } else if (this.isShortenedUrl(link)) {
      this.http.post<{ url: string }>(`${environment.apiUrl}/admin/resolve-maps-url`, { url: link }).subscribe({
        next: (res) => {
          const resolved = this.extractCoords(res.url);
          if (resolved) {
            this.tournamentForm.patchValue({ lat: resolved.lat, lng: resolved.lng });
            if (resolved.name) {
              this.tournamentForm.patchValue({ location: resolved.name });
            }
            this.verificationStatus.set('success');
          } else {
            this.mapsLinkError.set('Could not extract coordinates from the resolved link');
            this.verificationStatus.set('error');
          }
          this.mapsLinkLoading.set(false);
        },
        error: () => {
          this.mapsLinkError.set('Could not resolve shortened link. Try using the full Google Maps URL instead.');
          this.verificationStatus.set('error');
          this.mapsLinkLoading.set(false);
        }
      });
    } else {
      this.mapsLinkError.set('Could not find coordinates in this link. Copy the exact URL from Google Maps.');
      this.verificationStatus.set('error');
      this.mapsLinkLoading.set(false);
    }
  }

  private extractCoords(url: string): { lat: number; lng: number; name?: string } | null {
    let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      const name = this.extractPlaceName(url);
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]), name: name ?? undefined };
    }

    match = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }

    match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (match) {
      const name = this.extractPlaceName(url);
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]), name: name ?? undefined };
    }

    return null;
  }

  private extractPlaceName(url: string): string | null {
    const match = url.match(/\/place\/([^/@]+)/);
    if (match) {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
    return null;
  }

  private isShortenedUrl(url: string): boolean {
    return /maps\.app\.goo\.gl|goo\.gl\/maps/.test(url);
  }

  // ---- Form arrays ----

  get eligibilityArray(): FormArray { return this.tournamentForm.get('eligibility') as FormArray; }
  get scheduleDaysArray(): FormArray { return this.tournamentForm.get('scheduleDays') as FormArray; }
  get categoriesArray(): FormArray { return this.tournamentForm.get('categories') as FormArray; }

  eligibilityControl(index: number): FormControl { return this.eligibilityArray.at(index) as FormControl; }

  addEligibilityItem() { this.eligibilityArray.push(this.fb.control('')); }
  removeEligibilityItem(index: number) { this.eligibilityArray.removeAt(index); }

  addScheduleDay() {
    this.scheduleDaysArray.push(this.fb.group({
      events: this.fb.array([
        this.fb.group({
          name: [''],
          time: ['']
        })
      ])
    }));
  }
  removeScheduleDay(index: number) { this.scheduleDaysArray.removeAt(index); }

  getScheduleEvents(dayIndex: number): FormArray {
    return this.scheduleDaysArray.at(dayIndex).get('events') as FormArray;
  }
  scheduleDayGroup(index: number): FormGroup { return this.scheduleDaysArray.at(index) as FormGroup; }
  scheduleEventGroup(dayIndex: number, eventIndex: number): FormGroup {
    return this.getScheduleEvents(dayIndex).at(eventIndex) as FormGroup;
  }
  addScheduleEvent(dayIndex: number) {
    this.getScheduleEvents(dayIndex).push(this.fb.group({ name: [''], time: [''] }));
  }
  removeScheduleEvent(dayIndex: number, eventIndex: number) {
    this.getScheduleEvents(dayIndex).removeAt(eventIndex);
  }

  addCategory() {
    this.categoriesArray.push(this.fb.group({
      name: [''],
      champion: [''],
      '2nd_place': [''],
      '3rd_place': [''],
      extraPrizes: this.fb.array([]),
      specialAwards: this.fb.array([
        this.fb.group({
          name: [''],
          type: ['simple'],
          value: [''],
          '1st': [''],
          '2nd': [''],
          '3rd': ['']
        })
      ])
    }));
  }
  removeCategory(index: number) { this.categoriesArray.removeAt(index); }
  categoryGroup(index: number): FormGroup { return this.categoriesArray.at(index) as FormGroup; }



  getCategorySpecialAwards(catIndex: number): FormArray {
    return this.categoriesArray.at(catIndex).get('specialAwards') as FormArray;
  }
  specialAwardGroup(catIndex: number, awardIndex: number): FormGroup {
    return this.getCategorySpecialAwards(catIndex).at(awardIndex) as FormGroup;
  }
  addSpecialAward(catIndex: number) {
    this.getCategorySpecialAwards(catIndex).push(this.fb.group({
      name: [''], type: ['simple'], value: [''],
      '1st': [''], '2nd': [''], '3rd': ['']
    }));
  }
  removeSpecialAward(catIndex: number, awardIndex: number) {
    this.getCategorySpecialAwards(catIndex).removeAt(awardIndex);
  }

  getCategoryExtraPrizes(catIndex: number): FormArray {
    return this.categoriesArray.at(catIndex).get('extraPrizes') as FormArray;
  }
  extraPrizeGroup(catIndex: number, prizeIndex: number): FormGroup {
    return this.getCategoryExtraPrizes(catIndex).at(prizeIndex) as FormGroup;
  }
  addExtraPrize(catIndex: number) {
    this.getCategoryExtraPrizes(catIndex).push(this.fb.group({
      label: [''],
      value: ['']
    }));
  }
  removeExtraPrize(catIndex: number, prizeIndex: number) {
    this.getCategoryExtraPrizes(catIndex).removeAt(prizeIndex);
  }

  // ---- Load / populate ----

  loadTournament(slug: string) {
    const loadObs = this.mode === 'user'
      ? this.tournamentService.getMyTournament(slug)
      : new Observable(subscriber => {
          this.adminService.getTournament(slug).subscribe({
            next: (res) => { subscriber.next(res.data || res); subscriber.complete(); },
            error: (err) => { subscriber.error(err); }
          });
        });

    loadObs.subscribe({
      next: (apiTournament: any) => {
        this.tournamentId.set(apiTournament.id);
        this.populateForm(apiTournament);
      },
      error: (err: any) => {
        const backRoute = this.mode === 'user' ? '/my-tournaments' : '/admin/tournaments';
        if (err.status === 403) {
          this.toastService.show('You do not have permission to edit this tournament.', 'error');
        } else {
          this.toastService.show('Tournament not found.', 'error');
        }
        this.router.navigate([backRoute]);
      }
    });
  }

  private populateForm(t: any) {
    this.eligibilityArray.clear();
    this.scheduleDaysArray.clear();
    this.categoriesArray.clear();
    this.mapsLink.set('');
    this.mapsLinkError.set('');
    this.verificationStatus.set('idle');

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
      timeControl: t.timeControl || t.time_control,
      rounds: t.rounds,
      entryFee: this.parseCurrency(t.entryFee || t.entry_fee),
      prizePool: this.parseCurrency(t.prizePool || t.prize_pool),
      maxParticipants: t.participants?.max || t.max_participants,
      currentParticipants: t.participants?.current || t.current_participants,
      organizer: t.organizer,
      contact: t.contact || t.contactEmail || t.contact_email || '',
      link: t.link || '',
      registrationInstructions: t.registrationInstructions || t.registration_instructions || ''
    });

    if (t.eligibility && Array.isArray(t.eligibility)) {
      t.eligibility.forEach((item: string) => this.eligibilityArray.push(this.fb.control(item)));
    }

    if (t.schedule && typeof t.schedule === 'object') {
      Object.values(t.schedule as Record<string, any>).forEach((day: any) => {
        const eventsArray = this.fb.array(
          (day.events || []).map((e: any) => this.fb.group({ name: [e.name], time: [e.time] }))
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
                name: [awardName], type: ['nested'], value: [''],
                '1st': [(award as any)['1st'] || ''], '2nd': [(award as any)['2nd'] || ''], '3rd': [(award as any)['3rd'] || '']
              });
            }
            return this.fb.group({
              name: [awardName], type: ['simple'], value: [award as string],
              '1st': [''], '2nd': [''], '3rd': ['']
            });
          })
        );
        const fixedPrizeKeys = new Set(['champion', '2nd_place', '3rd_place', '4th_place', '5th_place']);
        const extraEntries = Object.entries(cat.prizes || {})
          .filter(([key]) => !fixedPrizeKeys.has(key));
        const extraPrizesArray = this.fb.array(
          extraEntries.map(([key, val]) => this.fb.group({ label: [key.replace(/_/g, ' ')], value: [val as string] }))
        );
        this.categoriesArray.push(this.fb.group({
          name: [catName],
          champion: [cat.prizes?.champion || ''],
          '2nd_place': [cat.prizes?.['2nd_place'] || ''],
          '3rd_place': [cat.prizes?.['3rd_place'] || ''],
          extraPrizes: extraPrizesArray,
          specialAwards: awardsArray
        }));
      });
    }
  }

  // ---- Submit ----

  confirmSave() {
    this.saving.set(true);
    const tournamentData = this.buildTournamentData();

    const apiPayload: Record<string, any> = {
      name: tournamentData['name'],
      status: tournamentData['status'],
      start_date: tournamentData['dates']['start'],
      end_date: tournamentData['dates']['end'],
      registration_deadline: tournamentData['registrationDeadline'] || null,
      location: tournamentData['location'] || null,
      latitude: tournamentData['coordinates']['lat'] || null,
      longitude: tournamentData['coordinates']['lng'] || null,
      format: tournamentData['format'] || null,
      time_control: tournamentData['timeControl'] || null,
      entry_fee: tournamentData['entryFee'] || null,
      prize_pool: tournamentData['prizePool'] || null,
      organizer: tournamentData['organizer'] || null,
      contact_email: tournamentData['contact'] || null,
      link: tournamentData['link'] || null,
      description: tournamentData['description'] || null,
      registration_instructions: tournamentData['registrationInstructions'] || null,
      rounds: tournamentData['rounds'] || 0,
      current_participants: tournamentData['participants']['current'] || 0,
      max_participants: tournamentData['participants']['max'] || 0,
      eligibility: tournamentData['eligibility'] || null,
      categories: tournamentData['categories'] || null,
      schedule: tournamentData['schedule'] || null,
    };

    const tid = this.tournamentId();
    if (tid) {
      apiPayload['slug'] = tournamentData['id'];
    }

    const op = this.mode === 'user'
      ? (tid
          ? this.tournamentService.updateMyTournament(tid, apiPayload)
          : this.tournamentService.createMyTournament(apiPayload))
      : (tid
          ? this.adminService.updateTournament(tid, apiPayload)
          : this.adminService.createTournament(apiPayload));

    const backRoute = this.mode === 'user' ? '/my-tournaments' : '/admin/tournaments';

    op.subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.show(tid ? 'Tournament updated successfully' : 'Tournament created successfully', 'success');
        this.router.navigate([backRoute]);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.toastService.show('Failed to save: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  // ---- Formatting helpers ----

  private prizeOrder: Record<string, number> = {
    'champion': 0, '1st_place': 1, '2nd_place': 2, '3rd_place': 3,
    '4th_place': 4, '5th_place': 5, '6th_place': 6, '7th_place': 7,
    '8th_place': 8, '9th_place': 9, '10th_place': 10
  };

  comparePrizeKeys = (a: { key: string }, b: { key: string }): number => {
    const oa = this.prizeOrder[a.key];
    const ob = this.prizeOrder[b.key];
    if (oa !== undefined && ob !== undefined) return oa - ob;
    if (oa !== undefined) return -1;
    if (ob !== undefined) return 1;
    return a.key.localeCompare(b.key);
  };

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  buildTournamentData(): Record<string, any> {
    const v = this.tournamentForm.value;
    const sanitize = (val: string, field: string) => {
      const limit = this.fieldLimits[field] || 255;
      const sanitized = this.sanitizeInput(field, val || '');
      return this.truncateToLimit(sanitized, limit);
    };
    const sanitizedName = sanitize(v.name || '', 'name');
    const sanitizedDescription = sanitize(v.description || '', 'description');
    const sanitizedLocation = sanitize(v.location || '', 'location');
    const sanitizedOrganizer = sanitize(v.organizer || '', 'organizer');
    const sanitizedContact = sanitize(v.contact || '', 'contact');
    const sanitizedLink = sanitize(v.link || '', 'link');
    const sanitizedFormat = sanitize(v.format || '', 'format');
    const sanitizedTimeControl = sanitize(v.timeControl || '', 'timeControl');
    const sanitizedRegInstructions = sanitize(v.registrationInstructions || '', 'registrationInstructions');
    const eligibility = this.eligibilityArray.value
      .map((e: string) => this.sanitizeInput('', e))
      .filter((e: string) => e);

    const schedule: Record<string, { events: { name: string; time: string }[] }> = {};
    this.scheduleDaysArray.controls.forEach((day, i) => {
      const dayVal = day.value;
      schedule[`day_${i + 1}`] = {
        events: dayVal.events.filter((e: { name: string }) => e.name?.trim())
      };
    });

    const categories: Record<string, any> = {};
    this.categoriesArray.controls.forEach(cat => {
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

      categories[catKey] = {
        prizes,
        ...(Object.keys(specialAwards).length ? { specialAwards } : {})
      };
    });

    return {
      id: sanitizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: sanitizedName,
      description: sanitizedDescription,
      status: v.status,
      dates: { start: v.startDate, end: v.endDate },
      location: sanitizedLocation,
      coordinates: { lat: v.lat || 0, lng: v.lng || 0 },
      format: sanitizedFormat || '',
      timeControl: sanitizedTimeControl || '',
      entryFee: this.formatCurrencyOutput(v.entryFee || ''),
      registrationDeadline: v.registrationDeadline || '',
      prizePool: this.formatCurrencyOutput(v.prizePool || ''),
      organizer: sanitizedOrganizer || '',
      contact: sanitizedContact || '',
      link: sanitizedLink || '',
      rounds: v.rounds || 0,
      registrationInstructions: sanitizedRegInstructions || '',
      participants: { current: v.currentParticipants || 0, max: v.maxParticipants || 0 },
      ...(eligibility.length ? { eligibility } : {}),
      ...(Object.keys(schedule).length ? { schedule } : {}),
      ...(Object.keys(categories).length ? { categories } : {})
    };
  }

  // ---- Poster Generation ----

  togglePosterTheme() {
    this.posterTheme.set(this.posterTheme() === 'dark' ? 'light' : 'dark');
  }

  async downloadPoster(theme?: 'dark' | 'light') {
    const t = theme || this.posterTheme();
    const el = t === 'dark' ? this.posterDarkRef?.nativeElement : this.posterLightRef?.nativeElement;
    if (!el) return;
    this.downloadingPoster.set(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: t === 'dark' ? '#0f172a' : '#ffffff',
        width: 540,
        height: 675,
        windowWidth: 540,
        windowHeight: 675
      });
      const dataUrl = canvas.toDataURL('image/png');
      const data = this.buildTournamentData();
      const slug = (data['name'] || 'tournament').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const link = document.createElement('a');
      link.download = `${slug}-poster-${t}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      this.toastService.show('Failed to generate poster image.', 'error');
    } finally {
      this.downloadingPoster.set(false);
    }
  }

  get posterDate(): string {
    const data = this.buildTournamentData();
    if (!data['dates']?.start) return '';
    const start = this.formatDate(data['dates']['start']);
    const end = data['dates']['end'] ? this.formatDate(data['dates']['end']) : '';
    return end && end !== start ? `${start} — ${end}` : start;
  }

  get posterPrizeCategories(): { category: string; prizes: { place: string; value: string }[]; specialAwards?: { name: string; value: string }[] }[] {
    try {
      const data = this.buildTournamentData();
      const cats = data?.['categories'];
      if (!cats) return [];
      const categories: { category: string; prizes: { place: string; value: string }[]; specialAwards?: { name: string; value: string }[] }[] = [];
      for (const [catName, cat] of Object.entries(cats as Record<string, any>)) {
        const prizes = (cat as any)?.prizes || {};
        const label = catName.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        const prizeRows: { place: string; value: string }[] = [];
        for (const [key, val] of Object.entries(prizes)) {
          if (!val) continue;
          const place = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          prizeRows.push({ place, value: val as string });
        }

        const specialAwards: { name: string; value: string }[] = [];
        const catSpecialAwards = (cat as any)?.specialAwards;
        if (catSpecialAwards) {
          for (const [awardName, awardVal] of Object.entries(catSpecialAwards)) {
            if (typeof awardVal === 'string') {
              const value = awardVal?.trim();
              if (value) {
                specialAwards.push({ name: awardName.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), value });
              }
            } else if (typeof awardVal === 'object' && awardVal !== null) {
              for (const [place, val] of Object.entries(awardVal as Record<string, string>)) {
                if (val !== undefined && val !== null && val.trim() !== '') {
                  specialAwards.push({ 
                    name: `${awardName.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} ${place.toUpperCase()}`,
                    value: val.trim()
                  });
                }
              }
            }
          }
        }

        if (prizeRows.length > 0 || specialAwards.length > 0) {
          categories.push({ category: label, prizes: prizeRows, ...(specialAwards.length > 0 ? { specialAwards } : {}) });
        }
      }
      return categories;
    } catch (e) {
      console.error('Error in posterPrizeCategories:', e);
      return [];
    }
  }
}
