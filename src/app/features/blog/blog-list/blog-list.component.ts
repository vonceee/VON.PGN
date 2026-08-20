import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { BlogService, Blog } from '../../../core/services/blog.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '@shared/ui';
import { FloatingCursorContainerDirective, FloatingCursorTriggerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterModule,
    ButtonComponent,
    FloatingCursorContainerDirective,
    FloatingCursorTriggerDirective,
    FloatingCursorComponent
  ],
  templateUrl: './blog-list.component.html',
  styles: [`
    .octagon-clip {
      clip-path: polygon(
        20px 0%, 
        calc(100% - 20px) 0%, 
        100% 20px, 
        100% calc(100% - 20px), 
        calc(100% - 20px) 100%, 
        20px 100%, 
        0% calc(100% - 20px), 
        0% 20px
      );
    }
  `],
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
