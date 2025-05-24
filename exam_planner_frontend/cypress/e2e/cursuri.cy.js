describe('Gestionare cursuri', () => {
    beforeEach(() => {
      cy.loginWithToken();
      cy.visit('/courses');
    });
  
    it('Afișează lista de cursuri', () => {
      cy.get('.course-card').should('have.length.at.least', 1);
    });
  
    it('Navighează la detalii curs', () => {
      cy.get('.course-card').first().click();
      cy.url().should('include', '/courses/');
      cy.contains('Metodă examinare').should('exist');
    });
  });