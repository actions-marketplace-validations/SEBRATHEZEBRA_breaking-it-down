import {
  XRayClient,
  GetTraceGraphCommand,
  GetTraceSummariesCommand
} from '@aws-sdk/client-xray'
import * as Table from 'table'
import * as core from '@actions/core'

const client = new XRayClient()
const wait = async (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))
const MAX_RETRIES = 12 // Assuming 10 seconds timeout, you can adjust this based on your requirements
const RETRY_INTERVAL = 5000 // 10 seconds interval

export const getTrace = async (): Promise<void> => {
  try {
    const name = core.getInput('name')
    const apiEndpoint = core.getInput('api-endpoint')
    const requestBody = core.getInput('request-body')

    console.log('requestBody: ', requestBody)
    console.log('requestBody: ', JSON.parse(requestBody))

    console.log(
      `------------------------------Testing Request: ${name}------------------------------`
    )

    const startTime = new Date()
    await sendApiRequest(apiEndpoint, JSON.parse(requestBody))
    const endTime = new Date()

    const traceIdInput = {
      StartTime: startTime,
      EndTime: endTime
    }

    let retries = 0
    while (retries < MAX_RETRIES) {
      const traceIds = new GetTraceSummariesCommand(traceIdInput)
      const traceIdResponse = await client.send(traceIds)
      if (
        traceIdResponse.TraceSummaries &&
        traceIdResponse.TraceSummaries.length > 0
      ) {
        for (const trace of traceIdResponse.TraceSummaries) {
          getTraceTable(trace.Id ?? '')
        }
        break
      } else {
        retries++
        console.log(`Searching for traces on AWS...`)
        await wait(RETRY_INTERVAL)
      }
    }

    if (retries === MAX_RETRIES) {
      console.log(`Max retries reached. No traces found after 1 minute.`)
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

const sendApiRequest = async (
  apiEndpoint: string,
  requestBody: object
): Promise<void> => {
  console.log(`Sending test request to api endpoint: '${apiEndpoint}'`)
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`Failed to send API request. Status: ${response.status}`)
  }

  const responseData = await response.json()
  console.log('API Response:', responseData)
}

const getTraceTable = async (traceId: string): Promise<void> => {
  const input = { TraceIds: [traceId] }
  const command = new GetTraceGraphCommand(input)
  const response = await client.send(command)

  // Extract and format data for custom table
  const tableData = response.Services?.map(service => {
    const ServiceName = service.Name
    const ServiceType = service.Type
    const ResponseTimes = service.ResponseTimeHistogram?.map(item => item.Value)
      .map(time => `${time}ms`)
      .join(`,`)

    return [ServiceName, ServiceType, ResponseTimes]
  }).filter(item => item[1] !== 'client')
  if (tableData !== undefined) {
    tableData.sort((a, b) => {
      if (a[2] === undefined || b[2] === undefined) {
        return 0
      }
      return b[2].localeCompare(a[2])
    })

    // Specify custom headers
    const headers = ['Service Name', 'Service Type', 'Response Times']
    // Create a custom table with headers and without the index column
    const customTable = Table.table([headers, ...(tableData ?? [])], {
      columns: {
        0: { alignment: 'left' },
        1: { alignment: 'left' },
        2: { alignment: 'left' }
      },
      drawHorizontalLine: (index, size) =>
        index === 0 || index === 1 || index === size
    })

    console.log(customTable)
  } else {
    console.log('No response times found for services')
  }
}
