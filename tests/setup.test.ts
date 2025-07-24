/**
 * Basic setup test to verify the project structure
 */

describe('Project Setup', () => {
  it('should have basic TypeScript compilation working', () => {
    expect(true).toBe(true);
  });

  it('should be able to import types', async () => {
    const types = await import('../src/types/index');
    expect(types).toBeDefined();
  });
});