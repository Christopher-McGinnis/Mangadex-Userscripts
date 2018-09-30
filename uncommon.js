// ==UserScript==
// @name     Mangadex Uncommon functions
// @version  0.0.5
// @description WARNING Should NOT be required by other userscripts. Lets be honest, no one else wants this crap. This is a personal library for personal problems.
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

/**************************************************
 * XPath
 */

// NOTE: I do not promot the use of this xpath builder. It is used soly to make ways I commonly use xpaths easier.
// syntax will change. Do NOT depend on this. Do NOT use this. Do not think this is a good idea.
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
  xp.contains = function(attr,text=throwMissingArg('XPath().contains(attr,text)','text','("@class","String")')) {
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
  xp.getOrderedSnapshot = function(node=document) {
    return getOrderedSnapshotByXpath(xp, node);
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


/****************************************************************************
 *  Potentialy Usefull functions. Wating till follows standard, or stablized.
 */

function throwMissingParam(name,param,example) {
    throw new Error(`Function <${name}> is missing required parameter: <${param}>${example ? ` eg. <${param}: ${example}>` : "" }`);
}
function throwMissingArg(name,arg_name,example) {
    throw new Error(`Function <${name}> is missing required argument: <${arg_name}>${example ? ` eg. <${example}>` : "" }`);
}
function throwOnBadParam(condition,name,param,example,bad_value) {
  if (condition) {
    throw new Error(`Function <${name}> has illegal value for required parameter: <${param}>${example ? ` exected: <${example}>` : "" }${bad_value ? ` got: <${bad_value}>`  : "" }`);
  }
}
function throwOnBadArg(condition,name,arg_name,example,bad_value) {
  if (condition) {
    throw new Error(`Function <${name}> has illegal value for required argument: <${arg_name}>${example ? ` exected: <${example}>` : "" }${bad_value ? ` got: <${bad_value}>`  : "" }`);
  }
}

/**
A promise I promise you dont have to write.
@param {Function} callback - Function we will call until true
@param {Intager} [tries=50] - How many times we should try callback before giving up.
@param {Intager} [delay=100] - How long we should wait between callback calls.
@param {String} [name] - Name to use for debugging
@returns {Promise} Resolves when callback returns a true value. Rejects when runs out of tries.
*/

function callUntilTrue({
  callback = throwMissingParam('callUntilTrue','xpath','"String"'),
  name,
  tries=50,
  delay=100
}) {
  return new Promise((resolve,reject) => {
    function checkLoop(tries_left) {
      new Promise((resolve,reject) => {
        let res = callback();
        if (res) {
          resolve(res);
        }
        reject(tries_left - 1);
      }).then(resolve).catch((tries_left) => {
        if (tries_left > 0) {
          setTimeout(() => {checkLoop( tries_left );},delay);
        }
        else {
          if (name) {
            dbg(`<${name}> failed to return a true value ${tries} times in ${delay}ms intervals. Giving up!`);
          }
          reject();
        }
      });
    }
    if (name) {
      dbg(`Now waiting for <${name}> to return a true value!`);
    }
    checkLoop(tries);
  });
}


// Checks the page for {xpath} every {delay} milliseconds up to {tries} times. Runs {callback} once found.
// Used to wait for required elements to load before running functions.
// xpath: A String or XPath instance
// callback: Function to run once an xpath match is found
function waitForElementByXpath({
  xpath = throwMissingParam('checkLoop','xpath','"String"'),
  tries=50,
  delay=100
}) {
  return new Promise((resolve,reject) => {
    dbg(`Now waiting for xpath <${xpath}>`);
    callUntilTrue({
      callback:() => { return getElementByXpath(xpath); },
      tries:tries,
      name:"xpath resolver",
      delay:delay,
    }).then(resolve).catch(()=> { dbg(`Failed to find xpath <${xpath}> ${tries} times in ${delay} intervals. Giving up!`); });
  });
}
// Gets all values for provided keys via GM_getValue, defaulting to the provided default values.
// keys = {SomeGM_Key: SomeDefaultValue, AnotherGM_Key: AnotherDefaultValue}
// fn: function toRunAfterAllGM_getValues_prommisesHaveFinished({
//   SomeGM_Key: SomeValue,
//   AnotherGM_Key: AnotherValue
//})
function getUserValue(key,defaultValue) {
  return new Promise((resolve,reject) => {
    let jsonDefault = JSON.stringify(defaultValue);
    if (typeof GM === "object" && typeof GM.getValue === 'function') {
      GM.getValue(key,jsonDefault).then((value) => {
        resolve(JSON.parse(value));
      });
    }
    else if (typeof GM_getValue === 'function') {
        resolve(JSON.parse(GM_getValue(key,jsonDefault)));
    }
    else {
      reject("To use 'getUserValue' you must grant either GM.getValue or GM_getValue.");
    }
  });
}
function getUserValues(keys) {
  let prommises=[];
  Object.entries(keys).forEach(([key,defaultValue]) => {
    prommises.push(getUserValue(key,defaultValue));
  });
  return Promise.all(prommises);
}

function setUserValue(key,value) {
  return new Promise((resolve,reject) => {
    if (typeof GM === "object" && typeof GM.setValue === 'function') {
      GM.setValue(key,JSON.stringify(value)).then(resolve).catch(reject);
    }
    else if (typeof GM_setValue === 'function') {
      GM_setValue(key,JSON.stringify(value));
      resolve();
    }
    else {
      reject("To use 'setUserValue' you must grant either GM.setValue or GM_setValue.");
    }
  });
}
function setUserValues(objs) {
  let prommises=[];
  Object.entries(objs).forEach(([key,value]) => {
    prommises.push(setUserValue(key,value));
  });
  return Promise.all(prommises);
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

function createToolTip({title,text}) {
  let tooltip_elm = htmlToElement(`<div>${title}<br><span>${text}</span></div>`);
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
  return {
    tooltip:tooltip_elm,
    text_container:tooltip_text
  };
}
