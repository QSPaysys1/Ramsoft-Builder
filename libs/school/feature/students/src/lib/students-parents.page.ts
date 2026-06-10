import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StudentsStore } from './students.store';

@Component({
  standalone: true,
  selector: 'lib-students-parents-page',
  imports: [RouterLink],
  templateUrl: './students-parents.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsParentsPageComponent implements OnInit {
  readonly store = inject(StudentsStore);

  ngOnInit(): void {
    void this.store.loadFilterOptions();
    void this.store.loadList();
  }
}
