import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DisplayGateway } from '../display/display.gateway';

@Component({
  selector: 'app-player-display',
  imports: [RouterLink],
  templateUrl: './player-display.html',
  styleUrl: './player-display.scss',
})
export class PlayerDisplay {
  protected readonly isPreview = !inject(DisplayGateway).isPlayerDisplayWindow();
}
