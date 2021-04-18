interface Query {
  page: number
  limit: number
}

interface RetType {
  a: number
  b: number
}

const staticData = Array(100).fill(1).map((_,idx) => ({
  key: `k${idx}`,
  a: idx,
  b: idx,
}))

function request (query: Query): Promise<{
  list: RetType[],
  total: number
}> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        list: staticData.slice((query.page - 1) * query.limit, (query.page) * query.limit),
        total: staticData.length,
      })
    }, 500)
  })
}

const columns = [
  {
    title: "a",
    dataIndex: "a",
  },
  {
    title: "b",
    dataIndex: "b",
  },
];

export { request, columns, RetType }
