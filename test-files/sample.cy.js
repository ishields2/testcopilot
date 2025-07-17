describe('Sample test', () => {
  it('should do something', () => {
    cy.wait(5000); // Should trigger a wait checker warning later
    cy.get('.btn').click();
  });
});
