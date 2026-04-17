import { Component, input } from '@angular/core';
import { TypewriteDirective } from '../../../directives/typewrite.directive';

@Component({
  selector: 'app-typewriter-text',
  standalone: true,
  imports: [TypewriteDirective],
  templateUrl: './typewriter-text.html',
  styleUrl: './typewriter-text.css',
})
export class TypewriterTextComponent {
  text = input.required<string>();
  size = input<string>('text-3xl md:text-5xl');
}

