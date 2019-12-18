import { Component, ElementRef, Input, NgZone, SimpleChanges, ViewChild } from '@angular/core';
import * as go from 'gojs';

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

    // This bit of code makes sure the mousemove event listeners on the canvas are run outside NgZone
    // This makes it so change detection isn't triggered every time the mouse is moved inside the canvas, greatly improving performance
    // If some state-altering behavior must happen on a mousemove event inside the overview,
    // you will have to using zone.run() to make sure that event triggers angular change detection
    this.overview.addEventListener = (DOMElement: Element | Window | Document, name: string, listener: any, capture: boolean) => {
      const superAddEventListener = go.Diagram.prototype.addEventListener;
      if (name === 'mousemove') {
        this.zone.runOutsideAngular(() => superAddEventListener.call(this, DOMElement, name, listener, capture));
      } else {
        this.zone.run(() => {
          superAddEventListener.call(this, DOMElement, name, listener, capture);
        });
      }
    };

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

}
