'use strict'

;(() => {
    function setMdFollowStatus(manga_id ,status) {
        const extraParams = `&_=${Date.now() - 5000}`
        const extraAttr = {
            credentials: 'include'
            ,cache: 'no-cache'
            ,headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }
        fetch(`/ajax/actions.ajax.php?function=manga_follow&id=${manga_id}&type=${status}${extraParams}` ,extraAttr)
            .then((r) => {
                if (r.ok) {
                    return status
                    // TODO change visual status
                }
            })
    }

    function EnableMdFeatureSubset(contentWindow ,contentDocument) {
        const extraParams = `&_=${Date.now() - 5000}`
        const extraAttr = {
            credentials: 'include'
            ,cache: 'no-cache'
            ,headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }
        Object.values(contentDocument.querySelectorAll('.btn-group a')).forEach((e) => {
            e.href = 'javascript:;'
        })
        Object.values(contentDocument.querySelectorAll('.btn-group')).map(e => ({
            btn: e.querySelector('button.manga_rating_button')
            ,selects: Object.values(e.querySelectorAll('a.manga_rating_button'))
            ,dropArrow: e.querySelector('button.dropdown-toggle')
        })).filter(({
            btn
            ,selects
        }) => btn != null || selects.some(e => e.matches('.disabled.manga_rating_button'))).forEach(({
            dropArrow
            ,btn
            ,selects
        }) => {
            let txtBtn = btn
            if (txtBtn == null) {
                txtBtn = dropArrow
            }
            [dropArrow ,btn].filter(e => e != null).forEach(e => e.addEventListener('click' ,() => {
                selects[0].parentElement.classList.toggle('show')
                selects[0].parentElement.addEventListener('focusout' ,() => {
                    selects[0].parentElement.classList.remove('show')
                })
            }))
            ;[...selects].forEach((e) => {
                e.addEventListener('click' ,() => {
                    const rating = e.id
                    const manga_id = e.getAttribute('data-manga-id')
                    fetch(`/ajax/actions.ajax.php?function=manga_rating&id=${manga_id}&rating=${rating}${extraParams}` ,extraAttr)
                        .then((r) => {
                            if (r.ok) {
                                txtBtn.innerHTML = ''
                                e.childNodes.forEach((e) => {
                                    txtBtn.appendChild(e.cloneNode(true))
                                })
                                // TODO change visual status
                            }
                        })
                })
            })
        })

        Object.values(contentDocument.querySelectorAll('.btn-group')).map(e => ({
            btn: e.querySelector('button.manga_follow_button')
            ,selects: Object.values(e.querySelectorAll('a.manga_follow_button'))
            ,dropArrow: e.querySelector('button.dropdown-toggle')
        })).filter(({
            btn
            ,selects
        }) => btn != null || selects.some(e => e.matches('.disabled.manga_follow_button'))).forEach(({
            dropArrow
            ,btn
            ,selects
        }) => {
            let txtBtn = btn
            if (txtBtn == null) {
                txtBtn = dropArrow
            }
            [dropArrow ,btn].filter(e => e != null).forEach(e => e.addEventListener('click' ,() => {
                selects[0].parentElement.classList.toggle('show')
                selects[0].parentElement.addEventListener('focusout' ,() => {
                    selects[0].parentElement.classList.remove('show')
                })
            }))
            ;[...selects].forEach((e) => {
                e.addEventListener('click' ,() => {
                    selects[0].parentElement.classList.remove('show')
                    const type = e.id
                    const manga_id = e.getAttribute('data-manga-id')
                    fetch(`/ajax/actions.ajax.php?function=manga_follow&id=${manga_id}&type=${type}${extraParams}` ,extraAttr)
                        .then((r) => {
                            if (r.ok) {
                                txtBtn.innerHTML = ''
                                e.childNodes.forEach((e) => {
                                    txtBtn.appendChild(e.cloneNode(true))
                                })
                                // TODO change visual status
                            }
                        })
                })
            })
        })

        Object.values(contentDocument.querySelectorAll('.btn-group')).map(e => ({
            btn: e.querySelector('button.manga_unfollow_button')
            ,selects: Object.values(e.querySelectorAll('a.manga_unfollow_button'))
            ,dropArrow: e.querySelector('button.dropdown-toggle')
        })).filter(({
            btn
            ,selects
        }) => selects.some(e => e.matches('.manga_unfollow_button'))).forEach(({
            dropArrow
            ,btn
            ,selects
        }) => {
            let txtBtn = btn
            if (txtBtn == null) {
                txtBtn = dropArrow
            }
            if (btn != null) {
                [dropArrow ,btn].filter(e => e != null).forEach(e => e.addEventListener('click' ,() => {
                    selects[0].parentElement.classList.toggle('show')
                    selects[0].parentElement.addEventListener('focusout' ,() => {
                        selects[0].parentElement.classList.remove('show')
                    })
                }))
            }

            [...selects].forEach((e) => {
                e.addEventListener('click' ,() => {
                    if (!confirm("Are you sure? This will remove all the 'read chapter' markers.")) {
                        return
                    }
                    selects[0].parentElement.classList.remove('show')
                    const type = e.id
                    const manga_id = e.getAttribute('data-manga-id')
                    fetch(`/ajax/actions.ajax.php?function=manga_unfollow&id=${manga_id}&type=${type}${extraParams}` ,extraAttr)
                        .then((r) => {
                            if (r.ok) {
                                txtBtn.innerHTML = ''
                                e.childNodes.forEach((e) => {
                                    txtBtn.appendChild(e.cloneNode(true))
                                })
                                // TODO change visual status
                            }
                        })
                })
            })
        })
    }

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
        console.log(`Copied '${a}'`)
    }

    function createMdExportInterface() {
        const b = document.createElement('button')
        const d = document.createElement('div')
        const s = document.createElement('div')
        const f = document.createElement('div')
        s.appendChild(f)
        d.style.display = 'flex'
        d.style.alignItems = 'center'
        d.style.justifyContent = 'center'
        d.style.position = 'fixed'
        d.style.width = '100vw'
        d.style.height = '100vh'
        d.style.top = '0'
        d.style.left = '0'
        d.style.backgroundColor = 'rgba(0,0,0,.75)'
        d.style.flexWrap = 'wrap'
        d.style.flexDirection = 'column'
        d.appendChild(b)
        d.appendChild(s)
        b.textContent = 'Looking For Follows'
        b.disabled = true

        document.body.appendChild(d)
        return [b ,f]
    }

    function fetchMdFollowsPage(page ,button ,container ,pages) {
        console.log(`Fetching Follows Page ${page}`)
        if (button != null) {
            button.textContent = `Fetching Page ${page}${pages ? ` of ${pages}` : ''}`
        }
        return fetch(`https://mangadex.org/follows/manga/0/0/${page}/`)
            .then((d) => {
                if (d.ok) {
                    return d.text()
                }
                throw Error(d.statusText)
            }).then((html) => {
                const doctype = document.implementation.createDocumentType('html' ,'' ,'')
                const dom = document.implementation.createDocument('' ,'html' ,doctype)
                dom.documentElement.innerHTML = html

                let manga = Object.values(dom.documentElement.querySelectorAll('.manga-entry'))
                if (manga.length == 0) {
                    throw Error('No Follows Found')
                }
                manga = serializeMdTitles(manga)
                const [,found ,total] = dom.documentElement.querySelector('#chapters > p').textContent.match(/to (\d+) of (\d+)/)
                const pages = dom.documentElement.querySelector('#chapters .page-link .fa-angle-double-right').parentElement.href.match(/(\d+)\/$/)[1]
                if (container != null) {
                    container.textContent = container.textContent ? container.textContent : 0
                    container.textContent = `Found ${found} / ${total} follows.`
                }
                return {
                    follows: manga
                    ,pages: parseInt(pages)
                }
            })
    }

    function fetchMdFollowsPages(page ,button ,container ,pages ,follows = []) {
        if (pages != null && page >= pages) {
            throw Error('Requested follows page is outside known follows page count.')
        }
        fetchMdFollowsPage(page ,button ,container ,pages).then(({
            follows: thisPage
            ,pages
        }) => fetchMdFollowsPages(page + 1 ,button ,container ,pages).then(({
            follows: nextPage
            ,pages
        }) => ({ follows: follows.concat(thisPage).concat(nextPage) }))).catch(e => ({
            follows
            ,pages
        }))
    }

    function serializeMdTitles(mangaList) {
        return mangaList.map((me) => {
            const data = {}
            data.id = me.dataset.id
            data.title = me.querySelector('.manga_title').title
            data.url = me.querySelector('.manga_title').href
            me.querySelectorAll('.btn-group .dropdown-menu .dropdown-item.disabled').forEach((opt) => {
                if (opt.classList.contains('manga_rating_button')) {
                    const rating = opt.textContent.trim()
                    if (rating != '') {
                        data.rating = opt.id
                    }
                }
                else if (opt.classList.contains('manga_follow_button')) {
                    data.followText = opt.textContent.trim()
                    data.follow = opt.id
                }
            })
            return data
        })
    }


    // Use this
    function exportMdFollows() {
        const [button ,container] = createMdExportInterface()
        fetchMdFollowsPages(1 ,button ,container).then(({ follows: data }) => {
            const titles = data.sort((a ,b) => a.follow - b.follow || (b.rating != null ? b.rating : -1) - (a.rating != null ? a.rating : -1)).reduce((k ,e) => `${k == '' ? '' : `${k}\n`}${e.followText}${e.rating != null ? ` (${e.rating})` : ''}: ${e.title}` ,'')
            console.log(titles)
            button.textContent = 'Copy Follows!'
            button.disabled = false
            button.onclick = () => {
                copyToClipboard(titles)
                button.parentElement.remove()
            }
        })
    }


    function searchTitleMD(title) {
        const url = `https://mangadex.org/search?title=${encodeURIComponent(title)}`
        return fetch(url).then((r) => {
            if (r.ok) {
                return r.text().then((html) => {
                    const doctype = document.implementation.createDocumentType('html' ,'' ,'')
                    const dom = document.implementation.createDocument('' ,'html' ,doctype)
                    dom.documentElement.innerHTML = html
                    const foundManga = Object.values(dom.documentElement.querySelectorAll('.manga-entry'))
                    const searchForm = dom.documentElement.querySelector('#search_titles_form')
                    const pages = dom.documentElement.querySelector('#content nav')
                    return {
                        mangaList: foundManga
                        ,searchForm
                        ,pages
                        ,dom
                    }
                })
            }
            throw Error('Search Failed')
        })
    }

    function ExportMuList() {
        return Object.values(document.querySelectorAll('#list_table > div')).map((e) => {
            let our_rating = e.querySelector('a[title="Update Rating"]')
            if (our_rating != null) {
                our_rating = parseInt(our_rating.textContent)
            }
            const title = e.querySelector('a[title="Series Info"]').textContent
            let read_volume = e.querySelector('a[title="Increment Volume"]')
            if (read_volume != null) {
                read_volume = parseFloat(read_volume.textContent.substr(2))
            }
            let read_chapter = e.querySelector('a[title="Increment Chapter"]')
            if (read_chapter != null) {
                read_chapter = parseFloat(read_chapter.textContent.substr(2))
            }
            return {
                title
                ,our_rating
                ,read_volume
                ,read_chapter
            }
        })
    }

    function createMdMatchInterface({
        searchterm
        ,mangaList
        ,searchForm
        ,pages
        ,styles
        ,dom
    }) {
        const iframe = document.createElement('iframe')
        iframe.style.width = '100vw'
        iframe.style.borderLeft = '0'
        iframe.style.borderRight = '0'
        iframe.style.borderTop = '0'
        iframe.style.height = 'auto'
        iframe.scrolling = 'no'
        iframe.frameborder = '0'
        document.body.appendChild(iframe)
        const iframeContent = document.createElement('div')
        iframeContent.id = 'content'
        iframeContent.style.display = 'flex'
        iframeContent.style.flexDirection = 'column'
        iframeContent.classList.add('container')
        iframeContent.setAttribute('role' ,'main')
        const searchBtn = document.createElement('button')
        const searchFormContainer = document.createElement('div')
        searchFormContainer.appendChild(searchForm)
        searchBtn.textContent = `Advanced Search '${searchterm}'`
        searchFormContainer.style.display = 'none'

        let runId = 0
        // iframe.src=`https://mangadex.org/search?title=${encodeURIComponent(searchterm)}`
        // iframe.stop()
        iframe.addEventListener('load' ,() => {
            const ourRunId = runId++
            const updateHeight = () => {
                if (ourRunId == runId - 1) {
                    iframe.style.height = `${lastEntry.offsetTop + lastEntry.offsetHeight + 60}px`
                }
            }
            if (ourRunId == 0) {
                // iframe.contentWindow.history.replaceState("mangadex", "MU->MD Import", `https://mangadex.org/search?title=${encodeURIComponent(searchterm)}`);
                iframeContent.appendChild(searchBtn)
                iframeContent.appendChild(searchFormContainer)
                mangaList.forEach((e) => {
                    iframeContent.appendChild(e)
                    // e.querySelector('.manga_follow_button').addEventListener('click',(btn)=>{
                    //  btn.id
                    // })
                })
                if (pages != null) {
                    iframeContent.appendChild(pages)
                }
                searchBtn.onclick = () => {
                    if (searchFormContainer.style.display == 'none') {
                        searchFormContainer.style.display = 'block'
                    }
                    else {
                        searchFormContainer.style.display = 'none'
                    }
                    updateHeight()
                }
                iframe.contentDocument.body.appendChild(iframeContent)
                dom.documentElement.querySelectorAll('style, link[rel="stylesheet"]').forEach((e) => {
                    // if (e.tagName != "SCRIPT") {
                    //  iframe.contentDocument.body.appendChild(e.cloneNode(true))
                    //  return
                    // }
                    const n = iframe.contentDocument.createElement(e.tagName)
                    Object.values(e.attributes).forEach(e => n.setAttribute(e.nodeName ,e.nodeValue))
                    if (e.tagName != 'SCRIPT' || (e.textContent && e.textContent.match('window.location') == null)) {
                        n.textContent = e.textContent
                    }

                    iframe.contentDocument.body.appendChild(n)
                })
                EnableMdFeatureSubset(iframe.contentWindow ,iframe.contentDocument)
                hasRun = true
            }
            const entries = Object.values(iframe.contentDocument.body.querySelectorAll('#search_titles_form, .manga-entry, nav .page-item'))
            const lastEntry = entries[entries.length - 1]

            iframe.contentDocument.body.querySelectorAll('img').forEach((e) => {
                e.addEventListener('load' ,updateHeight)
            })
            updateHeight()
            // There are weird problems with resize, at least with FF. Probably code imported
            setTimeout(updateHeight ,100)
            setTimeout(updateHeight ,1000)
            setTimeout(updateHeight ,10000)
        })
        return mangaList
    }

    function EasySelect(searchterm ,styles ,targetStatus) {
        return searchTitleMD(searchterm).then(({
            mangaList
            ,searchForm
            ,pages
            ,dom
        }) => {
            console.log(`Building Serial for '${searchterm}'!`)
            const serialList = serializeMdTitles(mangaList)
            console.log(serialList)
            console.log(`Checking if single '${searchterm}'!`)
            if (serialList.length === 1 && serialList[0].title.toLowerCase() === searchterm.toLowerCase()) {
                console.log(`Found Single Exact title match with MD Id '${serialList[0].id}' for Title '${serialList[0].title}'. Adding to list!`)
                setMdFollowStatus(serialList[0].id ,targetStatus)
                return []
            }
            console.log(`Trying to build iface for '${searchterm}'!`)
            if (true || mangaList.length >= 1 || serialList[0].title.toLowerCase() !== serialList.toLowerCase()) {
                return createMdMatchInterface({
                    searchterm
                    ,mangaList
                    ,searchForm
                    ,pages
                    ,styles
                    ,dom
                })
            }
            return mangaList
        }).then(serializeMdTitles)
    }

    function removeMatchingTitles(listA ,listB) {
        const excludeTitles = listB.map(b => b.title.toLowerCase())
        return listA.filter(a => !excludeTitles.includes(a.title.toLowerCase()))
    }

    function promptImportMd() {
        const styles = Object.values(document.querySelectorAll('style, link, script'))
        document.body.innerHTML = ''
        const txt = document.createElement('input')
        const followbtn = document.createElement('button')
        followbtn.textContent = 'Import to Follows'
        const compbtn = document.createElement('button')
        compbtn.textContent = 'Import to Completed'
        const planbtn = document.createElement('button')
        planbtn.textContent = 'Import to Plan To Read'
        const dropbtn = document.createElement('button')
        dropbtn.textContent = 'Import to Droped'
        const btnContainer = document.createElement('div')
        const statusContainer = document.createElement('div')
        const statusText = document.createElement('p')
        const instructionsContainer = document.createElement('div')
        instructionsContainer.innerHTML = 'Run this script on <a href=\'https://www.mangaupdates.com/mylist.html\'>Baka Updates</a> to copy your list, then paste the result above and press Import!'
        ;[btnContainer].forEach((e) => {
            e.style.display = 'flex'
            e.style.flexDirection = 'row'
            e.style.alignContent = 'center'
            e.style.justifyContent = 'center'
            e.style.alignItems = 'center'
            e.style.flexGrow = '1'
        })
        ;[document.body ,statusContainer].forEach((e) => {
            e.style.display = 'flex'
            e.style.flexDirection = 'column'
            e.style.alignContent = 'center'
            e.style.justifyContent = 'center'
        })
        statusContainer.style.alignItems = 'center'
        ;[followbtn ,compbtn ,planbtn ,dropbtn].forEach((e) => {
            e.style.flexGrow = '1'
            btnContainer.appendChild(e)
        })
        statusContainer.appendChild(instructionsContainer)
        statusContainer.appendChild(statusText)

        ;[txt ,btnContainer ,statusContainer].forEach(e => document.body.appendChild(e))
        const dbg = (...args) => {
            instructionsContainer.style.display = 'none'
            console.log(args.join(' '))
            statusText.textContent = args.join(' ')
        }
        const importPromise = (targetStatus) => {
            Object.values(btnContainer.children).forEach((e) => {
                e.disabled = true
            })
            let list
            try {
                list = JSON.parse(txt.value)
            }
            catch (e) {
                return Promise.reject(e)
            }

            function loopRun(fn) {
                return fn().then(() => loopRun(fn)).catch(() => { })
            }
            let mdFilterList = Promise.resolve()
            dbg(`Importing ${list.length} titles from MU`)
            if (list.length > 2) {
                // Reduce server load by removing follows from list
                let pageIdx = 1
                mdFilterList = loopRun(() => fetchMdFollowsPage(pageIdx).then(({
                    follows
                    ,pages
                }) => {
                    const origLength = list.length
                    list = removeMatchingTitles(list ,follows)
                    dbg(`Fetched MD Follows page ${pageIdx}/${pages}. Found ${origLength - list.length} existing titles. MU titles remaining: ${list.length}`)
                    const pagesLeft = pages - pageIdx
                    if (pagesLeft > 0 && list.length > pagesLeft) {
                        pageIdx++
                        // Small delay to reduce strain on server
                        return new Promise(res => setTimeout(res ,500))
                    }
                    throw Error('Should not fetch more pages ')
                }))
            }
            let idx = 0
            return mdFilterList.then(() => {
                dbg(`Searching for ${list.length} title${list.length != 1 ? 's' : ''}`)
                let interventionNeeded = 0
                loopRun(() => {
                    if (list[idx] != null) {
                        dbg(`${interventionNeeded > 0 ? `${interventionNeeded} title${interventionNeeded != 1 ? 's' : ''} require intervention. ` : ''}Searching for title ${idx + 1}/${list.length}: '${list[idx].title}'`)
                        // Small delay to reduce strain on server
                        return EasySelect(list[idx++].title ,styles ,targetStatus).then((searchResults) => {
                            if (searchResults.length > 0) {
                                interventionNeeded++
                            }
                            dbg(`${list[idx] == null ? 'Finished! ' : ''}${interventionNeeded > 0 ? `${interventionNeeded} title${interventionNeeded != 1 ? 's' : ''} require intervention. ` : ''}${list[idx] != null ? `Preparing for title ${idx + 1}/${list.length}: '${list[idx].title}'` : ''}`)
                            return new Promise(res => setTimeout(res ,5000))
                        })
                    }
                    throw Error('Out Of Entries')
                }).then(() => {
                    txt.value = ''
                    Object.values(btnContainer.children).forEach((e) => {
                        e.disabled = false
                    })
                })
            })
        }
        const importGenerator = toList => () => {
            importPromise(toList).catch((e) => {
                Object.values(btnContainer.children).forEach((e) => {
                    e.disabled = false
                })
                dbg(e)
            })
        }
        const followStatus = {
            reading: 1
            ,completed: 2
            ,hold: 3
            ,plan: 4
            ,droped: 5
            ,rereading: 6
        }
        followbtn.onclick = importGenerator(followStatus.reading)
        compbtn.onclick = importGenerator(followStatus.completed)
        planbtn.onclick = importGenerator(followStatus.plan)
        dropbtn.onclick = importGenerator(followStatus.droped)
    }
    if (window.location.href.match(/^https?:\/\/(www\.)?mangadex\.org/)) {
        promptImportMd()
    }
    else if (window.location.href.match(/^https?:\/\/(www\.)?mangaupdates\.com\/mylist\.html.*/)) {
        const list = ExportMuList()
        console.log('Copied list to clipboard')
        console.log(list)
        copy(list)
    }
    else {
        alert('This script must be run on MangaDex.org or MangaUpdates.com/mylist.html')
    }
})()
