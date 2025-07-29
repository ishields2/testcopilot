describe('Follow-up Assertion Coverage Test', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
  });

  // ✅ 1. Chained assertion on the same line — should NOT be flagged
  it('should not flag chained assertion on same line', () => {
    cy.get('#profile-button').click().should('have.class', 'active');
  });


  // ❌ 3. Long chain with no assertion — should be flagged
  it('should flag long chain without any assertion', () => {
    cy.get('#notifications')
      .find('.alert')
      .eq(1)
      .eq()
      .click(); // ❌ no assertion
  });

  // ❌ 3. Long chain with no assertion — should be flagged
  it('should flag long chain without any assertion', () => {
    cy.get('#notifications')
      .find('.alert')
      .eq(1)
      .eq()
      .click(); // ❌ no assertion
  });


});
