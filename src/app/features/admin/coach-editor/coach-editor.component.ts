import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { CoachService } from '../../coaches/services/coach.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { 
  heroChevronLeft, 
  heroCheck, 
  heroPlus, 
  heroTrash,
  heroGlobeAlt,
  heroUserCircle,
  heroCloudArrowUp,
  heroPhoto
} from '@ng-icons/heroicons/outline';
import { ToastService } from '../../../core/services/toast.service';


@Component({
  selector: 'app-coach-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIcon],

  providers: [
    provideIcons({ 
      heroChevronLeft, 
      heroCheck, 
      heroPlus, 
      heroTrash,
      heroGlobeAlt,
      heroUserCircle,
      heroCloudArrowUp,
      heroPhoto
    })
  ],
  template: `
    <div class="coach-editor max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <!-- Top Bar -->
      <div class="flex items-center justify-between">
        <button (click)="location.back()" class="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors font-bold">
          <ng-icon name="heroChevronLeft"></ng-icon>
          <span>Back to List</span>
        </button>
        
        <div class="flex items-center gap-3">
          @if (isEditing()) {
            <span class="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase tracking-widest">Editing Mode</span>
          } @else {
            <span class="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">New Profile</span>
          }
        </div>
      </div>

      <!-- Header -->
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          {{ isEditing() ? 'Edit Coach Profile' : 'Create Coach Profile' }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400 font-medium">Fill in the details below to {{ isEditing() ? 'update' : 'create' }} a public coach profile.</p>
      </div>

      <form [formGroup]="coachForm" (ngSubmit)="save()" class="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <!-- Left Column: Main Info -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Identity Section -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 space-y-6">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ng-icon name="heroUserCircle" class="text-blue-500"></ng-icon>
              <span>Basic Information</span>
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Full Name</label>
                <input type="text" formControlName="name" placeholder="e.g. Magnus Carlsen" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Professional Title</label>
                <input type="text" formControlName="title" placeholder="e.g. Grandmaster & World Champion" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">FIDE Rating</label>
                <input type="number" formControlName="fideRating" placeholder="e.g. 2850" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Location</label>
                <input type="text" formControlName="location" placeholder="e.g. Oslo, Norway" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Short Catchphrase / Intro</label>
              <input type="text" formControlName="shortInfo" placeholder="A brief one-liner for search results" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Biography</label>
              <textarea formControlName="bio" rows="6" placeholder="Tell the story of the coach..." class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium"></textarea>
            </div>
          </div>

          <!-- Expertise & Experience -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 space-y-6">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ng-icon name="heroGlobeAlt" class="text-indigo-500"></ng-icon>
              <span>Experience & Methods</span>
            </h3>

            <!-- Playing Experience -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Playing Experience</label>
                <button type="button" (click)="addPlayingExp()" class="text-xs font-bold text-blue-500 hover:text-blue-600">+ Add Line</button>
              </div>
              <div formArrayName="playingExperience" class="space-y-2">
                @for (ctrl of playingExperience.controls; track $index) {
                  <div class="flex gap-2">
                    <input type="text" [formControlName]="$index" class="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium" placeholder="Achievement or tournament win...">
                    <button type="button" (click)="removePlayingExp($index)" class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                      <ng-icon name="heroTrash"></ng-icon>
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Teaching Experience -->
            <div class="space-y-3 mt-6">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Teaching Experience</label>
                <button type="button" (click)="addTeachingExp()" class="text-xs font-bold text-blue-500 hover:text-blue-600">+ Add Line</button>
              </div>
              <div formArrayName="teachingExperience" class="space-y-2">
                @for (ctrl of teachingExperience.controls; track $index) {
                  <div class="flex gap-2">
                    <input type="text" [formControlName]="$index" class="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium" placeholder="Previous students or coaching roles...">
                    <button type="button" (click)="removeTeachingExp($index)" class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                      <ng-icon name="heroTrash"></ng-icon>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Settings & Social -->
        <div class="space-y-8">
          <!-- Availability & Logistics -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 space-y-6">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Settings</h3>
            
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Profile Picture</label>
              
              <div 
                (click)="fileInput.click()"
                class="relative group cursor-pointer aspect-square rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 transition-all overflow-hidden flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950"
              >
                @if (imagePreview()) {
                  <img [src]="imagePreview()" class="absolute inset-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity">
                  <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ng-icon name="heroCloudArrowUp" class="text-3xl text-white"></ng-icon>
                  </div>
                } @else {
                  <div class="flex flex-col items-center gap-3 text-slate-400 group-hover:text-blue-500 transition-colors">
                    <ng-icon name="heroPhoto" class="text-4xl"></ng-icon>
                    <div class="text-center">
                      <p class="text-xs font-bold uppercase tracking-widest">Click to upload</p>
                      <p class="text-[10px] mt-1">JPG, PNG or WEBP</p>
                    </div>
                  </div>
                }
                
                <input 
                  #fileInput 
                  type="file" 
                  class="hidden" 
                  accept="image/*" 
                  (change)="onFileSelected($event)"
                >
              </div>
              
              <p class="text-[10px] text-slate-400 mt-2 px-1">Professional portraits work best for coach profiles.</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Coaching Type</label>
              <select formControlName="coachingType" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
                <option value="Online">Online</option>
                <option value="Onsite">Onsite</option>
                <option value="Online & Onsite">Online & Onsite</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Availability</label>
              <input type="text" formControlName="availability" placeholder="e.g. Mon-Fri, 10am - 6pm" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
            </div>

            <div class="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <input type="checkbox" formControlName="isAcademyInstructor" id="isAcademy" class="w-5 h-5 rounded border-slate-300">
              <label for="isAcademy" class="!mb-0 cursor-pointer font-bold text-slate-900 dark:text-white">Academy Instructor</label>
            </div>
          </div>

          <!-- Social Media -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 space-y-6" formGroupName="socialMedia">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Social Presence</h3>
            
            <div class="space-y-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Twitter/X</label>
                <input type="text" formControlName="twitter" placeholder="username" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Twitch</label>
                <input type="text" formControlName="twitch" placeholder="channel" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">YouTube</label>
                <input type="text" formControlName="youtube" placeholder="channel url" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Lichess</label>
                <input type="text" formControlName="lichess" placeholder="username" class="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium">
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <button type="submit" [disabled]="saving()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 py-4 flex items-center justify-center gap-3">
            @if (saving()) {
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Saving Changes...</span>
            } @else {
              <ng-icon name="heroCheck" class="text-xl"></ng-icon>
              <span>{{ isEditing() ? 'Update Profile' : 'Create Profile' }}</span>
            }
          </button>
        </div>
      </form>

    </div>
  `,
  styles: []

})
export class CoachEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private coachService = inject(CoachService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);

  private router = inject(Router);
  public location = inject(Location);

  isEditing = signal(false);
  coachId = signal<string | null>(null);
  saving = signal(false);
  imagePreview = signal<string | null>(null);

  coachForm = this.fb.group({
    id: [''],
    name: ['', Validators.required],
    title: ['', Validators.required],
    shortInfo: ['', Validators.required],
    fideRating: [null as number | null],
    profilePicture: [null as any, Validators.required],
    isAcademyInstructor: [false],
    playingExperience: this.fb.array([]),
    teachingExperience: this.fb.array([]),
    bio: ['', Validators.required],
    location: ['', Validators.required],
    availability: ['', Validators.required],
    teachingMethods: this.fb.array(['Online Coaching']),
    coachingType: ['Online' as 'Online' | 'Onsite' | 'Online & Onsite', Validators.required],
    socialMedia: this.fb.group({
      twitter: [''],
      youtube: [''],
      twitch: [''],
      instagram: [''],
      facebook: [''],
      chesscom: [''],
      lichess: [''],
    })
  });

  get playingExperience() { return this.coachForm.get('playingExperience') as FormArray; }
  get teachingExperience() { return this.coachForm.get('teachingExperience') as FormArray; }
  get teachingMethods() { return this.coachForm.get('teachingMethods') as FormArray; }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('coachId');
      if (id && id !== 'new') {
        this.isEditing.set(true);
        this.coachId.set(id);
        this.loadCoach(id);
      } else {
        this.addPlayingExp();
        this.addTeachingExp();
      }
    });
  }

  loadCoach(id: string) {
    this.coachService.getCoachById(id).subscribe({
      next: (coach) => {
        // Clear arrays
        while (this.playingExperience.length) this.playingExperience.removeAt(0);
        while (this.teachingExperience.length) this.teachingExperience.removeAt(0);
        
        // Add values back to arrays
        coach.playingExperience?.forEach(exp => this.playingExperience.push(this.fb.control(exp)));
        coach.teachingExperience?.forEach(exp => this.teachingExperience.push(this.fb.control(exp)));
        
        this.coachForm.patchValue(coach as any);
        if (coach.profilePicture) {
          this.imagePreview.set(coach.profilePicture);
        }
      },
      error: (err) => {
        this.toastService.show('Failed to load coach details', 'error');

        console.error(err);
      }
    });
  }

  addPlayingExp() { this.playingExperience.push(this.fb.control('')); }
  removePlayingExp(index: number) { this.playingExperience.removeAt(index); }

  addTeachingExp() { this.teachingExperience.push(this.fb.control('')); }
  removeTeachingExp(index: number) { this.teachingExperience.removeAt(index); }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.coachForm.patchValue({ profilePicture: file });
      
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  save() {
    if (this.coachForm.invalid) {
      this.toastService.show('Please fill in all required fields', 'error');
      return;
    }


    this.saving.set(true);
    const data = this.coachForm.value;
    
    // Filter out empty strings from arrays
    data.playingExperience = (data.playingExperience as string[]).filter(x => !!x);
    data.teachingExperience = (data.teachingExperience as string[]).filter(x => !!x);
    data.teachingMethods = (data.teachingMethods as string[]).filter(x => !!x);

    const obs = this.isEditing() 
      ? this.coachService.updateCoach(this.coachId()!, data as any)
      : this.coachService.createCoach(data as any);

    obs.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toastService.show(`Coach profile ${this.isEditing() ? 'updated' : 'created'} successfully`);
        this.router.navigate(['/admin/coaches']);
      },
      error: (err) => {
        this.saving.set(false);
        this.toastService.show('An error occurred while saving the profile', 'error');

        console.error(err);
      }
    });
  }
}
