describe('Flaky Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('logs in with hardcoded wait and no assertion', () => {
    cy.get('#username').type('user123');
    cy.wait(1000); // ❌ Hard wait
    cy.get('#password').type('password123');
    cy.wait('@loginRequest'); // ❌ Alias wait
    cy.get('button[type="submit"]').click(); // ❌ No follow-up assertion
  });

  it('uses better async handling', () => {
    cy.get('#username').type('user123');
    cy.get('#password').type('password123');
    cy.intercept('POST', '/api/login').as('loginRequest');
    cy.get('button[type="submit"]').click();
    cy.wait('@loginRequest');
    cy.get('.welcome-message').should('contain', 'Welcome'); // ✅ Assertion present
  });

  it('has an alias wait without any intercept defined', () => {
    cy.get('#start-process').click();
    cy.wait('@process'); // ❌ No intercept or retry assurance
  });

  it('has retry-missing command', () => {
    cy.get('#toggle-button').click(); // ❌ No follow-up check
  });

  it('has proper retryable follow-up', () => {
    cy.get('#modal-button').click();
    cy.get('.modal').should('be.visible'); // ✅ Solid follow-up
  });
});
