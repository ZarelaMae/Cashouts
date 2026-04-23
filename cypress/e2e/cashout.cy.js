import { loginCustomer, loginAdmin } from "../services/auth.service"
import { createCashoutFromCustomer, verifiedBalanceAfterCashout, chooseCorrectCompany } from "../services/cashout.service"
import { findCashoutInManager, acceptCashoutInManager, approveCashoutInManager, findOperationOnHistory } from "../services/transaction.service"

describe("Cashout flow", () => {

let clientToken
let adminToken
let clientUsername
let clientEmail
let clientBalance
let cashoutId
let TEST_DATA
let filters

  beforeEach(() => {
    cy.fixture("testData").then((data) => {
      TEST_DATA = data
    })
  })

it("should create and approve a cashout", () => {
  // Login customer play
   loginCustomer(TEST_DATA)
  .then((response) => {
    expect(response.status).to.eq(200)
    clientToken = response.body.data.token
    clientUsername = response.body.data.username
    clientEmail = response.body.data.email
    clientBalance = response.body.data.amountInPlatform
    filters = [
          { type: "type", value: "Redeem" },
          { type: "transactionStatus", value: "Pending,Created,Approved" },
          { type: "customerEmail", value: clientEmail },
          { type: "customerUsername", value: clientUsername }
        ]

    // 2. Crear cashout
    return createCashoutFromCustomer(TEST_DATA, clientToken)
    })
    .then((cashoutResponse) => {
      if (cashoutResponse.status === 400) {
      expect(cashoutResponse.body.message).to.eq("You have pending operations")
      cy.log("Ya existe un cashout pendiente para el usuario")
      return null
      }
      expect(cashoutResponse.status).to.be.oneOf([200, 201])
      // 2.1 Verificar balance reducido al generar cashout
      return verifiedBalanceAfterCashout (TEST_DATA, clientToken)
    })
    .then((balanceResponse) => {
      if (!balanceResponse) return null
      expect(balanceResponse.status).to.eq(200)

      const finalBalance = balanceResponse.body.data.amountInPlatform
      expect(finalBalance).to.eq(clientBalance - TEST_DATA.cashout.amount)
      // 3. Login admin)
      return loginAdmin (TEST_DATA)
    })
    .then((adminResponse) => {
       if (!adminResponse) return null
       expect(adminResponse.status).to.be.oneOf([200, 201])
       adminToken = adminResponse.body.data.token
        // 4. Traer compañía
       return chooseCorrectCompany (TEST_DATA, adminToken)
       })
    .then((changeCompanyResponse) => {
       if (!changeCompanyResponse) return null
       console.log("changeCompanyResponse", changeCompanyResponse)

       if (changeCompanyResponse.body?.data?.token) {
       adminToken = changeCompanyResponse.body.data.token
       }
       // 5. Consultar cashout en dashboard
       return findCashoutInManager (TEST_DATA, adminToken, filters)
       })
    .then((response) => {
       if (!response) return null
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
       return acceptCashoutInManager(TEST_DATA, adminToken, cashoutId)
       })

    .then((firstApproveResponse) => {
        if (!firstApproveResponse) return null
        expect(firstApproveResponse.status).to.be.oneOf([200, 201])
        console.log("firstApproveResponse", firstApproveResponse.body)
        return approveCashoutInManager (TEST_DATA, adminToken, cashoutId)
        })

     .then((secondApproveResponse) => {
        if (!secondApproveResponse) return null
        console.log("secondApproveResponse", secondApproveResponse.body)
        expect(secondApproveResponse.status).to.be.oneOf([200, 201])
        // 7. Buscar operación en historial
        return  findOperationOnHistory (TEST_DATA, adminToken, filters)
        })
     .then((response) => {
         if (!response) return null
        expect(response.status).to.eq(200)
        const transactions = response.body.data.transactions
        cy.log("cantidad historial del usuario: " + transactions.length) //cantidad de transac de usuario
        const targetTransaction = transactions.find(tx => tx._id === cashoutId)
        expect(targetTransaction, "transacción encontrada").to.exist
        cy.log("Status de ultima transac: " + targetTransaction.transactionStatus)
       })
     })
   })