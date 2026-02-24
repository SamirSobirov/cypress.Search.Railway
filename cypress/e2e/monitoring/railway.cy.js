describe('Railway Product', () => {

  // 1. Инициализация файлов перед запуском
  before(() => {
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow - Railway with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    
    // Перехват API: добавил звездочки, чтобы поймать запрос наверняка
    cy.intercept({ method: 'POST', url: '**/obtain-trains**' }).as('railSearch');

    // 1. АВТОРИЗАЦИЯ
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    
    // ПЕРЕХОД В ЖД
    cy.visit('https://test.globaltravel.space/railway');
    cy.url().should('include', '/railway');

    // 2. ЗАПОЛНЕНИЕ ПОЛЕЙ (Откуда)
    cy.get('input[placeholder="Откуда"]').should('be.visible')
      .click({ force: true }).clear().type('ТАШКЕНТ СЕВЕРНЫЙ', { delay: 100 });
    
    // 🛡 ЗАЩИТА CI: Ждем физической отрисовки списка, кликаем и ДАЕМ ПАУЗУ для сохранения стейта
    cy.get('.p-listbox-item', { timeout: 10000 }).should('be.visible');
    cy.get('.p-listbox-item').contains(/ТАШКЕНТ СЕВЕРНЫЙ/i).click({ force: true });
    cy.wait(500); 

    // ЗАПОЛНЕНИЕ ПОЛЕЙ (Куда)
    cy.get('input[placeholder="Куда"]').should('be.visible')
      .click({ force: true }).clear().type('САМАРКАНД', { delay: 100 });
      
    // 🛡 ЗАЩИТА CI: То же самое для второго города
    cy.get('.p-listbox-item', { timeout: 10000 }).should('be.visible');
    cy.get('.p-listbox-item').contains(/САМАРКАНД/i).click({ force: true });
    cy.wait(500);

    // 3. ДАТА 
    cy.get("input[placeholder='Когда']").should('be.visible').click({ force: true });
    
    // Ждем открытия календаря
    cy.get('.p-datepicker-calendar').should('be.visible');

    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 2); // +2 дня

    if (targetDate.getMonth() !== today.getMonth()) {
      cy.get('.p-datepicker-next').should('be.visible').click({ force: true });
      cy.wait(500);
    }

    // 🛡 ЗАЩИТА CI: Исключаем заблокированные дни (.not('.p-disabled')), чтобы тест не упал на некликабельной дате
    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .not('.p-disabled') 
      .contains(new RegExp(`^${targetDate.getDate()}$`))
      .click({ force: true });
    
    cy.get('body').type('{esc}');
    cy.wait(1000); // Обязательно ждем закрытия календаря, чтобы он не перекрыл кнопку поиска

    // 4. ПОИСК
    // 🛡 ЗАЩИТА CI: Добавил .last(), так как первой кнопкой с такими классами может оказаться смена городов (реверс)
    cy.get('button.easy-button.p-button-icon-only')
        .last() 
        .should('be.visible')
        .click({ force: true });

    // 5. УМНАЯ ПРОВЕРКА (Smart Diagnostic)
    cy.wait('@railSearch', { timeout: 40000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Ошибка сервера API Railway: HTTP ${statusCode}`);
      }
    });

    // Ждем стабилизации интерфейса (отсекаем лоадеры)
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(15000);

    cy.get('body').then(($body) => {
      const allCards = $body.find('.ticket-card');
      let realTicketsCount = 0;

      // Фильтруем реальные билеты от скелетонов
      allCards.each((index, el) => {
        const cardText = Cypress.$(el).text();
        if (cardText.includes('Выбрать') || cardText.includes('Купить') || cardText.includes('UZS') || cardText.includes('сум')) {
          realTicketsCount++;
        }
      });

      if (realTicketsCount > 0) {
        cy.writeFile('offers_count.txt', realTicketsCount.toString());
        cy.log(`✅ Найдено реальных билетов (Railway): ${realTicketsCount}`);
      } else {
        cy.writeFile('offers_count.txt', '0');
        cy.log('⚪ Билетов не найдено (ЖД)');
      }
    });
  });
});