// ==UserScript==
// @name BookWalker Cover Page Extractor
// @namespace https://github.com/Christopher-McGinnis
// @description Click on preview image for this page or another volume. Automatically copies the cover image url to clipboard (and prints it in the terminal)
// @include    /^(?:https?:\/\/)?bookwalker\.jp\/de[a-zA-Z0-9]+-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]+(\/.*)?/
// @include    /^(?:https?:\/\/)?bookwalker\.jp\/series\/\d+(\/.*)?/
// @version  0.1.18
// @grant unsafeWindow
// @grant GM_xmlhttpRequest
// @require https://gitcdn.xyz/repo/nodeca/pica/5.0.0/dist/pica.min.js
// ==/UserScript==

'use strict'

if (!(window.location.href.match(/^(?:https?:\/\/)?bookwalker\.jp\/de[a-zA-Z0-9]+-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]+/)
    || window.location.href.match(/^(?:https?:\/\/)?bookwalker\.jp\/series\/\d+/))) {
  alert('Sorry, BookWalker Cover Extractor only works on Bookwalker series.')
}
const serializedCovers = {}
const volumeCovers = []
const ERROR_IMG = 'https://i.postimg.cc/4NbKcsP6/404.gif'
const LOADING_IMG = 'https://i.redd.it/ounq1mw5kdxy.gif'
function copyToClipboard(a) {
  const b = document.createElement('textarea')
  const c = document.getSelection()
  b.textContent = a
  document.body.appendChild(b)
  c.removeAllRanges()
  b.select()
  document.execCommand('copy')
  c.removeAllRanges()
  document.body.removeChild(b)
  console.log(`Copied cover art '${a}'`)
}
function isUserscript() {
  if (window.unsafeWindow == null) {
    return false
  }
  return true
}
function isValidAspectRatio(coverData ,serialData) {
  // Reject failed images
  if (coverData.width == 0 || coverData.height == 0) {
    console.log('0 size image')
    return false
  }
  /* Was Just a sanity check. No longer needed
    let previewAspect = serialData.previewWidth / serialData.previewHeight
    let coverAspect = coverData.width / coverData.height
    let aspectDiff = previewAspect / coverAspect
    // Accept perfect scales
    if ( aspectDiff == 1 ) {
      return true
    }

    if ( aspectDiff > 1.5 || aspectDiff < 0.5 ) {
      console.log(`Rejecting aspect ${previewAspect} / ${coverAspect} = ${aspectDiff}`)
      return false
    } */
  const widthDelta = serialData.previewWidth / coverData.width
  const convertW = coverData.width * widthDelta
  const convertH = coverData.height * widthDelta
  if (serialData.previewHeight > convertH + 1 || serialData.previewHeight < convertH - 1) {
    console.log(`Rejecting height preview: ${serialData.previewHeight} cover: ${coverData.height} = conv: ${convertH}`)
    return false
  }
  return true
}
function canvasToBlob(canvas) {
  return new Promise((ret ,err) => {
    canvas.toBlob(blob => ret(blob))
  })
}
// FIXME: Only calculate pixels we use
/**
 * Hermite resize - fast image resize/resample using Hermite filter. 1 cpu version!
 */
