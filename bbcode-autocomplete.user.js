// ==UserScript==
// @name     Mangadex Autocomplete
// @description Autocompletes @mention usernames. Maintains a small history of user posts you recently viewed and searches that for matches. Example image shown in additional info
// @namespace https://github.com/Brandon-Beck
// @version  0.0.7
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @require  https://cdn.rawgit.com/ichord/Caret.js/341fb20b6126220192b2cd226836cd5d614b3e09/dist/jquery.caret.js
// @require  https://cdn.rawgit.com/ichord/At.js/1b7a52011ec2571f73385d0c0d81a61003142050/dist/js/jquery.atwho.js
// @require  https://cdn.rawgit.com/Brandon-Beck/Mangadex-Userscripts/ecfc52fda045b5262562cf6a25423603f1ac5a99/common.js
// @require  https://cdn.rawgit.com/Brandon-Beck/Mangadex-Userscripts/ecfc52fda045b5262562cf6a25423603f1ac5a99/uncommon.js
// @require  https://cdn.rawgit.com/Brandon-Beck/Mangadex-Userscripts/9d40d6365a9e233e987ce2577c0322072b6b6a1f/settings-ui.js
// @match    https://mangadex.org/*
// @author   Brandon Beck
// @icon     https://mangadex.org/images/misc/default_brand.png
// @license  MIT
// ==/UserScript==

'use strict'

function insertStylesheet(cssText) {
  // const cssId = `css_${cssText.toString().replace(/\W/g ,'_')}`
  const style = document.createElement('style')
  style.type = 'text/css'
  if (style.styleSheet) {
    // This is required for IE8 and below.
    style.styleSheet.cssText = cssText
  }
  else {
    style.appendChild(document.createTextNode(cssText))
  }
  document.head.appendChild(style)
  return style.sheet
}
// For using AtWho's CSS. Disabled since it is difficault to make it use mangadex's active theme
function addCssLink(css_url) {
  const cssId = `css_${css_url.toString().replace(/\W/g ,'_')}`
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link')
    link.id = cssId
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = css_url
    // link.media = 'all';
    document.head.appendChild(link)
    return link.sheet
  }
}

function insertIntoStylesheet({ stylesheet ,selector ,css_text }) {
  if (stylesheet.insertRule) {
    css_text = `${selector} {${css_text}}`
    stylesheet.insertRule(css_text ,stylesheet.cssRules.length)
  }
  else if (stylesheet.addRule) {
    stylesheet.addRule(selector ,css_text)
  }
}
function findCSS_Rules3({ classID ,exactProperties = [] ,matchProperties = [] ,ignoredStylesheets = [] }) {
  let resultRule = {}
  let resultCssText = ''
  let exactCssText = ''
  let matchCssText = ''
  let result_stylesheet
  for (let i = 0; i < document.styleSheets.length; i++) {
  // Object.keys(document.styleSheets).forEach((i) => {
    try {
      const stylesheet = document.styleSheets[i]
      if (ignoredStylesheets.indexOf(stylesheet) >= 0) continue
      const style_rules = stylesheet.cssRules ? stylesheet.cssRules : stylesheet.rules
      if (style_rules) {
        result_stylesheet = stylesheet
        // for (let r = 0; r < style_rules.length; r++) {
        Object.keys(style_rules).forEach((r) => { // eslint-disable-line no-loop-func
          if (style_rules[r].selectorText && style_rules[r].selectorText === classID) {
            resultRule = style_rules[r]
            Object.values(style_rules[r].style).forEach((key) => {
              const v = style_rules[r].style[key]
              resultCssText += `${key}: ${v}; `
              if (exactProperties.indexOf(key) >= 0) {
                exactCssText += `${key}: ${v}; `
              }
              matchProperties.forEach((reg) => {
                if (key.startsWith(reg)) matchCssText += `${key}: ${v}; `
              })
            })
            // return { stylesheet, rule: style_rules[r] }
          }
        })
      }
    }
    catch (e) {
      // Rethrow exception if it's not a SecurityError. Note that SecurityError
      // exception is specific to Firefox.
      if (e.name !== 'SecurityError') throw e
      // continue // on as normal
    }
  // })
  }
  // let css_text = Object.enresultRule.reduce( (accum='',[k,v]) => { accum+=v  } )
  return {
    stylesheet: result_stylesheet ,rule: resultRule ,matchCssText ,exactCssText ,resultCssText
  }
}

