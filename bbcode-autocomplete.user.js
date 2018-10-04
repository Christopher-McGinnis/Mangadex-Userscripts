// ==UserScript==
// @name     Mangadex Autocomplete
// @description Autocompletes @mention usernames. Maintains a small history of user posts you recently viewed and searches that for matches. Example image shown in additional info
// @namespace https://github.com/Brandon-Beck
// @version  0.0.6
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @require  https://cdn.rawgit.com/ichord/Caret.js/341fb20b6126220192b2cd226836cd5d614b3e09/dist/jquery.caret.js
// @require  https://cdn.rawgit.com/ichord/At.js/1b7a52011ec2571f73385d0c0d81a61003142050/dist/js/jquery.atwho.js
// @require  https://cdn.rawgit.com/Brandon-Beck/Mangadex-Userscripts/15510350de16f4d20b5d7664ee3b66415995c109/common.js
// @require  https://cdn.rawgit.com/Brandon-Beck/Mangadex-Userscripts/15510350de16f4d20b5d7664ee3b66415995c109/uncommon.js
// @require  https://cdn.rawgit.com/Brandon-Beck/Mangadex-Userscripts/15510350de16f4d20b5d7664ee3b66415995c109/settings-ui.js
// @resource atwhoCSS https://cdn.rawgit.com/ichord/At.js/1b7a52011ec2571f73385d0c0d81a61003142050/dist/css/jquery.atwho.css
// @match    https://mangadex.org/*
// @author   Brandon Beck
// @icon     https://mangadex.org/images/misc/default_brand.png?1
// @license  MIT
// ==/UserScript==

'use strict'

// For using AtWho's CSS. Disabled since it is difficault to make it use mangadex's active theme
function addCssLink(css_url) {
  const cssId = `css_${css_url.toString().replace(/\W/g, '_')}`
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link')
    link.id = cssId
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = css_url
    // link.media = 'all';
    document.head.appendChild(link)
  }
}


function findCSS_Rule(classID) {
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const stylesheet = document.styleSheets[i]
      const style_rules = stylesheet.cssRules ? stylesheet.cssRules : stylesheet.rules
      if (style_rules) {
        for (let r = 0; r < style_rules.length; r++) {
          if (style_rules[r].selectorText && style_rules[r].selectorText === classID) {
            return { stylesheet, rule: style_rules[r] }
          }
        }
      }
    }
    catch (e) {
      // Rethrow exception if it's not a SecurityError. Note that SecurityError
      // exception is specific to Firefox.
      if (e.name !== 'SecurityError') throw e
      // continue on as normal
    }
  }
  return {}
}

function duplicate_cssRule(orig_selector, new_selector) {
  // if(findCSS_Rule(new_selector)) return true;  // Must have already done this one

  const { rule, stylesheet } = findCSS_Rule(orig_selector)
  if (!rule) return false
  let css_text = rule.style.cssText
  if (stylesheet.insertRule) {
    css_text = `${new_selector} {${css_text}}`
    stylesheet.insertRule(css_text, stylesheet.cssRules.length)
  }
  else if (stylesheet.addRule) {
    stylesheet.addRule(new_selector, css_text)
  }
  return true
}


