import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FooterComponent],
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  form = signal({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  submitted = signal(false);
  submitting = signal(false);

  updateField(field: string, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  onSubmit() {
    this.submitting.set(true);
    // Simulate form submission
    setTimeout(() => {
      this.submitting.set(false);
      this.submitted.set(true);
    }, 1000);
  }
}