function duplicate_cssRule3({
  origSelector
  ,newSelector
  ,exactProperties
  ,matchProperties
  ,ignoredStylesheets
  ,targetStylesheet: insertInto
}) {
  // if(findCSS_Rule(new_selector)) return true;  // Must have already done this one

  const { stylesheet: origStylesheet ,rule ,matchCssText ,exactCssText ,resultCssText } = findCSS_Rules3({
    classID: origSelector ,exactProperties ,matchProperties ,ignoredStylesheets
  })
  let cssText = matchProperties ? matchCssText : resultCssText
  if (!cssText) return false
  let targetStylesheet = insertInto
  if (targetStylesheet == null) targetStylesheet = origStylesheet
  if (targetStylesheet.insertRule) {
    cssText = `${newSelector} {${cssText}}`
    targetStylesheet.insertRule(cssText ,targetStylesheet.cssRules.length)
  }
  else if (targetStylesheet.addRule) {
    targetStylesheet.addRule(newSelector ,cssText)
  }
  return true
}


const xp = new XPath()
const posts = xp.new('//tr').with(xp.new().contains('@class' ,'post'))
// Because Javascript's does not require .sort to be Stable.
// Currently Chrome alone uses Unstable sort. They are now moving to Stable.
// This returns the same results for all browsers,
function stableSort(arr ,cmp = (a ,b) => {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}) {
  const stabilizedThis = arr.map((el ,index) => [el ,index])
  const stableCmp = (a ,b) => {
    const order = cmp(a[0] ,b[0])
    if (order !== 0) return order
    return a[1] - b[1]
  }
  stabilizedThis.sort(stableCmp)
  for (let i = 0; i < arr.length; i++) {
    arr[i] = stabilizedThis[i][0]
  }
  return arr
}
// userid = Your user ID
function User({ name ,id ,img }) {
  const user = this
  if (!(user instanceof User)) {
    return new User()
  }
  user.name = name
  user.id = id
  user.img = img
  return user
}
function UserList({ list = {} }) {
  const userList = this
  if (!(userList instanceof UserList)) {
    return new UserList()
  }
  userList.list = list
  userList.push = (user) => {
    userList.list[user.id] = user
  }
  return userList
}
function Post({ post_id ,time ,user_id ,thread_id }) {
  const post = this
  if (!(post instanceof Post)) {
    return new Post()
  }
  post.user_id = user_id
  post.thread_id = thread_id
  post.id = post_id
  post.time = time
  return post
}
function Thread({ id ,title ,manga_id }) {
  const thread = this
  if (!(thread instanceof Thread)) {
    return new Thread()
  }
  thread.id = id
  thread.title = title
  thread.manga_id = manga_id
  return thread
}
function Manga({ id ,title ,description }) {
  const manga = this
  if (!(thread instanceof Manga)) {
    return new Manga()
  }
  manga.id = id
  manga.title = title
  manga.description = description
  return manga
}
function MangaList({ list = {} }) {
  const mangaList = this
  if (!(mangaList instanceof MangaList)) {
    return new MangaList()
  }
  mangaList.list = list
  mangaList.push = (manga) => {
    mangaList.list[manga.id] = manga
  }
  return mangaList
}

