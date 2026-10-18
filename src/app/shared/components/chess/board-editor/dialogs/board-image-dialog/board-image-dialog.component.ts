import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-board-image-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-3xl w-full max-w-md p-6 sm:p-7 relative shadow-2xl border border-slate-100 flex flex-col gap-5 select-none mx-auto">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-slate-900 tracking-tight">Load board from image</h2>
          <p class="text-xs text-slate-500">Paste a screenshot or upload an image to detect the position.</p>
        </div>
        <button
          type="button"
          (click)="dialogRef.close()"
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer -mr-1.5 -mt-1.5"
          title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Error / Inline Alert -->
      @if (errorMessage(); as msg) {
        <div class="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4 shrink-0 text-rose-500 mt-0.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <div class="flex-1 leading-relaxed">
            {{ msg }}
          </div>
          <button
            type="button"
            (click)="errorMessage.set(null)"
            class="text-rose-400 hover:text-rose-600 p-0.5 rounded cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }

      <!-- Primary Action: Paste from Clipboard -->
      <div class="flex flex-col gap-2">
        <button
          type="button"
          (click)="pasteFromClipboard()"
          class="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm inline-flex items-center justify-between shadow-sm hover:shadow transition-all cursor-pointer group">
          <span class="inline-flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="size-5 text-slate-300 group-hover:text-white transition-colors">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
            Paste from clipboard
          </span>
          <kbd class="px-2 py-0.5 text-[11px] font-mono font-medium rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 group-hover:border-slate-600 transition-colors">
            Ctrl + V
          </kbd>
        </button>
        <p class="text-[11px] text-center text-slate-400">
          Takes any screenshot copied to your clipboard (PrtScn / Win+Shift+S).
        </p>
      </div>

      <!-- Divider -->
      <div class="flex items-center gap-3">
        <div class="flex-1 h-px bg-slate-200"></div>
        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">or</span>
        <div class="flex-1 h-px bg-slate-200"></div>
      </div>

      <!-- Drag & Drop Zone -->
      <div
        class="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150"
        [class.border-blue-500]="isDragging()"
        [class.bg-blue-50/60]="isDragging()"
        [class.border-slate-200]="!isDragging()"
        [class.bg-slate-50/50]="!isDragging()"
        [class.hover:bg-slate-100/70]="!isDragging()"
        [class.hover:border-slate-300]="!isDragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()">
        
        <div class="size-11 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center text-slate-600 mb-3 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="size-5.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </div>

        <p class="text-xs font-medium text-slate-800 mb-1">
          Drag & drop chessboard screenshot here
        </p>
        <p class="text-[11px] text-slate-400">
          or <span class="text-blue-600 hover:underline font-medium">browse files</span> from your computer
        </p>
        <span class="mt-2 text-[10px] text-slate-400 uppercase tracking-wider font-medium">PNG, JPG, WebP</span>
      </div>

      <input
        #fileInput
        type="file"
        accept="image/*"
        class="hidden"
        (change)="onFileSelected($event)">
    </div>
  `
})
export class BoardImageDialogComponent {
  dialogRef = inject(DialogRef<File>);

  isDragging = signal(false);
  errorMessage = signal<string | null>(null);

  /**
   * Captures image data directly from system clipboard via Clipboard API.
   */
  async pasteFromClipboard() {
    this.errorMessage.set(null);

    if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
      this.errorMessage.set('Clipboard image reading is not supported by your browser. Please drag & drop or use file upload.');
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      let imageFile: File | null = null;

      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          imageFile = new File([blob], 'clipboard-screenshot.png', { type: imageType });
          break;
        }
      }

      if (!imageFile) {
        this.errorMessage.set('No image found on your clipboard. Please copy a screenshot first.');
        return;
      }

      this.dialogRef.close(imageFile);
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error?.name === 'NotAllowedError') {
        this.errorMessage.set('Clipboard permission was denied. Please allow clipboard access or drag & drop the image.');
      } else {
        this.errorMessage.set(error?.message || 'Failed to read image from clipboard.');
      }
    }
  }

  /**
   * Global paste listener while this dialog is active.
   */
  @HostListener('window:paste', ['$event'])
  onWindowPaste(event: ClipboardEvent) {
    this.errorMessage.set(null);
    const files = event.clipboardData?.files;
    if (files && files.length > 0) {
      const file = Array.from(files).find(f => f.type.startsWith('image/'));
      if (file) {
        event.preventDefault();
        this.dialogRef.close(file);
        return;
      }
    }

    const items = event.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            this.dialogRef.close(file);
            return;
          }
        }
      }
    }

    this.errorMessage.set('No image found in pasted data. Please copy an image first.');
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    this.errorMessage.set(null);

    const file = Array.from(event.dataTransfer?.files || []).find(f => f.type.startsWith('image/'));
    if (file) {
      this.dialogRef.close(file);
    } else {
      this.errorMessage.set('Please drop a valid image file.');
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.dialogRef.close(file);
    }
    input.value = '';
  }
}
