describe('Follow-up Assertion Coverage Test', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
  });

  // ✅ 1. Chained assertion on the same line — should NOT be flagged
  it('should not flag chained assertion on same line', () => {
    cy.get('#profile-button').click().should('have.class', 'active');
  });

  // ✅ 2. Chained assertion 5 lines later — still in the chain — should NOT be flagged
  it('should not flag assertion split across lines in same chain', () => {
    cy
      .get('#menu')
      .find('.menu-item')
      .eq(2)
      .click()
      .should('contain', 'Settings');
  });

  // ❌ 3. Long chain with no assertion — should be flagged
  it('should flag long chain without any assertion', () => {
    cy.get('#notifications')
      .find('.alert')
      .eq(1)
      .eq()
      .eq()
      .eq()
      .eq()
      .eq()
      .eq()
      .eq()
      .eq()
      .eq()
      .eq()
      .click(); // ❌ no assertion
  });

  // ❌ 4. Long chain over multiple lines, no assertion — should be flagged
  it('should flag multiline chain with no assertion', () => {
    cy
      .get('#logout')
      .parents('form')
      .submit(); // ❌ no assertion
  });

  // ✅ 5. Long chain across lines but ends in assertion — should NOT be flagged
  it('should not flag multiline chain that ends in assertion', () => {
    cy
      .get('#search')
      .click()
      .should('be.visible');
  });

  // // ❌ 6. Simple action, no assertion anywhere — should be flagged
  it('should flag unchained action without assertion', () => {
    cy.get('#open-modal').click(); // ❌ no assertion
  });

  // // ✅ 7. Follow-up assertion inside .then — should NOT be flagged
  it('should not flag action followed by assertion inside then()', () => {
    cy.get('#submit-button').click().then(() => {
      cy.get('.confirmation').should('be.visible');
    });
  });

  // // ❌ 8. .then() used, but no assertion inside — should be flagged
  it('should flag then() without any assertion', () => {
    cy.get('#load-data').click().then(() => {
      cy.log('Loaded'); // ❌ no assertion
    });
  });

  it('click without assertion', () => {
    cy.get('#submit-btn').click(); // ❌ No assertion
  });

  it('type without assertion', () => {
    cy.get('#email').type('test@example.com'); // ❌ No assertion
  });

  it('clear without assertion', () => {
    cy.get('#email').clear(); // ❌ No assertion
  });

  it('check without assertion', () => {
    cy.get('#terms').check(); // ❌ No assertion
  });

  it('uncheck without assertion', () => {
    cy.get('#subscribe').uncheck(); // ❌ No assertion
  });

  it('select without assertion', () => {
    cy.get('#country').select('UK'); // ❌ No assertion
  });

  it('dblclick without assertion', () => {
    cy.get('#reset-btn').dblclick(); // ❌ No assertion
  });

  it('rightclick without assertion', () => {
    cy.get('#context-menu').rightclick(); // ❌ No assertion
  });

  it('focus without assertion', () => {
    cy.get('#first-name').focus(); // ❌ No assertion
  });

  it('blur without assertion', () => {
    cy.get('#last-name').blur(); // ❌ No assertion
  });

  it('submit without assertion', () => {
    cy.get('form').submit(); // ❌ No assertion
  });

  it('trigger without assertion', () => {
    cy.get('#modal').trigger('mouseover'); // ❌ No assertion
  });

  it('scrollIntoView without assertion', () => {
    cy.get('#footer').scrollIntoView(); // ❌ No assertion
  });

  it('scrollTo without assertion', () => {
    cy.scrollTo('bottom'); // ❌ No assertion
  });
  it('should not flag cy.click() followed by an expect() inside .then()', () => {
    cy.get('#submit').click().then(() => {
      expect(true).to.equal(true); // ✅ This should be detected as a follow-up assertion
    });
  });


});
