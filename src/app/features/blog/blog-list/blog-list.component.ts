import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { BlogService, Blog } from '../../../core/services/blog.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '@shared/ui';
import { LoadingComponent } from '../../../shared/components/feedback/loading/loading.component';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, ButtonComponent, LoadingComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">
      
      <!-- Standardized Page Header (Inline) -->
      <header class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="flex-1">
          <h1 class="text-4xl md:text-5xl mb-2 font-normal">Chess blogs</h1>
          <p class="text-muted text-lg">Insights, tutorials, and game analyses from the community.</p>
        </div>
        <div class="flex items-center gap-4">
          <a
            *ngIf="isAdmin()"
            routerLink="/blog/new"
            appButton
            variant="primary"
            class="whitespace-nowrap"
          >
            Create blog post
          </a>
        </div>
      </header>

      <!-- Tabs (only visible for admins to manage drafts) -->
      <div *ngIf="isAdmin()" class="border-b border-border-base mb-8">
        <nav class="flex gap-6">
          <button
            (click)="setTab('all')"
            [class.border-accent]="activeTab() === 'all'"
            [class.text-content]="activeTab() === 'all'"
            [class.border-transparent]="activeTab() !== 'all'"
            [class.text-muted]="activeTab() !== 'all'"
            class="pb-4 text-sm font-medium border-b-2 cursor-pointer transition-colors"
          >
            All blogs
          </button>
          <button
            (click)="setTab('my')"
            [class.border-accent]="activeTab() === 'my'"
            [class.text-content]="activeTab() === 'my'"
            [class.border-transparent]="activeTab() !== 'my'"
            [class.text-muted]="activeTab() !== 'my'"
            class="pb-4 text-sm font-medium border-b-2 cursor-pointer transition-colors"
          >
            My drafts & posts
          </button>
        </nav>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="min-h-96 flex items-center justify-center">
        <app-loading></app-loading>
      </div>

      <!-- Empty State -->
      <div
        *ngIf="!isLoading() && blogs().length === 0"
        class="ui-panel bg-main rounded-xl border border-border-base p-12 text-center my-8"
      >
        <h3 class="text-lg font-medium mb-2">No blog posts found</h3>
        <p class="text-muted text-sm mb-6">Check back later or check another tab.</p>
        <a
          *ngIf="isAdmin()"
          routerLink="/blog/new"
          appButton
          variant="primary"
        >
          Create first post
        </a>
      </div>

      <!-- Blog Grid -->
      <div
        *ngIf="!isLoading() && blogs().length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <article
          *ngFor="let blog of blogs()"
          class="ui-panel bg-main rounded-xl border border-border-base shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between h-full"
        >
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span
                *ngIf="blog.status === 'draft'"
                class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800"
              >
                Draft
              </span>
              <span class="text-xs text-muted">
                {{ blog.published_at ? formatDate(blog.published_at) : 'Not published' }}
              </span>
            </div>

            <h2 class="text-xl font-semibold mb-2 line-clamp-2">
              <a [routerLink]="['/blog', blog.slug]" class="hover:text-accent transition-colors">
                {{ blog.title }}
              </a>
            </h2>

            <p class="text-muted text-sm mb-6 line-clamp-3 leading-relaxed">
              {{ blog.summary || truncateText(blog.content, 120) }}
            </p>
          </div>

          <div class="flex items-center justify-between mt-auto pt-4 border-t border-border-base/50">
            <span class="text-xs text-muted">By {{ blog.author.name }}</span>
            <a
              [routerLink]="['/blog', blog.slug]"
              class="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
            >
              Read article
            </a>
          </div>
        </article>
      </div>

      <!-- Pagination (Simple) -->
      <div
        *ngIf="!isLoading() && (hasPrevPage() || hasNextPage())"
        class="flex items-center justify-center gap-4 mt-12"
      >
        <button
          appButton
          variant="outline"
          (click)="changePage(currentPage() - 1)"
          [disabled]="!hasPrevPage()"
        >
          Previous
        </button>
        <span class="text-sm text-muted">Page {{ currentPage() }} of {{ totalPages() }}</span>
        <button
          appButton
          variant="outline"
          (click)="changePage(currentPage() + 1)"
          [disabled]="!hasNextPage()"
        >
          Next
        </button>
      </div>

    </div>
  `,
})
export class BlogListComponent implements OnInit {
  private blogService = inject(BlogService);
  private authService = inject(AuthService);

  blogs = signal<Blog[]>([]);
  isLoading = signal(true);
  currentPage = signal(1);
  totalPages = signal(1);
  hasPrevPage = signal(false);
  hasNextPage = signal(false);
  activeTab = signal<'all' | 'my'>('all');

  isAdmin = computed(() => this.authService.isAdmin());

  ngOnInit() {
    this.loadBlogs();
  }

  setTab(tab: 'all' | 'my') {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadBlogs();
  }

  loadBlogs() {
    this.isLoading.set(true);
    const request =
      this.activeTab() === 'my'
        ? this.blogService.getMyBlogs(this.currentPage())
        : this.blogService.getBlogs(this.currentPage());

    request.subscribe({
      next: (res: any) => {
        this.blogs.set(res.data || []);
        this.currentPage.set(res.current_page || 1);
        this.totalPages.set(res.last_page || 1);
        this.hasPrevPage.set(res.prev_page_url !== null);
        this.hasNextPage.set(res.next_page_url !== null);
        this.isLoading.set(false);
      },
      error: () => {
        this.blogs.set([]);
        this.isLoading.set(false);
      },
    });
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadBlogs();
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  truncateText(text: string, limit: number): string {
    if (!text) return '';
    const plainText = text.replace(/[#*`\[\]]/g, ''); // strip simple markdown characters
    if (plainText.length <= limit) return plainText;
    return plainText.substring(0, limit) + '...';
  }
}
