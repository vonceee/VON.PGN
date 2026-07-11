import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BlogService, Blog } from '../../../core/services/blog.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '@shared/ui';
import { LoadingComponent } from '../../../shared/components/feedback/loading/loading.component';
import { BlogGameViewerComponent } from '@shared/chess';

interface ContentBlock {
  type: 'text' | 'game';
  content?: string;
  index?: number;
}

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonComponent,
    LoadingComponent,
    BlogGameViewerComponent,
  ],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-8">
      
      <!-- Back to Blogs -->
      <div class="mb-8">
        <a routerLink="/blog" class="text-sm font-medium text-muted hover:text-content hover:underline flex items-center gap-1">
          ← Back to blogs
        </a>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="min-h-96 flex items-center justify-center">
        <app-loading></app-loading>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading() && errorMsg()" class="ui-panel bg-main rounded-xl border border-red-200 p-8 text-center my-8">
        <h3 class="text-lg font-medium text-red-500 mb-2">Error loading post</h3>
        <p class="text-muted text-sm mb-4">{{ errorMsg() }}</p>
        <a routerLink="/blog" appButton variant="outline">Back to blogs</a>
      </div>

      <!-- Post Detail View -->
      <article *ngIf="!isLoading() && blog() as post" class="space-y-8">
        
        <!-- Standardized Page Header (Inline) -->
        <header class="mb-8 pb-6 border-b border-border-base">
          <div class="flex items-center gap-2 mb-3">
            <span
              *ngIf="post.status === 'draft'"
              class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800"
            >
              Draft
            </span>
            <span class="text-sm text-muted">
              {{ post.published_at ? formatDate(post.published_at) : 'Not published' }}
            </span>
          </div>

          <h1 class="text-4xl md:text-5xl font-normal text-content leading-tight mb-4">
            {{ post.title }}
          </h1>

          <div class="flex flex-wrap items-center justify-between gap-4 mt-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-subtle flex items-center justify-center font-semibold text-content border border-border-base">
                {{ post.author.name.charAt(0) }}
              </div>
              <div>
                <p class="text-sm font-medium text-content">{{ post.author.name }}</p>
                <p class="text-xs text-muted">Author</p>
              </div>
            </div>
            
            <!-- Admin Edit Controls -->
            <div *ngIf="isAdmin()" class="flex items-center gap-2">
              <a [routerLink]="['/blog', post.slug, 'edit']" appButton variant="outline" class="text-sm">
                Edit post
              </a>
              <button (click)="deletePost(post.id!)" appButton variant="outline" class="text-sm border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300">
                Delete
              </button>
            </div>
          </div>
        </header>

        <!-- Summary Banner -->
        <div *ngIf="post.summary" class="p-6 bg-subtle/20 border-l-4 border-accent rounded-r-xl text-muted italic leading-relaxed text-lg">
          {{ post.summary }}
        </div>

        <!-- Render Content Blocks (Inline Games and Text) -->
        <div class="prose prose-slate max-w-none text-content text-base md:text-lg space-y-6">
          @for (block of blocks(); track $index) {
            @if (block.type === 'text') {
              <div [innerHTML]="parseMarkdown(block.content || '')" class="markdown-body"></div>
            } @else if (block.type === 'game' && post.games && post.games[block.index!]; as g) {
              <app-blog-game-viewer [pgn]="g.pgn" [title]="g.title || ''"></app-blog-game-viewer>
            }
          }
        </div>

        <!-- Remaining/Non-Inline Games Section -->
        <section *ngIf="remainingGames().length > 0" class="mt-12 pt-8 border-t border-border-base">
          <h2 class="text-2xl font-normal text-content mb-6">Interactive games</h2>
          
          <div class="space-y-8">
            <div *ngFor="let g of remainingGames()" class="ui-panel bg-main rounded-xl border border-border-base p-4">
              <app-blog-game-viewer [pgn]="g.pgn" [title]="g.title || ''"></app-blog-game-viewer>
            </div>
          </div>
        </section>

        <!-- Author Bio Footer -->
        <footer *ngIf="post.author.bio" class="mt-16 p-8 rounded-2xl bg-subtle/25 border border-border-base flex flex-col md:flex-row gap-6 items-start">
          <div class="w-16 h-16 rounded-full bg-subtle flex items-center justify-center font-bold text-xl text-content border border-border-base shrink-0">
            {{ post.author.name.charAt(0) }}
          </div>
          <div>
            <h4 class="text-lg font-semibold text-content mb-2">About {{ post.author.name }}</h4>
            <p class="text-muted text-sm leading-relaxed">{{ post.author.bio }}</p>
          </div>
        </footer>

      </article>

    </div>
  `,
  styles: [
    `
      ::ng-deep .markdown-body {
        p {
          margin-bottom: 1.5rem;
          line-height: 1.75;
        }
        ul, ol {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        li {
          list-style-type: disc;
          margin-bottom: 0.5rem;
        }
        a {
          color: var(--color-accent);
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        strong {
          font-weight: 600;
        }
        h1, h2, h3, h4 {
          color: var(--color-content);
          font-weight: 500;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        h1 { font-size: 1.875rem; }
        h2 { font-size: 1.5rem; }
        h3 { font-size: 1.25rem; }
      }
    `,
  ],
})
export class BlogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogService = inject(BlogService);
  private authService = inject(AuthService);

  blog = signal<Blog | null>(null);
  isLoading = signal(true);
  errorMsg = signal<string | null>(null);

  isAdmin = computed(() => this.authService.isAdmin());

  // Parses content into inline games and text segments
  blocks = computed<ContentBlock[]>(() => {
    const post = this.blog();
    if (!post || !post.content) return [];
    return this.parseContent(post.content);
  });

  // Identifies games that are not placed inline in the text
  remainingGames = computed(() => {
    const post = this.blog();
    const blocksList = this.blocks();
    if (!post || !post.games) return [];

    const embeddedIndices = new Set<number>();
    blocksList.forEach(b => {
      if (b.type === 'game' && b.index !== undefined) {
        embeddedIndices.add(b.index);
      }
    });

    return post.games.filter((_, idx) => !embeddedIndices.has(idx));
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.loadBlog(slug);
      }
    });
  }

  loadBlog(slug: string) {
    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.blogService.getBlog(slug).subscribe({
      next: res => {
        this.blog.set(res.data);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error loading blog post:', err);
        this.errorMsg.set(err?.error?.message || 'Blog post not found.');
        this.isLoading.set(false);
      },
    });
  }

  deletePost(id: number) {
    if (confirm('Are you sure you want to delete this blog post?')) {
      this.blogService.deleteBlog(id).subscribe({
        next: () => {
          this.router.navigate(['/blog']);
        },
        error: err => {
          alert('Failed to delete blog post.');
        },
      });
    }
  }

  parseContent(content: string): ContentBlock[] {
    const blocks: ContentBlock[] = [];
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
    
    // Simple HTML encoding to protect against injections
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mt-6 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-medium mt-8 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-medium mt-10 mb-4">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent underline">$1</a>');

    // Line breaks and double spacing
    const paragraphs = html.split(/\n{2,}/);
    html = paragraphs.map(p => {
      if (p.trim().startsWith('<h')) return p.trim();
      
      // Basic bullet points support
      if (p.trim().startsWith('* ') || p.trim().startsWith('- ')) {
        const items = p.trim().split(/\n[*|-]\s+/);
        const listHtml = items.map(item => `<li class="ml-6 list-disc mb-1">${item.replace(/^[*|-]\s+/, '')}</li>`).join('');
        return `<ul class="mb-4">${listHtml}</ul>`;
      }
      
      return `<p class="mb-4 leading-relaxed">${p.trim().replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
