export function createCashoutFromCustomer (TEST_DATA, clientToken){
 return cy.request({
       method: "POST",
       url: `${TEST_DATA.apiUrl}/api/transaction/customer-redeem`,
       headers: {
         Authorization: `Bearer ${clientToken}`
       },
       failOnStatusCode: false,
       body: {
         amount: TEST_DATA.cashout.amount,
         payFieldCustomer: {
         email: TEST_DATA.customer.emailOrUsername
         },
         paymentMethodId: TEST_DATA.cashout.paymentMethodId,
         platform: TEST_DATA.cashout.platform,
         providerName: TEST_DATA.cashout.providerName,
         timeZone: TEST_DATA.cashout.timeZonePlayer
       }
     })
}

export function verifiedBalanceAfterCashout (TEST_DATA, clientToken) {
return cy.request({
          method: "GET",
          url: `${TEST_DATA.apiUrl}/api/customer/full`,
          headers: {
            Authorization: `Bearer ${clientToken}`
          },
          failOnStatusCode: false
     })
}

export function chooseCorrectCompany (TEST_DATA, adminToken){
    return cy.request({
          method: "POST",
          url: `${TEST_DATA.apiUrl}/api/authentication/change-company/master`,
          headers: {
            Authorization: `Bearer ${adminToken}`
          },
          body: {
            companyId: TEST_DATA.companyId
          },
          failOnStatusCode: false
        })
}

