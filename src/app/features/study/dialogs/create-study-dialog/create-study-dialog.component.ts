import { Component, inject, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-create-study-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="bg-main rounded-4xl shadow-lg w-full max-w-xl p-8 font-sans space-y-8 relative">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl text-content">Create new study</h2>
      </div>

      <div class="space-y-4">
        <!-- Study Name -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Study Name</label>
          <input
            type="text"
            [(ngModel)]="name"
            maxlength="100"
            placeholder="e.g. My Openings Analysis"
            class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-lg text-sm outline-none placeholder:text-muted"
            autofocus
          />
        </div>

        <!-- Visibility -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Visibility</label>
          <div #dropdownContainer class="relative w-full">
            <button
              type="button"
              (click)="isDropdownOpen.update(v => !v)"
              class="w-full py-2.5 pl-1 pr-1 text-left text-content font-medium cursor-pointer text-sm border-b-2 border-border-base flex items-center justify-between focus:outline-none bg-transparent"
            >
              <span>{{ getVisibilityLabel() }}</span>
              <svg
                class="fill-current h-4 w-4 text-muted transition-transform duration-200"
                [class.rotate-180]="isDropdownOpen()"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </button>

            @if (isDropdownOpen()) {
              <div
                class="absolute top-full left-0 w-full min-w-48 bg-main border border-border-base rounded-xl py-2 mt-2 z-50 flex flex-col shadow-lg max-h-64 overflow-y-auto"
              >
                <button
                  type="button"
                  (click)="setVisibility('public')"
                  class="w-full px-4 py-2.5 hover:bg-subtle flex items-center text-left group/item cursor-pointer focus:outline-none"
                >
                  <span
                    class="text-sm text-content group-hover/item:text-accent font-medium"
                    [class.text-accent]="visibility() === 'public'"
                  >
                    Public (Everyone can see)
                  </span>
                </button>
                <button
                  type="button"
                  (click)="setVisibility('unlisted')"
                  class="w-full px-4 py-2.5 hover:bg-subtle flex items-center text-left group/item cursor-pointer focus:outline-none"
                >
                  <span
                    class="text-sm text-content group-hover/item:text-accent font-medium"
                    [class.text-accent]="visibility() === 'unlisted'"
                  >
                    Unlisted (Hidden from search)
                  </span>
                </button>
                <button
                  type="button"
                  (click)="setVisibility('private')"
                  class="w-full px-4 py-2.5 hover:bg-subtle flex items-center text-left group/item cursor-pointer focus:outline-none"
                >
                  <span
                    class="text-sm text-content group-hover/item:text-accent font-medium"
                    [class.text-accent]="visibility() === 'private'"
                  >
                    Private (Only me)
                  </span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Category Selection -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-content">Category</label>
          <div #categoryDropdownContainer class="relative w-full">
            <button
              type="button"
              (click)="isCategoryDropdownOpen.update(v => !v)"
              class="w-full py-2.5 pl-1 pr-1 text-left text-content font-medium cursor-pointer text-sm border-b-2 border-border-base flex items-center justify-between focus:outline-none bg-transparent"
            >
              <span>{{ getCategoryLabel() }}</span>
              <svg
                class="fill-current h-4 w-4 text-muted transition-transform duration-200"
                [class.rotate-180]="isCategoryDropdownOpen()"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </button>

            @if (isCategoryDropdownOpen()) {
              <div
                class="absolute top-full left-0 w-full min-w-48 bg-main border border-border-base rounded-xl py-2 mt-2 z-50 flex flex-col shadow-lg max-h-64 overflow-y-auto"
              >
                <button
                  type="button"
                  (click)="setCategory('general')"
                  class="w-full px-4 py-2.5 hover:bg-subtle flex flex-col text-left cursor-pointer focus:outline-none group/item"
                >
                  <span
                    class="text-sm text-content group-hover/item:text-accent font-semibold"
                    [class.text-accent]="category() === 'general'"
                  >
                    General Study
                  </span>
                  <span class="text-xs text-muted">For casual puzzles or game analysis</span>
                </button>
                <button
                  type="button"
                  (click)="setCategory('opening_repertoire')"
                  class="w-full px-4 py-2.5 hover:bg-subtle flex flex-col text-left cursor-pointer focus:outline-none group/item"
                >
                  <span
                    class="text-sm text-content group-hover/item:text-accent font-semibold"
                    [class.text-accent]="category() === 'opening_repertoire'"
                  >
                    Opening Repertoire
                  </span>
                  <span class="text-xs text-muted">For memorizing lines with repeat drilling</span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Repertoire Orientation Selector (Only visible for Opening Repertoires) -->
        @if (category() === 'opening_repertoire') {
          <div class="space-y-2">
            <label class="text-sm font-semibold text-content">Repertoire Side (Default for Chapters)</label>
            <div class="flex gap-4">
              <button
                (click)="orientation.set('white')"
                type="button"
                class="flex-1 py-2.5 px-4 border border-border-base rounded-xl cursor-pointer hover:bg-subtle transition text-sm font-medium focus:outline-none flex items-center justify-center gap-2"
                [class.border-accent]="orientation() === 'white'"
                [class.bg-accent/5]="orientation() === 'white'"
              >
                <span class="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400"></span>
                White Repertoire
              </button>
              <button
                (click)="orientation.set('black')"
                type="button"
                class="flex-1 py-2.5 px-4 border border-border-base rounded-xl cursor-pointer hover:bg-subtle transition text-sm font-medium focus:outline-none flex items-center justify-center gap-2"
                [class.border-accent]="orientation() === 'black'"
                [class.bg-accent/5]="orientation() === 'black'"
              >
                <span class="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-950"></span>
                Black Repertoire
              </button>
            </div>
          </div>
        }
      </div>

      <div class="pt-4 flex gap-4 w-full">
        <button
          appButton
          variant="outline"
          class="flex-1"
          (click)="dialogRef.close()"
        >
          Cancel
        </button>
        <button
          appButton
          variant="primary"
          class="flex-1"
          (click)="onSubmit()"
          [disabled]="!name().trim()"
        >
          Create study
        </button>
      </div>
    </div>
  `,
})
export class CreateStudyDialogComponent {
  dialogRef = inject(DialogRef<any>);

  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;
  @ViewChild('categoryDropdownContainer') categoryDropdownContainer!: ElementRef;

  isDropdownOpen = signal(false);
  isCategoryDropdownOpen = signal(false);

  name = signal('');
  visibility = signal<'public' | 'private' | 'unlisted'>('public');
  category = signal<'general' | 'opening_repertoire'>('general');
  orientation = signal<'white' | 'black'>('white');

  getVisibilityLabel(): string {
    switch (this.visibility()) {
      case 'public': return 'Public (Everyone can see)';
      case 'unlisted': return 'Unlisted (Hidden from search)';
      case 'private': return 'Private (Only me)';
      default: return 'Public';
    }
  }

  getCategoryLabel(): string {
    switch (this.category()) {
      case 'general': return 'General Study';
      case 'opening_repertoire': return 'Opening Repertoire';
      default: return 'General Study';
    }
  }

  setVisibility(val: 'public' | 'private' | 'unlisted') {
    this.visibility.set(val);
    this.isDropdownOpen.set(false);
  }

  setCategory(val: 'general' | 'opening_repertoire') {
    this.category.set(val);
    this.isCategoryDropdownOpen.set(false);
  }

  onSubmit() {
    if (this.name().trim()) {
      this.dialogRef.close({
        name: this.name().trim(),
        visibility: this.visibility(),
        category: this.category(),
        orientation: this.category() === 'opening_repertoire' ? this.orientation() : 'white'
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (
      this.isDropdownOpen() &&
      this.dropdownContainer &&
      !this.dropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isDropdownOpen.set(false);
    }
    if (
      this.isCategoryDropdownOpen() &&
      this.categoryDropdownContainer &&
      !this.categoryDropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isCategoryDropdownOpen.set(false);
    }
  }
}

