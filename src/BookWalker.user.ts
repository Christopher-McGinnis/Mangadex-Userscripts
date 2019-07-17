// ==UserScript==
// @name BookWalker Cover Page Extractor
// @namespace https://github.com/Brandon-Beck
// @description Click on preview image for this page or another volume. Automatically copies the cover image url to clipboard (and prints it in the terminal)
// @include    /^(?:https?:\/\/)?bookwalker\.jp\/de[a-zA-Z0-9]+-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]+(\/.*)?/
// @include    /^(?:https?:\/\/)?bookwalker\.jp\/series\/\d+(\/.*)?/
// @include    /^(?:https?:\/\/)?mangadex\.org\/title\/\d+(\/.*)?/
// @version  0.1.29
// @grant unsafeWindow
// @grant GM_xmlhttpRequest
// ==/UserScript==

// @require https://gitcdn.xyz/repo/nodeca/pica/5.0.0/dist/pica.min.js
// TODO: MD Sanity Check. Ensure BW link is to a Manga (as opposed to an LN)


'use strict'

/*
declare interface pica {
  (): {
    resize(from: HTMLCanvasElement | HTMLImageElement, to: HTMLCanvasElement, {quality: number}):  Promise<HTMLCanvasElement>
  }
}
*/
export {}

const ERROR_IMG = 'https://i.postimg.cc/4NbKcsP6/404.gif'
const LOADING_IMG = 'https://i.redd.it/ounq1mw5kdxy.gif'

/*
  Utilities
*/
function copyToClipboard(a: string): void {
  const b = document.createElement('textarea')
  const c = document.getSelection()
  b.textContent = a
  document.body.appendChild(b)
  if (c) c.removeAllRanges()
  b.select()
  document.execCommand('copy')
  if (c) c.removeAllRanges()
  document.body.removeChild(b)
  console.log(`Copied '${a}'`)
}

function isUserscript(): boolean {
  if (window.unsafeWindow == null) {
    return false
  }
  return true
}

// Ignore CORS
function fetchNoCORS(url: string) {
  return new Promise((ret ,err) => {
    GM_xmlhttpRequest({
      method: 'GET'
      ,url
      ,onerror: err
      ,ontimeout: err
      ,onload: (response) => {
        if (response.status >= 200 && response.status <= 299) {
          return ret(response)
        }
        return err(response.statusText)
      }
    })
  })
}
function fetchDomNoCORS(url: string) {
  return fetchNoCORS(url).then((r) => {
    if (r.status >= 200 && r.status <= 299) {
      const parser = new DOMParser()
      const htmlDocument = parser.parseFromString(r.responseText ,'text/html')
      return Promise.resolve(htmlDocument.documentElement)
    }
    return Promise.reject(Error(r.statusText))
  })
}
function fetchDom(url: string) {
  return fetchDomNoCORS(url)
  /* return fetch(url).then((r) => {
    if (r.ok) {
      return r.text().then((html) => {
        const doctype = document.implementation.createDocumentType('html' ,'' ,'')
        const dom = document.implementation.createDocument('' ,'html' ,doctype)
        dom.documentElement.innerHTML = html
        return dom.documentElement
      })
    }
    return Promise.reject(r.statusText)
  }) */
}

// Image Utilities
async function isValidAspectRatio(serialData: SerialDataCover): Promise<boolean> {
  // Reject failed images
  const cover = await serialData.cover
  const preview = await serialData.preview
  if (cover.naturalWidth === 0 || cover.naturalHeight === 0) {
    console.log('0 size image')
    return false
  }

  const widthDelta = preview.naturalWidth / cover.naturalWidth
  const convertW = cover.naturalWidth * widthDelta
  const convertH = cover.naturalHeight * widthDelta
  if (preview.naturalHeight > convertH + 1 || preview.naturalHeight < convertH - 1) {
    console.log(`Rejecting height preview: ${preview.naturalHeight} cover: ${cover.naturalHeight} = conv: ${convertH}`)
    return false
  }
  return true
}
// Ignore CORS
function getImageBlobIgnoreCORS(url: string): Promise<Blob> {
  return new Promise((ret ,err) => {
    GM_xmlhttpRequest({
      method: 'GET'
      ,url
      ,responseType: 'blob'
      ,onerror: err
      ,ontimeout: err
      ,onload: (response) => {
        if (response.status >= 200 && response.status <= 299) {
          return ret(response.response)
        }
        return err(response)
      }
    })
  })
}


