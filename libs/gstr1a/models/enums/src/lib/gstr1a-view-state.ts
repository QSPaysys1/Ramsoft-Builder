/** Section / workspace load lifecycle. */
export type Gstr1aViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type Gstr1aRetsaveViewState = 'idle' | 'submitting' | 'success' | 'error';

export type Gstr1aFilingWorkflowState =
  | 'draft'
  | 'validated'
  | 'previewed'
  | 'submitted'
  | 'tracked';
