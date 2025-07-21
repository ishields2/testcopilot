describe('Half 1 - Timing, Intercepts, and Missing Assertions', () => {
  beforeEach(() => {
    cy.visit('/profile');
  });
  it('clicks and immediately asserts visibility', () => {
    cy.get('#open-settings').click().should('have.class', 'active'); // ✅ Chained assertion
  });


});
