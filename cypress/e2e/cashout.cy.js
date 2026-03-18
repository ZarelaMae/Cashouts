const API_URL = "https://api.playplayplay.club"
const TARGET_COMPANY_ID = "650cbacb5b27367205467e2e"
const platformCashout = "Sweepstakes"
const cashoutAmount = 50

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
    clientBalance = response.body.data.amountInPlatform

    // 2. Crear cashout
    cy.request({
      method: "POST",
      url: `${API_URL}/api/transaction/customer-redeem`,
      headers: {
        Authorization: `Bearer ${clientToken}`
      },
      failOnStatusCode: false,
      body: {
        amount: cashoutAmount,
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
        cy.log("Ya existe un cashout pendiente para el usuario, pasamos a aprobar el que tiene pendiente")
      } else {
        expect(cashoutResponse.status).to.be.oneOf([200, 201])

        // 2.1 Verificar balance reducido al generar cashout
        cy.request({
          method: "GET",
          url: `${API_URL}/api/customer/full`,
          headers: {
            Authorization: `Bearer ${clientToken}`
          },
          failOnStatusCode: false
        }).then((balanceResponse) => {
          expect(balanceResponse.status).to.eq(200)

          const finalBalance = balanceResponse.body.data.amountInPlatform
          expect(finalBalance).to.eq(clientBalance - cashoutAmount)
        })
      }

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

        // 4. Traer compañía
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

                // 7. Buscar operación en historial
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