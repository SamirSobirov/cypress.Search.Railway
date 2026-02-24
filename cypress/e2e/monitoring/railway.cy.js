describe('Railway Product', () => {

  // 🛡 ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК
  // Если любая команда упадет, мы пометим это в файлах до завершения теста
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
    cy.visit('https://test.globaltravel.space/railway');

    // 2. ЗАПОЛНЕНИЕ (Добавил страховку для CI)
    cy.get('input[placeholder="Откуда"]').should('be.visible')
      .click({ force: true }).type('ТАШКЕНТ СЕВЕРНЫЙ', { delay: 100 });
    cy.get('.p-listbox-item', { timeout: 15000 }).contains(/ТАШКЕНТ СЕВЕРНЫЙ/i).click({ force: true });
    cy.wait(500);

    cy.get('input[placeholder="Куда"]').should('be.visible')
      .click({ force: true }).type('САМАРКАНД', { delay: 100 });
    cy.get('.p-listbox-item', { timeout: 15000 }).contains(/САМАРКАНД/i).click({ force: true });
    cy.wait(1000);

    // 3. ДАТА
    cy.get("input[placeholder='Когда']").click({ force: true });
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    
    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .not('.p-disabled')
      .contains(new RegExp(`^${targetDate.getDate()}$`))
      .click({ force: true });
    
    cy.get('body').type('{esc}');
    cy.wait(1000);

    // 4. ПОИСК (Используем более точный селектор для кнопки Поиска)
    // В ЖД часто две одинаковые кнопки, .last() помогает нажать именно на "Найти"
    cy.get('button.easy-button.p-button-icon-only').last().click({ force: true });

    // 5. ДИАГНОСТИКА API
    cy.wait('@railSearch', { timeout: 45000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Railway API Error: ${statusCode}`);
      }
    });

    cy.wait(15000); // Ждем отрисовки карточек

    cy.get('body').then(($body) => {
      const tickets = $body.find('.ticket-card').filter((i, el) => {
        const txt = Cypress.$(el).text();
        return txt.includes('UZS') || txt.includes('сум') || txt.includes('Выбрать');
      });

      const count = tickets.length;
      cy.writeFile('offers_count.txt', count.toString());
    });
  });
});