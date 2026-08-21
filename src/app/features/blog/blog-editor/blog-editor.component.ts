import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BlogService, Blog, BlogGame } from '../../../core/services/blog.service';
import { ButtonComponent } from '@shared/ui';
interface EditorGame {
  id?: number;
  title: string;
  pgn: string;
  order: number;
}

@Component({
  selector: 'app-blog-editor',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonComponent,
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">
      
      <!-- Back Link -->
      <div class="mb-8">
        <a routerLink="/blog" class="text-sm/6 font-medium text-gray-500 hover:text-content hover:underline flex items-center gap-1">
          ← Back to blogs
        </a>
      </div>

      <!-- Standardized Page Header (Inline) -->
      <header class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="flex-1">
          <h1 class="text-4xl md:text-5xl mb-2">
            {{ isEditMode() ? 'Edit blog post' : 'Create new blog post' }}
          </h1>
          <p class="text-gray-500 text-sm md:text-base leading-relaxed tracking-widest max-w-3xl">
            {{ isEditMode() ? 'Update your post and manage interactive games.' : 'Write articles, draft ideas, and insert chess games.' }}
          </p>
        </div>
      </header>

      <div *ngIf="isLoading() && isEditMode()" class="min-h-96 flex items-center justify-center">
      </div>

      <!-- Main Editor Container (Side by Side layout on desktop) -->
      <div *ngIf="!isLoading() || !isEditMode()" class="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
        
        <!-- Left Side: Editor Form -->
        <div class="space-y-6">
          <div class="bg-white rounded-xl border border-border-base p-6 md:p-8 space-y-6">
            
            <!-- Title -->
            <div class="flex flex-col">
              <label class="text-sm/6 font-semibold">Title</label>
              <input
                type="text"
                [(ngModel)]="title"
                placeholder="Enter an catchy title..."
                class="w-full px-4 py-3 rounded-xl border border-border-base bg-white outline-none focus:border-accent text-base md:text-lg font-medium"
              />
            </div>

            <!-- Summary / Excerpt -->
            <div class="flex flex-col">
              <label class="text-sm/6 font-semibold">Summary (optional)</label>
              <textarea
                [(ngModel)]="summary"
                placeholder="Brief excerpt shown in the list feed..."
                rows="2"
                class="w-full px-4 py-3 rounded-xl border border-border-base bg-white outline-none focus:border-accent text-sm/6 resize-none"
              ></textarea>
            </div>

            <!-- Editor Body with Markdown Toolbar -->
            <div class="flex flex-col">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-base pb-3">
                <label class="text-sm/6 font-semibold">Body content (Markdown)</label>
                
                <!-- Toolbar Helpers -->
                <div class="flex items-center gap-1 bg-subtle/50 border border-border-base rounded-full p-1 text-xs">
                  <button (click)="insertMarkdown('bold')" class="px-2.5 py-1 rounded-full hover:bg-white font-semibold cursor-pointer">B</button>
                  <button (click)="insertMarkdown('italic')" class="px-2.5 py-1 rounded-full hover:bg-white italic cursor-pointer">I</button>
                  <button (click)="insertMarkdown('header')" class="px-2.5 py-1 rounded-full hover:bg-white font-medium cursor-pointer">H2</button>
                  <button (click)="insertMarkdown('link')" class="px-2.5 py-1 rounded-full hover:bg-white hover:underline cursor-pointer">Link</button>
                  <span class="w-[1px] h-4 bg-border-base mx-1"></span>
                  <div class="relative group/insert">
                    <button class="px-2.5 py-1 rounded-full hover:bg-white font-medium cursor-pointer">Insert game</button>
                    <!-- Dropdown for games -->
                    <div class="absolute bottom-full right-0 mb-2 w-48 bg-white border border-border-base rounded-xl shadow-lg p-2 invisible group-hover/insert:visible opacity-0 group-hover/insert:opacity-100 transition-all z-10 flex flex-col gap-1">
                      <span *ngIf="games().length === 0" class="text-sm/6 text-gray-500 text-center py-2">No games added yet</span>
                      <button
                        *ngFor="let g of games(); let idx = index"
                        (click)="insertGameTag(idx)"
                        class="text-left text-xs px-3 py-2 hover:bg-subtle rounded-lg truncate cursor-pointer font-medium"
                      >
                        Game #{{ idx }} - {{ g.title || 'Untitled' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Main text area -->
              <textarea
                #editorTextarea
                [(ngModel)]="content"
                placeholder="Write your article here. Use [game:0] to insert your first game inline..."
                rows="16"
                class="w-full px-4 py-3 rounded-xl border border-border-base bg-white outline-none focus:border-accent text-base leading-relaxed resize-y min-h-[350px]"
              ></textarea>
            </div>
            
            <!-- Status & Action Buttons -->
            <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border-base">
              <div class="flex items-center gap-4">
                <label class="text-sm/6 font-semibold">Status:</label>
                <select
                  [(ngModel)]="status"
                  class="px-3 py-2 rounded-xl border border-border-base bg-white text-sm/6 outline-none focus:border-accent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              
              <div class="flex items-center gap-2">
                <button
                  appButton
                  variant="outline"
                  routerLink="/blog"
                  [disabled]="isSaving()"
                >
                  Cancel
                </button>
                
                <button
                  appButton
                  variant="primary"
                  (click)="savePost()"
                  [loading]="isSaving()"
                >
                  {{ isEditMode() ? 'Save changes' : 'Publish post' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: Live Preview & Games Manager -->
        <div class="space-y-6">
          
          <!-- PGN Games Manager Card -->
          <div class="bg-white rounded-xl border border-border-base p-6 space-y-4">
            <h3 class="text-lg font-semibold border-b border-border-base pb-2">PGN games manager</h3>
            
            <!-- Game adding inputs -->
            <div class="space-y-3 p-4 bg-subtle/25 rounded-xl border border-border-base">
              <h4 class="text-xs font-semibold text-gray-500 uppercase">Add a chess game</h4>
              
              <div class="flex flex-col gap-1.5">
                <input
                  type="text"
                  [(ngModel)]="newGameTitle"
                  placeholder="Game title (e.g. Kasparov vs Deep Blue)"
                  class="w-full px-3 py-2 rounded-lg border border-border-base bg-white text-sm/6 outline-none focus:border-accent"
                />
              </div>
              
              <div class="flex flex-col gap-1.5">
                <textarea
                  [(ngModel)]="newGamePgn"
                  placeholder="Paste PGN string here..."
                  rows="4"
                  class="w-full px-3 py-2 rounded-lg border border-border-base bg-white text-xs outline-none focus:border-accent resize-none"
                ></textarea>
              </div>

              <button
                appButton
                variant="outline"
                (click)="addGame()"
                class="w-full text-xs py-2"
              >
                + Add game to post
              </button>
            </div>

            <!-- List of Games -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-gray-500 uppercase">Games in this post</h4>
              
              <div *ngIf="games().length === 0" class="text-sm/6 text-gray-500 text-center py-4 border border-dashed border-border-base rounded-xl">
                No games added yet.
              </div>

              <div *ngFor="let g of games(); let idx = index" class="flex items-center justify-between p-3 rounded-xl border border-border-base bg-subtle/10 gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm/6 font-medium px-1.5 py-0.5 rounded-full bg-accent text-main shrink-0">
                      [game:{{ idx }}]
                    </span>
                    <span class="text-sm/6 font-semibold truncate">{{ g.title || 'Untitled Game' }}</span>
                  </div>
                  <p class="text-sm/6 text-gray-500 truncate mt-1 max-w-[250px]">{{ g.pgn.substring(0, 40) }}...</p>
                </div>
                <button
                  (click)="removeGame(idx)"
                  class="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer shrink-0"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- Live Preview Card -->
          <div class="bg-white rounded-xl border border-border-base p-6 space-y-4">
            <h3 class="text-lg font-semibold border-b border-border-base pb-2">Live preview</h3>
            
            <div class="space-y-4">
              <h1 class="text-2xl md:text-3xl font-medium">{{ title() || 'Post Title' }}</h1>
              
              <div *ngIf="summary()" class="p-4 bg-subtle/25 border-l-4 border-accent rounded-r-xl text-gray-500 text-sm/6 italic">
                {{ summary() }}
              </div>

              <!-- Preview Render Blocks -->
              <div class="prose max-w-none text-sm/6 md:text-base leading-relaxed space-y-4">
                @for (block of previewBlocks(); track $index) {
                  @if (block.type === 'text') {
                    <div [innerHTML]="parseMarkdown(block.content || '')" class="preview-markdown"></div>
                  } @else if (block.type === 'game') {
                    <div class="my-4 p-4 rounded-xl border border-dashed border-border-base bg-subtle/20 flex flex-col items-center justify-center min-h-[120px] text-center">
                      <div class="w-8 h-8 rounded-full bg-accent text-main flex items-center justify-center font-medium text-xs mb-2">
                        ♞
                      </div>
                      <span class="text-xs font-semibold">
                        [Interactive Chessboard: Game #{{ block.index }}]
                      </span>
                      <span class="text-sm/6 text-gray-500 mt-1 truncate max-w-[300px]">
                        {{ games()[block.index!]?.title || 'Untitled Game' }}
                      </span>
                    </div>
                  }
                }
                <div *ngIf="content().trim() === ''" class="text-gray-500 text-center py-8">
                  Start typing in the body field to see live article preview.
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  `,
  styles: [
    `
      ::ng-deep .preview-markdown {
        p { margin-bottom: 1rem; line-height: 1.6; }
        ul, ol { margin-bottom: 1rem; padding-left: 1.25rem; }
        li { list-style-type: disc; margin-bottom: 0.25rem; }
        a { color: var(--color-accent); text-decoration: underline; }
        strong { font-weight: 600; }
        h1, h2, h3 { font-weight: 500; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        h1 { font-size: 1.5rem; }
        h2 { font-size: 1.25rem; }
        h3 { font-size: 1.125rem; }
      }
    `,
  ],
})
export class BlogEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogService = inject(BlogService);

  title = signal('');
  summary = signal('');
  content = signal('');
  status = signal<'draft' | 'published'>('draft');
  games = signal<EditorGame[]>([]);

  // Adding games fields
  newGameTitle = '';
  newGamePgn = '';

  // App statuses
  isLoading = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  editBlogId = signal<number | null>(null);

  previewBlocks = computed(() => {
    return this.parseContent(this.content());
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.isEditMode.set(true);
        this.loadBlog(slug);
      }
    });
  }

  loadBlog(slug: string) {
    this.isLoading.set(true);
    this.blogService.getBlog(slug).subscribe({
      next: res => {
        const blog = res.data;
        this.editBlogId.set(blog.id!);
        this.title.set(blog.title);
        this.summary.set(blog.summary || '');
        this.content.set(blog.content);
        this.status.set(blog.status);
        this.games.set(
          (blog.games || []).map(g => ({
            id: g.id,
            title: g.title || '',
            pgn: g.pgn,
            order: g.order,
          }))
        );
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error loading blog post for edit:', err);
        alert('Failed to load blog post for editing.');
        this.router.navigate(['/blog']);
      },
    });
  }

  addGame() {
    if (!this.newGamePgn.trim()) {
      alert('PGN string cannot be empty.');
      return;
    }

    const newGame: EditorGame = {
      title: this.newGameTitle.trim() || 'Untitled Game',
      pgn: this.newGamePgn.trim(),
      order: this.games().length,
    };

    this.games.update(arr => [...arr, newGame]);

    // Reset inputs
    this.newGameTitle = '';
    this.newGamePgn = '';
  }

  removeGame(idx: number) {
    this.games.update(arr => {
      const copy = [...arr];
      copy.splice(idx, 1);
      // Re-index orders
      return copy.map((g, i) => ({ ...g, order: i }));
    });
  }

  insertMarkdown(type: 'bold' | 'italic' | 'header' | 'link') {
    const textarea = document.querySelector('textarea[placeholder*="Write your article"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    let replacement = '';
    switch (type) {
      case 'bold':
        replacement = `**${selection || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selection || 'italic text'}*`;
        break;
      case 'header':
        replacement = `\n## ${selection || 'Heading'}\n`;
        break;
      case 'link':
        replacement = `[${selection || 'Link text'}](https://example.com)`;
        break;
    }

    this.content.set(text.substring(0, start) + replacement + text.substring(end));

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    });
  }

  insertGameTag(idx: number) {
    const textarea = document.querySelector('textarea[placeholder*="Write your article"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = textarea.value;
    const replacement = `[game:${idx}]`;

    this.content.set(text.substring(0, start) + replacement + text.substring(start));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    });
  }

  savePost() {
    if (!this.title().trim()) {
      alert('Post title is required.');
      return;
    }
    if (!this.content().trim()) {
      alert('Post body content is required.');
      return;
    }

    this.isSaving.set(true);

    const payload = {
      title: this.title().trim(),
      summary: this.summary().trim() || null,
      content: this.content().trim(),
      status: this.status(),
      games: this.games().map((g, i) => ({
        title: g.title || null,
        pgn: g.pgn,
        order: i,
      })),
    };

    const action = this.isEditMode()
      ? this.blogService.updateBlog(this.editBlogId()!, payload)
      : this.blogService.createBlog(payload);

    action.subscribe({
      next: res => {
        this.isSaving.set(false);
        this.router.navigate(['/blog', res.data.slug]);
      },
      error: err => {
        console.error('Error saving blog post:', err);
        alert(err?.error?.message || 'An error occurred while saving the blog post.');
        this.isSaving.set(false);
      },
    });
  }

  parseContent(content: string) {
    const blocks: { type: 'text' | 'game'; content?: string; index?: number }[] = [];
    const regex = /\[game:(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const matchIndex = match.index;
      const textBefore = content.substring(lastIndex, matchIndex);

      if (textBefore) {
        blocks.push({ type: 'text', content: textBefore });
      }

      const gameIndex = parseInt(match[1], 10);
      blocks.push({ type: 'game', index: gameIndex });

      lastIndex = regex.lastIndex;
    }

    const textAfter = content.substring(lastIndex);
    if (textAfter) {
      blocks.push({ type: 'text', content: textAfter });
    }

    return blocks;
  }

  parseMarkdown(md: string): string {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mt-4 mb-1">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-medium mt-5 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-medium mt-6 mb-2">$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent underline">$1</a>');

    const paragraphs = html.split(/\n{2,}/);
    html = paragraphs.map(p => {
      if (p.trim().startsWith('<h')) return p.trim();

      if (p.trim().startsWith('* ') || p.trim().startsWith('- ')) {
        const items = p.trim().split(/\n[*|-]\s+/);
        const listHtml = items.map(item => `<li class="ml-4 list-disc mb-0.5">${item.replace(/^[*|-]\s+/, '')}</li>`).join('');
        return `<ul class="mb-2">${listHtml}</ul>`;
      }

      return `<p class="mb-2 leading-relaxed">${p.trim().replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }
}
