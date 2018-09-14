// ==UserScript==
// @name     Mangadex Copy link as BBCode
// @description Adds a "Copy as BBCode" button next to links. Currently operates on title page links, and any breadcrumbs.
// @namespace https://github.com/Brandon-Beck
// @version  0.0.1
// @grant    unsafeWindow
// @require  https://greasyfork.org/scripts/372223-mangadex-common/code/Mangadex%20Common.js
// @match    https://mangadex.org/*
// ==/UserScript==

/*
unsafeWindow used soly for debugging in firefox.
*/

function Print(x) {
  unsafeWindow.console.log(x);
}



let tooltip_elm = htmlToElement("<div>Copied as BB Code<br><span></span></div>");
let tooltip_text = tooltip_elm.children[1];
tooltip_elm.style.display="none";
tooltip_elm.style.backgroundColor="rgba(15,15,15,0.9)";
tooltip_elm.style.borderRadius="15px";
tooltip_elm.style.color="rgb(215,215,215)";
tooltip_elm.style.left="0%";
tooltip_elm.style.position="absolute";
tooltip_elm.style.zIndex=10;
tooltip_elm.style.textAlign="center";
document.body.appendChild(tooltip_elm);
let tooltipTimer;
function autohide_tooltip(time) {
  clearTimeout(tooltipTimer);
  tooltipTimer=setTimeout(function() {
    tooltip_elm.style.display="none";
  },time);
}
function bbcode_link(href,title) {
  return `[url=${href}]${title}[/url]`;
}
function bbcode_onclick(bb_elm,href,title) {
  Print("Clicked");
  let bbcd = bbcode_link(href,title);
  Print(bbcd);
  copyTextToClipboard(bbcd);
  bb_elm.appendChild(tooltip_elm);
  tooltip_elm.style.display="block";
  tooltip_text.textContent=bbcd;
  autohide_tooltip(2000);
}



let bb_templ = htmlToElement("<div style='display: inline;' title='Copy link as BB Code'></div>");
bb_templ.appendChild(document.createTextNode("[bb]"));

function append_bbcode_button(elm) {
  let bb_elm = bb_templ.cloneNode(true);
  Print("appending");
  elm.parentNode.appendChild(bb_elm);
  bb_elm.onclick=function() { bbcode_onclick(bb_elm,elm.href,elm.title); };
}

function apply_to_xpath_snapshots(xpath_snapshots,fn) {
  for (let i = 0; i < xpath_snapshots.snapshotLength; i++ ) {
    let item = xpath_snapshots.snapshotItem(i);
    fn(item);
  }
}

function main() {
  Print("Running MAIN");
	let manga_titles = getElementsByXpath("//a[contains(@class,'manga_title')]");
  let breadcrumb_links = getElementsByXpath("//li[contains(@class,'breadcrumb-item')]/a");
  apply_to_xpath_snapshots(manga_titles,append_bbcode_button);
  apply_to_xpath_snapshots(breadcrumb_links,function(elm) {
    let bb_elm = bb_templ.cloneNode(true);
    Print("appending");
    elm.parentNode.appendChild(bb_elm);
    bb_elm.onclick=function() { bbcode_onclick(bb_elm,elm.href,elm.textContent); };
  });
}
Print("RUNNING");
CheckLoop("//a[contains(@class,'navbar-brand')]",main);
