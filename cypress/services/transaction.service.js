export function findCashoutInManager (TEST_DATA, adminToken, filters){
    return cy.request({
            method: "GET",
            url: `${TEST_DATA.apiUrl}/api/transaction/paginated`,
            headers: {
              Authorization: `Bearer ${adminToken}`
            },
            qs: {
              page: 1,
              pageSize: 10000,
              timeZone: TEST_DATA.cashout.timeZoneManager,
              filters: JSON.stringify(filters)
            },
            failOnStatusCode: false
          })
}

export function acceptCashoutInManager(TEST_DATA, adminToken, cashoutId) {
  return cy.request({
    method: "PUT",
    url: `${TEST_DATA.apiUrl}/api/process/accept-redeem`,
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    failOnStatusCode: false,
    body: {
      _id: cashoutId,
      platform: TEST_DATA.cashout.platform
    }
  })
}

export  function approveCashoutInManager (TEST_DATA, adminToken, cashoutId){
    return cy.request({
      method: "PUT",
      url: `${TEST_DATA.apiUrl}/api/process/approve-redeem`,
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      failOnStatusCode: false,
      body: {
         _id: cashoutId,
         platform: TEST_DATA.cashout.platform
      }
   })
}

export function findOperationOnHistory (TEST_DATA, adminToken, filters){
    return cy.request({
      method: "GET",
      url: `${TEST_DATA.apiUrl}/api/transaction/paginated`,
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      qs: {
        page: 1,
        pageSize: 10000,
        timeZone: TEST_DATA.cashout.timeZoneManager,
        filters: JSON.stringify(filters)
      },
      failOnStatusCode: false
   })
}