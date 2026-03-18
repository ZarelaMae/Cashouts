const TEST_DATA = {
  companyId: "650cbacb5b27367205467e2e",
  apiUrl: "https://api.playplayplay.club",
  customer: {
    emailOrUsername: "zarelamae16@gmail.com",
    password: "16Mayo17.1@"
  },
  admin: {
    username: "root",
    password: "Root2023@Backendv1"
  },
  cashout: {
    amount: 50,
    paymentMethodId: "675a18231bec994a6d84c55c",
    platform: "Sweepstakes",
    providerName: "Manual",
    timeZonePlayer: "America/Lima",
    timeZoneManager: "America/Chicago",
    payFieldCustomer: {
      key: "1234a"
    }
  }
}

let clientToken
let adminToken
let clientUsername
let clientEmail
let clientBalance
let cashoutId

it("should create and approve a cashout", () => {
  // Login customer play
  cy.request({
    method: "POST",
    url: `${TEST_DATA.apiUrl}/api/customer/authentication/login`,
    body: {
      companyId: TEST_DATA.companyId,
      emailOrUsername: TEST_DATA.customer.emailOrUsername,
      password: TEST_DATA.customer.password
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    clientToken = response.body.data.token
    clientUsername = response.body.data.username
    clientEmail = response.body.data.email
    clientBalance = response.body.data.amountInPlatform

    // 2. Crear cashout
    cy.request({
      method: "POST",
      url: `${TEST_DATA.apiUrl}/api/transaction/customer-redeem`,
      headers: {
        Authorization: `Bearer ${clientToken}`
      },
      failOnStatusCode: false,
      body: {
        amount: TEST_DATA.cashout.amount,
        payFieldCustomer: {
          key: TEST_DATA.cashout.payFieldCustomer.key
        },
        paymentMethodId: TEST_DATA.cashout.paymentMethodId,
        platform: TEST_DATA.cashout.platform,
        providerName: TEST_DATA.cashout.providerName,
        timeZone: TEST_DATA.cashout.timeZonePlayer
      }
    }).then((cashoutResponse) => {
      if (cashoutResponse.status === 400) {
        expect(cashoutResponse.body.message).to.eq("You have pending operations")
        cy.log("Ya existe un cashout pendiente para el usuario")
      return
      } else {
        expect(cashoutResponse.status).to.be.oneOf([200, 201])

        // 2.1 Verificar balance reducido al generar cashout
        cy.request({
          method: "GET",
          url: `${TEST_DATA.apiUrl}/api/customer/full`,
          headers: {
            Authorization: `Bearer ${clientToken}`
          },
          failOnStatusCode: false
        }).then((balanceResponse) => {
          expect(balanceResponse.status).to.eq(200)

          const finalBalance = balanceResponse.body.data.amountInPlatform
          expect(finalBalance).to.eq(clientBalance - TEST_DATA.cashout.amount)
        })
      }

      // 3. Login admin
      cy.request({
        method: "POST",
        url: `${TEST_DATA.apiUrl}/api/authentication/login/backend`,
        body: {
          username: TEST_DATA.admin.username,
          password: TEST_DATA.admin.password
        }
      }).then((adminResponse) => {
        expect(adminResponse.status).to.be.oneOf([200, 201])
        adminToken = adminResponse.body.data.token

        // 4. Traer compañía
        cy.request({
          method: "POST",
          url: `${TEST_DATA.apiUrl}/api/authentication/change-company/master`,
          headers: {
            Authorization: `Bearer ${adminToken}`
          },
          body: {
            companyId: TEST_DATA.companyId
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
          }).then((response) => {
            expect(response.status).to.eq(200)

            const transactions = response.body.data.transactions
            expect(transactions, "transactions list").to.have.length.greaterThan(0)

            const targetTransaction = transactions.find((tx) =>
              ["Pending", "Created"].includes(tx.transactionStatus) &&
               tx.customerEmail === clientEmail &&
               tx.customerUsername === clientUsername
            )

            expect(targetTransaction, "cashout pending o created").to.exist
            cashoutId = targetTransaction._id

            cy.log("cashoutId: " + cashoutId)
            console.log("transactions", transactions)

            // 6. Aprobaciones cashout
            cy.request({
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
            }).then((firstApproveResponse) => {
              expect(firstApproveResponse.status).to.be.oneOf([200, 201])
              console.log("firstApproveResponse", firstApproveResponse.body)

              cy.request({
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
              }).then((secondApproveResponse) => {
                console.log("secondApproveResponse", secondApproveResponse.body)
                expect(secondApproveResponse.status).to.be.oneOf([200, 201])

                // 7. Buscar operación en historial
                cy.request({
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
                }).then((response) => {
                  expect(response.status).to.eq(200)
                  const transactions = response.body.data.transactions
                  cy.log("cantidad historial del usuario: " + transactions.length) //cantidad de transac de usuario
                  const targetTransaction = transactions.find(tx => tx._id === cashoutId)
                  expect(targetTransaction, "transacción encontrada").to.exist
                  cy.log("Status de ultima transac: " + targetTransaction.transactionStatus)
                })
              })
            })
          })
        })
      })
    })
  })
})