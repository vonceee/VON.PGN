import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormArray, FormControl, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TournamentService } from '../../../core/services/tournament.service';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

interface Step {
  key: string;
  label: string;
  fields: string[];
}

@Component({
  selector: 'app-tournament-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './tournament-editor.html',
  styleUrls: ['./tournament-editor.css']
})
export class TournamentEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tournamentService = inject(TournamentService);
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public location = inject(Location);

  tournamentId = signal<number | null>(null);
  saving = signal(false);
  currentStep = signal(0);
  stepsCompleted = signal<Set<number>>(new Set());
  attempted = signal<Set<string>>(new Set());
  mapsLink = signal('');
  mapsLinkError = signal('');
  mapsLinkLoading = signal(false);

  steps: Step[] = [
    { key: 'basic', label: 'Basic Info', fields: ['name', 'status'] },
    { key: 'dates', label: 'Dates & Location', fields: ['startDate', 'endDate', 'location'] },
    { key: 'format', label: 'Format', fields: ['format', 'timeControl', 'rounds', 'entryFee'] },
    { key: 'organizer', label: 'Organizer', fields: ['organizer', 'contact'] },
    { key: 'registration', label: 'Registration', fields: [] },
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
    lat: [14.5995],
    lng: [120.9842],
    format: ['Swiss System', Validators.required],
    timeControl: ['90 min + 30 sec increment', Validators.required],
    rounds: [9, Validators.required],
    entryFee: ['', Validators.required],
    prizePool: [''],
    maxParticipants: [128],
    currentParticipants: [0],
    organizer: ['', Validators.required],
    contact: ['', Validators.required],
    registrationInstructions: [''],
    eligibility: this.fb.array([]),
    scheduleDays: this.fb.array([]),
    categories: this.fb.array([])
  });

  previewData = computed(() => this.buildTournamentData());

  ngOnInit() {
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
    // Can only jump to completed steps or the next uncompleted step
    const completed = this.stepsCompleted();
    if (completed.has(index) || index <= this.currentStep()) {
      this.currentStep.set(index);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getStepStatus(index: number): 'completed' | 'current' | 'upcoming' {
    if (this.stepsCompleted().has(index) && index !== this.currentStep()) return 'completed';
    if (index === this.currentStep()) return 'current';
    return 'upcoming';
  }

  isStepClickable(index: number): boolean {
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

  // ---- Maps link ----

  parseMapsLink() {
    const link = this.mapsLink().trim();
    if (!link) return;

    this.mapsLinkError.set('');
    this.mapsLinkLoading.set(true);

    const coords = this.extractCoords(link);

    if (coords) {
      this.tournamentForm.patchValue({ lat: coords.lat, lng: coords.lng });
      if (coords.name) {
        this.tournamentForm.patchValue({ location: coords.name });
      }
      this.mapsLinkLoading.set(false);
    } else if (this.isShortenedUrl(link)) {
      this.http.post<{ url: string }>(`${environment.apiUrl}/admin/resolve-maps-url`, { url: link }).subscribe({
        next: (res) => {
          const resolved = this.extractCoords(res.url);
          if (resolved) {
            this.tournamentForm.patchValue({ lat: resolved.lat, lng: resolved.lng });
            if (resolved.name) {
              this.tournamentForm.patchValue({ location: resolved.name });
            }
          } else {
            this.mapsLinkError.set('Could not extract coordinates from the resolved link');
          }
          this.mapsLinkLoading.set(false);
        },
        error: () => {
          this.mapsLinkError.set('Could not resolve shortened link. Try using the full Google Maps URL instead.');
          this.mapsLinkLoading.set(false);
        }
      });
    } else {
      this.mapsLinkError.set('Could not find coordinates in this link. Use the share button on Google Maps to get a valid link.');
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
      date: [''],
      events: this.fb.array([])
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
      eligibility: this.fb.array([]),
      champion: [''],
      '2nd_place': [''],
      '3rd_place': [''],
      '4th_place': [''],
      '5th_place': [''],
      '6th_to_10th': [''],
      '11th_to_15th': [''],
      specialAwards: this.fb.array([])
    }));
  }
  removeCategory(index: number) { this.categoriesArray.removeAt(index); }
  categoryGroup(index: number): FormGroup { return this.categoriesArray.at(index) as FormGroup; }

  getCategoryEligibility(catIndex: number): FormArray {
    return this.categoriesArray.at(catIndex).get('eligibility') as FormArray;
  }
  categoryEligibilityControl(catIndex: number, elIndex: number): FormControl {
    return this.getCategoryEligibility(catIndex).at(elIndex) as FormControl;
  }
  addCategoryEligibility(catIndex: number) { this.getCategoryEligibility(catIndex).push(this.fb.control('')); }
  removeCategoryEligibility(catIndex: number, elIndex: number) { this.getCategoryEligibility(catIndex).removeAt(elIndex); }

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

  // ---- Load / populate ----

  loadTournament(slug: string) {
    let t = this.tournamentService.getTournamentById(slug);
    if (t) this.populateForm(t);

    this.adminService.getTournaments().subscribe({
      next: (res) => {
        const apiTournament = res.data?.find((item: any) => item.id === slug);
        if (apiTournament) {
          this.tournamentId.set(apiTournament.id);
          this.populateForm(apiTournament);
        }
      },
      error: () => {}
    });
  }

  private populateForm(t: any) {
    if (this.eligibilityArray.length > 0 || this.scheduleDaysArray.length > 0 || this.categoriesArray.length > 0) return;

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
      contact: t.contactEmail || t.contact_email || '',
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
        this.scheduleDaysArray.push(this.fb.group({ date: [day.date], events: eventsArray }));
      });
    }

    if (t.categories && typeof t.categories === 'object') {
      Object.entries(t.categories as Record<string, any>).forEach(([catName, cat]) => {
        const elArray = this.fb.array((cat.eligibility || []).map((e: string) => this.fb.control(e)));
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
        this.categoriesArray.push(this.fb.group({
          name: [catName], eligibility: elArray,
          champion: [cat.prizes?.champion || ''],
          '2nd_place': [cat.prizes?.['2nd_place'] || ''],
          '3rd_place': [cat.prizes?.['3rd_place'] || ''],
          '4th_place': [cat.prizes?.['4th_place'] || ''],
          '5th_place': [cat.prizes?.['5th_place'] || ''],
          '6th_to_10th': [cat.prizes?.['6th_to_10th'] || ''],
          '11th_to_15th': [cat.prizes?.['11th_to_15th'] || ''],
          specialAwards: awardsArray
        }));
      });
    }
  }

  // ---- Submit ----

  confirmSave() {
    this.saving.set(true);
    const tournamentData = this.buildTournamentData();

    const apiPayload = {
      name: tournamentData['name'],
      slug: tournamentData['id'],
      status: tournamentData['status'],
      start_date: tournamentData['dates']['start'],
      end_date: tournamentData['dates']['end'],
      registration_deadline: tournamentData['registrationDeadline'],
      location: tournamentData['location'],
      latitude: tournamentData['coordinates']['lat'],
      longitude: tournamentData['coordinates']['lng'],
      format: tournamentData['format'],
      time_control: tournamentData['timeControl'],
      entry_fee: tournamentData['entryFee'],
      prize_pool: tournamentData['prizePool'],
      organizer: tournamentData['organizer'],
      contact_email: tournamentData['contact'],
      description: tournamentData['description'],
      registration_instructions: tournamentData['registrationInstructions'],
      rounds: tournamentData['rounds'],
      current_participants: tournamentData['participants']['current'],
      max_participants: tournamentData['participants']['max'],
      eligibility: tournamentData['eligibility'] || null,
      categories: tournamentData['categories'] || null,
      schedule: tournamentData['schedule'] || null,
    };

    const tid = this.tournamentId();
    const op = tid
      ? this.adminService.updateTournament(tid, apiPayload)
      : this.adminService.createTournament(apiPayload);

    op.subscribe({
      next: () => {
        this.tournamentService.fetchTournaments();
        this.saving.set(false);
        this.toastService.show(tid ? 'Tournament updated successfully' : 'Tournament created successfully', 'success');
        this.router.navigate(['/admin/tournaments']);
      },
      error: (err) => {
        this.saving.set(false);
        this.toastService.show('Failed to save: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  // ---- Formatting helpers ----

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  private buildTournamentData(): Record<string, any> {
    const v = this.tournamentForm.value;
    const eligibility = this.eligibilityArray.value.filter((e: string) => e.trim());

    const schedule: Record<string, { date: string; events: { name: string; time: string }[] }> = {};
    this.scheduleDaysArray.controls.forEach((day, i) => {
      const dayVal = day.value;
      schedule[`day_${i + 1}`] = {
        date: dayVal.date,
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
      if (catVal['4th_place']) prizes['4th_place'] = catVal['4th_place'];
      if (catVal['5th_place']) prizes['5th_place'] = catVal['5th_place'];
      if (catVal['6th_to_10th']) prizes['6th_to_10th'] = catVal['6th_to_10th'];
      if (catVal['11th_to_15th']) prizes['11th_to_15th'] = catVal['11th_to_15th'];

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
        eligibility: catVal.eligibility?.filter((e: string) => e.trim()) || [],
        prizes,
        ...(Object.keys(specialAwards).length ? { specialAwards } : {})
      };
    });

    return {
      id: v.name!.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: v.name,
      description: v.description || '',
      status: v.status,
      dates: { start: v.startDate, end: v.endDate },
      location: v.location || '',
      coordinates: { lat: v.lat || 0, lng: v.lng || 0 },
      format: v.format || '',
      timeControl: v.timeControl || '',
      entryFee: this.formatCurrencyOutput(v.entryFee || ''),
      registrationDeadline: v.registrationDeadline || '',
      prizePool: this.formatCurrencyOutput(v.prizePool || ''),
      organizer: v.organizer || '',
      contact: v.contact || '',
      rounds: v.rounds || 0,
      registrationInstructions: v.registrationInstructions || '',
      participants: { current: v.currentParticipants || 0, max: v.maxParticipants || 0 },
      ...(eligibility.length ? { eligibility } : {}),
      ...(Object.keys(schedule).length ? { schedule } : {}),
      ...(Object.keys(categories).length ? { categories } : {})
    };
  }
}
