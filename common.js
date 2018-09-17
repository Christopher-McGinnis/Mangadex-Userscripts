// ==UserScript==
// @name     Mangadex Common
// @version  0.0.1
// @description Common function library for Mangadex. Should be required by other userscripts.
// ==/UserScript==
"use strict";
dbg("Loaded");
function dbg(x) {
  //unsafeWindow used soly for debugging in firefox via Web Console.
  if (typeof unsafeWindow === 'object') {
    unsafeWindow.console.log(x);
  }
  else {
    console.log(x);
  }
}
function htmlToElement(html) {
  var template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
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
  // First try to copy using the 2 GM methods..
  if (typeof GM === "object" && typeof GM.setClipboard === 'function') {
    GM.setClipboard(text);
  }
  else if (typeof GM_setClipboard === 'function') {
    GM_setClipboard(text);
  }
  // Programmer failed to grant setClipboard permissions.
  // Attempt to use browser supported methods.
  else if (navigator && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      dbg('Async: Copying to clipboard was successful!');
    }, function(err) {
      dbg('Async: Could not copy text: ', err);
    });
  }
  else {
    fallbackCopyTextToClipboard(text);
  }
}
/**************************************************
 * XPath
 */

function getSnapshotByXpath(path,node=document) {
  return document.evaluate( path.toString() , node, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}
function getItterByXpath(path,node=document) {
  return document.evaluate( path.toString(), node, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
}
function getElementByXpath(path,node=document) {
  return document.evaluate( path.toString(), node, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

// NOTE: I do not promot the use of this xpath builder. It is used soly to make ways I commonly use xpaths easier.
// syntax will change. Do NOT depend on this.
// TODO: small AST?
function XPath(xpath_str="") {
  let xp = this;
  if (!( xp instanceof XPath) ) {
	    return new XPath(xpath_str);
	}
  xp.xpath=xpath_str;
  function toStr(o) {
    if (o instanceof XPath) {
      return o.asText();
    }
    else {
      return o;
    }
  }
  xp.contains = function(attr,text) {
    xp.xpath += `contains(concat(' ', normalize-space(${attr}), ' '), ' ${text} ')`;
    return xp;
  };
  xp.with = function(selector) {
    xp.xpath += `[${toStr(selector)}]`;
    return xp;
  };
  xp.append = function(text) {
    xp.xpath += text;
    return xp;
  };
  xp.and = function(o='') {
    xp.xpath += " and " + toStr(o);
    return xp;
  }
  xp.or = function(o='') {
    xp.xpath += " or " + toStr(o);
    return xp;
  }
  xp.toString = function() {
    return xp.xpath;
  };
  xp.getElement = function(node=document) {
    return getElementByXpath(xp, node);
  };
  xp.getSnapshot = function(node=document) {
    return getSnapshotByXpath(xp, node);
  };
  xp.getItter = function(node=document) {
    return getItterByXpath(xp, node);
  };
  return xp;
}

function throwMissingParam(name,param) {
    throw new Error(`Function <${name}> is missing required parameter: <${param}>`);
}


// Checks the page for {xpath} every {delay} milliseconds up to {tries} times. Runs {callback} once found.
// Used to wait for required elements to load before running functions.
// xpath: A String or XPath instance
// callback: Function to run once an xpath match is found
function checkLoop({
  xpath = throwMissingParam('checkLoop','xpath="String"'),
  callback=throwMissingParam('checkLoop','callback=fn()'),
  onError = () => {},
  tries=50,delay=100},cnt=tries) {
  dbg(`Checking for xpath <${xpath}>`);
  if (getElementByXpath(xpath)) {
    callback();
  }
  else if (cnt > 0) {
    setTimeout(() => { checkLoop(arguments[0],cnt - 1); },delay);
  }
  else {
    dbg(`Failed to find xpath <${xpath}>`);
    onError();
  }
}
