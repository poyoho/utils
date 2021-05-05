import { PromiseTryAllWithMax } from "@poyoho/shared-service"

export class UploadHelper {

  // Promise.all with control of concurrent connections and try times
  tryAllWithMax (uploadChunks: (() => Promise<any>)[], maxConnection: number, tryRequest: number) {
    return PromiseTryAllWithMax(uploadChunks, maxConnection, tryRequest)
  }

  // slow start upload
  slowStart(uploadChunks: (() => Promise<any>)[]) {

  }
}