const xp = new XPath()
const posts = xp.new('//tr').with(xp.new().contains('@class', 'post'))
// Because Javascript's does not require .sort to be Stable.
// Currently Chrome alone uses Unstable sort. They are now moving to Stable.
// This returns the same results for all browsers,
function stableSort(arr, cmp = (a, b) => {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}) {
  const stabilizedThis = arr.map((el, index) => [el, index])
  const stableCmp = (a, b) => {
    const order = cmp(a[0], b[0])
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
function User({ name, id, img }) {
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
function Post({
  post_id, time, user_id, thread_id
}) {
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
function Thread({ id, title, manga_id }) {
  const thread = this
  if (!(thread instanceof Thread)) {
	    return new Thread()
  }
  thread.id = id
  thread.title = title
  thread.manga_id = manga_id
  return thread
}
function Manga({ id, title, description }) {
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

function UserHistory({ read_posts_history = [], user_id, username } = {}) {
  const uhist = this
  if (!(uhist instanceof UserHistory)) {
	    return new UserHistory()
  }
  function clipText(text, max_length) {
    return (text.length > max_length) ? `${text.substr(0, max_length - 1)}&hellip;` : text
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
  this.max_size = 200
  this.history = read_posts_history

  this.push = (post) => {
    const post_id = parseInt(post.id.replace(/^post_/, ''))

    // this.history.delete(post_id);
    // this.history.set(post_id,{user_id:user_id,user_img:user_img,excerpt:excerpt});

    // this.history.filter((e)=> { e.thread_id === thread_id } );

    function array_move(arr, old_index, new_index) {
      arr.splice(new_index, 0, arr.splice(old_index, 1)[0])
      return arr
    }
    let exists = false
    this.history.some((e, k) => {
      if (e.post_id === post_id) {
        exists = true
        array_move(this.history, k, 0)
        return true
      }
      return false
    })
    if (exists) {
      return false
    }
    const time = xp.new('.//span').with(xp.new('./span').with(xp.new().contains('@class', 'fa-clock'))).getElement(post).title
    const thread = xp.new('./td/span/a').with(xp.new('preceding-sibling::span').with(xp.new().contains('@class', 'fa-clock'))).getElement(post).href
    const thread_id = parseInt(thread.match(/\/thread\/(\d+)\//)[1])

    const user = xp.new('.//a[contains(@class,"user_level") and starts-with(@href,"/user/")]').getElement(post)
    const user_name = user.textContent
    // TODO: actualy store user level
    const user_level = user.className
    const user_color = user.style.color

    const user_id = parseInt(user.href.match(/\/user\/(\d+)\//)[1])
    const user_img = xp.new('.//img').with(xp.new().contains('@class', 'avatar')).getElement(post).src
    const postContents = xp.new('.//div').with(xp.new().contains('@class', 'postbody')).getElement(post)
    const did_mention = Boolean(xp.new(`.//a[@href="https://mangadex.org/user/${uhist.user_id}"]`).getElement(postContents))
    // cleanText. Hide spoilers and other invisible crap
    const cleanText = getVisibleText(postContents)
    const excerpt = clipText(cleanText, 100)
    this.history.unshift({
      thread_id
      , user_name
      , user_level
      , user_color
      , user_id
      , user_img
      , did_mention
      , post_id
      , excerpt
      , time
    })
    cleanupHistory()
  }
  this.autoComplete = (partial_name, { thread_id = 0, case_sensitive = false, fuzzy = true } = {}) => {
    let matches = this.history.filter((e) => {
      // If this user is already marked as the highest priority match, dont process them anymore.
      const regex_partial_name = new RegExp(`${fuzzy ? '' : '^'}${partial_name}`, `${case_sensitive ? '' : 'i'}`)
      if (e.user_name.match(regex_partial_name)) {
        return true
      }
      return false
    })
    matches = stableSort(matches, (a, b) => {
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
        const regex_partial_name = new RegExp(`^${partial_name}`, `${case_sensitive ? '' : 'i'}`)
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
  xp.new('id("navbarSupportedContent")').with(xp.new().contains('@class', 'navbarSupportedContent'))
  const current_user_id = xp.new('id("navbarSupportedContent")//a[contains(@href,"/user/")]').getElement().href.match(/\/user\/(\d+)\//)[1]
  return parseInt(current_user_id)
}

const displayAutocomplete_html = htmlToElement(`
  <div class="dropdown-menu show pre-scrollable" style="overflow-y:hidden;" >
  </div>
  `)
// displayAutocomplete_html.tabIndex=1;
function clearAutocomplete() {
  while (displayAutocomplete_html.firstChild) {
    displayAutocomplete_html.removeChild(displayAutocomplete_html.firstChild)
  }
  if (displayAutocomplete_html.parentNode) {
    displayAutocomplete_html.parentNode.removeChild(displayAutocomplete_html)
  }
  displayAutocomplete_html.dataset.selected = -1
}
function displayAutocomplete({
  textarea, recommendations, prefix_startpos, prefix_stoppos, thread_id
}) {
  clearAutocomplete()
  for (const recommendation of recommendations) {
    // <span class="dropdown-item"><img src="${recommendation.user_img}"/>${recommendation.user_name}</span>
    // recommendation.user_img.classList.add("mh-100");
    const item_html = htmlToElement(`
      <div class="dropdown-item d-flex justify-content-between align-items-center px-2" style="height:50px;" title="${recommendation.excerpt}">
      <div class="h-100">
      <span class="">${recommendation.did_mention ? '@' : ''}</span>
      <span class="${recommendation.thread_id === thread_id ? 'far fa-comments' : ''}"></span>
      <img src="${recommendation.user_img}" class="mh-100 rounded avatar"/>
      </div>
      <span>${recommendation.user_name}</span>
      </div>
    `)
    // item_html.tabIndex=1;
    item_html.onclick = () => {
      clearAutocomplete()
      replaceTextareaInput({
        textarea
        , replacement: `${recommendation.user_name} `
        , prefix_startpos
        , prefix_stoppos
      })
    }
    displayAutocomplete_html.appendChild(item_html)
  }
  const caret = getCaretCoordinates(textarea, textarea.selectionEnd)
  displayAutocomplete_html.style.top = `${caret.top + caret.height}px`
  displayAutocomplete_html.style.left = `${caret.left}px`
  displayAutocomplete_html.style.position = 'absolute'
  displayAutocomplete_html.style.display = 'inline'

  textarea.parentNode.style.position = 'relative'
  textarea.parentNode.appendChild(displayAutocomplete_html)
}

function onTextareaInput({ textarea, uhist, thread_id }) {
  clearAutocomplete()
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const v = textarea.value
  const textBefore = v.substring(0, start)
  const textAfter = v.substring(end, v.length)
  if (start === end) {
    const has_prefix = textBefore.match(/@(\S*)$/)
    if (has_prefix) {
      let prefix = has_prefix[1] + textAfter
      prefix = prefix.match(/^(\S*)/)[1]
      const prefix_startpos = has_prefix.index + 1
      const prefix_stoppos = prefix_startpos + prefix.length
      const recommendations = uhist.autoComplete(prefix, { thread_id })
      displayAutocomplete({
        textarea
        , recommendations
        , prefix_startpos
        , prefix_stoppos
        , thread_id
      })
    }
  }
}
function onTextareaKeyDown(e) {
  // Down
  const activexp = xp.new('./').with(xp.new().contains('@class', 'active'))
  function getSelection() {
    const r = parseInt(displayAutocomplete_html.dataset.selected)
    return !isNaN(r) ? r : -1
  }
  function doIncrement(increment) {
    let should_preventDefault = false
    if (displayAutocomplete_html.hasChildNodes()) {
      let cur_selection = getSelection()
      if (increment === 0) {
        // prevent default if something is selected
        should_preventDefault = cur_selection !== -1
        return should_preventDefault
      }
      if (displayAutocomplete_html.children[cur_selection]) {
        displayAutocomplete_html.children[cur_selection].classList.remove('active')
      }
      should_preventDefault = true
      cur_selection += increment
      if (cur_selection >= displayAutocomplete_html.children.length) {
        cur_selection = displayAutocomplete_html.children.length - 1
      }
      if (cur_selection >= 0) {
        displayAutocomplete_html.children[cur_selection].classList.add('active')
        const topPos = displayAutocomplete_html.children[cur_selection].offsetTop
        displayAutocomplete_html.scrollTop = topPos
      }
      else if (cur_selection < -1) {
        should_preventDefault = false
        cur_selection = -1
      }
      displayAutocomplete_html.dataset.selected = cur_selection
    }
    return should_preventDefault
  }
  if (e.keyCode == keycodes.downarrow) {
    if (doIncrement(1)) {
      e.preventDefault()
    }
  }
  else if ((e.keyCode == keycodes.tab || e.keyCode == keycodes.enter) && getSelection() === -1) {
    if (doIncrement(1)) {
      displayAutocomplete_html.children[getSelection()].onclick()
      e.preventDefault()
    }
  }
  // Up
  else if (e.keyCode == keycodes.uparrow) {
    if (doIncrement(-1)) {
      e.preventDefault()
    }
    else {
      clearAutocomplete()
    }
  }
  // right
  else if (e.keyCode == keycodes.rightarrow || e.keyCode == keycodes.enter || e.keyCode == keycodes.tab || e.keyCode == keycodes.space) {
    if (doIncrement(0)) {
      displayAutocomplete_html.children[getSelection()].onclick()
      e.preventDefault()
    }
    else {
      clearAutocomplete()
    }
  }
  else {
    clearAutocomplete()
  }
}
function replaceTextareaInput({
  textarea,
  replacement,
  prefix_startpos,
  prefix_stoppos
}) {
  const start = prefix_startpos || textarea.selectionStart
  const end = prefix_stoppos || textarea.selectionEnd
  const v = textarea.value
  const textBefore = v.substring(0, start)
  const textAfter = v.substring(end, v.length)
  const textSelected = v.substring(start, end)
  textarea.value = `${textBefore}${replacement}${textAfter}`
  textarea.selectionStart = start + replacement.length
  textarea.selectionEnd = start + replacement.length
  textarea.focus()
}
function disableAutocompletion() {
  const textarea = xp.new('id("text")').getElement()
  // textarea.removeEventListener("input",() => onTextareaInput );
}
function initSettingsDialog(loaded_settings) {
  const settings_ui = new SettingsUI({ group_name: 'Auto-Complete', settings_tree_config: { save_location: '', autosave: true } })
  const autocompleteTypes = settings_ui.addMultiselect({ title: 'Types', key: 'autocomplete_types' })
  autocompleteTypes.addOption({ key: 'usernames', title: '@Username' })
  autocompleteTypes.addOption({ key: 'titles', title: ':Title' })
  // Load our saved settings object into the ui
  settings_ui.settings_tree.load_all()
  // return new settings object which is bound to the UI.
  const settings = settings_ui.settings_tree.values
  return settings
}
function main({ read_posts_history, settings: loaded_settings }) {
  const settings = initSettingsDialog(loaded_settings)
  const user_id = getCurrentUserID()
  const uhist = new UserHistory({ read_posts_history, user_id })
  unsafeWindow.uhist = uhist
  // Add current page's posts to history.

  let thread = xp.new(posts).append('//td/span/a').with(xp.new('preceding-sibling::span').with(xp.new().contains('@class', 'fa-clock'))).getElement()
  if (thread) {
    thread = thread.href
    const thread_id = parseInt(thread.match(/\/thread\/(\d+)\//)[1])
    if (location.pathname.startsWith('/thread/')) {
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
    /* xp.new('//textarea[@id="text"]').forEachElement( (textarea) => {
      textarea.addEventListener("input",() => onTextareaInput({
        textarea:textarea,
        uhist:uhist,
        thread_id:thread_id,
      } ) );
      textarea.addEventListener("keydown", onTextareaKeyDown);
    }); */
    // NOTE there can be more than one textarea. but they all use the same id :O

    function autoComplete(partial_name, render_view) {
      // console.log(partial_name);
      const r = uhist.autoComplete(partial_name, { thread_id, case_sensitive: false, fuzzy: true })
      // console.log(r);
      // console.log(render_view);
      render_view(r)
    }
    function formatDisplayItem(item) {
      return `<li class="dropdown-item d-flex justify-content-between align-items-center px-2" style="height:50px;" title="${item.excerpt}">
        <div class="h-100">
        <span class="">${item.did_mention ? '@' : ''}</span>
        <span class="${item.thread_id === thread_id ? 'far fa-comments' : ''}"></span>
        <img src="${item.user_img}" class="mh-100 rounded avatar"/>
        </div>
        <span class="${item.user_level}" style="color:${item.user_color};">${item.user_name}</span>
        </li>`
    }

    $('textarea[id="text"]').atwho({
      at: '@'
      , displayTpl: formatDisplayItem
      , insertTpl: '${atwho-at}${user_name}'
      , searchKey: 'user_name'
      // We don't want to use your filter or sorter. remoteFilter is a better fit for us.
      , data: []
      // data: uhist.history,
      , limit: 200
      , callbacks: {
        remoteFilter: autoComplete
        // NoOp
        , sorter: (_, i) => i
      }
    })
    // These make atwho dropdown menu use the same color theme as the site.
    // $('.atwho-container').addClass('');
    $('.atwho-view').addClass('container').css({ display: 'none' })
    $('.atwho-view-ul').addClass('dropdown-menu show pre-scrollable')
    $('.atwho-view-ul').addClass('dropdown-menu show')
    // make the selected atwho user be highlighted using the same color theme as the site.
    duplicate_cssRule('.dropdown-item:hover, .dropdown-item:focus', '.atwho-view .cur')

    // addCssLink('https://cdn.rawgit.com/ichord/At.js/1b7a52011ec2571f73385d0c0d81a61003142050/dist/css/jquery.atwho.css');
    // For debugging
    unsafeWindow.uhist = uhist
  }
}

getUserValues({
  read_posts_history: []
  , settings: {}
}).then(main)
