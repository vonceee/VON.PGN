import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CoachApplicationService } from '../../../core/services/coach-application.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-coach-application',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './coach-application.component.html',
})
export class CoachApplicationComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);
  private applicationService = inject(CoachApplicationService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  applicationForm!: FormGroup; // Definite assignment assertion
  submitting = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  fileError: string | null = null;

  constructor() {
    const currentUser = this.authService.currentUser();
    const userEmail = currentUser?.email || '';

    this.applicationForm = this.fb.group({
      name: ['', [Validators.required]],
      title: [''],
      shortInfo: ['', [Validators.required]],
      fideRating: [null, [Validators.required, Validators.min(0)]],
      email: [userEmail, [Validators.required, Validators.email]],
      bio: ['', [Validators.required]],
      location: [''],
      availability: [''],
      coachingType: ['Online', [Validators.required]],
      playingExperience: this.fb.array([]),
      teachingExperience: this.fb.array([]),
      teachingMethods: this.fb.array([]),
      socialMedia: this.fb.group({
        twitter: [''],
        youtube: [''],
        twitch: [''],
        instagram: [''],
        facebook: [''],
        chesscom: [''],
        lichess: [''],
      }),
      profilePicture: [''],
    });

    // Disable email field if it's pre-filled from user account
    if (userEmail) {
      this.applicationForm.get('email')?.disable();
    }
  }

  getFieldError(fieldName: string): string | null {
    const control = this.applicationForm.get(fieldName);
    if (control?.errors?.['serverError']) {
      return control.errors['serverError'];
    }
    return null;
  }

  get playingExperience(): FormArray {
    return this.applicationForm.get('playingExperience') as FormArray;
  }

  get teachingExperience(): FormArray {
    return this.applicationForm.get('teachingExperience') as FormArray;
  }

  get teachingMethods(): FormArray {
    return this.applicationForm.get('teachingMethods') as FormArray;
  }

  addPlayingExperience() {
    this.playingExperience.push(this.fb.control(''));
  }

  removePlayingExperience(index: number) {
    this.playingExperience.removeAt(index);
  }

  addTeachingExperience() {
    this.teachingExperience.push(this.fb.control(''));
  }

  removeTeachingExperience(index: number) {
    this.teachingExperience.removeAt(index);
  }

  addTeachingMethod() {
    this.teachingMethods.push(this.fb.control(''));
  }

  removeTeachingMethod(index: number) {
    this.teachingMethods.removeAt(index);
  }

  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.fileError = null; // Reset previous errors

    if (file) {
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.fileError = 'File size must be less than 5MB';
        this.selectedFile = null;
        this.previewUrl = null;
        // Reset the file input
        (event.target as HTMLInputElement).value = '';
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.fileError = 'Only JPEG, PNG, and GIF images are allowed';
        this.selectedFile = null;
        this.previewUrl = null;
        // Reset the file input
        (event.target as HTMLInputElement).value = '';
        return;
      }

      this.selectedFile = file;
      // For preview, we can still show the image
      const reader = new FileReader();
      reader.onload = () => {
        // Store preview URL for display only (not sent to server)
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFile = null;
      this.previewUrl = null;
    }
  }

  onSubmit() {
    if (this.applicationForm.valid) {
      this.submitting = true;

      // Create FormData for file upload
      const formData = new FormData();
      const formValue = this.applicationForm.value;

      // Add all form fields to FormData
      formData.append('name', formValue.name);
      if (formValue.title) formData.append('title', formValue.title);
      if (formValue.shortInfo) formData.append('shortInfo', formValue.shortInfo);
      if (formValue.fideRating) formData.append('fideRating', formValue.fideRating.toString());
      // Handle disabled email field
      const emailValue = this.applicationForm.get('email')?.value;
      formData.append('email', emailValue);

      // Handle arrays
      const playingExperience = formValue.playingExperience.filter((exp: string) => exp.trim());
      playingExperience.forEach((exp: string, index: number) => {
        formData.append(`playingExperience[${index}]`, exp);
      });

      const teachingExperience = formValue.teachingExperience.filter((exp: string) => exp.trim());
      teachingExperience.forEach((exp: string, index: number) => {
        formData.append(`teachingExperience[${index}]`, exp);
      });

      const teachingMethods = formValue.teachingMethods.filter((method: string) => method.trim());
      teachingMethods.forEach((method: string, index: number) => {
        formData.append(`teachingMethods[${index}]`, method);
      });

      // Add other fields
      if (formValue.bio) formData.append('bio', formValue.bio);
      if (formValue.location) formData.append('location', formValue.location);
      if (formValue.availability) formData.append('availability', formValue.availability);
      if (formValue.coachingType) formData.append('coachingType', formValue.coachingType);

      // Social media
      if (formValue.socialMedia.twitter) formData.append('twitter', formValue.socialMedia.twitter);
      if (formValue.socialMedia.youtube) formData.append('youtube', formValue.socialMedia.youtube);
      if (formValue.socialMedia.twitch) formData.append('twitch', formValue.socialMedia.twitch);
      if (formValue.socialMedia.instagram) formData.append('instagram', formValue.socialMedia.instagram);
      if (formValue.socialMedia.facebook) formData.append('facebook', formValue.socialMedia.facebook);
      if (formValue.socialMedia.chesscom) formData.append('chesscom', formValue.socialMedia.chesscom);
      if (formValue.socialMedia.lichess) formData.append('lichess', formValue.socialMedia.lichess);

      // Add file if selected
      if (this.selectedFile) {
        formData.append('profilePicture', this.selectedFile);
      }

      // Submit to API
      this.http.post(`${environment.apiUrl}/coach-applications`, formData).subscribe({
        next: (response) => {
          this.toastService.show('Coach profile submitted successfully! We will review it for listing on our platform.', 'success');
          this.router.navigate(['/coaches']);
        },
        error: (error) => {
          console.error('Submission failed:', error);
          this.submitting = false;

          // Handle validation errors from backend
          if (error.error?.errors) {
            // Handle file upload errors
            if (error.error.errors.profilePicture) {
              this.fileError = error.error.errors.profilePicture[0];
            }

            // Handle other validation errors
            Object.keys(error.error.errors).forEach(field => {
              const control = this.applicationForm.get(field);
              if (control) {
                control.setErrors({ serverError: error.error.errors[field][0] });
              }
            });
          } else if (error.error?.message) {
            // Show general error message
            this.toastService.show(error.error.message, 'error');
          } else {
            // Show generic error message
            this.toastService.show('Failed to submit application. Please try again.', 'error');
          }
        }
      });
    } else {
      console.log('Form is invalid');
      console.log('Form controls errors:');
      Object.keys(this.applicationForm.controls).forEach(key => {
        const control = this.applicationForm.get(key);
        if (control?.invalid) {
          console.log(`${key}:`, control.errors);
        }
      });
      this.applicationForm.markAllAsTouched();
    }
  }
}