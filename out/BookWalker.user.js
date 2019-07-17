// ==UserScript==
// @name BookWalker Cover Page Extractor
// @namespace https://github.com/Christopher-McGinnis
// @description Click on preview image for this page or another volume. Automatically copies the cover image url to clipboard (and prints it in the terminal)
// @include    /^(?:https?:\/\/)?bookwalker\.jp\/de[a-zA-Z0-9]+-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]+(\/.*)?/
// @include    /^(?:https?:\/\/)?bookwalker\.jp\/series\/\d+(\/.*)?/
// @include    /^(?:https?:\/\/)?mangadex\.org\/title\/\d+(\/.*)?/
// @version  0.1.30
// @grant unsafeWindow
// @grant GM_xmlhttpRequest
// ==/UserScript==
// @require https://gitcdn.xyz/repo/nodeca/pica/5.0.0/dist/pica.min.js
// TODO: MD Sanity Check. Ensure BW link is to a Manga (as opposed to an LN)

'use strict'

const ERROR_IMG = 'https://i.postimg.cc/4NbKcsP6/404.gif'
const LOADING_IMG = 'https://i.redd.it/ounq1mw5kdxy.gif'
/*
  Utilities
*/
function copyToClipboard(a) {
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
function isUserscript() {
  if (window.unsafeWindow == null) {
    return false
  }
  return true
}
// taken from https://stackoverflow.com/a/20488304
function toAsciiEquivilent(str) {
  return str.replace(/[\uff01-\uff5e]/g ,ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}
// Ignore CORS
function fetchNoCORS(url) {
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
        if (response.statusText && response.statusText.length > 0) return err(Error(response.statusText))
        return err(Error(response.status.toString()))
      }
    })
  })
}
function fetchDomNoCORS(url) {
  return fetchNoCORS(url).then((r) => {
    if (r.status >= 200 && r.status <= 299) {
      const parser = new DOMParser()
      const htmlDocument = parser.parseFromString(r.responseText ,'text/html')
      return Promise.resolve(htmlDocument.documentElement)
    }
    if (r.statusText && r.statusText.length !== 0) return Promise.reject(Error(r.statusText))
    return Promise.reject(Error(r.status.toString()))
  })
}
function fetchDom(url) {
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
async function isValidAspectRatio(serialData) {
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
function getImageBlobIgnoreCORS(url) {
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
function getCoverUrlFromRID(rid) {
  return `https://c.bookwalker.jp/coverImage_${rid}.jpg`
}
function getVolumePageFromSeriesPage(doc) {
  const volumePage = doc.querySelector('.overview-synopsis-hdg > a')
  if (volumePage) {
    return fetchDom(volumePage.href)
  }
  return Promise.reject(Error('No volume pages found'))
}
function getCoverImgElmsFromVolumePage(doc) {
  const volumeContainerElms = doc.querySelectorAll('.detail-section.series .cmnShelf-list')
  const imgs = []
  volumeContainerElms.forEach((list) => {
    list.querySelectorAll('.cmnShelf-item').forEach((e) => {
      const img = e.querySelector('.cmnShelf-image > img')
      if (img) {
        imgs.push(img)
      }
    })
  })
  return imgs
}
function getIdFromImg(img) {
  return img.src.split('/')[3]
}
async function toImgPromiseIgnoreCORS(uri) {
  const img = document.createElement('img')
  img.crossOrigin = 'anonymous'
  let src
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
function searchBookWalkerForMangaTitle(manga) {
  // cat 2 = manga
  return fetchDomNoCORS(`https://bookwalker.jp/search/?qcat=2&word=${encodeURIComponent(manga)}`)
    .catch((e) => {
      e.message = `Bookwalker search for '${manga}' failed: ${e.message}`
      throw e
    })
    .then(doc => Object.values(doc.querySelectorAll('.bookItem'))
      .map(e => e.querySelector('[class*="bookItemHover"]'))
      .filter((e) => {
        if (e) return e.title.includes(manga)
        return false
      }))
    .then((e) => {
      if (e.length === 1) {
        const { url } = e[0].dataset
        if (url) return Promise.resolve(url)
        return Promise.reject(Error('Manga Match found but failed to find Seriese/Volume URL'))
      }
      return Promise.reject(Error('Multiple Matching Manga Found'))
    })
}
function toImgPromise(uri) {
  let img = document.createElement('img')
  img.crossOrigin = 'anonymous'
  let src
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
function getCoverFromRid(rid) {
  const url = getCoverUrlFromRID(rid)
  return getImageBlobIgnoreCORS(url)
    .then(b => ({
      img: toImgPromiseIgnoreCORS(b) ,blob: b
    }))
}
function getRidFromId(id) {
  return parseInt(id.toString().split('').reverse().join(''))
}
function serializeImg(img) {
  const id = getIdFromImg(img)
  const previewBlob = getImageBlobIgnoreCORS(img.src)
  const serialData = {
    id
    ,serialLevel: 0 /* BASE */
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
  return serialData
}
function getSerialDataFromSeriesPage(doc) {
  return getVolumePageFromSeriesPage(doc)
    .then(doc => getCoverImgElmsFromVolumePage(doc))
    .then(imgs => imgs.map((img) => {
      const serial = serializeImg(img)
      return serial
    }))
}
function getSerialDataFromBookwalker(url ,doc) {
  if (url.match(/^(?:https?:\/\/)?bookwalker\.jp\/series\/\d+(\/.*)?/)) {
    return getSerialDataFromSeriesPage(doc)
  }
  if (url.match(/^(?:https?:\/\/)?bookwalker\.jp\/de[a-zA-Z0-9]+-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]+(\/.*)?/)) {
    return Promise.resolve(getCoverImgElmsFromVolumePage(doc).map(img => serializeImg(img)))
  }
  return Promise.reject(Error(`Bookwalker URL expected. Got '${url}'`))
}
function fetchCoverImageFromSerialData(serialDataOrig) {
  let serialData
  if (serialDataOrig.serialLevel === 2 /* COVER */) {
    if (serialDataOrig.fetchLocked === true) {
      return Promise.reject(Error('fetchLocked'))
    }
    serialData = serialDataOrig
  }
  else {
    serialDataOrig.ready = false
    serialDataOrig.fetchLocked = true
    serialDataOrig.fetchLockedId = 0
    if (serialDataOrig.serialLevel === 0 /* BASE */) {
      serialDataOrig.maxTries = 10
    }
    serialDataOrig.triesLeft = serialDataOrig.maxTries
    serialData = serialDataOrig
    serialData.serialLevel = 2 /* COVER */
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
  function loopRun(fn) {
    return fn()
      .catch((e) => {
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
function getSerieseDetailsFromMD(mangadexId) {
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
function filterBwLink(url) {
  const series = url.match(/^((?:https?:\/\/)?bookwalker\.jp\/series\/\d+)(\/.*)?/)
  if (series) return series[1]
  const volume = url.match(/^((?:https?:\/\/)?bookwalker\.jp\/de[a-zA-Z0-9]+-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]+)(\/.*)?/)
  if (volume) return volume[1]
  return undefined
}
function japaneseConfidenceRating(str) {
  // Regex for matching Hirgana or Katakana (*)
  if (str.match(/[ぁ-んァ-ンｧ-ﾝﾞﾟ]/)) return 1
  // Regex for matching ALL Japanese common & uncommon Kanji (4e00 – 9fcf) ~ The Big Kahuna!
  if (str.match(/[一-龯]/)) return 0.8
  return 0
  // str.match(/[Ａ - ｚ]/)
  // Regex for matching Hirgana
  // str.match(/[ぁ-ん]/)
  // Regex for matching full-width Katakana (zenkaku 全角)
  // str.match(/[ァ-ン]/)
  // Regex for matching half-width Katakana (hankaku 半角)
  // str.match(/[ｧ-ﾝﾞﾟ]/)
  // Regex for matching full-width Numbers (zenkaku 全角)
  // str.match(/[０-９]/)
  // str.match(/[Ａ - ｚ]/)
  // str.match(/[ぁ - ゞ]/)
  // str.match(/[ァ - ヶ]/)
  // str.match(/[ｦ - ﾟ]/)
}
function getJapaneseTitlesFromMD() {
  const cont = document.querySelector('#content')
  if (cont) {
    return Object.values(cont.querySelectorAll('.fa-book')).map((e) => {
      // Parent has to exist. We are a child of cont after all
      if (e.parentElement.textContent) {
        const trimed = e.parentElement.textContent.trim()
        if (trimed.length > 0) return trimed
      }
      return undefined
    })
      .filter(e => e !== undefined) // Definitly defined now
      .sort((a ,b) => {
        const conf = japaneseConfidenceRating(b) - japaneseConfidenceRating(a)
        if (conf !== 0) return conf
        return b.length - a.length
      })
  }
  throw Error('Could not find MD Titles')
}
function getBW_CoversFromMD() {
  const id = getTitleIdFromMD()
  getSerieseDetailsFromMD(id)
    .then((e) => {
      if (e.manga.links) {
        const { bw } = e.manga.links
        if (bw) {
          const usableBw = filterBwLink(`https://bookwalker.jp/${bw}`)
          if (usableBw) return Promise.resolve(usableBw)
          return Promise.reject(Error(`Unusable Bookwalker Url Recieved! '${bw}'`))
        }
      }
      if (e.manga.lang_flag !== 'jp') {
        return Promise.reject(Error(`Bookwalker is for Japanese Manga Only. This is '${e.manga.lang_name}'`))
      }
      // return Promise.reject(Error('Bookwalker Url Not Found!'))
      const titles = getJapaneseTitlesFromMD()
      // FIXME do not just assume 1st result is correct
      if (titles && titles[0]) {
        return searchBookWalkerForMangaTitle(titles[0]).then((searchRes) => {
          const usableBw = filterBwLink(searchRes)
          if (usableBw) return Promise.resolve(usableBw)
          return Promise.reject(Error(`Search Gave Unusable Bookwalker Url! '${searchRes}'`))
        })
      }
      return Promise.reject(Error('Failed to find Bookwalker URL!'))
    })
    .then(bw => fetchDom(bw)
      .then(dom => getSerialDataFromBookwalker(bw ,dom)))
    .then((serialData) => {
      serialData.forEach((e) => {
        e.mangadexId = id
      })
      return serialData
    })
    .then((serialData) => {
      createInterface(serialData)
      function loopRun(fn) {
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
function listUploadBtn(mangadexId ,volume ,blob ,filename) {
  const uploadType = 0 /* BLOB */
  const form = document.querySelector('#manga_cover_upload_form')
  if (!form) {
    throw Error('No Cover Upload Form Found')
  }
  const fileNameField = form.querySelector("input[name='old_file']")
  if (!fileNameField) {
    throw Error('No Cover File Name Field Found')
  }
  fileNameField.value = filename
  const volumeNameField = form.querySelector("input[name='volume']")
  if (!volumeNameField) {
    throw Error('No Cover Volume Field Found')
  }
  if (volume !== '') volumeNameField.value = volume
  const uploadBtn = form.querySelector('#upload_cover_button')
  if (!uploadBtn) {
    throw Error('No Submit Button Found')
  }
  const fileField = form.querySelector("input[type='file']")
  if (!fileField) {
    throw Error('No Cover File Field Found')
  }
  const dt = new DataTransfer() // specs compliant (as of March 2018 only Chrome)
  dt.items.add(new File([blob] ,filename))
  fileField.files = dt.files
  const showDiagBtn = document.querySelector('a[data-target="#manga_cover_upload_modal"]')
  if (showDiagBtn) showDiagBtn.click()
  return undefined
}
function blobPost(mangadexId ,volume ,blob ,filename) {
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
function createSingleInterface(serialData) {
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
  let preview
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
  const uploadBtn = copy.cloneNode()
  uploadBtn.innerText = 'Upload'
  controls.appendChild(uploadBtn)
  let copyTimeout1
  let copyTimeout2
  function tryUpload() {
    if (serialData.serialLevel === 2 /* COVER */
            && serialData.blob && serialData.mangadexId !== undefined) {
      const imageTypeMatch = serialData.blob.type.match(/^image\/(.+)/)
      let volumeMatch = toAsciiEquivilent(serialData.title).match(/\((\d+(?:\.\d+)?)\)$/)
      if (!volumeMatch) volumeMatch = toAsciiEquivilent(serialData.title).match(/\s(\d+(?:\.\d+)?)$/)
      let volume
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
  let lastBlobUri
  function revokeLastUri() {
    if (lastBlobUri !== undefined) {
      URL.revokeObjectURL(lastBlobUri)
      lastBlobUri = undefined
    }
  }
  cover.onload = revokeLastUri
  cover.onerror = revokeLastUri
  function updateCover(serialData) {
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
    updateCover(serialData)
    title.innerText = serialData.title
    enable()
  }).catch(fail)
  next.onclick = () => {
    loading()
    fetchCoverImageFromSerialData(serialData).then((/* same serialData Object */) => {
      enable()
      updateCover(serialData)
    }).catch(fail)
  }
  return cont
}
function createInterface(serialData) {
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
  let copyTimeout1
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
  // cont.style.marginLeft = '200px'
  cont.style.marginLeft = '35px'
  cont.style.marginRight = '35px'
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
