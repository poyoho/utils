import express from "express"
import http from "http"
import path from "path"
import fs from "fs-extra"
import multiparty from "multiparty"

const app = express()
const server = http.createServer(app)


const UPLOAD_DIR = path.resolve(__dirname, "..", "save")
const extractExt = (filename: string) => filename.slice(filename.lastIndexOf("."), filename.length)

const pipeStream = (path: string, ws: fs.WriteStream) => {
  return new Promise(resolve => {
    const rs = fs.createReadStream(path)
    rs.on("end", () => {
      fs.unlinkSync(path)
      resolve(null)
    })
    rs.pipe(ws)
  })
}

const mergeFileChunk = async (filePath: string, filehash: string) => {
  let startIdx = 0
  const chunkDir = path.resolve(UPLOAD_DIR, filehash)
  // in order to ensure the correct combination
  const chunkPaths = (await fs.readdir(chunkDir))
    .sort((a, b) =>  Number(/.*-(\d*)/.exec(a)[1]) - Number(/.*-(\d*)/.exec(b)[1]))
  const mergeTask = chunkPaths.map((chunkPath) => {
    const _chunkPath = path.resolve(chunkDir, chunkPath)
    const fileStat = fs.statSync(_chunkPath)
    const ws = fs.createWriteStream(filePath, { start: startIdx })
    startIdx += fileStat.size
    return pipeStream(_chunkPath, ws)
  })
  await Promise.all(mergeTask)
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

// error test
let errorTest = 0
let errorRequestList = [1, 20, 40, 60, 80]

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method.toLowerCase() == 'options')
    res.send(200)
  else
    next();
});

app.all("/upload", async (req, res) => {
  errorTest++
  if (errorRequestList.includes(errorTest)) {
    console.error("error test", errorTest)
    res.status(500)
    res.end("error test")
    return
  }
  const multipart = new multiparty.Form()
  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err)
      res.status(500)
      res.end("process file chunk failed")
      return
    }
    console.log('/upload', fields)
    const [chunk] = files.chunk
    const [start_idx] = fields.start_idx
    const [end_idx] = fields.end_idx
    const [filename] = fields.filename
    const [fileHash] = fields.filehash
    const chunkDir = path.resolve(UPLOAD_DIR, fileHash)
    const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${extractExt(filename)}`)
    const chunkPath = path.resolve(chunkDir, filename + "-" + start_idx + "-" + end_idx)
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
})

app.all("/merge", async (req, res) => {
  errorTest = 0
  const data = await resolvePost(req)
  console.log('/merge', data)
  const { filename, filehash } = data
  const ext = extractExt(filename)
  const filePath = path.resolve(UPLOAD_DIR, `${filehash}${ext}`)
  res.end(
    JSON.stringify({
      code: 0,
      message: "file merged success"
    })
  )
  await mergeFileChunk(filePath, filehash)
  console.log("merge end")
  return
})

app.all("/verify", async (req, res) => {
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
        (fs.existsSync(path.resolve(UPLOAD_DIR, fileHash))
          ? await fs.readdir(path.resolve(UPLOAD_DIR, fileHash))
          : [])
          .map(name => {
            name = name.replace(filename, "")
            const idxs = /-(\d*)-(\d*)/.exec(name)
            console.log(idxs);
            return [idxs[1], idxs[2]]
          })
      res.end(
        JSON.stringify({
          shouldUpload: true,
          uploadedList: await createUploadedList(filehash)
        })
      );
    }
})

app.listen(3000, () => console.log("listening port 3000"))
