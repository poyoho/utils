import http from "http"
import path from "path"
import fs from "fs-extra"
import multiparty from "multiparty"

const server = http.createServer()


const UPLOAD_DIR = path.resolve(__dirname, "..", "save")
const extractExt = (filename: string) => filename.slice(filename.lastIndexOf("."), filename.length)

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

const mergeFileChunk = async (filePath: string, filehash: string, size: number) => {
  const chunkDir = path.resolve(UPLOAD_DIR, filehash)
  const chunkPaths = await fs.readdir(chunkDir)
  chunkPaths.sort((a, b) => a.split("-")[1].localeCompare(b.split("-")[1]))
  await Promise.all(chunkPaths.map((chunkPath, idx) => pipeStream(
    path.resolve(chunkDir, chunkPath),
    fs.createWriteStream(filePath, { start: idx * size })
  )))
  fs.rmdirSync(chunkDir)
}

const resolvePost = (req: any): Promise<any> =>
  new Promise(resolve => {
    let chunk = "";
    req.on("data", (data: any) => {
      chunk += data;
    })
    req.on("end", () => {
      resolve(JSON.parse(chunk));
    })
  })

server.on("request", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "*")
  if (req.method === "OPTIONS") {
    res.status = 200
    res.end()
    return
  }

  if (req.url === "/merge") {
    const data = await resolvePost(req)
    console.log('/merge', data)
    const { filename, filehash, size } = data
    const ext = extractExt(filename)
    const filePath = path.resolve(UPLOAD_DIR, `${filehash}${ext}`)
    await mergeFileChunk(filePath, filehash, size)
    res.end(
      JSON.stringify({
        code: 0,
        message: "file merged success"
      })
    )
    return
  } else if (req.url === "/upload") {
    const multipart = new multiparty.Form()
    multipart.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err)
        res.status = 500
        res.end("process file chunk failed")
        return
      }
      console.log('/upload', fields)
      const [chunk] = files.chunk
      const [hash] = fields.hash
      const [filename] = fields.filename
      const [fileHash] = fields.filehash
      const chunkDir = path.resolve(UPLOAD_DIR, fileHash)
      const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${extractExt(filename)}`)
      const chunkPath = path.resolve(chunkDir, hash)
      if (fs.existsSync(filePath) || fs.existsSync(chunkPath)) {
        res.end("file exist")
        return
      }
      if (!fs.existsSync(chunkDir)) {
        await fs.mkdirs(chunkDir)
      }
      await fs.move(chunk.path, chunkPath)
      res.end("received file chunk")
    })
  } else if (req.url === "/verify") {
    const data = await resolvePost(req)
    console.log("/verify", data)
    const { filehash, filename } = data
    const ext = extractExt(filename)
    const filePath = path.resolve(UPLOAD_DIR, `${filehash}${ext}`)
    if (fs.existsSync(filePath)) {
      res.end(
        JSON.stringify({
          shouldUpload: false
        })
      );
    } else {
      const createUploadedList = async (fileHash: string) =>
        fs.existsSync(path.resolve(UPLOAD_DIR, fileHash))
          ? await fs.readdir(path.resolve(UPLOAD_DIR, fileHash))
          : [];
      res.end(
        JSON.stringify({
          shouldUpload: true,
          uploadedList: await createUploadedList(filehash)
        })
      );
    }
  }
})

server.listen(3000, () => console.log("listening port 3000"))
