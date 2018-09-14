// ==UserScript==
// @name     Mangadex Copy link as BBCode
// @description Adds a "Copy as BBCode" button next to links. Currently operates on title page links, and any breadcrumbs.
// @namespace https://github.com/Christopher-McGinnis
// @version  0.0.1
// @grant    unsafeWindow
// @match    https://mangadex.org/*
// ==/UserScript==

/*
unsafeWindow used soly for debugging in firefox.
*/

function Print(x) {
  unsafeWindow.console.log(x);
}
function getElementsByXpath(path,node=document) {
  return document.evaluate(path, node, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}
function getElementByXpath(path,node=document) {
  return document.evaluate(path, node, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function htmlToElement(html) {
  var template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

function CheckLoop(xpath,fn,cnt=50,delay=100) {
  Print("Checking for xpath...");
  if (getElementByXpath(xpath)) {
    fn();
  }
  else if (cnt != 0) {
    setTimeout(function() { CheckLoop(cnt - 1); },delay);
  }
  else {
    Print("Failed to find xpath '" + xpath + "'");
  }
}

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.style.position="fixed";
  textArea.style.top="50%";
  textArea.style.left="50%";
  textArea.style.marginTop="-10px";
  textArea.style.marginLeft="-10px";
  textArea.style.width="20px";
  textArea.style.height="20px";
  textArea.style.opacity="0";


  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}
function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    console.log('Async: Copying to clipboard was successful!');
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
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
