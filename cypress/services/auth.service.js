export function loginCustomer(TEST_DATA){
    return cy.request({
      method: "POST",
      url: `${TEST_DATA.apiUrl}/api/customer/authentication/login`,
      body: {
        companyId: TEST_DATA.companyId,
        emailOrUsername: TEST_DATA.customer.emailOrUsername,
        password: TEST_DATA.customer.password
    }
  })
}

export function loginAdmin (TEST_DATA){
    return cy.request({
        method: "POST",
        url: `${TEST_DATA.apiUrl}/api/authentication/login/backend`,
        body: {
          username: TEST_DATA.admin.username,
          password: TEST_DATA.admin.password
        }
      })
}