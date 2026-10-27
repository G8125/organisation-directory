import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from './core/pipes/translate.pipe';
import { OrganisationStoreService } from './core/services/organisation-store.service';
import { TranslationService } from './core/services/translation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  public readonly store = inject(OrganisationStoreService);
  public readonly translationService = inject(TranslationService);

  public onBrandThemeChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.setBrandTheme(val);
  }
}
