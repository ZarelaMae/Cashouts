let clientToken
let adminToken
let clientUsername
let clientEmail
let cashoutId

it("should create and approve a cashout", () => {

  //Login customer play
  cy.request({
    method: "POST",
    url: "https://api.playplayplay.club/api/customer/authentication/login",
    body: {
      companyId: "650cbacb5b27367205467e2e",
      emailOrUsername: "zarelamae16@gmail.com",
      password: "16Mayo17.1@"
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    clientToken = response.body.data.token
    clientUsername = response.body.data.username
    clientEmail = response.body.data.email

    cy.log("Response completa:" + clientUsername)
    cy.log("Response completa:" + clientEmail)

    // 2. Crear cashout
    cy.request({
      method: "POST",
      url: "https://api.playplayplay.club/api/transaction/customer-redeem",
      headers: {
        Authorization: `Bearer ${clientToken}`
      },
      failOnStatusCode: false,
      body: {
        amount: 100,
        payFieldCustomer: {
          key: "1234a"
        },
        paymentMethodId: "675a18231bec994a6d84c55c",
        platform: "Sweepstakes",
        providerName: "Manual",
        timeZone: "America/Lima"
      }
    }).then((cashoutResponse) => {

      if (cashoutResponse.status === 400) {
        expect(cashoutResponse.body.message).to.eq("You have pending operations")
        cy.log("Ya existe un cashout pendiente para el usuario" )
        return
      } else {
        expect(cashoutResponse.status).to.be.oneOf([200, 201])
      }

    })

    // 3. Login admin
    cy.request({
      method: "POST",
      url: "https://api.playplayplay.club/api/authentication/login/backend",
      body: {
        username: "root",
        password: "Root2023@Backendv1"
      }
    }).then((adminResponse) => {
      expect(adminResponse.status).to.be.oneOf([200, 201])
      adminToken = adminResponse.body.data.token

      // 4. Cambiar compañía

      // 5. Consultar cashout en dashboard
      const filters = [
        { type: "type", value: "Redeem" },
        { type: "transactionStatus", value: "Pending,Created,Approved" },
        { type: "customerEmail", value: "taboadapaola6@gmail.com" }
        //{ type: "customerUsername", value: clientUsername }
      ]

      cy.request({
        method: "GET",
        url: "https://api.playplayplay.club/api/transaction/paginated",
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
        cashoutId = transactions[0]._id

        cy.log("cashoutId: " + cashoutId)
        cy.log("cantidad: " + transactions.length)
        cy.log("cantidad: " + transactions[0].codeTransaction)

        console.log("transactions", transactions)

        // 6. Aprobaciones cashout
        cy.request({
          method: "PUT",
          url: "https://api.playplayplay.club/api/process/accept-redeem",
          headers: {
            Authorization: `Bearer ${adminToken}`
          },
          failOnStatusCode: false,
          body: {
            _id: cashoutId,
            platform: "Sweepstakes"
          }
        }).then((firstApproveResponse) => {
          expect(firstApproveResponse.status).to.be.oneOf([200, 201])
          console.log("firstApproveResponse", firstApproveResponse.body)

          cy.request({
            method: "PUT",
            url: "https://api.playplayplay.club/api/process/approve-redeem",
            headers: {
              Authorization: `Bearer ${adminToken}`
            },
            failOnStatusCode: false,
            body: {
              _id: cashoutId,
              platform: "Sweepstakes"
            }
          }).then((secondApproveResponse) => {
            console.log("secondApproveResponse", secondApproveResponse.body)
            expect(secondApproveResponse.status).to.be.oneOf([200, 201])

            // 7. Buscar operacion en historial
            cy.request({
              method: "GET",
              url: "https://api.playplayplay.club/api/transaction/paginated",
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