/*
  Bookwalker Utilities
*/

function getCoverUrlFromRID(rid: number): string {
  return `https://c.bookwalker.jp/coverImage_${rid}.jpg`
}

/*
  Bookwalker Functions
*/

// FIXME: I believe there are better ways to do this, but I am new to type-fu
const enum SerialDataLevel {
  BASE
  ,COVER_REQ
  ,COVER
}

interface SerialDataBase {
  id: string
  rid: number
  preview: Promise<HTMLImageElement>
  previewBlob?: Blob
  title: string
  serialLevel: SerialDataLevel
  mangadexId?: number
  // CoverReq
  maxTries?: number
  // Cover
  fetchLocked?: boolean
  fetchLockedId?: number
  triesLeft?: number
  cover?: Promise<HTMLImageElement>
  ready?: boolean
  coverPromise: Promise<HTMLImageElement>
  coverResolver?: Function
  coverRejector?: Function
}
interface SerialDataBasic extends SerialDataBase {
  serialLevel: SerialDataLevel.BASE
}
interface SerialDataCoverReq extends SerialDataBase {
  serialLevel: SerialDataLevel.COVER_REQ
  maxTries: number
}
interface SerialDataCover extends SerialDataBase {
  serialLevel: SerialDataLevel.COVER
  cover: Promise<HTMLImageElement>
  ready: boolean
  fetchLocked: boolean
  fetchLockedId: number
  maxTries: number
  triesLeft: number
  blob?: Blob
}
type SerialData = SerialDataBasic | SerialDataCoverReq | SerialDataCover;


