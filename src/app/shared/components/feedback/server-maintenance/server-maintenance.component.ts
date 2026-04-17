import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-server-maintenance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './server-maintenance.component.html',
})
export class ServerMaintenanceComponent {
  @Input() title = 'Under Maintenance';
  @Input() message =
    "We're currently working on improving this feature. Please check back shortly!";
}
