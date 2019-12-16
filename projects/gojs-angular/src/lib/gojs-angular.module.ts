import { NgModule } from '@angular/core';
import { DiagramComponent } from './diagram.component';
import { OverviewComponent } from './overview.component';
import { PaletteComponent } from './palette.component';

@NgModule({
  declarations: [
    DiagramComponent,
    OverviewComponent,
    PaletteComponent
  ],
  imports: [
  ],
  exports: [
    DiagramComponent,
    OverviewComponent,
    PaletteComponent
  ]
})
export class GojsAngularModule { }
