// ==UserScript==
// @name     Mangadex Common
// @version  0.0.1
// @description Common function library for Mangadex. Should be required by other userscripts.
// ==/UserScript==
"use strict";

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
function getOrderedItterByXpath(path,node=document) {
  return document.evaluate( path.toString(), node, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
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
      return o.toString();
    }
    else {
      return o;
    }
  }
  xp.new=function(xpath_str) { return new XPath(xpath_str); };
  xp.clone=function() { return new XPath(xp.xpath); };
  xp.contains = function(attr,text=throwMissingParam('XPath().contains(attr,text)','"@class","some-class"')) {
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
  xp.getOrderedItter = function(node=document) {
    return getOrderedItterByXpath(xp, node);
  };
  xp.forEachElement = (fn,node) => {
    for(let [i,item] = [xp.getItter()]; (()=>{item=i.iterateNext(); return item;})();) {
      fn(item);
    };
  }
  xp.forEachOrderedElement = (fn,node) => {
    for(let [i,item] = [xp.getOrderedItter()]; (()=>{item=i.iterateNext(); return item;})();) {
      fn(item);
    };
  }
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
// Gets all values for provided keys via GM_getValue, defaulting to the provided default values.
// keys = {SomeGM_Key: SomeDefaultValue, AnotherGM_Key: AnotherDefaultValue}
// fn: function toRunAfterAllGM_getValues_prommisesHaveFinished({
//   SomeGM_Key: SomeValue,
//   AnotherGM_Key: AnotherValue
//})
function getUserValues(keys,fn) {
  let values={};
  let itemsLeft=Object.keys(keys).length;
  Object.entries(keys).forEach( ([key,defaultValue]) => {
    dbg("in loop");
    let jsonDefault = JSON.stringify(defaultValue);
    if (typeof GM === "object" && typeof GM.getValue === 'function') {
      GM.getValue(key,jsonDefault).then((value) => {
        values[key] = JSON.parse(value);
        itemsLeft--;
        if (itemsLeft === 0 ) {
          fn(values);
        }
      });
    }
    else if (typeof GM_getValue === 'function') {
      values[key] = JSON.parse(GM_getValue(key,jsonDefault));
      itemsLeft--;
      if (itemsLeft === 0 ) {
        fn(values);
      }
    }
    else {
      dbg("To use 'getUserValues' you must grant either GM.getValue or GM_getValue.");
    }
  });
}
function setUserValues(keys,fn=()=>{return true;}) {
  let values={};
  let itemsLeft=Object.keys(keys).length;
  Object.entries(keys).forEach( ([key,newValue]) => {
    if (typeof GM === "object" && typeof GM.setValue === 'function') {
      GM.setValue(key,JSON.stringify(newValue)).then(() => {
        itemsLeft--;
        if (itemsLeft === 0 ) {
          fn();
        }
      });
    }
    else if (typeof GM_setValue === 'function') {
      GM_setValue(key,JSON.stringify(newValue));
      itemsLeft--;
      if (itemsLeft === 0 ) {
        fn();
      }
    }
    else {
      dbg("To use 'setUserValues' you must grant either GM.setValue or GM_setValue.");
    }
  });
}

const keycodes={
  backspace:8,    tab:9,         enter:13,
  shift:16,       ctrl:17,       alt:18,
  pause_break:19, capslock:20,   escape:27,
  space:32,       pageup:33,     pagedown:34,
  end:35,         home:36,       leftarrow:37,
  uparrow:38,     rightarrow:39, downarrow:40,
  insert:45,      delete:46,
  0:48,   1:49,   2:50,   3:51,
  4:52,   5:53,   6:54,   7:55,
  8:56,   9:57,   a:65,   b:66,
  c:67,   d:68,   e:69,   f:70,
  g:71,   h:72,   i:73,   j:74,
  k:75,   l:76,   m:77,   n:78,
  o:79,   p:80,   q:81,   r:82,
  s:83,   t:84,   u:85,   v:86,
  w:87,   x:88,   y:89,   z:90,
  multiply: 106, add: 107, subtract: 109,
  decimalpoint: 110, divide: 111,
  f1: 112, f2: 113, f3: 114,
  f4: 115, f5: 116, f6: 117,
  f7: 118, f8: 119, f9: 120,
  f10: 121, f11: 122, f12: 123,
  numlock: 144, scrolllock: 145,
  semicolon: 186, equalsign: 187,
  comma: 188, dash: 189, period: 190,
  forwardslash: 191, graveaccent: 192,
  openbracket: 219, backslash: 220,
  closebraket: 221, singlequote: 222
};