function getVolumePageFromSeriesPage(doc: HTMLElement) {
  const volumePage: HTMLAnchorElement | null = doc.querySelector('.overview-synopsis-hdg > a')
  if (volumePage) {
    return fetchDom(volumePage.href)
  }
  return Promise.reject(Error('No volume pages found'))
}
function getCoverImgElmsFromVolumePage(doc: HTMLElement) {
  const volumeContainerElms = doc.querySelectorAll('.detail-section.series .cmnShelf-list')
  console.log(volumeContainerElms)
  const imgs: HTMLImageElement[] = []
  volumeContainerElms.forEach((list) => {
    list.querySelectorAll('.cmnShelf-item').forEach((e) => {
      const img: HTMLImageElement | null = e.querySelector('.cmnShelf-image > img')
      if (img) {
        imgs.push(img)
      }
    })
  })
  return imgs
}
function getIdFromImg(img: HTMLImageElement): string {
  return img.src.split('/')[3]
}
async function toImgPromiseIgnoreCORS(uri: string | Blob | Promise<Blob> | HTMLImageElement): Promise<HTMLImageElement> {
  const img = document.createElement('img')
  img.crossOrigin = 'anonymous'
  let src: string
  if (uri instanceof Blob) {
    src = URL.createObjectURL(uri)
  }
  else if (uri instanceof Promise) {
    src = URL.createObjectURL(await uri)
  }
  else if (typeof (uri) === 'string') {
    src = uri
  }
  else if (typeof (uri) === 'object' && uri.tagName === 'IMG') {
    // FIXME double fetch
    src = uri.src
  }
  else {
    return Promise.reject(Error(`Invalid URI '${uri}'`))
  }

  return new Promise((ret ,err) => {
    img.onload = () => {
      URL.revokeObjectURL(src)
      ret(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(src)
      // console.error(e)
      err(e)
    }
    img.src = src
  })
}
function toImgPromise(uri: string | Blob | HTMLImageElement): Promise<HTMLImageElement> {
  let img = document.createElement('img')
  img.crossOrigin = 'anonymous'
  let src: string
  if (uri instanceof Blob) {
    src = URL.createObjectURL(uri)
  }
  else if (typeof (uri) === 'string') {
    src = uri
  }
  else if (typeof (uri) === 'object' && uri.tagName === 'IMG') {
    img = uri
    src = uri.src
  }
  else {
    return Promise.reject(`Invalid URI '${uri}'`)
  }

  return new Promise((ret ,err) => {
    img.onload = () => {
      URL.revokeObjectURL(src)
      return ret(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(src)
      // console.error(e)
      return err(e)
    }
    if (img.complete) {
      return ret(img)
    }
    if (img.src !== src) img.src = src
  })
}

function getCoverFromRid(rid: number): Promise<{img: Promise<HTMLImageElement> ,blob?: Blob}> {
  const url = getCoverUrlFromRID(rid)
  return getImageBlobIgnoreCORS(url)
    .then(b => ({
      img: toImgPromiseIgnoreCORS(b) ,blob: b
    }))
}

function getRidFromId(id: string): number {
  return parseInt(id.toString().split('').reverse().join(''))
}

function serializeImg(img: HTMLImageElement): SerialDataBasic {
  const id = getIdFromImg(img)
  const previewBlob = getImageBlobIgnoreCORS(img.src)
  const serialData: SerialDataBasic = {
    id
    ,serialLevel: SerialDataLevel.BASE
    ,preview: toImgPromiseIgnoreCORS(previewBlob)
    ,previewBlob
    ,rid: getRidFromId(id)
    ,title: img.alt
  }
  // FIXME: definitly not the right go about this.
  // new Promise((upperRes) => {
  serialData.coverPromise = new Promise((res ,rej) => {
    serialData.coverResolver = res
    serialData.coverRejector = rej
    // return upperRes()
  })
  // }).then()
  console.log(serialData)
  return serialData
}
function getSerialDataFromSeriesPage(doc: HTMLElement): Promise<SerialDataBasic[]> {
  console.log('volume')
  return getVolumePageFromSeriesPage(doc)
    .then((doc) => {
      console.log('img')
      return getCoverImgElmsFromVolumePage(doc)
    })
    .then((imgs) => {
      console.log('serial')
      return imgs.map((img) => {
        const serial = serializeImg(img)
        console.error(serial)
        return serial
      })
    })
}
function getSerialDataFromBookwalker(url: string ,doc: HTMLElement): Promise<SerialDataBasic[]> {
  if (url.match(/^(?:https?:\/\/)?bookwalker\.jp\/series\/\d+(\/.*)?/)) {
    return getSerialDataFromSeriesPage(doc)
  }
  if (url.match(/^(?:https?:\/\/)?bookwalker\.jp\/de[a-zA-Z0-9]+-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]+(\/.*)?/)) {
    return Promise.resolve(getCoverImgElmsFromVolumePage(doc).map(img => serializeImg(img)))
  }

  return Promise.reject(Error(`Bookwalker URL expected. Got '${url}'`))
}

function fetchCoverImageFromSerialData(serialDataOrig: SerialData): Promise<SerialDataCover> {
  let serialData: SerialDataCover
  if (serialDataOrig.serialLevel === SerialDataLevel.COVER) {
    if (serialDataOrig.fetchLocked === true) {
      return Promise.reject(Error('fetchLocked'))
    }
    serialData = serialDataOrig
  }
  else {
    serialDataOrig.ready = false
    serialDataOrig.fetchLocked = true
    serialDataOrig.fetchLockedId = 0
    if (serialDataOrig.serialLevel === SerialDataLevel.BASE) {
      serialDataOrig.maxTries = 10
    }
    serialDataOrig.triesLeft = serialDataOrig.maxTries
    serialData = serialDataOrig as SerialDataBase as SerialDataCover
    serialData.serialLevel = SerialDataLevel.COVER
  }
  serialData.fetchLocked = true
  serialData.fetchLockedId++
  const ourLock = serialData.fetchLockedId
  // Add 1 to rid. We will premptivly subtract one in out loop
  if (!serialData.ready) {
    serialData.rid++
  }
  serialData.ready = false

  // FIXME Work with CORS/Non-Userscript mode
  function loopRun(fn: Function): Promise<SerialDataCover> {
    return fn()
      .catch((e: Error) => {
        // FIXME type errors
        if (e.message !== 'Out of Tries') return loopRun(fn)
        return Promise.reject(e)
      })
  }
  return loopRun(() => {
    if (serialData.triesLeft <= 0) {
      serialData.fetchLocked = false
      return Promise.reject(Error('Out of Tries'))
    }
    serialData.triesLeft--
    serialData.rid--
    return getCoverFromRid(serialData.rid)
      .then(async ({ img ,blob }) => {
        serialData.cover = img
        if (!await isValidAspectRatio(serialData)) {
          return Promise.reject(Error('Invalid Aspect Ratio'))
          // return Promise.reject(Error('Invalid Aspect Ratio'))
        }
        if (blob) serialData.blob = blob
        img.then(() => {
          if (serialData.coverResolver) serialData.coverResolver(img)
          else return Promise.reject(Error('Cover Resolver failed to initialize before images were found!'))
        })
        // this should never happen. else isValidAspect would fail
        img.catch(() => {
          if (serialData.coverRejector) serialData.coverRejector(img)
          else return Promise.reject(Error('Cover Rejector failed to initialize and an attempt to use it was made!'))
        })
        serialData.ready = true
        serialData.fetchLocked = false
        return serialData
      })
  })
}

/* ***************************
  MD functions
*/

type MD_LanguageFlags = 'jp' | 'en' | string;

interface MD_SeriesDetailsJson {
    manga: {
        artist: string;
        author: string;
        cover_url: string;
        description: string;
        lang_flag: MD_LanguageFlags;
        links: {
            [index: string]: string;
        };
    };
}
function getSerieseDetailsFromMD(mangadexId: number): Promise<MD_SeriesDetailsJson> {
  return fetch(`https://mangadex.org/api/manga/${mangadexId}`)
    .then((r) => {
      if (r.ok) {
        return r.json().then(j => j)
      }
      return Promise.reject(r.statusText)
    })
}
function getTitleIdFromMD() {
  const m = window.location.href.match(/^https?:\/\/(?:www\.)?mangadex\.org\/title\/(\d+)(?:\/.*)?$/)
  if (m) {
    return parseInt(m[1])
  }
  throw Error('No MD Title ID Found')
}
function filterBwLink(url: string) {
  const series = url.match(/^((?:https?:\/\/)?bookwalker\.jp\/series\/\d+)(\/.*)?/)
  if (series) return series[1]
  const volume = url.match(/^((?:https?:\/\/)?bookwalker\.jp\/de[a-zA-Z0-9]+-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]+)(\/.*)?/)
  if (volume) return volume[1]
  return undefined
}
function getBW_CoversFromMD() {
  const id = getTitleIdFromMD()
  getSerieseDetailsFromMD(id)
    .then((e) => {
      const { bw } = e.manga.links
      if (bw) {
        const usableBw = filterBwLink(`https://bookwalker.jp/${bw}`)
        if (usableBw) return Promise.resolve(usableBw)
        return Promise.reject(Error(`Unusable Bookwalker Url Recieved! '${bw}'`))
      }
      return Promise.reject(Error('Bookwalker Url Not Found!'))
    })
    .then(bw => fetchDom(bw)
      .then(dom => getSerialDataFromBookwalker(bw ,dom)))
    .then((serialData: SerialDataBasic[]) => {
      serialData.forEach((e) => {
        e.mangadexId = id
      })
      return serialData
    })
    .then((serialData: SerialDataBasic[]) => {
      createInterface(serialData)
      function loopRun(fn: Function) {
        return fn().then(() => loopRun(fn)).catch(() => { })
      }
      let idx = 0
      loopRun(() => {
        if (serialData[idx]) {
          return fetchCoverImageFromSerialData(serialData[idx]).then(() => idx++)
        }
        return Promise.reject(Error('Out of Idxs'))
      })
    })
}
function listUploadBtn(mangadexId: number ,volume: string ,blob: Blob ,filename: string) {
  const enum UploadType {
    BLOB
    ,FILE
  }
  const uploadType = UploadType.BLOB

  const form = document.querySelector('#manga_cover_upload_form')
  if (!form) {
    throw Error('No Cover Upload Form Found')
  }

  const fileNameField = form.querySelector("input[name='old_file']") as HTMLInputElement
  if (!fileNameField) {
    throw Error('No Cover File Name Field Found')
  }
  fileNameField.value = filename

  const volumeNameField = form.querySelector("input[name='volume']") as HTMLInputElement
  if (!volumeNameField) {
    throw Error('No Cover Volume Field Found')
  }
  if (volume !== '') volumeNameField.value = volume

  const uploadBtn = form.querySelector('#upload_cover_button') as HTMLInputElement
  if (!uploadBtn) {
    throw Error('No Submit Button Found')
  }
  const fileField = form.querySelector("input[type='file']") as HTMLInputElement
  if (!fileField) {
    throw Error('No Cover File Field Found')
  }
  const dt = new DataTransfer() // specs compliant (as of March 2018 only Chrome)
  dt.items.add(new File([blob] ,filename))
  fileField.files = dt.files

  /*
  uploadBtn.type = 'button'
  uploadBtn.onclick = () => {
    if (uploadType === UploadType.BLOB) {
      blobPost(mangadexId ,volumeNameField.value ,blob ,filename)
    }
    uploadBtn.onclick = null
    fileField.onclick = null
  }

  fileField.onclick = () => {
    uploadType = UploadType.FILE
    uploadBtn.type = 'submit'
    uploadBtn.onclick = null
    fileField.onclick = null
  }
*/
  const showDiagBtn = document.querySelector('a[data-target="#manga_cover_upload_modal"]') as HTMLButtonElement
  if (showDiagBtn) showDiagBtn.click()
  return undefined
}
function blobPost(mangadexId: number ,volume: string ,blob: Blob ,filename: string) {
  if (!['image/png' ,'image/jpeg' ,'image/gif'].includes(blob.type)) {
    throw Error(`Unsupported Image Format '${blob.type}'`)
  }
  if (volume.trim() === '') {
    throw Error(`Invalid Volume Number '${volume}'`)
  }
  const formData = new FormData()
  formData.append('volume' ,volume)
  formData.append('old_file' ,filename)
  formData.append('file' ,blob ,filename)
  console.log('FETCH BASE')
  console.log(formData)
  // unsafeWindow.formData = formData
  // return undefined
  fetch(`https://mangadex.org/ajax/actions.ajax.php?function=manga_cover_upload&id=${mangadexId}` ,{
    credentials: 'include'
    ,headers: {
      // 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:70.0) Gecko/20100101 Firefox/70.0'
      // ,'Accept': '*/*'
      // ,'Accept-Language': 'en-US,en;q=0.5'
      'cache-control': 'no-cache'
      ,'X-Requested-With': 'XMLHttpRequest'
      // ,'Content-Type': 'multipart/form-data; boundary=---------------------------157450823414663905041102867756'
    }
    ,referrer: `https://mangadex.org/title/${mangadexId}/ijiranaide-nagatoro-san/covers/`
    ,body: formData
    ,method: 'POST'
    ,mode: 'cors'
  })
}
/*
  Interface
*/

