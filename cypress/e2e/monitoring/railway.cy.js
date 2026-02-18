describe('Railway Product', () => {
  it('Search Flow - Railway', () => {
    cy.viewport(1280, 800);
    
    // 1. ИНТЕРЦЕПТ: Используем точный эндпоинт, который мы нашли в Network (obtain-trains)
    cy.intercept('POST', '**/obtain-trains').as('railSearch');

    // 1. АВТОРИЗАЦИЯ
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    
    // ПЕРЕХОД В ЖД
    cy.visit('https://test.globaltravel.space/railway');
    cy.url().should('include', '/railway');

    // 2. ОТКУДА
    cy.get('input[placeholder="Откуда"]').should('be.visible')
      .click({ force: true }).clear().type('ТАШКЕНТ СЕВЕРНЫЙ', { delay: 150 });
    
    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/ТАШКЕНТ СЕВЕРНЫЙ/i).click({ force: true });
    
    // 3. КУДА
    cy.get('input[placeholder="Куда"]').should('be.visible')
      .click({ force: true }).clear().type('САМАРКАНД', { delay: 150 });

    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/САМАРКАНД/i).click({ force: true });

    // 4. ДАТА (Сегодня + 2 дня)
    cy.get("input[placeholder='Когда']").click({ force: true });
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const dayToSelect = targetDate.getDate();

    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');

   // 5. ПОИСК
cy.get('button.easy-button.p-button-icon-only')
  .should('be.visible')
  .click({ force: true });

// 6. УМНАЯ ПРОВЕРКА РЕЗУЛЬТАТА

// А) СТРОГО ЖДЕМ ОТВЕТ СЕРВЕРА. Если тут будет 400, тест упадет здесь!
cy.wait('@railSearch', { timeout: 30000 }).then((interception) => {
  assert.isNotNull(interception.response, 'Сервер не прислал ответ');
  expect(interception.response.statusCode).to.eq(200, 'Сервер вернул ошибку вместо билетов!');
});

// Б) Только если сервер ответил 200, проверяем наличие билетов
cy.get('.ticket-card', { timeout: 10000 })
  .should('be.visible') // Убеждаемся, что они именно видимы
  .then(($tickets) => {
    const count = $tickets.length;
    cy.log(`Найдено реальных билетов на экране: ${count}`);
    cy.writeFile('offers_count.txt', count.toString());
    expect(count).to.be.greaterThan(0);
  });
  });
});