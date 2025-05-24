describe('Pagina de autentificare', () => {
  it('Redirecționează către autentificare după click', () => {
    cy.visit('/');
    cy.contains('Autentificare').click(); // textul de pe butonul de login
    cy.url().should('include', '/auth');
  });
});