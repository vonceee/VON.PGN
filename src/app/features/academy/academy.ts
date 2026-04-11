import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-academy',
  standalone: true,
  imports: [CommonModule, RouterModule, FooterComponent, IconComponent],
  templateUrl: './academy.html',
  styleUrl: './academy.css',
})
export class AcademyComponent {}
