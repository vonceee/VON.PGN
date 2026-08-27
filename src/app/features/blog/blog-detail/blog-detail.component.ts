import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BlogService, Blog } from '../../../core/services/blog.service';
import { AuthService } from '../../../core/services/auth.service';
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
    BlogGameViewerComponent,
  ],
  templateUrl: './blog-detail.component.html',
  styles: []
})
export class BlogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogService = inject(BlogService);
  private authService = inject(AuthService);

  blog = signal<Blog | null>(null);
  isLoading = signal(true);
  errorMsg = signal<string | null>(null);
  fromSource = signal<string | null>(null);

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
    this.route.queryParamMap.subscribe(queryParams => {
      this.fromSource.set(queryParams.get('from'));
    });

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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>');

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
