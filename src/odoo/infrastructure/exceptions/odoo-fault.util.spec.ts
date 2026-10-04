import { summarizeOdooFault } from './odoo-fault.util';

describe('summarizeOdooFault', () => {
  it('keeps only the final exception line of a traceback', () => {
    const fault = [
      'Traceback (most recent call last):',
      '  File "/opt/odoo/odoo/service/model.py", line 133, in retrying',
      '    result = func()',
      'odoo.exceptions.ValidationError: The partner email is invalid',
    ].join('\n');

    const summary = summarizeOdooFault(fault);
    expect(summary).toBe('ValidationError: The partner email is invalid');
    expect(summary).not.toContain('/opt/odoo');
  });

  it('passes short single-line messages through', () => {
    expect(summarizeOdooFault('Record does not exist')).toBe(
      'Record does not exist',
    );
  });

  it('truncates very long messages', () => {
    expect(summarizeOdooFault('x'.repeat(2000)).length).toBeLessThanOrEqual(
      501,
    );
  });

  it('handles empty input', () => {
    expect(summarizeOdooFault(undefined)).toBe('Unknown Odoo error');
  });
});
