import { ComponentFixture, TestBed } from '@angular/core/testing';
import go from 'gojs';
import { DiagramComponent } from './diagram.component';

describe('GojsAngularComponent', () => {
  let component: DiagramComponent;
  let fixture: ComponentFixture<DiagramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiagramComponent);
    component = fixture.componentInstance;
    component.initDiagram = () => new go.Diagram();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
