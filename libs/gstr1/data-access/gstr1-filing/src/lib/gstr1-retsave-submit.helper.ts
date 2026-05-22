import type { Gstr1SectionRetsaveFacade } from './gstr1-section-retsave.facade';

/** Wires a page’s payload builder into {@link Gstr1SectionRetsaveFacade} and runs retsave. */
export async function submitGstr1SectionRetsave(
  facade: Gstr1SectionRetsaveFacade,
  input: {
    readonly isGstr1a: boolean;
    readonly buildPayload: () => Record<string, unknown> | null;
  },
): Promise<void> {
  facade.setGstr1aMode(input.isGstr1a);
  facade.registerPayloadBuilder(input.buildPayload);
  await facade.submit();
}
