import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FluidFunctionalism } from './fluid-functionalism';

describe('FluidFunctionalism', () => {
  let component: FluidFunctionalism;
  let fixture: ComponentFixture<FluidFunctionalism>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FluidFunctionalism],
    }).compileComponents();

    fixture = TestBed.createComponent(FluidFunctionalism);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