function createSingleInterface(serialData: SerialData): HTMLDivElement {
  const cont = document.createElement('div')
  const info = document.createElement('div')
  const title = document.createElement('h4')
  const coverCont = document.createElement('div')
  const cover = document.createElement('img')
  const copy = document.createElement('button')
  const next = document.createElement('button')
  const controls = document.createElement('div')
  controls.appendChild(copy)
  controls.appendChild(next)
  controls.style.position = 'relative'
  controls.style.display = 'flex'
  copy.style.flexGrow = '1'
  next.style.flexGrow = '1'
  coverCont.style.position = 'relative'

  info.appendChild(title)
  const coverDisplayWidth = 200
  controls.style.width = `${coverDisplayWidth}px`
  coverCont.style.width = `${coverDisplayWidth}px`

  coverCont.appendChild(cover)
  let preview: HTMLImageElement | undefined
  serialData.preview.then((serialPreview) => {
    preview = serialPreview
    preview.width = Math.ceil(coverDisplayWidth / 4)
    preview.style.left = '5px' // `${-coverDisplayWidth}px`
    preview.style.position = 'absolute'
    preview.style.bottom = '5px' // `${(Math.ceil(expectedHeight/4)) - expectedHeight}px`
    preview.style.outlineWidth = '5px'
    preview.style.outlineStyle = 'none'
    const aspectDelta = preview.naturalWidth / coverDisplayWidth
    const expectedHeight = preview.naturalHeight * aspectDelta
    // coverCont.style.maxHeight=`${Math.ceil(expectedHeight)}px`
    // coverCont.style.minHeight=`${Math.ceil(expectedHeight)}px`
    coverCont.style.height = `${Math.ceil(expectedHeight)}px`
    coverCont.appendChild(preview)
  })
  // preview.style.zIndex=1

  coverCont.style.display = 'flex'
  cover.style.alignSelf = 'center'
  cover.style.outlineWidth = '5px'
  cover.style.outlineStyle = 'none'
  cover.style.width = '100%'
  info.style.display = 'flex'
  info.style.minHeight = '3em'
  info.style.alignItems = 'center'

  cont.style.marginLeft = '5px'
  cont.appendChild(info)
  cont.appendChild(coverCont)
  cont.appendChild(controls)
  cont.style.display = 'flex'
  cont.style.flexDirection = 'column'
  cont.style.width = `${coverDisplayWidth}px`

  next.innerText = 'Next'
  copy.innerText = 'Copy'
  const uploadBtn = copy.cloneNode() as typeof copy
  uploadBtn.innerText = 'Upload'
  controls.appendChild(uploadBtn)

  let copyTimeout1: NodeJS.Timeout
  let copyTimeout2: NodeJS.Timeout
  function tryUpload() {
    if (serialData.serialLevel === SerialDataLevel.COVER
    && serialData.blob && serialData.mangadexId !== undefined) {
      const imageTypeMatch = serialData.blob.type.match(/^image\/(.+)/)
      const volumeMatch = serialData.title.match(/(?:\((\d+(?:\.\d+)?)\)| (\d+(?:\.\d+)?))$/)
      let volume: string | undefined
      if (volumeMatch) {
        volume = volumeMatch[1]
      }
      if (volume === undefined) volume = ''
      if (imageTypeMatch !== null && volume !== null) {
        const imageType = imageTypeMatch[1]
        listUploadBtn(serialData.mangadexId ,volume ,serialData.blob ,`${serialData.title}.${imageType}`)
      }
    }
  }
  function tryCopy() {
    if (!copy.disabled) {
      cover.style.outlineStyle = 'double'
      cover.style.outlineColor = 'yellow'
      if (preview) {
        preview.style.outlineStyle = 'double'
        preview.style.outlineColor = 'yellow'
      }
      cover.style.zIndex = '1'
      copyToClipboard(getCoverUrlFromRID(serialData.rid))
      copy.innerText = 'Coppied!'
      clearTimeout(copyTimeout1)
      clearTimeout(copyTimeout2)
      copyTimeout1 = setTimeout(() => {
        copy.innerText = 'Copy'
      } ,2000)
    }
    else {
      cover.style.outlineStyle = 'solid'
      if (preview) {
        preview.style.outlineStyle = 'solid'
        preview.style.outlineColor = 'red'
      }

      cover.style.outlineColor = 'red'
      copy.innerText = 'Cannot Copy!'
    }
    copyTimeout2 = setTimeout(() => {
      cover.style.outlineStyle = 'none'
      if (preview) {
        preview.style.outlineStyle = 'none'
      }
      cover.style.zIndex = '0'
    } ,500)
  }
  copy.onclick = () => {
    tryCopy()
  }
  cover.onclick = () => {
    tryCopy()
  }
  uploadBtn.onclick = () => {
    tryUpload()
  }

  let lastBlobUri: string | undefined

  function revokeLastUri() {
    if (lastBlobUri !== undefined) {
      URL.revokeObjectURL(lastBlobUri)
      lastBlobUri = undefined
    }
  }
  cover.onload = revokeLastUri
  cover.onerror = revokeLastUri

  function updateCover(serialData: SerialDataCover) {
    let url = getCoverUrlFromRID(serialData.rid)
    revokeLastUri()
    if (serialData.blob) {
      url = URL.createObjectURL(serialData.blob)
      lastBlobUri = url
    }
    cover.src = url
  }

  function enable() {
    next.disabled = false
    copy.disabled = false
    uploadBtn.disabled = false
    next.innerText = 'Wrong Image?'
    copy.innerText = 'Copy'
  }
  function loading() {
    cover.src = LOADING_IMG
    next.disabled = true
    copy.disabled = true
    uploadBtn.disabled = true
    next.innerText = 'Looking for Image'
  }
  function fail() {
    cover.src = ERROR_IMG
    next.disabled = false
    copy.disabled = true
    uploadBtn.disabled = true
    next.innerText = 'Not Found! Retry?'
    serialData.rid = getRidFromId(serialData.id)
    serialData.triesLeft = serialData.maxTries
    serialData.ready = false
  }

  loading()

  title.innerText = serialData.title
  serialData.coverPromise.then((/* same serialData Object */) => {
    updateCover(serialData as SerialDataCover)
    title.innerText = serialData.title
    enable()
  }).catch(fail)

  next.onclick = () => {
    loading()
    fetchCoverImageFromSerialData(serialData).then((/* same serialData Object */) => {
      enable()
      updateCover(serialData as SerialDataCover)
    }).catch(fail)
  }
  return cont
}

