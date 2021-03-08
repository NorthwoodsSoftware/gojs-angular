import { NgModule } from '@angular/core';
import { DataSyncService } from './data-sync.service';
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
  providers: [
    DataSyncService
  ],
  exports: [
    DiagramComponent,
    OverviewComponent,
    PaletteComponent
  ]
})
export class GojsAngularModule { }
