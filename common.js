// ==UserScript==
// @name     Mangadex Common
// @version  1
// @description Common function library for Mangadex. Should be required by other userscripts.
// @match    https://mangadex.org/*
// @grant    unsafeWindow
// ==/UserScript==

function Print(x) {
  // unsafeWindow needed to print to Web Console in firefox.
  unsafeWindow.console.log(x);
}


function getSnapshotByXpath(path,node=document) {
  return document.evaluate(path, node, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}
function getItterByXpath(path,node=document) {
  return document.evaluate(path, node, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
}
function getElementByXpath(path,node=document) {
  return document.evaluate(path, node, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
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
  xp.and = function(o) {
    xp.xpath += " and " + toStr(o);
    return xp;
  }
  xp.or = function(o) {
    xp.xpath += " or " + toStr(o);
    return xp;
  }
  xp.asText = function() {
    return xp.xpath;
  };
  xp.getElement = function(node=document) {
    return getElementByXpath(xp.xpath,node);
  };
  xp.getSnapshot = function(node=document) {
    return getSnapshotByXpath(xp.xpath,node);
  };
  xp.getItter = function(node=document) {
    return getItterByXpath(xp.xpath,node);
  };
  return xp;
}


function htmlToElement(html) {
  var template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}
// Checks the page for {xpath} every {delay} milliseconds up to {cnt} times. Runs {fn} once found.
// Used to wait for required elements to load before running functions.
function checkLoop(xpath,fn,cnt=50,delay=100) {
  Print(`Checking for xpath <${xpath}>`);
  if (getElementByXpath(xpath)) {
    fn();
  }
  else if (cnt != 0) {
    setTimeout(function() { CheckLoop(cnt - 1); },delay);
  }
  else {
    Print(`Failed to find xpath <${xpath}>`);
  }
}
