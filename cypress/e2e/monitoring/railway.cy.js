describe('Railway Product', () => {

  Cypress.on('fail', (error) => {
    cy.writeFile('api_status.txt', '500');
    cy.writeFile('offers_count.txt', 'ERROR');
    throw error;
  });

  before(() => {
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow - Railway with Smart Diagnostic', () => {
    cy.viewport(1280, 800);

    cy.intercept({ method: 'POST', url: '**/obtain-trains**' }).as('railSearch');

    // 1. АВТОРИЗАЦИЯ
    cy.visit('https://test.globaltravel.space/sign-in');
    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');

    // Переход в ЖД
    cy.visit('https://test.globaltravel.space/railway');

    // 2. ВЫБОР ГОРОДОВ 
    cy.get('input[placeholder="Откуда"]').should('be.visible').click({ force: true })
      .type('ТАШКЕНТ СЕВЕРНЫЙ', { delay: 100 });
    cy.get('.p-listbox-item', { timeout: 15000 }).contains(/ТАШКЕНТ СЕВЕРНЫЙ/i).click({ force: true });
    cy.wait(500);

    cy.get('input[placeholder="Куда"]').should('be.visible').click({ force: true })
      .type('САМАРКАНД', { delay: 100 });
    cy.get('.p-listbox-item', { timeout: 15000 }).contains(/САМАРКАНД/i).click({ force: true });
    cy.wait(500);

    // 3. ВЫБОР ДАТЫ
    cy.get("input[placeholder='Когда']").click({ force: true });
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);

    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .not('.p-disabled')
      .contains(new RegExp(`^${targetDate.getDate()}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(1000);

    // 4. НАЖАТИЕ ПОИСКА
    cy.get('button.easy-button.p-button-icon-only').last().should('be.visible').click({ force: true });

    // 5. ПРОВЕРКА API
    cy.wait('@railSearch', { timeout: 50000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Server Error Railway: ${statusCode}`);
      }
    });

    cy.wait(15000);

    // 6. ПОДСЧЕТ БИЛЕТОВ
    cy.get('body').then(($body) => {
      const tickets = $body.find('.ticket-card').filter((i, el) => {
        const text = Cypress.$(el).text();
        return text.includes('UZS') || text.includes('сум') || text.includes('Выбрать');
      });

      const count = tickets.length;
      cy.writeFile('offers_count.txt', count.toString());
    });
  });
});