// ==UserScript==
// @name     Mangadex Copy link as BBCode
// @description Adds a "Copy as BBCode" button next to links. Currently operates on title page links, and any breadcrumbs.
// @namespace https://github.com/Brandon-Beck
// @version  0.0.3
// @grant    unsafeWindow
// @grant    GM.setClipboard
// @grant    GM_setClipboard
// @require  https://gitcdn.xyz/repo/Brandon-Beck/Mangadex-Userscripts/a480c30b64fba63fad4e161cdae01e093bce1e4c/common.js
// @require  https://gitcdn.xyz/repo/Brandon-Beck/Mangadex-Userscripts/21ec54406809722c425c39a0f5b6aad59fb3d88d/uncommon.js
// @match    https://mangadex.org/*
// @license  MIT
// @author   Brandon Beck
// @icon     https://mangadex.org/images/misc/default_brand.png?1
// ==/UserScript==
// TODO: Look for a decent IDE for userscripts.
// Currently using ViolentMonkey with Atom and atom-live-server to sync changes with ViolentMonkey
// Unfortunatly, syncing requires doesnt work well that way.
// Compiling for testing.

'use strict'

/** ***************************
 * Create HTML nodes.
 */
const tooltip_elm = htmlToElement('<div>Copied as BB Code<br><span></span></div>')
const tooltip_text = tooltip_elm.children[1]
tooltip_elm.style.display = 'none'
tooltip_elm.style.backgroundColor = 'rgba(15,15,15,0.9)'
tooltip_elm.style.borderRadius = '15px'
tooltip_elm.style.color = 'rgb(215,215,215)'
tooltip_elm.style.left = '0%'
tooltip_elm.style.position = 'absolute'
tooltip_elm.style.zIndex = 10
tooltip_elm.style.textAlign = 'center'
document.body.appendChild(tooltip_elm)
const bb_templ = htmlToElement("<div style='display: inline;' title='Copy link as BB Code'></div>")
bb_templ.appendChild(document.createTextNode('[bb]'))
/** ***************************
 * Declare global variables
 */
let tooltipTimer
function autohide_tooltip(time) {
  clearTimeout(tooltipTimer)
  tooltipTimer = setTimeout(() => {
    tooltip_elm.style.display = 'none'
  } ,time)
}
function bbcode_link(href ,title) {
  return `[url=${href}]${title}[/url]`
}
function bbcode_onclick(bb_elm ,href ,title) {
  dbg('Clicked')
  const bbcd = bbcode_link(href ,title)
  dbg(bbcd)
  copyTextToClipboard(bbcd)
  bb_elm.appendChild(tooltip_elm)
  tooltip_elm.style.display = 'block'
  tooltip_text.textContent = bbcd
  autohide_tooltip(2000)
}
function append_bbcode_button(elm) {
  const bb_elm = bb_templ.cloneNode(true)
  dbg('appending')
  elm.parentNode.appendChild(bb_elm)
  bb_elm.onclick = function () {
    bbcode_onclick(bb_elm ,elm.href ,elm.title)
  }
}
function apply_to_xpath_snapshots(xpath_snapshots ,fn) {
  for (let i = 0; i < xpath_snapshots.snapshotLength; i++) {
    const item = xpath_snapshots.snapshotItem(i)
    fn(item)
  }
}
function main() {
  dbg('Running MAIN')
  const page_titles = getSnapshotByXpath("//h6[contains(@class,'card-header') and ./span[contains(@class,'fa-book')] ]")
  const manga_titles = getSnapshotByXpath("//a[contains(@class,'manga_title')]")
  const breadcrumb_links = getSnapshotByXpath("//li[contains(@class,'breadcrumb-item')]/a")
  apply_to_xpath_snapshots(manga_titles ,append_bbcode_button)
  apply_to_xpath_snapshots(breadcrumb_links ,(elm) => {
    const bb_elm = bb_templ.cloneNode(true)
    dbg('appending')
    elm.parentNode.appendChild(bb_elm)
    bb_elm.onclick = function () {
      bbcode_onclick(bb_elm ,elm.href ,elm.textContent)
    }
  })
  apply_to_xpath_snapshots(page_titles ,(elm) => {
    let title = ''
    elm.childNodes.forEach((e) => {
      if (e.nodeName === '#text') {
        title += e.textContent
      }
    })
    title = title.trim()
    if (title) {
      const bb_elm = bb_templ.cloneNode(true)
      dbg('appending')
      bb_elm.onclick = function () {
        bbcode_onclick(bb_elm ,location.href ,title)
      }
      elm.appendChild(bb_elm)
    }
  })
}
dbg('RUNNING')
waitForElementByXpath({ xpath: "//a[contains(@class,'navbar-brand')]" }).then(main)
