export interface Gstr2bTableColumn<TField extends string = string> {
  readonly id: string;
  readonly label: string;
  readonly field: TField;
  readonly locked?: boolean;
  readonly defaultHidden?: boolean;
}