function UserHistory({ read_posts_history = [] ,user_id ,username ,historySize = 200 } = {}) {
  const uhist = this
  if (!(uhist instanceof UserHistory)) {
    return new UserHistory()
  }
  function clipText(text ,max_length) {
    return (text.length > max_length) ? `${text.substr(0 ,max_length - 1)}&hellip;` : text
  }

  function getVisibleText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent
    const style = getComputedStyle(node)
    if (style && style.display === 'none') return ''
    let text = ''
    for (let i = 0; i < node.childNodes.length; i++) text += getVisibleText(node.childNodes[i])
    return text
  }
  const cleanupHistory = () => {
    if (this.history.size > this.max_size) {
      // delete(this.history.entries().next().value[0]);
      this.history.shift()
    }
  }
  this.user_id = user_id
  this.username = '' // get from userid
  this.max_size = historySize
  this.history = read_posts_history

  this.push = (post) => {
    const post_id = parseInt(post.id.replace(/^post_/ ,''))

    // this.history.delete(post_id);
    // this.history.set(post_id,{user_id:user_id,user_img:user_img,excerpt:excerpt});

    // this.history.filter((e)=> { e.thread_id === thread_id } );

    function array_move(arr ,old_index ,new_index) {
      arr.splice(new_index ,0 ,arr.splice(old_index ,1)[0])
      return arr
    }
    let exists = false
    this.history.some((e ,k) => {
      if (e.post_id === post_id) {
        exists = true
        array_move(this.history ,k ,0)
        return true
      }
      return false
    })
    if (exists) {
      return false
    }
    const time = xp.new('.//span').with(xp.new('./span').with(xp.new().contains('@class' ,'fa-clock'))).getElement(post).title
    const thread = xp.new('./td/span/a').with(xp.new('preceding-sibling::span').with(xp.new().contains('@class' ,'fa-clock'))).getElement(post).href
    const thread_id = parseInt(thread.match(/\/thread\/(\d+)\//)[1])

    const user = xp.new('.//a[contains(@class,"user_level") and starts-with(@href,"/user/")]').getElement(post)
    const user_name = user.textContent
    // TODO: actualy store user level
    const user_level = user.className
    const user_color = user.style.color

    const user_id = parseInt(user.href.match(/\/user\/(\d+)\//)[1])
    const user_img = xp.new('.//img').with(xp.new().contains('@class' ,'avatar')).getElement(post).src
    const postContents = xp.new('.//div').with(xp.new().contains('@class' ,'postbody')).getElement(post)
    const did_mention = Boolean(xp.new(`.//a[@href="https://mangadex.org/user/${uhist.user_id}"]`).getElement(postContents))
    // cleanText. Hide spoilers and other invisible crap
    const cleanText = getVisibleText(postContents)
    const excerpt = clipText(cleanText ,100)
    this.history.unshift({
      thread_id
      ,user_name
      ,user_level
      ,user_color
      ,user_id
      ,user_img
      ,did_mention
      ,post_id
      ,excerpt
      ,time
    })
    cleanupHistory()
  }
  this.autoComplete = (partial_name ,{ thread_id = 0 ,case_sensitive = false ,fuzzy = true } = {}) => {
    let matches = this.history.filter((e) => {
      // If this user is already marked as the highest priority match, dont process them anymore.
      const regex_partial_name = new RegExp(`${fuzzy ? '' : '^'}${partial_name}` ,`${case_sensitive ? '' : 'i'}`)
      if (e.user_name.match(regex_partial_name)) {
        return true
      }
      return false
    })
    matches = stableSort(matches ,(a ,b) => {
      // List those from this thread before other threads
      {
        const am = a.thread_id === thread_id
        const bm = b.thread_id === thread_id
        if (am !== bm) {
          return bm
        }
      }
      // List people whos names start with partial before those with partial anywhere in name
      if (fuzzy) {
        const regex_partial_name = new RegExp(`^${partial_name}` ,`${case_sensitive ? '' : 'i'}`)
        const am = a.user_name.match(regex_partial_name) != null
        const bm = b.user_name.match(regex_partial_name) != null
        if (am !== bm) {
          return bm
        }
      }
      // List those who mentioned us before those who did not.
      if (a.did_mention !== b.did_mention) {
        return b.did_mention
      }
    })
    const seen = {}
    matches = matches.filter((e) => {
      if (seen[e.user_id]) {
        return false
      }
      seen[e.user_id] = true
      return true
    })
    return matches
  }
  return this
}

function getCurrentUserID() {
  xp.new('id("navbarSupportedContent")').with(xp.new().contains('@class' ,'navbarSupportedContent'))
  const current_user_id = xp.new('id("navbarSupportedContent")//a[contains(@href,"/user/")]').getElement().href.match(/\/user\/(\d+)\//)[1]
  return parseInt(current_user_id)
}

function initSettingsDialog(loaded_settings) {
  const settingsUi = new SettingsUI({
    groupName: 'Auto-Complete'
    ,settingsTreeConfig: {
      saveLocation: 'settings' ,autosave: true
    }
  })
  const autocompleteTypes = settingsUi.addMultiselect({
    title: 'Types' ,key: 'autocompleteTypes'
  })
  autocompleteTypes.addOption({
    key: 'usernames' ,title: '@Username'
  })
  autocompleteTypes.addOption({
    key: 'titles' ,title: ':Title'
  })
  const userHistLimit = settingsUi.addTextbox({
    key: 'max_post_history'
    ,title: 'User History Size'
    ,value: 200
    ,min: 20
    ,max: 2000
    ,titleText: 'Maximum number of user posts we should remember. Used for @mention autocompletion'
    ,type: 'number'
  })
  const titleHistLimit = settingsUi.addTextbox({
    key: 'max_title_history'
    ,title: 'Title History Size'
    ,value: 10
    ,min: 0
    ,max: 2000
    ,titleText: 'Maximum number of Non-Followed titles we should remember. Used for :Title autocompletion. Added to history when you visit the title page.'
    ,type: 'number'
  })
  // Load our saved settings object into the ui
  // settingsUi.settingsTree.load_all()
  settingsUi.settingsTree.value = loaded_settings
  // return new settings object which is bound to the UI.
  const settings = settingsUi.settingsTree.value
  return settings
}
function main({ read_posts_history ,settings: loaded_settings }) {
  const settings = initSettingsDialog(loaded_settings)
  const user_id = getCurrentUserID()
  const uhist = new UserHistory({
    read_posts_history
    ,user_id
    ,historySize: settings.max_post_history
  })
  unsafeWindow.uhist = uhist
  // Add current page's posts to history.

  let thread = xp.new(posts).append('//td/span/a').with(xp.new('preceding-sibling::span').with(xp.new().contains('@class' ,'fa-clock'))).getElement()
  if (thread) {
    thread = thread.href
    const thread_id = parseInt(thread.match(/\/thread\/(\d+)\//)[1])
    if (window.location.pathname.startsWith('/thread/')) {
      posts.forEachOrderedElement((post) => {
        uhist.push(post)
      })
    }
    else {
      // Consider more efficient approch
      const snap = posts.getOrderedSnapshot()
      for (let i = snap.snapshotLength - 1; i >= 0; i--) {
        uhist.push(snap.snapshotItem(i))
      }
    }
    setUserValues({ read_posts_history: uhist.history })

    // NOTE there can be more than one textarea. but they all use the same id :O

    function autoComplete(partial_name ,render_view) {
      const r = uhist.autoComplete(partial_name ,{
        thread_id ,case_sensitive: false ,fuzzy: true
      })
      render_view(r)
    }
    function formatDisplayItem(item) {
      return `<li class="dropdown-item px-0 " style=""><div class="d-flex justify-content-between align-items-center px-2" style="height:50px;" title="${item.excerpt}">
        <div class="h-100">
        <span class="">${item.did_mention ? '@' : ''}</span>
        <span class="${item.thread_id === thread_id ? 'far fa-comments' : ''}"></span>
        <img src="${item.user_img}" class="mh-100 rounded avatar"/>
        </div>
        <span class="${item.user_level}" style="color:${item.user_color};">${item.user_name}</span>
        </div></li>`
    }

    $('textarea[id="text"]').atwho({
      at: '@'
      ,displayTpl: formatDisplayItem
      ,insertTpl: '${atwho-at}${user_name}'
      ,searchKey: 'user_name'
      // We don't want to use your filter or sorter. remoteFilter is a better fit for us.
      ,data: []
      // data: uhist.history,
      ,limit: 200
      ,callbacks: {
        remoteFilter: autoComplete
        // NoOp
        ,sorter: (_ ,i) => i

      }
    })
    // HACK make atwho use flex instead of block
    $('.atwho-container').addClass('container ')
    $('.atwho-view').css({ display: 'none' })
    $('.atwho-view-ul').addClass('pre-scrollable d-inline-flex flex-column')

    // This also works instead of inline flex on ul, but it makes the container visible until atwho is invoked
    // Hide now. atwho changes display between none and whatever it is already set to automaticly
    // $('.atwho-view').css({display:'flex'})
    // $('.atwho-view-ul').addClass('pre-scrollable ')

    // These make atwho dropdown menu use the same color theme as the site
    // const atwhoStylesheet = addCssLink('https://cdn.rawgit.com/ichord/At.js/1b7a52011ec2571f73385d0c0d81a61003142050/dist/css/jquery.atwho.css')
    const customStylesheet = insertStylesheet('')
    // HACK dropdown-menu breaks atwho autoscroll somehow. lets just copy parts of the theme
    duplicate_cssRule3({
      origSelector: '.dropdown-menu'
      ,newSelector: '.atwho-view-ul'
      ,matchProperties: ['background' ,'color' ,'border' ,'margin' ,'padding']
      // ,ignoredStylesheets: [atwhoStylesheet]
      ,targetStylesheet: customStylesheet
    })
    duplicate_cssRule3({
      origSelector: '.dropdown-menu.show'
      ,newSelector: '.atwho-view-ul'
      ,matchProperties: ['background' ,'color' ,'border' ,'margin' ,'padding']
      // ,ignoredStylesheets: [atwhoStylesheet]
      ,targetStylesheet: customStylesheet
    })
    // make the selected atwho user be highlighted using the same color theme as the site.
    duplicate_cssRule3({
      origSelector: '.dropdown-item:hover, .dropdown-item:focus'
      ,newSelector: '.atwho-view .cur'
      ,matchProperties: ['background' ,'color']
      // ,ignoredStylesheets: [atwhoStylesheet]
      ,targetStylesheet: customStylesheet
    })
    // For debugging
    // unsafeWindow.uhist = uhist
  }
}

getUserValues({
  read_posts_history: []
  ,settings: {}
}).then(main)
