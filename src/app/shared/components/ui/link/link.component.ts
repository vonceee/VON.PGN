import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'a[appLink]',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-content></ng-content>
    <span class="underline-bar"></span>
  `,
  styles: [`
    :host {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: inherit;
      text-decoration: none;
      transition: color 0.3s ease;
      cursor: pointer;
    }

    :host(:hover) {
      color: var(--color-accent);
    }

    .underline-bar {
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 100%;
      height: 2px;
      background-color: var(--color-accent);
      transform: scaleX(0);
      transform-origin: right;
      transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    }

    :host(:hover) .underline-bar {
      transform: scaleX(1);
      transform-origin: left;
    }

    :host-context(.text-danger) .underline-bar,
    :host-context([variant="danger"]) .underline-bar {
      background-color: #f43f5e; /* rose-500 */
    }
  `],
})
export class LinkComponent {
  variant = input<'primary' | 'danger' | 'ghost'>('primary');
}
