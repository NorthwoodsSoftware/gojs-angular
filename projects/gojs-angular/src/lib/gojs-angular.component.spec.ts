import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GojsAngularComponent } from './gojs-angular.component';

describe('GojsAngularComponent', () => {
  let component: GojsAngularComponent;
  let fixture: ComponentFixture<GojsAngularComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GojsAngularComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GojsAngularComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
