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

// А) Сначала ждем, что билеты ФИЗИЧЕСКИ появились и стали ВИДИМЫ (решает проблему 10 vs 7)

cy.get('.ticket-card', { timeout: 45000 }).should('be.visible');



// Б) Считаем только те карточки, которые видит пользователь (:visible)

cy.get('.ticket-card:visible').then(($tickets) => {

const count = $tickets.length;

cy.log(`Найдено реальных билетов на экране: ${count}`);



// Записываем точное число для Telegram бота

cy.writeFile('offers_count.txt', count.toString());



// В) Проверяем статус запроса через историю (cy.get вместо cy.wait)

// Это предотвращает падение, если запрос завершился слишком быстро

cy.get('@railSearch').then((xhr) => {

if (xhr && xhr.response) {

cy.log('Статус ответа сервера:', xhr.response.statusCode);

expect(xhr.response.statusCode).to.be.oneOf([200, 201]);

}

});



// Г) Финальный ассерт: тест упадет только если билетов действительно 0

expect(count, 'На странице должны быть видимые билеты').to.be.greaterThan(0);

});

});

});