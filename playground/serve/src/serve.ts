import http from "http"
import path from "path"
import fs from "fs-extra"
import multiparty from "multiparty"

const server = http.createServer()

const UPLOAD_DIR = path.resolve(__dirname, "..", "save")
// const extractExt = (filename: string) => filename.slice(filename.lastIndexOf("."), filename.length)


const pipeStream = (path: string, writeStream: fs.WriteStream) => {
  return new Promise(resolve => {
    const rs = fs.createReadStream(path)
    rs.on("end", () => {
      fs.unlinkSync(path)
      resolve(null)
    })
    rs.pipe(writeStream)
  })
}

const mergeFileChunk = async (filePath: string, filename: string, size: number) => {
  const chunkDir = path.resolve(UPLOAD_DIR, `_${filename}`)
  const chunkPaths = await fs.readdir(chunkDir)
  chunkPaths.sort((a, b) => a.split("-")[1].localeCompare(b.split("-")[1]))
  await Promise.all(chunkPaths.map((chunkPath, idx) => pipeStream(
    path.resolve(chunkDir, chunkPath),
    fs.createWriteStream(filePath, { start: idx * size })
  )))
  fs.rmdirSync(chunkDir)
}

server.on("request", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "*")
  if (req.method === "OPTIONS") {
    res.status = 200
    res.end()
    return
  }

  if (req.url === "/merge") {
    console.log('/merge')
    const data = await new Promise<{
      filename: string,
      size: number
    }>(resolve => {
      let chunk = ""
      req.on("data", (data: Blob) => {
        chunk += data
      })
      req.on("end", () => {
        resolve(JSON.parse(chunk))
      })
    })
    const { filename, size } = data
    const filePath = path.resolve(UPLOAD_DIR, `${filename}`)
    await mergeFileChunk(filePath, filename, size)
    res.end(
      JSON.stringify({
        code: 0,
        message: "file merged success"
      })
    )
    return
  } else if (req.url === "/upload") {
    console.log('/upload')
    const multipart = new multiparty.Form()
    multipart.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err)
        res.status = 500
        res.end("process file chunk failed")
        return
      }
      const [chunk] = files.chunk
      const [hash] = fields.hash
      const [filename] = fields.filename
      // const [fileHash] = fields.fileHash
      const chunkDir = path.resolve(UPLOAD_DIR, `_${filename}`)
      const filePath = path.resolve(chunkDir, hash)
      if (fs.existsSync(filePath)) {
        console.log('file exist', filePath)
        res.end("file exist")
        return
      }
      if (!fs.existsSync(chunkDir)) {
        await fs.mkdirs(chunkDir)
      }
      await fs.move(chunk.path, filePath)
      res.end("received file chunk")
    })
  }
})

server.listen(3000, () => console.log("listening port 3000"))
