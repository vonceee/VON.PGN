import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LinkComponent } from '../../ui/link/link.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, LinkComponent],
  templateUrl: './footer.component.html',
})
export class FooterComponent {}
