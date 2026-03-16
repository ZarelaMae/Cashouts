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
      clientUsername=response.body.data.username
      clientEmail=response.body.data.email
      cy.log("Response completa:" + clientUsername )
      cy.log("Response completa:" + clientEmail )
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
           expect(cashoutResponse.body.message)
             .to.eq("You have pending operations")
             return
         }
         else {
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

         // 4. Consultar cashout en dashboard
          cy.request({
            method: "GET",
            url: "https://api.playplayplay.club/api/transaction/paginated?page=1&pageSize=10000&timeZone=America/Chicago&filters=%5B%7B%22type%22%3A%22type%22%2C%22value%22%3A%22Redeem%22%7D%2C%7B%22type%22%3A%22transactionStatus%22%2C%22value%22%3A%22Pending%2CCreated%2C%20Ready%22%7D%5D",
            headers: {
              Authorization: `Bearer ${adminToken}`
            }
          }).then((response) => {
          const transactions = response.body.data.transactions
          const transaction = transactions.find(t =>
          t.customerUsername === clientUsername &&
          t.customerEmail === clientEmail
          )
          cashoutId = transaction.body.data.transactions._id
          cy.log("Response completa:" + cashoutId)

            // 5. Aprobar cashout
           cy.request({
           method: "PUT",
           url: "https://api.playplayplay.club/api/process/accept-redeem",
           headers: {
             Authorization: `Bearer ${adminToken}`
           },
           body: {
                 _id: cashoutId,
                 platform: "Sweepstakes"
                 },
            failOnStatusCode: false
            }).then((approveResponse) => {
              expect(approveResponse.status).to.eq(200)
            })
          })
        })
      })
    })
