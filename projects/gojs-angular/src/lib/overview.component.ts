import { Component, ElementRef, Input, NgZone, SimpleChanges, ViewChild } from '@angular/core';
import * as go from 'gojs';
import { NgDiagramHelper } from "./ng-diagram-helper";

@Component({
  selector: 'gojs-overview',
  template: '<div #ngOverview [className]=divClassName></div>'
})
export class OverviewComponent {

  // The function used to initialize the Overview
  @Input() public initOverview: () => go.Overview;
  // Overview div class name. Use this name to style your Overview in CSS
  @Input() public divClassName: string;
  // The Diagram to observe with the Overview
  @Input() public observedDiagram: go.Diagram = null;

  @ViewChild('ngOverview', { static: true }) public overviewDiv: ElementRef;

  // The Overview itself
  public overview: go.Overview | null = null;

  constructor(public zone: NgZone) { }

  /**
   * Initialize the overview
   */
  public ngAfterViewInit() {
    if (!this.overviewDiv) return;
    if (this.initOverview) {
      this.overview = this.initOverview();
    } else {
      this.overview = new go.Overview();
      this.overview.contentAlignment = go.Spot.Center;
    }

    // recuces hange detection on mouse moves, boosting performance
    NgDiagramHelper.makeMouseMoveRunOutsideAngularZone(this.overview, this.zone);

    this.overview.div = this.overviewDiv.nativeElement;
  }

  /**
   * Only update when the observed diagram changes
   * @param changes
   */
  public ngOnChanges(changes: SimpleChanges) {
    if (!this.overview) return;
    if (changes && changes.observedDiagram && changes.observedDiagram.currentValue !== changes.observedDiagram.previousValue) {
      this.overview.observed = changes.observedDiagram.currentValue;
    }
  }

  public ngOnDestroy() {
    this.overview.div = null; // removes event listeners
  }

}