function resample_single(uri ,width ,height ,resize_canvas_bool) {
  const imgPromise = toImgPromise(uri)
  const canvas = document.createElement('canvas')
  return imgPromise.then((orig_img) => {
    canvas.width = orig_img.naturalWidth
    canvas.height = orig_img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(orig_img ,0 ,0)
    const width_source = orig_img.naturalWidth
    const height_source = orig_img.naturalHeight
    width = Math.round(width)
    height = Math.round(height)
    const ratio_w = width_source / width
    const ratio_h = height_source / height
    const ratio_w_half = Math.ceil(ratio_w / 2)
    const ratio_h_half = Math.ceil(ratio_h / 2)
    // let ctx = canvas.getContext("2d");
    const img = ctx.getImageData(0 ,0 ,width_source ,height_source)
    const img2 = ctx.createImageData(width ,height)
    const { data } = img
    const data2 = img2.data
    console.log('RESIZING')
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const x2 = (i + j * width) * 4
        let weight = 0
        let weights = 0
        let weights_alpha = 0
        let gx_r = 0
        let gx_g = 0
        let gx_b = 0
        let gx_a = 0
        const center_y = (j + 0.5) * ratio_h
        const yy_start = Math.floor(j * ratio_h)
        const yy_stop = Math.ceil((j + 1) * ratio_h)
        for (let yy = yy_start; yy < yy_stop; yy++) {
          const dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half
          const center_x = (i + 0.5) * ratio_w
          const w0 = dy * dy // pre-calc part of w
          const xx_start = Math.floor(i * ratio_w)
          const xx_stop = Math.ceil((i + 1) * ratio_w)
          for (let xx = xx_start; xx < xx_stop; xx++) {
            const dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half
            const w = Math.sqrt(w0 + dx * dx)
            if (w >= 1) {
              // pixel too far
              continue
            }
            // hermite filter
            weight = 2 * w * w * w - 3 * w * w + 1
            const pos_x = 4 * (xx + yy * width_source)
            // alpha
            gx_a += weight * data[pos_x + 3]
            weights_alpha += weight
            // colors
            if (data[pos_x + 3] < 255) weight = weight * data[pos_x + 3] / 250
            gx_r += weight * data[pos_x]
            gx_g += weight * data[pos_x + 1]
            gx_b += weight * data[pos_x + 2]
            weights += weight
          }
        }
        data2[x2] = gx_r / weights
        data2[x2 + 1] = gx_g / weights
        data2[x2 + 2] = gx_b / weights
        data2[x2 + 3] = gx_a / weights_alpha
      }
    }
    console.log('RESIZE DONE')
    // clear and resize canvas
    if (resize_canvas_bool === true) {
      canvas.width = width
      canvas.height = height
    }
    else {
      ctx.clearRect(0 ,0 ,width_source ,height_source)
    }
    // draw
    ctx.putImageData(img2 ,0 ,0)
    return canvasToBlob(canvas)
    // return canvas.toDataURL("image/png")
  })
}
// Image comparison
// Must bypass cross origin request.
// Only possible via userscript
function getRequest(data) {
  return new Promise((ret ,err) => {
    GM_xmlhttpRequest({
      onerror: err
      ,ontimeout: err
      ,onload: (response) => {
        ret(response)
      }
      ,...data
    })
  })
}
function getImageBlob(url) {
  return new Promise((ret ,err) => {
    GM_xmlhttpRequest({
      method: 'GET'
      ,url
      ,responseType: 'blob'
      ,onerror: err
      ,ontimeout: err
      ,onload: (response) => {
        if (response.status == 200) {
          return ret(response.response)
        }
        return err(response)
      }
    })
  })
}
function toImgPromise(uri) {
  const img = document.createElement('img')
  img.crossOrigin = 'Anonymous'
  let src
  if (uri instanceof Blob) {
    src = URL.createObjectURL(uri)
  }
  else if (typeof (uri) === 'string') {
    src = uri
  }
  else {
    return Promise.reject(`Invalid URI '${uri}'`)
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
function getImageData(url) {
  const img = document.createElement('img')
  const canvas = document.createElement('canvas')
  img.crossOrigin = 'Anonymous'
  return new Promise((ret ,err) => {
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img ,0 ,0)
      ret(ctx.getImageData(0 ,0 ,img.width ,img.height))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = err
    if (url instanceof Blob) {
      img.src = URL.createObjectURL(url)
    }
    else {
      getImageBlob(url).then((blob) => {
        img.src = URL.createObjectURL(blob)
      }).catch(err)
    }
  })
}
function imageCompare(firstImage ,secondImage ,comparison) {
  console.log('Compare Checking Img1')
  return new Promise((ret ,err) => getImageData(firstImage).then((img1) => {
    console.log('Compare Checking Img 2')
    return getImageData(secondImage).then((img2) => {
      if (img1.width !== img2.width || img1.height != img2.height) {
        return err(NaN)
      }
      let diff = 0
      function updateDiff(i) {
        diff += Math.abs(img1.data[4 * i + 0] - img2.data[4 * i + 0]) / 255
        diff += Math.abs(img1.data[4 * i + 1] - img2.data[4 * i + 1]) / 255
        diff += Math.abs(img1.data[4 * i + 2] - img2.data[4 * i + 2]) / 255
      }
      const pixelCount = img1.data.length / 4
      // if (comparison.match == "all") {
      let regionSize = pixelCount / comparison.regionsRequired
      let { regionsRequired } = comparison
      if (regionsRequired == null) {
        regionsRequired = pixelCount
      }
      if (regionSize < 1) {
        regionSize = pixelCount
      }
      const regionCount = Math.floor(pixelCount / regionSize)
      if (regionCount < regionsRequired) {
        regionsRequired = regionCount
      }
      console.log('Compare Checking Pixel Array')
      let c_diff
      for (let i = 0; i < regionCount; i++) {
        updateDiff(Math.floor(i * regionSize))
        if (i >= regionsRequired) {
          c_diff = diff / (i * 3)
          if (c_diff > comparison.maxAcceptableDiff) {
            console.log('Compare Done Checking Bad')
            return err(c_diff)
          }
        }
        else if (i >= regionCount - 1) {
          c_diff = diff / (i * 3)
          console.log('Compare Done Checking Good')
          return ret(c_diff)
        }
      }
      // }
      return err('Comparison Code Failed to return within loop. ')
      // ret(diff / (img1.width * img1.height * 3));
    })
  }))
}
function ridAsCoverUrl(rid) {
  return `https://c.bookwalker.jp/coverImage_${rid}.jpg`
}
// Must bypass cross origin request. Could be done with userscript
function tryFetchImageRequest(rid) {
  const url = ridAsCoverUrl(rid)
  const p = getImageBlob(url)
  return p.then((blob) => {
    console.log(`RID '${rid}' URL '${url}' Blob Promise '${p}' Blob '${blob}'`)
    return {
      url ,blob
    }
  })
}
function tryFetchImage(serialData ,maxTries) {
  if (serialData.fetchLocked === true) {
    return new Promise((ret ,err) => {
      err('fetchLocked')
    })
  }
  if (serialData.fetchLockedId == null) {
    serialData.fetchLockedId = 0
  }
  serialData.fetchLocked = true
  serialData.fetchLockedId++
  const ourLock = serialData.fetchLockedId
  if (serialData.triesLeft == null) {
    serialData.triesLeft = maxTries
  }
  else {
    maxTries = serialData.triesLeft
  }
  if (!serialData.rid) {
    throw Error('SerialData.rid must be defined here')
  }
  if (!serialData.triesLeft) {
    throw Error('SerialData.triesLeft must be defined here')
  }
  let { rid } = serialData
  if (serialData.ready) {
    serialData.ready = false
    rid--
  }
  const promise = new Promise((ret ,err) => {
    function retryLoop(rid) {
      function errCheck(errRet) {
        if (serialData.triesLeft <= 0) {
          serialData.fetchLocked = false
          serialData.rid = rid
          return err(errRet)
        }
        return retryLoop(rid - 1)
      }
      let p
      if (isUserscript()) {
        p = tryFetchImageRequest(rid)
      }
      else {
        p = tryFetchImageViaElement(rid)
      }
      serialData.triesLeft--
      p.then((resData) => {
        // Ensure we are still the active loader
        // if (serialData.ready == false && ourLock == serialData.fetchLockedId) {
        // }
        const checks = []
        // Ensure Valid Aspect Ratio
        if (resData.img && !isValidAspectRatio({
          width: resData.img.naturalWidth ,height: resData.img.naturalHeight
        } ,serialData)) {
          checks.push(Promise.reject('Invalid Aspect Ratio'))
        }
        let imgDiffPerc = 0
        // Try ensure same image.
        if (resData.blob != null) {
          serialData.blob = resData.blob
          const blobUrl = URL.createObjectURL(resData.blob)
          console.log(`LOOKING AT BLOB: ${resData}`)
          checks.push(toImgPromise(resData.blob).then((img) => {
            if (!isValidAspectRatio({
              width: img.naturalWidth ,height: img.naturalHeight
            } ,serialData)) {
              console.log(`Reject 2 w: ${img.naturalWidth} h: ${img.naturalHeight}, pw: '${serialData.previewWidth}' ph: '${serialData.previewHeight}'`)
              return Promise.reject('Invalid Aspect Ratio')
            }
            // return resample_single(blobUrl, serialData.previewWidth, serialData.previewHeight, true).then((resizedBlob) => {
            // /* Should be Faster, but... doesn't work atm
            const canvasResizer = document.createElement('canvas')
            const imgResizer = document.createElement('img')
            imgResizer.src = blobUrl
            canvasResizer.width = serialData.previewWidth
            canvasResizer.height = serialData.previewHeight
            return window.pica().resize(imgResizer ,canvasResizer ,{ quality: 3 }).then(canvasResizer => canvasToBlob(canvasResizer)).then(resizedBlob => imageCompare(resizedBlob ,serialData.preview ,{
              match: 'all'
              ,regionsRequired: null
              ,minRegionsReject: 50000
              ,maxAcceptableDiff: 0.10
              ,regionRange: [1 ,1]
            }).then((diffPerc) => {
              imgDiffPerc = diffPerc
            }))
          }).then((ret) => {
            URL.revokeObjectURL(blobUrl)
            return ret
          }).catch((errRet) => {
            URL.revokeObjectURL(blobUrl)
            console.log('Reject 3')
            console.log(errRet)
            return Promise.reject(errRet)
          }))
        }
        Promise.all(checks).then(() => {
          // serialData.blob = resData.blob
          serialData.diff = imgDiffPerc
          serialData.ready = true
          serialData.url = ridAsCoverUrl(rid)
          serialData.rid = rid
          serialData.fetchLocked = false
          return ret(serialData)
        }).catch(errCheck)
      }).catch(errCheck)
    }
    retryLoop(rid)
  })
  serialData.promise = promise
  return promise
}
function tryFetchImageViaElement(rid) {
  const url = ridAsCoverUrl(rid)
  const img = document.createElement('img')
  return new Promise((ret ,err) => {
    img.addEventListener('load' ,() => {
      ret({
        img ,url
      })
    })
    img.addEventListener('error' ,() => {
      err()
    })
    img.src = url
  })
}
function createSingleInterface(serialData) {
  const cont = document.createElement('div')
  const info = document.createElement('div')
  const title = document.createElement('h4')
  const preview = document.createElement('img')
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
  const aspectDelta = serialData.previewWidth / coverDisplayWidth
  const expectedHeight = serialData.previewHeight * aspectDelta
  // coverCont.style.maxHeight=`${Math.ceil(expectedHeight)}px`
  // coverCont.style.minHeight=`${Math.ceil(expectedHeight)}px`
  coverCont.style.height = `${Math.ceil(expectedHeight)}px`
  // coverCont.style.minHeight=`${Math.floor(expectedHeight)}px`
  preview.width = Math.ceil(coverDisplayWidth / 4)
  preview.style.left = '5px' // `${-coverDisplayWidth}px`
  preview.style.position = 'absolute'
  preview.style.bottom = '5px' // `${(Math.ceil(expectedHeight/4)) - expectedHeight}px`
  // preview.style.zIndex=1
  coverCont.appendChild(cover)
  coverCont.appendChild(preview)
  coverCont.style.display = 'flex'
  cover.style.alignSelf = 'center'
  cover.style.outlineWidth = '5px'
  cover.style.outlineStyle = 'none'
  preview.style.outlineWidth = '5px'
  preview.style.outlineStyle = 'none'
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
  let copyTimeout1
  let copyTimeout2
  function tryCopy() {
    if (!copy.disabled) {
      cover.style.outlineStyle = 'double'
      preview.style.outlineStyle = 'double'
      cover.style.outlineColor = 'yellow'
      preview.style.outlineColor = 'yellow'
      cover.style.zIndex = '1'
      copyToClipboard(serialData.url)
      copy.innerText = 'Coppied!'
      clearTimeout(copyTimeout1)
      clearTimeout(copyTimeout2)
      copyTimeout1 = setTimeout(() => {
        copy.innerText = 'Copy'
      } ,2000)
    }
    else {
      cover.style.outlineStyle = 'solid'
      preview.style.outlineStyle = 'solid'
      cover.style.outlineColor = 'red'
      preview.style.outlineColor = 'red'
      copy.innerText = 'Cannot Copy!'
    }
    copyTimeout2 = setTimeout(() => {
      cover.style.outlineStyle = 'none'
      preview.style.outlineStyle = 'none'
      cover.style.zIndex = '0'
    } ,500)
  }
  copy.onclick = () => {
    tryCopy()
  }
  cover.onclick = () => {
    tryCopy()
  }
  let lastBlobUri
  cover.onload = revokeLastUri
  cover.onerror = revokeLastUri
  function revokeLastUri() {
    if (lastBlobUri != null) {
      lastBlobUri
      URL.revokeObjectURL(lastBlobUri)
      lastBlobUri = null
    }
  }
  function updateCover(serialData) {
    let { url } = serialData
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
    next.innerText = 'Wrong Image?'
    copy.innerText = 'Copy'
  }
  function loading() {
    cover.src = LOADING_IMG
    next.disabled = true
    copy.disabled = true
    next.innerText = 'Looking for Image'
  }
  function fail() {
    cover.src = ERROR_IMG
    next.disabled = false
    copy.disabled = true
    next.innerText = 'Not Found! Retry?'
    serialData.rid = idToRid(serialData.id)
    serialData.triesLeft = null
  }
  preview.src = serialData.preview
  loading()
  title.innerText = serialData.volumeTitle
  serialData.promise.then((/* same serialData Object */) => {
    updateCover(serialData)
    title.innerText = serialData.volumeTitle
    enable()
  }).catch(fail)
  next.onclick = () => {
    loading()
    tryFetchImage(serialData).then((/* same serialData Object */) => {
      enable()
      updateCover(serialData)
    }).catch(fail)
  }
  return cont
}
function createInterface() {
  const faces = volumeCovers.map(e => createSingleInterface(e))
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
      const urls = volumeCovers.reduce((a ,e) => {
        if (e.ready) {
          return `${a}\n${e.url}`.trim()
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
function idToRid(id) {
  return parseInt(id.toString().split('').reverse().join(''))
}
function prepareSerialForElement(e ,volumeTitle) {
  const img = e.querySelector('img')
  const id = img.src.split('/')[3]
  const rid = idToRid(id)
  let serialData = serializedCovers[id]
  if (serialData == null) {
    serialData = {}
    serializedCovers[id] = serialData
  }
  if (serialData.volumeTitle == null && volumeTitle != null) {
    volumeCovers.push(serialData)
    serialData.volumeTitle = volumeTitle
  }
  if (serialData.promise != null) {
    return serialData
  }
  serialData.promise = new Promise((ret ,err) => {
    serialData.retPromise = ret
    serialData.errPromise = err
  })
  serialData.ready = false
  serialData.id = id
  serialData.preview = img.src
  serialData.rid = rid
  serialData.previewWidth = img.naturalWidth
  serialData.previewHeight = img.naturalHeight
  serialData.promiseLock = false
  return serialData
}
function deduceCoverImageFromElement(e ,volumeTitle) {
  const img = e.querySelector('img')
  const id = img.src.split('/')[3]
  const rid = parseInt(id.toString().split('').reverse().join(''))
  const serialData = prepareSerialForElement(e ,volumeTitle)
  if (serialData.promiseLock == true) {
    return serialData.promise
  }
  serialData.promiseLock = true
  const realPromise = tryFetchImage(serializedCovers[id])
  realPromise.then((e) => {
    serialData.retPromise(e)
  })
  realPromise.catch((e) => {
    serialData.errPromise(e)
  })
  return serialData.promise
}
function BookWalkerPrintCoverUrls() {
  console.log(volumeCovers.reduce((a ,e) => {
    if (e.ready) {
      return `${a}\n${e.url}`.trim()
    }
    return a
  } ,''))
}
function waitForQueryElement(selector ,maxTime = null) {
  return new Promise(((resolve ,reject) => {
    const element = document.querySelector(selector)
    let timeout
    if (maxTime != null) {
      timeout = setTimeout(() => {
        reject('Timeout')
      } ,maxTime)
    }
    if (element) {
      clearTimeout(timeout)
      resolve(element)
      return
    }
    const observer = new MutationObserver(((mutations) => {
      mutations.forEach((mutation) => {
        const nodes = Array.from(mutation.addedNodes)
        for (const node of nodes) {
          if (node.querySelector) {
            const e = node.querySelector(selector)
            if (e) {
              observer.disconnect()
              clearTimeout(timeout)
              resolve(e)
              return
            }
          }
        }
      })
    }))
    observer.observe(document.documentElement ,{
      childList: true ,subtree: true
    })
  }))
}
// FIXME! Wait for them to exist.
// FIXME! Create easier/more obvious ways to copy to clipboard (something onscreen)
// FIXME! Add 'Copied Image' Popup text
// FIXME! Compare images (preview vs cover) % match, somehow. Generaly, the correct image is within revid -10 range,
// however, occasionaly another image exists between the reversed id and the desired cover.
waitForQueryElement('.detail-section.series .cmnShelf-list .cmnShelf-item').then(() => {
  console.log("You can get detailed cover infromation via the 'BookWalkerCoverDetails' variable")
  console.log("You can get the all extracted cover urls by calling 'BookWalkerPrintCoverUrls()'")
  /* **************** *
     * Define Variables *
     * **************** */
  const mainCover = {}
  const sections = {}
  if (!isUserscript()) {
    window.BookWalkerCoverDetails = volumeCovers
    window.BookWalkerPrintCoverUrls = BookWalkerPrintCoverUrls
    window.deduceCoverImageFromElement = deduceCoverImageFromElement
  }
  else {
    unsafeWindow.BookWalkerCoverDetails = volumeCovers
    unsafeWindow.BookWalkerPrintCoverUrls = BookWalkerPrintCoverUrls
    // unsafeWindow.deduceCoverImageFromId=deduceCoverImageFromId
    unsafeWindow.deduceCoverImageFromElement = deduceCoverImageFromElement
  }
  const notifyVariable = () => {
    console.log('Found BookWalkerCovers:')
    BookWalkerPrintCoverUrls()
    console.log("You can get detailed cover infromation via the 'BookWalkerCoverDetails' variable")
    console.log("You can get all extracted cover urls by calling 'BookWalkerPrintCoverUrls()'")
    // createInterface()
  }
  let notifyTimeout
  const resetNotify = () => {
    clearTimeout(notifyTimeout)
    notifyTimeout = setTimeout(notifyVariable ,7000)
  }
  /* *************** *
     * Find Main Cover *
     * *************** */
  /*
    document.querySelectorAll(".main-cover").forEach((e)=>{
      let sectionTitle="MAIN"
      let volumeTitle = "MAIN VOLUME"
      //let serialData={}
      //serialData.volumeTitle = volumeTitle
      deduceCoverImageFromElement(e).then((serialData)=>{
        resetNotify()
        mainCover.volumeTitle = volumeTitle
        mainCover.url = serialData.url
        console.log(`Found '${sectionTitle}' cover art canidate '${serialData.url}' for preview '${e.querySelector("img").src}'`)
        e.onclick=()=> {
          console.log(`Copied cover art '${serialData.url}'`)
          copyToClipboard(serialData.url);
        }
      })
    }) */
  /* ****************** *
     * Find Volume Covers *
     * ****************** */
  const volumeContainerElms = document.querySelectorAll('.detail-section.series .cmnShelf-list')
  let volumeContainerElmsIdx = 0
  volumeContainerElms.forEach((list) => {
    const sectionTitle = 'Volumes'
    const section = []
    sections[sectionTitle] = section
    list.querySelectorAll('.cmnShelf-item').forEach((e) => {
      const volumeTitle = e.querySelector('.cmnShelf-head').textContent
      prepareSerialForElement(e ,volumeTitle)
    })
  })
  function nextVolumeContainer() {
    return new Promise((ret ,err) => {
      const list = volumeContainerElms[volumeContainerElmsIdx]
      volumeContainerElmsIdx++
      if (list == null) {
        err()
        return
      }
      const sectionTitle = 'Volumes'
      const section = []
      sections[sectionTitle] = section
      const volumeElms = list.querySelectorAll('.cmnShelf-item')
      let volumeElmsIdx = 0
      function nextVolume() {
        return new Promise((ret ,err) => {
          const e = volumeElms[volumeElmsIdx]
          volumeElmsIdx++
          if (e == null) {
            err()
            return
          }
          const volumeTitle = e.querySelector('.cmnShelf-head').textContent
          deduceCoverImageFromElement(e ,volumeTitle).then((serialData) => {
            resetNotify()
            console.log(`Found '${sectionTitle}' '${volumeTitle}' cover art canidate '${serialData.url}' for preview '${e.querySelector('img').src}'`)
            section.push({
              volumeTitle ,url: serialData.url
            })
            e.onclick = () => {
              console.log(`Copied cover art '${serialData.url}'`)
              copyToClipboard(serialData.url)
            }
            ret()
          }).catch(() => {
            // We don't care! Returning anyways~!
            ret()
          })
        })
      }
      function nvLoop() {
        const nv = nextVolume()
        nv.then(() => {
          nvLoop()
        }).catch(() => {
          ret()
        })
      }
      nvLoop()
    })
  }
  function getAllStuff() {
    return new Promise((ret ,err) => {
      function nvContLoop() {
        const nv = nextVolumeContainer()
        nv.then(() => {
          nvContLoop()
        }).catch(() => {
          ret()
        })
      }
      nvContLoop()
    })
  }
  getAllStuff() // .then(doSomething?)
  const iface = createInterface()
  if (!isUserscript()) {
    // We are a bookmarklet, or the user ran us in the console. Regardless, they WANT to see us!
    iface.scrollIntoView()
  }
})
