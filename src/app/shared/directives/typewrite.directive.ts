import { Directive, ElementRef, OnDestroy, Input, afterNextRender } from '@angular/core';

@Directive({
  selector: '[appTypewrite]',
  standalone: true,
})
export class TypewriteDirective implements OnDestroy {
  @Input() typewriteSpeed = 20;

  private observer: IntersectionObserver | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private blinker: ReturnType<typeof setInterval> | null = null;

  constructor(private el: ElementRef<HTMLElement>) {
    afterNextRender(() => {
      const host = this.el.nativeElement;
      const text = (host.textContent || '').trim();
      if (!text) return;

      if (this.isVisible(host)) {
        this.run(host, text);
      } else {
        this.observer = new IntersectionObserver(
          ([e]) => {
            if (e.isIntersecting) {
              this.run(host, text);
              this.observer!.unobserve(host);
            }
          },
          { threshold: 0 },
        );
        this.observer.observe(host);
      }
    });
  }

  private isVisible(el: HTMLElement): boolean {
    return el.getBoundingClientRect().top < window.innerHeight;
  }

  private run(host: HTMLElement, text: string) {
    host.textContent = '';
    host.classList.add('typewriter');

    const out = document.createElement('span');
    out.className = 'tw-out';

    const cursor = document.createElement('span');
    cursor.className = 'tw-cursor';
    cursor.style.cssText =
      'display:inline-block;width:3px;height:1.1em;background-color:#22d3ee;vertical-align:text-bottom;margin-left:2px';

    host.appendChild(out);
    host.appendChild(cursor);

    this.blinker = setInterval(() => {
      cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
    }, 350);

    let i = 0;
    this.timer = setInterval(() => {
      if (i >= text.length) {
        clearInterval(this.timer!);
        return;
      }
      out.textContent += text[i];
      i++;
    }, this.typewriteSpeed);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    clearInterval(this.timer!);
    clearInterval(this.blinker!);
  }
}
