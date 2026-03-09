import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Header } from '../learn/components/header/header';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, Header],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {}
