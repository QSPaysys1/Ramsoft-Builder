import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthToastStackComponent } from '@ramsoft-builder/auth/ui/login';

@Component({
  imports: [RouterModule, AuthToastStackComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'ramsoft-web';
}
