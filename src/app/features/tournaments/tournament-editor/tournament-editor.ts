import { Component, inject, OnInit, signal, Input, ChangeDetectorRef, computed, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormArray, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { AdminService } from '../../../core/services/admin.service';
import { TournamentService } from '../../../core/services/tournament.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../core/services/toast.service';

import { StepBasicInfoComponent, StepDatesLocationComponent, StepFormatRulesComponent } from './components/steps.component';
import { StepOrganizerComponent, StepRegistrationComponent, StepEligibilityComponent } from './components/steps-extra.component';
import { StepPrizesComponent, StepScheduleComponent } from './components/steps-prizes-schedule.component';
import { ReviewSectionComponent } from './components/review-section.component';
import { PosterPreviewComponent } from './components/poster-preview.component';

import { TournamentMode, PosterTheme, VerificationStatus, comparePrizeKeys } from './models/tournament-editor.models';
import { TournamentFormHandler } from './handlers/tournament-form.handler';
import { TournamentMapsService } from './services/tournament-maps.service';
import { TournamentPosterHandler } from './handlers/tournament-poster.handler';

@Component({
  selector: 'app-tournament-editor',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, ButtonComponent,
    StepBasicInfoComponent, StepDatesLocationComponent,
    StepFormatRulesComponent, StepOrganizerComponent, StepRegistrationComponent,
    StepEligibilityComponent, StepPrizesComponent, StepScheduleComponent,
    ReviewSectionComponent, PosterPreviewComponent,
  ],
  templateUrl: './tournament-editor.html',
  styleUrls: ['./tournament-editor.css'],
})
export class TournamentEditorComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private tournamentService = inject(TournamentService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  public location = inject(Location);
  private platformId = inject(PLATFORM_ID);

  // Handlers & Services
  public formHandler = inject(TournamentFormHandler);
  private mapsService = inject(TournamentMapsService);
  private posterHandler = inject(TournamentPosterHandler);

  @Input() mode: TournamentMode = 'admin';

  // State Signals
  tournamentId = signal<string | null>(null);
  saving = signal(false);
  
  // Maps State
  mapsLink = signal('');
  mapsLinkError = signal('');
  mapsLinkLoading = signal(false);
  verificationStatus = signal<VerificationStatus>('idle');

  // Poster State
  useCustomPosterSignal = signal(false);
  downloadingPoster = signal(false);

  // Form Shortcut
  get tournamentForm() { return this.formHandler.tournamentForm; }

  // Computed Values
  private formValueSignal = toSignal(this.tournamentForm.valueChanges, { initialValue: this.tournamentForm.value });
  tournamentDataSignal = computed(() => {
    this.formValueSignal();
    return this.formHandler.buildTournamentData();
  });

  get useCustomPoster() { return this.tournamentForm.get('posterSettings.useCustomPoster')?.value ?? false; }

  // Form Array Getters for Template
  get eligibilityArray() { return this.formHandler.eligibilityArray; }
  get scheduleDaysArray() { return this.formHandler.scheduleDaysArray; }
  get categoriesArray() { return this.formHandler.categoriesArray; }

  ngOnInit() {
    const mode = this.route.snapshot.data['mode'];
    if (mode) this.mode = mode;

    this.route.paramMap.subscribe(params => {
      const id = params.get('tournamentId');
      if (id && isPlatformBrowser(this.platformId)) {
        this.loadTournament(id);
      }
    });
  }

  // ---- Navigation ----

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ---- Delegate Methods for Template ----
  getError(fieldName: string) { return this.formHandler.getError(fieldName); }
  buildTournamentData() { return this.formHandler.buildTournamentData(); }
  comparePrizeKeys = comparePrizeKeys;

  addEligibilityItem() { this.formHandler.addEligibilityItem(); }
  removeEligibilityItem(i: number) { this.formHandler.removeEligibilityItem(i); }
  addScheduleDay() { this.formHandler.addScheduleDay(); }
  removeScheduleDay(i: number) { this.formHandler.removeScheduleDay(i); }
  addScheduleEvent(i: number) { this.formHandler.addScheduleEvent(i); }
  removeScheduleEvent(di: number, ei: number) { this.formHandler.removeScheduleEvent(di, ei); }
  addCategory() { this.formHandler.addCategory(); }
  removeCategory(i: number) { this.formHandler.removeCategory(i); }
  addSpecialAward(i: number) { this.formHandler.addSpecialAward(i); }
  removeSpecialAward(ci: number, ai: number) { this.formHandler.removeSpecialAward(ci, ai); }
  addExtraPrize(i: number) { this.formHandler.addExtraPrize(i); }
  removeExtraPrize(ci: number, pi: number) { this.formHandler.removeExtraPrize(ci, pi); }

  // ---- Form Actions ----

  parseMapsLink() {
    const link = this.mapsLink().trim();
    if (!link) return;

    this.mapsLinkError.set('');
    this.mapsLinkLoading.set(true);
    this.verificationStatus.set('idle');

    const handleCoords = (coords: any) => {
      if (coords) {
        const patchData: any = { lat: coords.lat, lng: coords.lng };
        if (coords.name) patchData.location = coords.name;
        this.tournamentForm.patchValue(patchData);
        this.verificationStatus.set('success');
      } else {
        this.mapsLinkError.set('Could not extract coordinates from this link.');
        this.verificationStatus.set('error');
      }
      this.mapsLinkLoading.set(false);
    };

    if (this.mapsService.isShortenedUrl(link)) {
      this.mapsService.resolveShortenedUrl(link).subscribe({ next: handleCoords, error: () => handleCoords(null) });
    } else {
      handleCoords(this.mapsService.extractCoords(link));
    }
  }

  loadTournament(slug: string) {
    const obs = this.mode === 'user' ? this.tournamentService.getMyTournament(slug) : this.adminService.getTournament(slug);
    obs.subscribe({
      next: (res: any) => {
        const data = res.data || res;
        this.tournamentId.set(data.id);
        this.formHandler.populateForm(data);
        if (data.poster_settings?.useCustomPoster) this.useCustomPosterSignal.set(true);
      },
      error: (err: any) => {
        this.toastService.show(err.status === 403 ? 'Permission denied.' : 'Tournament not found.', 'error');
        this.router.navigate([this.mode === 'user' ? '/my-events' : '/admin']);
      }
    });
  }

  confirmSave() {
    // Basic validation
    if (this.tournamentForm.invalid) {
      this.tournamentForm.markAllAsTouched();
      this.toastService.show('Please fix the errors before saving.', 'error');
      return;
    }

    this.saving.set(true);
    const data = this.formHandler.buildTournamentData();
    const payload: any = {
      ...data,
      start_date: data['dates'].start,
      end_date: data['dates'].end,
      latitude: data['coordinates'].lat,
      longitude: data['coordinates'].lng,
      contact_email: data['contact'],
      registration_instructions: data['registrationInstructions'],
      poster_settings: data['poster_settings']
    };

    const tid = this.tournamentId();
    if (tid) payload['slug'] = tid;

    const op = this.mode === 'user'
      ? (tid ? this.tournamentService.updateMyTournament(tid, payload) : this.tournamentService.createMyTournament(payload))
      : (tid ? this.adminService.updateTournament(tid, payload) : this.adminService.createTournament(payload));

    op.subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.show(`Tournament ${tid ? 'updated' : 'created'} successfully`, 'success');
        this.router.navigate([this.mode === 'user' ? '/my-events' : '/admin']);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.toastService.show('Failed to save: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  // ---- Poster Actions ----

  get posterPrizeCategories() { return this.posterHandler.getPosterPrizeCategories(this.tournamentDataSignal()); }

  onPosterFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file && file.size < 10 * 1024 * 1024) {
      this.handleMediaUpload({ file, type: 'poster' });
    } else {
      this.toastService.show('File is too large (max 10MB)', 'error');
    }
  }

  handleMediaUpload(event: { file: File; type: 'background' | 'logo' | 'poster' }) {
    const formData = new FormData();
    formData.append('file', event.file);
    formData.append('type', event.type);

    this.http.post<{ url: string }>(`${environment.apiUrl}/my/tournaments/media`, formData).subscribe({
      next: (res) => {
        setTimeout(() => {
          if (event.type === 'background') this.tournamentForm.get('posterSettings.backgroundImage')?.setValue(res.url);
          else if (event.type === 'poster') {
            this.tournamentForm.get('posterSettings.customPosterUrl')?.setValue(res.url);
            this.tournamentForm.get('posterSettings.useCustomPoster')?.setValue(true);
            this.useCustomPosterSignal.set(true);
          } else {
            (this.tournamentForm.get('posterSettings.logos') as FormArray).push(new FormControl(res.url));
          }
          this.cdr.detectChanges();
          this.toastService.show('Image uploaded successfully', 'success');
        });
      },
      error: (err) => this.toastService.show('Upload failed: ' + (err.error?.message || err.message), 'error')
    });
  }

  removeCustomPoster() {
    this.tournamentForm.patchValue({ posterSettings: { useCustomPoster: false, customPosterUrl: null } });
    this.useCustomPosterSignal.set(false);
    this.toastService.show('Custom poster removed.', 'success');
    this.cdr.detectChanges();
  }

  // ---- UI Helpers ----
  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'auto';
    }
  }
}
