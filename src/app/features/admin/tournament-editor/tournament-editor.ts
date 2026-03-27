import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TournamentService } from '../../../core/services/tournament.service';

interface Section { key: string; label: string; }

@Component({
  selector: 'app-tournament-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tournament-editor.html',
  styleUrls: ['./tournament-editor.css']
})
export class TournamentEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tournamentService = inject(TournamentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public location = inject(Location);

  tournamentId = signal<string | null>(null);
  saving = signal(false);
  activeSection = signal<string>('basic');

  sections: Section[] = [
    { key: 'basic', label: 'Basic Info' },
    { key: 'dates', label: 'Dates & Location' },
    { key: 'format', label: 'Format' },
    { key: 'organizer', label: 'Organizer' },
    { key: 'eligibility', label: 'Eligibility' },
    { key: 'prizes', label: 'Prizes' },
    { key: 'schedule', label: 'Schedule' }
  ];

  tournamentForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    bannerImage: [''],
    status: ['upcoming', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    registrationDeadline: [''],
    location: [''],
    lat: [14.5995],
    lng: [120.9842],
    format: ['Swiss System'],
    timeControl: ['90 min + 30 sec increment'],
    rounds: [9],
    entryFee: [''],
    prizePool: [''],
    maxParticipants: [128],
    currentParticipants: [0],
    organizer: [''],
    contactEmail: [''],
    eligibility: this.fb.array([]),
    scheduleDays: this.fb.array([]),
    categories: this.fb.array([])
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('tournamentId');
      if (id) {
        this.tournamentId.set(id);
        this.loadTournament(id);
      }
    });
  }

  setSection(key: string) {
    this.activeSection.set(key);
  }

  get eligibilityArray(): FormArray {
    return this.tournamentForm.get('eligibility') as FormArray;
  }

  get scheduleDaysArray(): FormArray {
    return this.tournamentForm.get('scheduleDays') as FormArray;
  }

  get categoriesArray(): FormArray {
    return this.tournamentForm.get('categories') as FormArray;
  }

  eligibilityControl(index: number): FormControl {
    return this.eligibilityArray.at(index) as FormControl;
  }

  addEligibilityItem() {
    this.eligibilityArray.push(this.fb.control(''));
  }

  removeEligibilityItem(index: number) {
    this.eligibilityArray.removeAt(index);
  }

  addScheduleDay() {
    this.scheduleDaysArray.push(this.fb.group({
      date: [''],
      events: this.fb.array([])
    }));
  }

  removeScheduleDay(index: number) {
    this.scheduleDaysArray.removeAt(index);
  }

  getScheduleEvents(dayIndex: number): FormArray {
    return this.scheduleDaysArray.at(dayIndex).get('events') as FormArray;
  }

  scheduleDayGroup(index: number): FormGroup {
    return this.scheduleDaysArray.at(index) as FormGroup;
  }

  scheduleEventGroup(dayIndex: number, eventIndex: number): FormGroup {
    return this.getScheduleEvents(dayIndex).at(eventIndex) as FormGroup;
  }

  addScheduleEvent(dayIndex: number) {
    this.getScheduleEvents(dayIndex).push(this.fb.group({
      name: [''],
      time: ['']
    }));
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

  removeCategory(index: number) {
    this.categoriesArray.removeAt(index);
  }

  categoryGroup(index: number): FormGroup {
    return this.categoriesArray.at(index) as FormGroup;
  }

  getCategoryEligibility(catIndex: number): FormArray {
    return this.categoriesArray.at(catIndex).get('eligibility') as FormArray;
  }

  categoryEligibilityControl(catIndex: number, elIndex: number): FormControl {
    return this.getCategoryEligibility(catIndex).at(elIndex) as FormControl;
  }

  addCategoryEligibility(catIndex: number) {
    this.getCategoryEligibility(catIndex).push(this.fb.control(''));
  }

  removeCategoryEligibility(catIndex: number, elIndex: number) {
    this.getCategoryEligibility(catIndex).removeAt(elIndex);
  }

  getCategorySpecialAwards(catIndex: number): FormArray {
    return this.categoriesArray.at(catIndex).get('specialAwards') as FormArray;
  }

  specialAwardGroup(catIndex: number, awardIndex: number): FormGroup {
    return this.getCategorySpecialAwards(catIndex).at(awardIndex) as FormGroup;
  }

  addSpecialAward(catIndex: number) {
    this.getCategorySpecialAwards(catIndex).push(this.fb.group({
      name: [''],
      type: ['simple'],
      value: [''],
      '1st': [''],
      '2nd': [''],
      '3rd': ['']
    }));
  }

  removeSpecialAward(catIndex: number, awardIndex: number) {
    this.getCategorySpecialAwards(catIndex).removeAt(awardIndex);
  }

  loadTournament(id: string) {
    const t = this.tournamentService.getTournamentById(id);
    if (!t) return;

    this.tournamentForm.patchValue({
      name: t.name,
      description: t.description,
      bannerImage: t.bannerImage,
      status: t.status,
      startDate: t.dates.start,
      endDate: t.dates.end,
      registrationDeadline: t.registrationDeadline,
      location: t.location,
      lat: t.coordinates.lat,
      lng: t.coordinates.lng,
      format: t.format,
      timeControl: t.timeControl,
      rounds: t.rounds,
      entryFee: t.entryFee,
      prizePool: t.prizePool,
      maxParticipants: t.participants.max,
      currentParticipants: t.participants.current,
      organizer: t.organizer,
      contactEmail: t.contactEmail
    });

    if (t.eligibility) {
      t.eligibility.forEach(item => {
        this.eligibilityArray.push(this.fb.control(item));
      });
    }

    if (t.schedule) {
      Object.values(t.schedule).forEach(day => {
        const eventsArray = this.fb.array(
          day.events.map(e => this.fb.group({ name: [e.name], time: [e.time] }))
        );
        this.scheduleDaysArray.push(this.fb.group({
          date: [day.date],
          events: eventsArray
        }));
      });
    }

    if (t.categories) {
      Object.entries(t.categories).forEach(([catName, cat]) => {
        const elArray = this.fb.array(
          cat.eligibility.map(e => this.fb.control(e))
        );
        const awardsArray = this.fb.array(
          Object.entries(cat.specialAwards || {}).map(([awardName, award]) => {
            if (typeof award === 'object') {
              return this.fb.group({
                name: [awardName],
                type: ['nested'],
                value: [''],
                '1st': [award['1st']],
                '2nd': [award['2nd']],
                '3rd': [award['3rd']]
              });
            }
            return this.fb.group({
              name: [awardName],
              type: ['simple'],
              value: [award],
              '1st': [''],
              '2nd': [''],
              '3rd': ['']
            });
          })
        );

        this.categoriesArray.push(this.fb.group({
          name: [catName],
          eligibility: elArray,
          champion: [cat.prizes.champion || ''],
          '2nd_place': [cat.prizes['2nd_place'] || ''],
          '3rd_place': [cat.prizes['3rd_place'] || ''],
          '4th_place': [cat.prizes['4th_place'] || ''],
          '5th_place': [cat.prizes['5th_place'] || ''],
          '6th_to_10th': [cat.prizes['6th_to_10th'] || ''],
          '11th_to_15th': [cat.prizes['11th_to_15th'] || ''],
          specialAwards: awardsArray
        }));
      });
    }
  }

  saveTournament() {
    if (this.tournamentForm.invalid) return;
    this.saving.set(true);

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

    const tournamentData: Record<string, any> = {
      id: v.name!.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: v.name,
      description: v.description || '',
      bannerImage: v.bannerImage || '',
      status: v.status,
      dates: { start: v.startDate, end: v.endDate },
      location: v.location || '',
      coordinates: { lat: v.lat || 0, lng: v.lng || 0 },
      format: v.format || '',
      timeControl: v.timeControl || '',
      entryFee: v.entryFee || '',
      registrationDeadline: v.registrationDeadline || '',
      prizePool: v.prizePool || '',
      organizer: v.organizer || '',
      contactEmail: v.contactEmail || '',
      rounds: v.rounds || 0,
      participants: { current: v.currentParticipants || 0, max: v.maxParticipants || 0 },
      ...(eligibility.length ? { eligibility } : {}),
      ...(Object.keys(schedule).length ? { schedule } : {}),
      ...(Object.keys(categories).length ? { categories } : {})
    };

    const tid = this.tournamentId();
    if (tid) {
      const current = this.tournamentService.tournaments();
      const idx = current.findIndex(t => t.id === tid);
      if (idx !== -1) {
        current[idx] = { ...current[idx], ...tournamentData } as any;
        this.tournamentService.tournaments.set([...current]);
      }
    } else {
      this.tournamentService.tournaments.update(list => [...list, tournamentData as any]);
    }

    this.saving.set(false);
    alert(tid ? 'Tournament updated successfully' : 'Tournament created successfully');
    this.router.navigate(['/admin/tournaments']);
  }
}
