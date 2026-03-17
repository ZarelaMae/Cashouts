 const API_URL = "https://api.playplayplay.club"
 const TARGET_COMPANY_ID = "650cbacb5b27367205467e2e"
 const platformCashout = "Sweepstakes"
let clientToken
let adminToken
let clientUsername
let clientEmail
let cashoutId

it("should create and approve a cashout", () => {
  //Login customer play
   cy.request({
    method: "POST",
    url: `${API_URL}/api/customer/authentication/login`,
    body: {
      companyId: TARGET_COMPANY_ID,
      emailOrUsername: "zarelamae16@gmail.com",
      password: "16Mayo17.1@"
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    clientToken = response.body.data.token
    clientUsername = response.body.data.username
    clientEmail = response.body.data.email
    // 2. Crear cashout
    cy.request({
      method: "POST",
      url: `${API_URL}/api/transaction/customer-redeem`,
      headers: {
        Authorization: `Bearer ${clientToken}`
      },
      failOnStatusCode: false,
      body: {
        amount: 50,
        payFieldCustomer: {
          key: "1234a"
        },
        paymentMethodId: "675a18231bec994a6d84c55c",
        platform: platformCashout,
        providerName: "Manual",
        timeZone: "America/Lima"
      }
    }).then((cashoutResponse) => {
      if (cashoutResponse.status === 400) {
        expect(cashoutResponse.body.message).to.eq("You have pending operations")
        cy.log("Ya existe un cashout pendiente para el usuario , pasamos a aprobar el que tiene pendiente" )
        return
      } else {
        expect(cashoutResponse.status).to.be.oneOf([200, 201])
      }
    })
    // 3. Login admin
    cy.request({
      method: "POST",
      url: `${API_URL}/api/authentication/login/backend`,
      body: {
        username: "root",
        password: "Root2023@Backendv1"
      }
    }).then((adminResponse) => {
      expect(adminResponse.status).to.be.oneOf([200, 201])
      adminToken = adminResponse.body.data.token
    // 4. Traer compañia
      cy.request({
          method: "POST",
          url: `${API_URL}/api/authentication/change-company/master`,
          headers: {
            Authorization: `Bearer ${adminToken}`
          },
          body: {
            companyId: TARGET_COMPANY_ID
          },
          failOnStatusCode: false
        }).then((changeCompanyResponse) => {
          console.log("changeCompanyResponse", changeCompanyResponse)

          if (changeCompanyResponse.body?.data?.token) {
            adminToken = changeCompanyResponse.body.data.token
          }
      // 5. Consultar cashout en dashboard
      const filters = [
        { type: "type", value: "Redeem" },
        { type: "transactionStatus", value: "Pending,Created,Approved" },
        { type: "customerEmail", value: clientEmail },
        { type: "customerUsername", value: clientUsername }
      ]
      cy.request({
        method: "GET",
        url: `${API_URL}/api/transaction/paginated`,
        headers: {
          Authorization: `Bearer ${adminToken}`
        },
        qs: {
          page: 1,
          pageSize: 10000,
          timeZone: "America/Chicago",
          filters: JSON.stringify(filters)
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        const transactions = response.body.data.transactions
        expect(transactions, "transactions list").to.have.length.greaterThan(0)
        const targetTransaction = transactions.find(tx =>
          ["Pending", "Created"].includes(tx.transactionStatus)
        )
        expect(targetTransaction, "cashout pending o created").to.exist
        cashoutId = targetTransaction._id
        cy.log("cashoutId: " + cashoutId)
        console.log("transactions", transactions)
        // 6. Aprobaciones cashout
        cy.request({
          method: "PUT",
          url: `${API_URL}/api/process/accept-redeem`,
          headers: {
            Authorization: `Bearer ${adminToken}`
          },
          failOnStatusCode: false,
          body: {
            _id: cashoutId,
            platform: platformCashout
          }
        }).then((firstApproveResponse) => {
          expect(firstApproveResponse.status).to.be.oneOf([200, 201])
          console.log("firstApproveResponse", firstApproveResponse.body)

          cy.request({
            method: "PUT",
            url: `${API_URL}/api/process/approve-redeem`,
            headers: {
              Authorization: `Bearer ${adminToken}`
            },
            failOnStatusCode: false,
            body: {
              _id: cashoutId,
              platform: platformCashout
            }
          }).then((secondApproveResponse) => {
            console.log("secondApproveResponse", secondApproveResponse.body)
            expect(secondApproveResponse.status).to.be.oneOf([200, 201])
            // 7. Buscar operacion en historial
            cy.request({
              method: "GET",
              url: `${API_URL}/api/transaction/paginated`,
              headers: {
                Authorization: `Bearer ${adminToken}`
              },
              qs: {
                page: 1,
                pageSize: 10000,
                timeZone: "America/Chicago",
                filters: JSON.stringify(filters)
              },
              failOnStatusCode: false
            }).then((response) => {
              expect(response.status).to.eq(200)
              const transactions = response.body.data.transactions
              cy.log("cantidad historial: " + transactions.length)
              cy.log("Status " + transactions[0].transactionStatus)
            })
            })
          })
        })
      })
    })
  })
})