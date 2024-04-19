import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false)

  const transactions = useMemo(
    () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
    [paginatedTransactions, transactionsByEmployee]
  )

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    // transactionsByEmployeeUtils.invalidateData()
    await employeeUtils.fetchAll()
        
    // Bug 5 Fixed [Employees filter not available during loading more data]
    // Fixed two wrong behaviors 
    // Updated functionality
    // 1. Initially filter stops showing "Loading employees.." as soon as employees is succeeded
    // 2. When View More Button is clicked filter does not show "Loading employees.." as this data is already loaded
    setIsLoading(false)
    await paginatedTransactionsUtils.fetchAll()
    // Bug 7 Fixed [Approving a transaction won't persist the new value]
    // The placement of transactionsByEmployeeUtils.invalidateData() after fetching new data will also include old values, this way the data will be persistent
    transactionsByEmployeeUtils.invalidateData()

    // setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      // paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
      // Bug 7 Fixed [Approving a transaction won't persist the new value]
      // The placement of paginatedTransactionUtils.invalidateData() after fetching new data will also include old values, this way the data will be persistent
      paginatedTransactionsUtils.invalidateData()
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])
  
  // To check the value of transactionsByEmployee
  // console.log("TBE: " + JSON.stringify(transactionsByEmployee))

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={isLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            console.log("New Value: " + JSON.stringify(newValue));
            
            if (newValue === null) {
              return
            }
            // Bug 3 Fixed [Cannot select all Employees after selecting an employee]
            // On selecting All Employees from drop-down list id becomes empty string, which should load all transations
            if (newValue.id === "")
              await loadAllTransactions()
            else
              await loadTransactionsByEmployee(newValue.id)
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} />
          
          {/* Bug 6 Fixed [View more button not working as expected] */}
          {/* Part 1 and Part 2 both are fixed */}
          {/* Added two more conditions: [transactionsByEmployee === null] to resolve Part-1 and [paginatedTransactions?.nextPage !==null] to resolve Part-2*/}
          {transactions !== null && transactionsByEmployee === null && paginatedTransactions?.nextPage !== null && (
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading}
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