function createInterface(serialData: SerialData[]): HTMLDivElement {
  const faces = serialData.map(e => createSingleInterface(e))
  const cont = document.createElement('div')
  const copyAll = document.createElement('button')
  copyAll.style.display = 'flex'
  copyAll.style.flexGrow = '1'
  copyAll.style.flexDirection = 'column'
  copyAll.style.width = '100%'
  copyAll.style.outlineStyle = 'none'
  copyAll.style.outlineWidth = '5px'
  copyAll.style.outlineColor = 'yellow'
  copyAll.innerText = 'Copy All Covers'
  copyAll.style.fontSize = '3em'
  let copyTimeout1: NodeJS.Timeout
  function tryCopy() {
    if (!copyAll.disabled) {
      copyAll.style.outlineStyle = 'double'
      copyAll.style.zIndex = '1'
      copyAll.innerText = 'Coppied All Covers!'
      const urls = serialData.reduce((a ,e) => {
        if (e.ready) {
          return `${a}\n${getCoverUrlFromRID(e.rid)}`.trim()
        }
        return a
      } ,'')
      copyToClipboard(urls)
      clearTimeout(copyTimeout1)
      copyTimeout1 = setTimeout(() => {
        copyAll.style.outlineStyle = 'none'
        copyAll.innerText = 'Copy All Covers'
        copyAll.style.zIndex = '0'
      } ,2000)
    }
  }

  cont.style.marginLeft = '200px'
  cont.style.display = 'flex'
  cont.style.flexWrap = 'wrap'
  copyAll.onclick = tryCopy
  cont.appendChild(copyAll)
  faces.forEach((e) => {
    cont.appendChild(e)
  })
  document.body.appendChild(cont)
  return cont
}

// Do it

if (window.location.href.match(/^(?:https?:\/\/)?mangadex\.org\/title\/\d+\/[^\/]+\/covers(\/.*)?/)) {
  getBW_CoversFromMD()
}
